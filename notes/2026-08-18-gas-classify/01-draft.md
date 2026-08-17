問い合わせフォームの内容を、毎回自分の目で読んで振り分けていませんか。

Gemini API に投げて自動で仕分けさせようとすると、たいてい最初の壁にぶつかります。
思っていない言葉が返ってくることです。

要約なら、多少の言い回しの違いは気になりません。
でも分類は違います。
決めたラベル以外の言葉が返ってきた瞬間、その行は使えなくなります。

この記事では、スプレッドシートのA列に問い合わせ本文を書くと、
B列に分類ラベル、C列に判断理由が入るGASを、コード全文で載せます。
分類プロンプトの全文と、想定外の応答が来たときの逃げ方まで含めます。

---

## 分類は要約と何が違うか

以前、議事録をGemini APIで要約するGASを紹介しました。
要約は出力が自由文なので、多少表現が揺れても実務に支障はありません。

分類はそうはいきません。
「配送について」と書いてほしいのに「配送関連のお問い合わせ」と返ってくると、
後工程のif文やフィルタが引っかからなくなります。

スプレッドシートのB列の値で、後工程を自動で分岐させることがあります。
その場合、ラベルが1文字ズレるだけで仕組み全体が止まります。

要約は「だいたい合っていれば使える」出力でした。
分類は「決めた選択肢のどれかでなければ使えない」出力です。
この違いを埋めるのが、今回のコードの主題です。

分類がズレたときに厄介なのは、エラーにならないことです。
存在しないラベルが1つB列に紛れ込んでも、スプレッドシート自体は正常に動きます。
気づかないまま集計を回すと、後から数字が合わない原因を探す羽目になります。

だからこそ、出力そのものを縛る設計が必要になります。

---

## Geminiに選択肢を守らせる書き方

やり方は次の3つを組み合わせます。

- 分類先のラベルをコードの先頭に配列で固定し、プロンプトにそのまま埋め込む
- 配列の文字列と完全に一致する形で返すよう明示し、言い換えを禁止する
- 応答をJSON形式で強制し、解析できなければ未分類として残す

ラベルを配列にしておくのは、プロンプトと後工程のコードが
同じ配列を参照するようにするためです。
プロンプトの中に選択肢を手で書き写すと、コードを直したときに
プロンプト側の更新を忘れる事故が起きます。

JSON形式を強制するのは、応答をそのまま文字列としてB列に書き込むと、
前置きの一文が混ざることがあるからです。
「承知しました。分類結果は次の通りです」のような一文が入ると、
それだけでB列の値が汚れます。

温度パラメータも0に近づけています。
分類は同じ入力に対して、毎回同じ答えを返してほしい作業だからです。

CATEGORIESの配列は、あえてコードの一番上に置いています。
読者が自分の業務に合わせて差し替えるとき、コードを読み進める前に、
最初の数行を書き換えるだけで済むようにするためです。

差し替えるときの注意が1つあります。
ラベルの粒度をそろえることです。
「不具合報告」と「使い方の質問」のように、性質が離れたものを混ぜるのは構いません。
ただし「不具合報告」と「軽微な不具合」のように意味が重なるラベルを入れると、
Geminiの判定が不安定になります。

---

## コードとプロンプトの全文

スプレッドシートの拡張機能からApps Scriptを開き、そのまま貼ってください。
A列に問い合わせ本文が入っている前提です。

```javascript
/**
 * 問い合わせ分類ツール
 * スプレッドシートのA列を読み、B列に分類ラベル、C列に判断理由を書き込む。
 */

// 分類先のラベル。ここを自分の業務に合わせて差し替える。
const CATEGORIES = [
  '料金について',
  '不具合報告',
  '使い方の質問',
  '解約・退会',
  'その他'
];

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/' +
  GEMINI_MODEL + ':generateContent';

// メニューから実行する
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('問い合わせ分類')
    .addItem('A列を分類する', 'classifyInquiries')
    .addToUi();
}

// メイン処理
function classifyInquiries() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();

  for (let row = 2; row <= lastRow; row++) {
    const text = sheet.getRange(row, 1).getValue();
    const existingLabel = sheet.getRange(row, 2).getValue();

    if (!text || existingLabel) {
      continue; // 空欄、またはすでに分類済みの行はスキップする
    }

    const result = classifyOne(String(text));
    sheet.getRange(row, 2).setValue(result.category);
    sheet.getRange(row, 3).setValue(result.reason);
  }

  SpreadsheetApp.getUi().alert('分類が終わりました。');
}

// 1件分をGeminiに投げて分類する
function classifyOne(text) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。スクリプトプロパティに登録してください。');
  }

  const prompt = buildPrompt(text);

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 256,
      responseMimeType: 'application/json'
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(GEMINI_API_URL + '?key=' + apiKey, options);
  const code = response.getResponseCode();

  if (code !== 200) {
    return { category: '未分類', reason: 'APIエラー(' + code + ')' };
  }

  const json = JSON.parse(response.getContentText());
  const candidate = json.candidates && json.candidates[0];
  const parts = candidate && candidate.content && candidate.content.parts;
  const rawText = parts && parts[0] && parts[0].text;

  if (!rawText) {
    return { category: '未分類', reason: '応答からテキストを取り出せなかった' };
  }

  return parseResult(rawText);
}

// Geminiの応答をJSONとして解釈する。失敗したら未分類にする。
function parseResult(rawText) {
  try {
    const parsed = JSON.parse(rawText);

    if (CATEGORIES.indexOf(parsed.category) === -1) {
      return { category: '未分類', reason: '選択肢外の値: ' + parsed.category };
    }

    return {
      category: parsed.category,
      reason: parsed.reason || ''
    };
  } catch (e) {
    return { category: '未分類', reason: 'JSON解析に失敗: ' + rawText.slice(0, 50) };
  }
}

// プロンプトを組み立てる
function buildPrompt(text) {
  return [
    'あなたは問い合わせ内容を分類する担当者です。',
    '次のテキストを読み、以下のカテゴリの中から最も当てはまるものを1つだけ選んでください。',
    '',
    'カテゴリ:',
    CATEGORIES.map(function(c) { return '- ' + c; }).join('\n'),
    '',
    '出力は次のJSON形式のみとし、他の文章は書かないでください。',
    '{"category": "カテゴリの文字列", "reason": "選んだ理由を1文で"}',
    '',
    'category には、上のカテゴリの文字列のいずれかと完全に一致する値を入れてください。',
    'カテゴリを言い換えたり、新しい言葉を作ったりしないでください。',
    'どれにも当てはまらない場合は、最も近いものを1つ選んでください。',
    '',
    '--- 対象テキスト ---',
    text
  ].join('\n');
}
```

`buildPrompt` が実際に組み立てている指示文です。
対象テキストの部分だけ、A列の内容に差し替わります。

```
あなたは問い合わせ内容を分類する担当者です。
次のテキストを読み、以下のカテゴリの中から最も当てはまるものを1つだけ選んでください。

カテゴリ:
- 料金について
- 不具合報告
- 使い方の質問
- 解約・退会
- その他

出力は次のJSON形式のみとし、他の文章は書かないでください。
{"category": "カテゴリの文字列", "reason": "選んだ理由を1文で"}

category には、上のカテゴリの文字列のいずれかと完全に一致する値を入れてください。
カテゴリを言い換えたり、新しい言葉を作ったりしないでください。
どれにも当てはまらない場合は、最も近いものを1つ選んでください。

--- 対象テキスト ---
（ここにA列のテキストが入る）
```

カテゴリの一覧をそのまま選択肢として渡し、
「完全に一致する値」「言い換えない」と繰り返し縛っています。
Geminiが似た言葉に言い換えてしまう挙動を、手元で何度か見たための対策です。

「どれにも当てはまらない場合は、最も近いものを1つ選んでください」も入れています。
これが無いと、該当なしという理由で選択肢の外の言葉を返すことがあります。

JSONで返らなかったときの扱いにも触れておきます。
`parseResult` は、解析に失敗した行を止めずに「未分類」として先へ進めます。
1件のエラーで処理全体を止めると、後続の行がまとめて分類漏れになるからです。

「未分類」を残すのは、失敗を隠さないためでもあります。
B列に「未分類」という文字列が並べば、どの行が判定できなかったか一目で分かります。
理由はC列に書き込んでいるので、原因を追うときにログを開き直す手間もありません。

---

## 動作条件

初回実行時に、スプレッドシートの読み書きと外部URLへの接続について
承認画面が出ます。求められたスコープを確認してから進めてください。

APIキーはコードに書きません。
スクリプトエディタの「プロジェクトの設定」から、
スクリプトプロパティに `GEMINI_API_KEY` として登録します。

1行の分類につき、Gemini APIの応答を待つ時間がかかります。
数十行程度なら問題になりませんが、数百行を一度に流すと
GASの実行時間の上限に近づきます。
行数が多い場合の分割実行は、別の記事で扱います。

1日あたりのリクエスト数にも上限があります。
Gemini APIの無料枠は、モデルごとに1日に呼び出せる回数が決まっています。
問い合わせの件数がその上限に近い場合は、
Google AI Studioの管理画面で残りの回数を確認してから流してください。

---

## つまずきやすいところ

B列が未分類ばかりになる場合、CATEGORIESの配列と実際の問い合わせの内容が
ズレている可能性があります。配列の中身を見直してください。

JSONの解析に失敗する場合、generationConfigの responseMimeType を
外していないか確認してください。外すと前置き付きの文章で返ることがあります。

同じ内容なのに毎回違うラベルが出る場合、temperatureの値を疑ってください。
0から離れているほど、分類の揺れが大きくなります。

権限の承認画面で止まる場合、自分で書いたスクリプトなので、
詳細を開いて許可を進めれば実行できます。
拒否したまま再実行すると、同じ画面が繰り返し出ます。

一部の行だけ処理されない場合、`classifyInquiries`はB列がすでに埋まっている行を飛ばす仕様です。
既存のラベルを上書きしたいときは、対象行のB列を消してから再実行してください。

---

## 今日できること

手元のスプレッドシートに、実際の問い合わせを3〜5件だけ貼ってみてください。
CATEGORIESの配列を自分の業務に合わせて書き換えるだけで、そのまま動きます。

未分類が多く出るなら、コードの不具合ではありません。
カテゴリの粒度が、本文の内容と合っていないというサインです。

---

分類という作業は、要約より地味に見えて、
選択肢を外から縛る設計力が問われます。

Geminiに賢く判断してもらう発想をやめます。
決めた箱のどれかに入れてもらうと考えるだけで、後工程が扱いやすくなります。
