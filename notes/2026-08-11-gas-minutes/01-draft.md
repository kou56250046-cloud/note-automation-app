会議の議事録は、書いた瞬間がいちばん熱量が高い。

その熱量のまま「決定事項」「タスク」「次回への申し送り」まで整理できれば理想です。
でも現実は、議事録を貼って終わり。
誰が何をいつまでにやるのか、ドキュメントの中に埋もれたままになります。

この記事では、Googleドキュメントに書いた議事録を、Gemini APIで要約して
ドキュメントの先頭に自動で挿入する GAS（Google Apps Script）を紹介します。

コピーして貼るだけで動くコードと、要約に使っているプロンプトを、全文載せます。

---

## 議事録は「あとで整理する」が実現しない

議事録が読み返されない理由は、書き手の能力ではありません。
構造の問題です。

会議中に書けるのは、発言をそのまま並べた生のテキストです。
決定事項とタスクを仕分ける余力は、会議の場では出てきません。

そして会議が終わると、次の予定がすぐに来ます。
「あとで整理する」の「あとで」は、たいてい来ません。

結果として、議事録は検索されるだけの死んだテキストになります。
「あの会議、何が決まったんだっけ」と聞かれるたびに、
本文を頭から読み返す作業が発生します。

ここを自動化すれば、書いた直後に整理された形が手に入ります。
人が読み返す部分を、要約だけに縮められます。

---

## 何を作るか

Googleドキュメントを開いた状態でメニューから実行すると、
本文を丸ごとGemini APIに渡し、返ってきた要約をドキュメントの先頭に挿入します。

要約の中身は次の4項目に固定しています。

- 決定事項
- 未決事項
- タスク（誰が・何を・いつまでに）
- 次回への申し送り

汎用の要約ツールにはしていません。
議事録という1つの用途に絞ることで、プロンプトの指示を具体的にできます。
「良い感じに要約して」ではなく、出したい形をこちらから決めています。

4項目を固定にしているのにも理由があります。
自由記述で要約させると、会議の雰囲気や参加者の発言態度など、
本来は不要な情報まで拾ってしまうことがあります。

決定事項・未決事項・タスク・申し送りの4つに絞ると、
出力を読む側が毎回同じ順番で確認できます。
フォーマットが揺れないことも、自動化の価値の一部です。

---

## コード全文

Googleドキュメントのスクリプトエディタ（拡張機能 → Apps Script）に、
そのまま貼ってください。

```javascript
/**
 * 議事録要約ツール
 * Googleドキュメントの本文をGemini APIで要約し、先頭に挿入する。
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/' +
  GEMINI_MODEL + ':generateContent';

// ドキュメントを開いたときにメニューを追加する
function onOpen() {
  DocumentApp.getUi()
    .createMenu('議事録要約')
    .addItem('この議事録を要約する', 'summarizeMinutes')
    .addToUi();
}

// メイン処理
function summarizeMinutes() {
  const doc = DocumentApp.getActiveDocument();
  const body = doc.getBody();
  const text = body.getText();

  if (text.length < 50) {
    DocumentApp.getUi().alert('本文が短すぎます。議事録を貼ってから実行してください。');
    return;
  }

  const summary = callGemini(text);
  insertSummary(body, summary);

  DocumentApp.getUi().alert('要約をドキュメント先頭に挿入しました。');
}

// Gemini APIを呼び出す
function callGemini(minutesText) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY が設定されていません。スクリプトプロパティに登録してください。');
  }

  const prompt = buildPrompt(minutesText);

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024
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
  const json = JSON.parse(response.getContentText());

  if (code !== 200) {
    const message = json.error ? json.error.message : response.getContentText();
    throw new Error('Gemini API エラー(' + code + '): ' + message);
  }

  const candidate = json.candidates && json.candidates[0];
  const parts = candidate && candidate.content && candidate.content.parts;

  if (!parts || !parts[0] || !parts[0].text) {
    throw new Error('Gemini の応答から要約テキストを取り出せませんでした。');
  }

  return parts[0].text;
}

// プロンプトを組み立てる
function buildPrompt(minutesText) {
  return [
    'あなたは会議の議事録を要約する担当者です。',
    '次の議事録を読み、以下の4項目に分けて日本語で出力してください。',
    '',
    '# 決定事項',
    '会議で決まったことを箇条書きで。決まっていなければ「なし」と書く。',
    '',
    '# 未決事項',
    '持ち越しになった論点を箇条書きで。',
    '',
    '# タスク',
    '担当者と期限が分かる場合はセットで書く。「誰が・何を・いつまでに」の形式。',
    '担当者や期限が本文に無い場合は、その旨を書く（推測で補わない）。',
    '',
    '# 次回への申し送り',
    '次回の会議で確認すべきことを箇条書きで。',
    '',
    '出力は上記の見出しとMarkdownの箇条書きのみとし、前置きや締めの挨拶は書かないでください。',
    '本文に書かれていないことは推測で補わないでください。',
    '',
    '--- 議事録本文 ---',
    minutesText
  ].join('\n');
}

// ドキュメントの先頭に要約を挿入する
function insertSummary(body, summaryText) {
  const heading = '【AI要約 ' + formatDate(new Date()) + '】';
  body.insertParagraph(0, '');
  body.insertParagraph(0, summaryText);
  body.insertParagraph(0, heading).setHeading(DocumentApp.ParagraphHeading.HEADING2);
}

function formatDate(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}
```

---

## プロンプト全文（構造だけを取り出したもの）

上のコードの `buildPrompt` が実際に組み立てている指示文は、次の形になります。
議事録本文の部分だけ、貼り付けた文書に差し替わります。

```
あなたは会議の議事録を要約する担当者です。
次の議事録を読み、以下の4項目に分けて日本語で出力してください。

# 決定事項
会議で決まったことを箇条書きで。決まっていなければ「なし」と書く。

# 未決事項
持ち越しになった論点を箇条書きで。

# タスク
担当者と期限が分かる場合はセットで書く。「誰が・何を・いつまでに」の形式。
担当者や期限が本文に無い場合は、その旨を書く(推測で補わない)。

# 次回への申し送り
次回の会議で確認すべきことを箇条書きで。

出力は上記の見出しとMarkdownの箇条書きのみとし、前置きや締めの挨拶は書かないでください。
本文に書かれていないことは推測で補わないでください。

--- 議事録本文 ---
（ここに議事録の本文が入る）
```

「推測で補わないでください」を2回入れているのは意図的です。
議事録の要約は、無い発言を足すと事故になります。
Geminiは指示が弱いと、文脈から自然に見える内容を補ってしまうことがあるため、
禁止を繰り返して抑えています。

---

## 動作条件

**トリガー**

`onOpen` は単純トリガーで、ドキュメントを開くと自動実行され、
メニューを追加するだけの役割です。

Gemini APIを呼ぶ `summarizeMinutes` は、メニューをクリックしたときだけ動きます。
単純トリガーの中で外部通信をすると制限に引っかかるため、この分離が必要です。

**権限**

初回実行時に、Googleの承認画面が出ます。
このスクリプトが要求するのは、ドキュメントの読み書きと、外部URLへの接続です。
求められたスコープを確認してから承認してください。

**APIキーの置き場所**

コードにキーを直接書きません。
スクリプトエディタの「プロジェクトの設定」から「スクリプト プロパティ」を開き、
`GEMINI_API_KEY` という名前で登録します。

こうしておくと、コードを他人に共有してもキーは漏れません。

**実行時間の制限**

GASの1回の実行には時間の上限があります。
議事録が数万字を超えるような長さになると、Gemini側のトークン上限や
応答時間の影響で失敗しやすくなります。

長時間の会議を1本の議事録にまとめて流す運用より、
議題ごとにドキュメントを分けて実行するほうが安定します。

**モデルと利用枠**

コードでは `gemini-2.0-flash` を指定しています。
要約は複雑な推論を必要としない作業なので、速く安いモデルで十分です。

Gemini APIには無料で使える利用枠がありますが、
1日あたりのリクエスト数に上限があります。
何度も実行する運用では、上限に近づいていないかを
Google AI Studio の管理画面で確認してください。

---

## つまずきやすいところ

**「承認が必要です」で止まる**

初回はGoogleの確認画面が出ます。
自分のスクリプトなので、詳細を開いて許可を進めれば実行できます。

**「GEMINI_API_KEY が設定されていません」と出る**

スクリプトプロパティへの登録を忘れているか、キー名の綴りが違います。
`GEMINI_API_KEY` の大文字・小文字まで一致させてください。

**要約が返ってこない**

`callGemini` はAPIのエラーメッセージをそのまま例外に含めています。
実行ログ（表示 → 実行数）を開くと、APIキーの権限不足なのか、
リクエスト形式の問題なのかが本文に出ます。

**要約の中身が薄い**

議事録本文がそもそも発言の羅列だけで、決定事項が明記されていない場合、
Geminiは「なし」と正直に返します。
これはバグではなく、プロンプトの「推測で補わない」が効いている状態です。

**要約の途中で応答が切れる**

`maxOutputTokens` を1024に設定しています。
議事録が1万字を超えるような場合、この上限に収まらず要約が途中で切れることがあります。

その場合は数値を増やすか、議事録を議題ごとに分けて
複数回に分けて実行する方法で対応してください。

---

## 今日できること

このコードをコピーして、自分のGoogleドキュメントの
スクリプトエディタに貼ってみてください。

Gemini APIキーは Google AI Studio で発行できます。
発行したら、スクリプトプロパティに `GEMINI_API_KEY` として登録し、
ドキュメントを開き直してメニューから実行するだけです。

過去の議事録が1つ手元にあれば、5分あれば動作を確認できます。

1回目の実行では、要約の見出しがすでに項目名として決め打ちされているので、
自分の会議のスタイルに合わせて `buildPrompt` の中身を調整してみてください。
「担当者」を「アサイン先」に変える程度の書き換えでも、
チームで使う言葉に馴染みます。

---

議事録の要約は、AIに向いている作業の中でも特に相性がよい領域です。
形式が決まっていて、事実だけを抜き出せばよく、創造性を求められません。

だからこそ、プロンプトで「推測で補わない」ときつく縛るほうが、
実務では使いやすい要約になります。

今回のコードは議事録専用に絞っています。
スプレッドシートに議事録が溜まっている場合は、
`DocumentApp` の部分を `SpreadsheetApp` に置き換える発想で応用できますが、
それは別の記事で扱います。
