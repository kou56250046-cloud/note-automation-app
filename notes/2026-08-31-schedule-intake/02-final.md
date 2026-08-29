「火水木ならいつでも」「月曜以外なら」——日程調整フォームに返ってくるのは、たいていこういう文です。

これを上から順に読んで、曜日ごとの空き表に手で書き写しているなら、その手作業はシートの列設計で減らせます。

日程調整の入口では、これに加えて2つの管理が要ります。締切を過ぎた回答をどう扱うか。同じ人が2回目に送ってきた回答をどう扱うか。

この記事では、この2つを含めた入口の設計だけを書きます。Geminiでの構造化は次の記事の範囲です。

## こんな作業をしていませんか

Googleフォームで日程調整の自由記述を集めて、返ってきた回答を上から順に読みながら、曜日ごとの空き状況を手で表に書き写す。

締切のあとに届いた回答をどう扱うか決めておらず、集計する段になって「これはもう遅い」と気づく。

同じ人が予定を変えて2回答えてきて、シートには行が2つ残り、どちらが最新か分からなくなる。

この3つは別々の問題ではありません。シートの列設計を最初に決めていないから起きています。

## 日程調整のシートに必要な3つの条件

フォームの回答をインストーラブルトリガーで受け取り、シートに1行ずつ積む。ここまでは、どんな用途でも同じ形です。

日程調整では、そこに3つの条件が加わります。

- 自由記述が要約対象の長文ではなく、曜日と時間帯に正規化する前提の短文であること
- 締切日時をどこかに持ち、締切後の回答を区別する必要があること
- 同じ回答者が複数回答したとき、最新の内容で上書きする必要があること

この3つを、シートの列とコードの両方に反映させます。

## インストーラブルトリガーを設定する

`onFormSubmit(e)` という関数名を置くだけの「シンプルトリガー」では、外部サービスへの接続権限がありません。

構造化の段でGemini APIを呼ぶ以上、インストーラブルトリガーを使います。設定手順は次のとおりです。

- スクリプトエディタを開き、左メニューの時計アイコン(トリガー)をクリックする
- 「トリガーを追加」を押す
- 実行する関数を `onFormSubmit` にする
- イベントのソースを「フォームから」にする
- イベントの種類を「フォーム送信時」にする
- 保存すると、初回だけ権限の承認ダイアログが出る

承認は、シートの所有者本人でログインした状態で行ってください。共有アカウントで作業していると、ダイアログが出ずに止まって見えることがあります。

## シートの列設計

シート名は `responses` にします。列は6つです。

- A列 タイムスタンプ — フォーム送信時刻
- B列 回答者名 — フォームの記述式1問目
- C列 都合 — 自由記述。「火水木ならいつでも」のような曖昧な文がそのまま入る
- D列 処理状態 — `pending` / `done` / `error` のいずれか
- E列 構造化結果 — Gemini が返したJSON文字列。次の記事で埋める
- F列 処理日時 — 構造化が終わった時刻

C列に入る文言は、正規化されていない生の日本語です。曜日と時間帯への変換はここでは行いません。後段で「空き」「不可」「未回答」の3段階に直す前提で、そのまま受け取ります。

## 締切をどこに持つか

締切日時は、シートの列には持たせません。回答が増えるたびに全行へコピーする理由がなく、システム全体で1つの値だからです。

スクリプトプロパティに `DEADLINE_AT` という名前で、ISO8601形式の文字列を1つ保存します。

```
DEADLINE_AT = 2026-09-04T18:00:00+09:00
```

締切をあとから動かしたくなったときも、スクリプトプロパティを書き換えるだけで済みます。シートの数式やコードを触る必要がありません。

締切を過ぎて届いた回答は、処理状態を `error` にして残します。処理状態は3値と決めているため、締切超過専用の状態は増やしません。代わりにE列(構造化結果)へ「締切超過」という文字列を入れ、あとで見分けられるようにします。

締切を過ぎた回答を捨てずに残すのは、幹事が「本当に間に合わなかったのか」を確認できるようにするためです。自動で消すと、あとから揉めます。

## 同じ人が2回答えたときの扱い

日程調整では、参加者が予定を変えて2回目の回答を送ってくることがよくあります。アンケートの感想であればどちらも別の意見として残せますが、都合は1人につき1つに定まっている必要があります。

このシステムでは、後勝ちにします。回答者名で既存の行を探し、見つかれば上書き、無ければ新規追加します。

回答者名は完全一致で突合します。

## 受信からシート書き込みまでのコード

差し替えるのは `config.gs` の定数だけです。

```javascript
// config.gs
const SHEET_NAME = 'responses';
const NAME_COLUMN_HEADER = '回答者名';
const FREE_TEXT_COLUMN_HEADER = '都合';

// システム全体で1つだけ持つ締切。スクリプトプロパティのキー名
const DEADLINE_PROPERTY_KEY = 'DEADLINE_AT';

const HEADERS = [
  'タイムスタンプ',
  NAME_COLUMN_HEADER,
  FREE_TEXT_COLUMN_HEADER,
  '処理状態',
  '構造化結果',
  '処理日時'
];
```

```javascript
// intake.gs
function onFormSubmit(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SHEET_NAME);

  ensureHeaders_(sheet);

  const itemResponses = e.response.getItemResponses();
  let name = '';
  let freeText = '';

  for (const item of itemResponses) {
    const title = item.getItem().getTitle();
    if (title === NAME_COLUMN_HEADER) {
      name = item.getResponse();
    } else if (title === FREE_TEXT_COLUMN_HEADER) {
      freeText = item.getResponse();
    }
  }

  if (!name) {
    // 名前が空だと突合できないため、error として残す
    sheet.appendRow([new Date(), '(未入力)', freeText, 'error', '未入力のため保留', '']);
    return;
  }

  const deadline = getDeadline_();
  const now = new Date();
  const isLate = deadline && now > deadline;

  const existingRow = findRowByName_(sheet, name);
  const status = isLate ? 'error' : 'pending';
  const note = isLate ? '締切超過' : '';
  const row = [now, name, freeText, status, note, ''];

  if (existingRow) {
    // 同じ回答者名の行があれば上書きする(後勝ち)
    sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function ensureHeaders_(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = HEADERS.every((h, i) => firstRow[i] === h);
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function findRowByName_(sheet, name) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const names = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (let i = 0; i < names.length; i++) {
    if (names[i][0] === name) {
      return i + 2; // ヘッダー行のオフセット
    }
  }
  return null;
}

function getDeadline_() {
  const value = PropertiesService
    .getScriptProperties()
    .getProperty(DEADLINE_PROPERTY_KEY);
  return value ? new Date(value) : null;
}
```

`ensureHeaders_` は、シートを作り直したときにも自動でヘッダーを揃えます。手で列名を打ち直す作業を減らせます。

## つまずきどころ

1つ目は、締切のタイムゾーンです。`DEADLINE_AT` に `+09:00` を付け忘れると、GASの実行環境の解釈次第で数時間ずれます。JSTで運用するなら、必ずオフセット付きで書いてください。

2つ目は、回答者名の表記揺れです。このコードは完全一致でしか同一人物と判定しないので、全角と半角、姓名の間のスペースの有無が揺れると別人の行が増えます。ここは自動では吸収しません。フォームの記述式に「姓名の間にスペースを入れない」と注記を添えるかどうかは、運用側の判断に残しています。

## 今日できること

自分のフォームとシートに対して、`onFormSubmit` をインストーラブルトリガーとして登録してください。

そのあと、スクリプトプロパティに `DEADLINE_AT` を1つ設定し、同じ名前で2回テスト送信してみます。行が2つに増えず、2回目の内容で1行だけ上書きされていれば、入口は完成です。

締切に手作業が残ります。開始のたびに `DEADLINE_AT` の値を手で書き換える作業だけは、このコードでは自動化していません。

火曜の記事では、この `pending` 行を拾ってGeminiに投げ、曜日×時間帯の空き状況に構造化するコードを書きます。

---

今週は「日程調整ヒートマップ」というひとつの自動化システムを、7本に分けて書いています。

- 月: 参加者の空き状況を自由記述で集める。日程調整フォームの入口設計
- 火: Geminiに自由記述の空き時間を構造化させる。プロンプトと呼び出しコードの全文
- 水: 同時送信の二重書き込みとGeminiの形式崩れを防ぐ。壊れる集計コードと直したコード
- 木: 全員の空き状況を、色の濃淡で一目にするヒートマップダッシュボード
- 金: 集計のトリガーと権限。全員が空いている枠が決まったらSlackに通知する設定
- 土: ヒートマップの見せ方でつまずいた5箇所。before→afterで直す
- 日: 日程調整ヒートマップ完成版一式。差し替えて自分の会議調整で使う手順書(有料)
