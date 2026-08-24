同じ回答が2行に増えていた。Gemini APIを呼ぶ処理が、途中で止まったまま動かなくなっていた。

GASでフォームの回答を自動処理する仕組みを組むと、この2つに必ずぶつかります。

直し方はどちらも、数行を足すだけで終わります。今日はこの2つだけを扱います。

## 前提だけ先に

GASでフォームの回答を受け取り、外部APIを呼んで結果をスプレッドシートに書き込む。この形の自動化を組んでいる前提で話を進めます。

題材はアンケートの自由記述要約ですが、Slack通知でもCRM連携でも同じコードで直せます。入口のフォーム設計や、Geminiに投げるプロンプトの中身はこの記事では扱いません。壊れ方と直し方だけに絞ります。

この記事で扱う2つの関数は、どちらもフォーム送信をきっかけに動くonFormSubmitトリガーの中身です。Gemini APIキーはスクリプトプロパティに保存し、コードには直接書いていない前提で進めます。外部リクエストを送るため、初回実行時にはUrlFetchApp向けの承認が必要です。承認画面の細かい話は別の記事に譲ります。

## 壊れ方1: 同じ行を2回処理する

フォームの回答は、同時に2件届くことがあります。締切間際に回答が集中する場面を想像してください。

排他制御のないコードは、こうなります。

```javascript
function onFormSubmit(e) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const lastRow = sheet.getLastRow();
  const status = sheet.getRange(lastRow, 5).getValue();

  if (status === '処理済み') return;

  const summary = callGemini(sheet.getRange(lastRow, 3).getValue());
  sheet.getRange(lastRow, 4).setValue(summary);
  sheet.getRange(lastRow, 5).setValue('処理済み');
}
```

「処理済みかどうかを見てから処理する」という順番自体が穴です。2つの実行が同時に最終行を読むと、両方とも未処理を見た状態でGeminiを呼びます。片方が書き込む前に、もう片方も同じ行を処理してしまいます。

直したコードです。

```javascript
function onFormSubmit(e) {
  const lock = LockService.getScriptLock();

  try {
    const gotLock = lock.tryLock(10000);
    if (!gotLock) {
      console.error('ロック取得に失敗。処理をスキップしました');
      return;
    }

    const sheet = SpreadsheetApp.getActiveSheet();
    const lastRow = sheet.getLastRow();
    const status = sheet.getRange(lastRow, 5).getValue();

    if (status === '処理済み') return;

    const summary = callGemini(sheet.getRange(lastRow, 3).getValue());
    sheet.getRange(lastRow, 4).setValue(summary);
    sheet.getRange(lastRow, 5).setValue('処理済み');

  } finally {
    lock.releaseLock();
  }
}
```

ポイントは3つです。

- tryLock(10000)は、10秒待ってロックが取れなければfalseを返します。例外は投げません
- waitLockは挙動が違います。同じように10秒待って取れないと、今度は例外を投げます。呼び分けを間違えると、tryLockのつもりで書いたコードが想定外の場所で落ちます
- ロックは必ずtry / finallyで囲み、releaseLock()をfinally側に置きます。処理中に例外が出ても、ロックが解放されるようにするためです

LockServiceには3種類あります。

- getScriptLock()は、スクリプト単位で1人だけが実行できるようにします。今回はこれを使います。フォーム送信は誰が出しても同じシートに書き込むためです
- getDocumentLock()は、同じスプレッドシートを開いている人同士の排他制御です。フォームのトリガーには向きません
- getUserLock()は、同じユーザーの実行同士だけをロックします。送信者ごとに別々の処理をさせたいときに使います

今回のように、誰の回答でも同じシートの同じ行を触る処理では、getScriptLock()一択です。

再現させたいときは、同じフォームを2つのタブで開き、ほぼ同時に送信します。ロックが無いコードだと、高い確率で同じ行が2回処理されます。

## 壊れ方2: 429で処理が止まる

Gemini APIには呼び出し回数の上限があります。上限を超えると、429 RESOURCE_EXHAUSTEDが返ってきます。

例外をそのまま投げるコードだと、そこで処理全体が止まります。

```javascript
function callGemini(text) {
  const res = UrlFetchApp.fetch(GEMINI_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(buildPayload(text)),
    headers: { 'x-goog-api-key': API_KEY }
  });

  return JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
}
```

muteHttpExceptionsを指定していないため、ステータスが400番台や500番台だとfetch自体が例外を投げます。1件でも429に当たると、それ以降の行が処理されないまま終わります。

指数バックオフで直したコードです。

```javascript
function callGemini(text, retryCount = 0) {
  const MAX_RETRY = 3;

  const res = UrlFetchApp.fetch(GEMINI_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(buildPayload(text)),
    headers: { 'x-goog-api-key': API_KEY },
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();

  if (code === 200) {
    return JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
  }

  if (code === 400 || code === 403) {
    throw new Error(`リトライしても直らないエラーです: ${code} ${res.getContentText()}`);
  }

  if (code === 429 && retryCount < MAX_RETRY) {
    const waitMs = Math.pow(2, retryCount) * 1000;
    Utilities.sleep(waitMs);
    return callGemini(text, retryCount + 1);
  }

  throw new Error(`リトライ上限に達しました: ${code} ${res.getContentText()}`);
}
```

muteHttpExceptions: trueを渡すと、fetchは429でも500でも例外を投げず、レスポンスをそのまま返します。ステータスコードは自分でgetResponseCode()を見て判定します。

待ち時間は1秒、2秒、4秒と、リトライのたびに倍にしています。Math.pow(2, retryCount) * 1000の1行だけです。

待ち時間を固定のままリトライすると、上限に達している間もほぼ同じ間隔で叩き続けることになります。間隔を毎回2倍にすることで、上限が解除されるまでの時間を稼ぎます。

すべてのエラーをリトライしていいわけではありません。

- 400（リクエストの形式が誤っている）や403（権限がない）は、何回投げても結果が変わりません。即座に諦めて例外を投げます
- 429（呼び出し過多）だけが、時間を置けば直る可能性のあるエラーです

**待ち時間はGASの6分の実行時間制限を確実に消費します。** リトライ回数を増やしすぎると、リトライ自体が原因でタイムアウトすることもあります。分割実行の設計は別の記事で扱っているので、ここでは触れません。

## つまずいたところ

1つ目は、ロックの範囲です。tryLockをシート読み書きの外側に置くと、ロックを取っている時間が必要以上に長くなります。Gemini呼び出しはロックの外に出し、シートへの読み書きだけをロックで囲むほうが安全です。

2つ目は、リトライ回数の上限です。MAX_RETRYを大きくしすぎると、1回のフォーム送信処理が数十秒かかります。私は3回までに決めています。3回を超えて429が続く場合は、リトライではなく時間をおいて手動で再実行する運用にしています。

3つ目は、直したあとの確認方法です。ロックの動作は、開発環境から連続で関数を呼び出すだけでは再現しにくいので、実際にフォームから2件同時に送信して確かめています。

## 今日できること

UrlFetchApp.fetchを呼んでいる箇所を1つ探して、muteHttpExceptions: trueを追加してください。それだけで、次に429が来たときに処理全体が止まらなくなります。

## 締め

排他制御とリトライは、動いているときには気づきません。同時アクセスが起きたときと、APIの上限に当たったときに初めて壊れます。

次はこの仕組みに画面を付けて、他の人が結果を見られる状態にする話です。

## 出典

- LockService: https://developers.google.com/apps-script/reference/lock/lock-service
- Gemini API troubleshooting: https://ai.google.dev/gemini-api/docs/troubleshooting
