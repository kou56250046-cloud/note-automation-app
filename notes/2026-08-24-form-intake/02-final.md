Googleフォームの自由記述をGeminiで要約する仕組みは、フォーム側では失敗しません。

失敗するのはシート側です。

自由記述の列がどこにあるか固定していない、処理済みかどうかを判定する列がない。
この2つで、後から積む要約処理がまるごと壊れます。

私は最初、シンプルトリガーで組みました。

これはスプレッドシートのメニューにある「トリガー」の設定画面を使わず、
エディタ上で `onFormSubmit(e)` という関数名を置くだけの方式です。

フォームを送信すると動くには動きます。

ところが、その中でGemini APIを呼ぼうとした瞬間に権限エラーが出ました。
シンプルトリガーは外部サービスへの接続を許可されていません。

ここから、インストーラブルトリガーへの組み替えと、シート構造の設計をやり直しました。
この記事では、その入口の部分だけを書きます。

Geminiの呼び出しコードは書きません。次の記事の範囲です。
ここで扱うのは「フォームの回答をどう受け取り、どう並べれば後段が処理しやすいか」だけです。

## インストーラブルトリガーを設定する

`onFormSubmit(e)` という関数名を置くだけの「シンプルトリガー」は、
関数名がイベント名と一致していれば自動で動きます。

ですが権限が実行者の範囲に限定されるため、外部API（Gemini API含む）を呼べません。
UrlFetchAppを使う時点で、シンプルトリガーは選択肢から外れます。

代わりに「インストーラブルトリガー」を使います。

設定は次の手順です。

- スクリプトエディタを開き、左メニューの時計アイコン（トリガー）をクリックする
- 「トリガーを追加」を押す
- 実行する関数を、受信処理を書いた関数名にする
- イベントのソースを「フォームから」にする
- イベントの種類を「フォーム送信時」にする
- 保存すると、初回だけ権限の承認ダイアログが出る

このとき対象のフォームは、フォーム作成時に生成される固有IDで指定します。
スプレッドシートの拡張機能メニューからスクリプトエディタを開いた場合は、
自動で連携済みのフォームが候補に出ます。

コードから登録する方法もあります。後半のコードに含めています。
一度登録すれば、以降はGASのプロジェクトを開かなくても動き続けます。

## シートの列設計

Geminiに渡す前提でシートを作るなら、最低限この7列を用意します。

- A列: 回答ID（フォームが自動で発行するレスポンスID）
- B列: タイムスタンプ
- C列: 生テキスト（自由記述の中身）
- D列: 処理状態（未処理 / 処理中 / 完了）
- E列: 要約（Geminiの出力。次の記事で埋める）
- F列: カテゴリ（同上）
- G列: 感情スコア（同上）

このうちD列の処理状態が、この記事でいちばん伝えたい設計です。

回答が届くたびに「未処理」で1行追加します。
要約処理を回すバッチは、D列が「未処理」の行だけを拾って処理します。

処理を始めたら「処理中」に、終わったら「完了」に書き換えます。
これだけで、後段のバッチが「どこまで処理したか」を自分で判断できるようになります。

## 受信からシート書き込みまでのコード

トリガー登録と、フォーム送信を受けてシートに1行追加するところまでの全文です。
フォームIDとシート名は、自分の環境の値に置き換えてください。

```javascript
// トリガーを1回だけ登録する関数。
// スクリプトエディタから手動で1回実行すれば十分です。
function setupFormTrigger() {
  const formId = 'YOUR_FORM_ID'; // フォームの固有ID
  const form = FormApp.openById(formId);

  // 既存の同名トリガーが二重登録されないように、いったん削除する
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction() === 'onFormSubmitHandler') {
      ScriptApp.deleteTrigger(t);
    }
  }

  ScriptApp.newTrigger('onFormSubmitHandler')
    .forForm(form)
    .onFormSubmit()
    .create();
}

// フォーム送信のたびに呼ばれる本体。
// e.response からその回答だけを取り出せる。
function onFormSubmitHandler(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName('回答'); // シート名は環境に合わせて変更する

  const response = e.response;
  const itemResponses = response.getItemResponses();

  // 自由記述の質問だけを拾う。
  // フォームの質問順が変わっても列位置がずれないように、
  // インデックスではなく質問タイプで判定する。
  let freeText = '';
  for (const item of itemResponses) {
    const type = item.getItem().getType();
    if (type === FormApp.ItemType.PARAGRAPH_TEXT) {
      freeText = item.getResponse();
      break;
    }
  }

  const responseId = response.getId();
  const timestamp = response.getTimestamp();

  sheet.appendRow([
    responseId,
    timestamp,
    freeText,
    '未処理', // D列: 処理状態の初期値
    '',       // E列: 要約（後段で埋める）
    '',       // F列: カテゴリ（後段で埋める）
    ''        // G列: 感情スコア（後段で埋める）
  ]);
}
```

`setupFormTrigger` を1回実行すると、承認ダイアログが出ます。
Googleアカウントで許可すれば、以降はフォーム送信のたびに自動で行が追加されます。

## 処理状態列がないと何が起きるか

処理状態列を作らず、行数だけで未処理を判断する書き方もできます。
最後に処理した行番号をプロパティに保存しておく方式です。

```javascript
// 壊れる例: 行数だけで未処理を判断する
function processUnhandledRowsBad() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName('回答');
  const lastRow = sheet.getLastRow();
  const props = PropertiesService.getScriptProperties();
  const lastProcessed = Number(props.getProperty('lastRow') || 1);

  for (let row = lastProcessed + 1; row <= lastRow; row++) {
    // ここでGemini呼び出し（省略）
  }

  // 全行を処理し終えた前提で更新する
  props.setProperty('lastRow', String(lastRow));
}
```

一見動きますが、途中の行でGemini呼び出しが失敗すると壊れます。

`lastRow` はループの最後で一括更新しているため、
途中で止まっても更新されず、次回同じ範囲を丸ごと再処理します。

逆に、途中で更新するタイミングを早めると、
今度は失敗した行が「処理済み」扱いになって二度と拾われません。

行数という1つの数値だけで進捗を持つと、
「どこまで終わったか」と「どこで失敗したか」を同時に表現できないのです。

D列の処理状態を使えば、行ごとに独立して状態を持てます。
1行が失敗しても、その行だけ「処理中」のまま残るので、次回改めて拾えます。

```javascript
// 直した例: 行ごとの処理状態で判断する
function processUnhandledRowsGood() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName('回答');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const status = data[i][3]; // D列
    if (status !== '未処理') continue;

    const row = i + 1;
    sheet.getRange(row, 4).setValue('処理中');

    // ここでGemini呼び出し（火曜の記事で扱う）

    sheet.getRange(row, 4).setValue('完了');
  }
}
```

この対比が、その理由です。
入口の設計を1列増やすだけで、後段の処理が二重実行に強くなります。

## つまずきどころ

トリガーの承認は、シートの所有者本人でログインした状態で行う必要があります。
共有アカウントで作業していると、承認ダイアログが出ずに止まって見えることがあります。

もう1つは質問の並び替えです。

フォームの質問を後から並び替えると、`getItemResponses()` が返す配列の順序も変わります。
インデックスで自由記述の列を決めていると、ここで無言で崩れます。

前述のコードでは質問タイプ（`PARAGRAPH_TEXT`）で判定しているため、
並び替えの影響を受けません。

## 今日できること

自分のフォームとシートに対して、`setupFormTrigger` を1回実行してください。

そのあとテスト送信を1件行い、D列に「未処理」が入った行が
自動で追加されるかを確認します。

ここまで確認できれば、Geminiに渡す入口は完成しています。

火曜の記事では、この「未処理」の行を拾ってGeminiに投げるコードを書きます。

---

今週は「アンケート自由記述 自動要約ダッシュボード」というひとつの自動化システムを、
7本に分けて書いています。

- 月: Googleフォームの自由記述を、Geminiが読める形でシートに集める入口設計
- 火: アンケートの自由記述をGeminiで要約・分類する。プロンプトと呼び出しコードの全文
- 水: 二重実行と429エラーを防ぐ。壊れるアンケート集計コードと直したコード
- 木: アンケート結果を、色数と並びの2箇所だけ直して見せられるダッシュボードにする
- 金: アンケート自動集計のトリガーと権限。ネガティブな回答だけSlackに通知する設定
- 土: アンケートダッシュボードの見せ方でつまずいた5箇所。before→afterで直す
- 日: アンケート自由記述 自動要約ダッシュボード完成版一式（有料）
