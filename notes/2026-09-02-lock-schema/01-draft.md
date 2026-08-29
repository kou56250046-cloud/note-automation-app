Geminiに投げた自由記述の返事が、曜日のキーを1つ抜かした形で返ってきても、GASは何も文句を言いません。

JSON.parseは文字列として正しいかどうかしか見ていません。キーが足りなくても、booleanのはずが文字列でも、そのまま通ります。

落ちてくれるならまだ気づけます。落ちずに次の工程へ流れると、壊れたことに誰も気づけません。

今日はこの壊れ方と、フォーム送信が重なったときに同じ行を二重に処理してしまう壊れ方、この2つを直したコードで見せます。

## 前提

日程調整フォームの回答を、Geminiで曜日×時間帯のboolean一覧に変換する仕組みを組んでいるとします。

自由記述の「都合」欄をGeminiに読ませて、月〜金×午前/午後/夜の空き状況をtrue/falseで受け取り、シートに書き込みます。

シートの列構成やGeminiへの投げ方そのものは、この記事より前の工程で扱った内容です。ここでは壊れ方と直し方だけを扱います。

## 壊れ方1: 同時送信で同じ行を二重に処理する

締切間際になると、フォームの回答が数十秒の間に何件も届きます。

未処理の行をまとめて処理する関数を、こう書いていたとします。

```javascript
function processPendingRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows = sheet.getDataRange().getValues();

  rows.forEach((row, i) => {
    if (i === 0) return;
    if (row[3] !== 'pending') return;

    const obj = extractAvailability(row[2]);
    const rowNumber = i + 1;

    sheet.getRange(rowNumber, 5).setValue(JSON.stringify(obj));
    sheet.getRange(rowNumber, 4).setValue('done');
    sheet.getRange(rowNumber, 6).setValue(new Date());
  });
}
```

フォーム送信のたびにこの関数を呼ぶ設計だと、2件がほぼ同時に届いたとき、2つの実行が同時に立ち上がります。

両方とも同じタイミングでシートを読み込むので、どちらの実行も同じ「pending」の行を見つけます。片方が処理を終えて「done」に書き換える前に、もう片方も同じ行をGeminiに投げてしまいます。同じ行にGemini呼び出しが2回走り、後から書き込んだほうの結果だけが残ります。

直したコードです。

```javascript
function processPendingRows() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(LOCK_WAIT_MS)) {
    console.warn('他の実行が処理中のため、今回はスキップしました');
    return;
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const rows = sheet.getDataRange().getValues();

    rows.forEach((row, i) => {
      if (i === 0) return;
      if (row[3] !== 'pending') return;

      const rowNumber = i + 1;
      const result = extractWithRetry_(row[2]);

      if (result.ok) {
        sheet.getRange(rowNumber, 5).setValue(JSON.stringify(result.data));
        sheet.getRange(rowNumber, 4).setValue('done');
      } else {
        sheet.getRange(rowNumber, 4).setValue('error');
      }
      sheet.getRange(rowNumber, 6).setValue(new Date());
    });
  } finally {
    lock.releaseLock();
  }
}
```

getScriptLock()は、スクリプト全体で実行を1つに絞ります。

先に処理を始めた実行がロックを持っている間、後から来た実行はtryLock(LOCK_WAIT_MS)で最大30秒待ちます。30秒たっても空かなければfalseが返るだけで、例外は出ません。そのときは今回の実行を諦めて、次のトリガーに任せます。

ロックを関数全体に掛けている点が、1行だけを守るロックとは違います。処理対象が複数行のまとめ処理になったので、1行分のロックでは足りません。

## 壊れ方2: Geminiが期待した形で返さない

こちらは例外が出ないぶん、気づくのが遅れます。

Geminiに「月〜金×午前/午後/夜のboolean」を返すよう頼んでも、自由記述の書き方によっては期待通りに埋まりません。木曜のキーが丸ごと抜けていたり、booleanのはずが文字列の"true"で返ってきたりします。土曜日(sat)のような、こちらが定義していない曜日を勝手に足してくることもあります。

検証をしないコードです。

```javascript
function extractAvailability(freeText) {
  const prompt = buildPrompt_(freeText);
  const res = UrlFetchApp.fetch(GEMINI_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(buildPayload_(prompt)),
    headers: { 'x-goog-api-key': API_KEY }
  });

  const text = JSON.parse(res.getContentText())
    .candidates[0].content.parts[0].text;

  return JSON.parse(text);
}
```

このコードは、Geminiが木曜(thu)のキーを丸ごと落として返してきても、そのまま素通しします。

JSON.parse(text)は文字列としては正しいJSONを読んでいるだけです。キーが足りないことにも、booleanが文字列になっていることにも気づきません。obj.thu.amは単にundefinedになり、その先の集計処理でfalsy扱いされます。画面には「木曜は空いていない」と表示されますが、本当は「聞けていない」だけです。

このE列は、全員の空き枠を数える集計処理が読みに行きます。形が崩れたまま渡ると、集計そのものが実際とは違う結果を返します。

直したコードです。

```javascript
function validateAvailability_(obj) {
  const problems = [];

  if (!obj || typeof obj !== 'object') {
    return ['レスポンス全体がオブジェクトの形になっていません'];
  }

  Object.keys(obj).forEach(key => {
    if (!DAYS.includes(key)) {
      problems.push(`存在しないキーがあります: ${key}`);
    }
  });

  DAYS.forEach(day => {
    const slots = obj[day];
    if (!slots || typeof slots !== 'object') {
      problems.push(`${day} キーがありません`);
      return;
    }
    SLOTS.forEach(slot => {
      if (typeof slots[slot] !== 'boolean') {
        problems.push(`${day}.${slot} がbooleanではありません（値: ${JSON.stringify(slots[slot])}）`);
      }
    });
  });

  return problems;
}

function extractAvailability(freeText, problems) {
  const prompt = buildPrompt_(freeText, problems);
  const res = UrlFetchApp.fetch(GEMINI_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(buildPayload_(prompt)),
    headers: { 'x-goog-api-key': API_KEY }
  });

  const text = JSON.parse(res.getContentText())
    .candidates[0].content.parts[0].text;

  return JSON.parse(text);
}

function extractWithRetry_(freeText) {
  let problems = [];

  for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
    const obj = extractAvailability(freeText, problems);
    problems = validateAvailability_(obj);

    if (problems.length === 0) {
      return { ok: true, data: obj };
    }
  }

  return { ok: false, data: null };
}
```

buildPrompt_も、2回目以降は前回の不備を足すように変えています。

```javascript
function buildPrompt_(freeText, problems) {
  let prompt = `次の自由記述から、月〜金×午前/午後/夜の空き状況をJSONで返してください。\n自由記述: ${freeText}`;

  if (problems && problems.length > 0) {
    prompt += `\n\n前回の出力には次の不備がありました。直してください。\n- ${problems.join('\n- ')}`;
  }

  return prompt;
}
```

このリトライは、待ち時間を伸ばして再送する形にしていません。

呼び出し過多のエラーとは違い、形式崩れは時間を置いても直りません。Geminiに「どこが足りなかったか」を具体的に伝えて、もう一度読ませるほうが効きます。

MAX_RETRYは3回です。3回試しても形が揃わなければ、extractWithRetry_はok: falseを返し、processPendingRowsはD列を「error」にして処理を止めます。ここで無理にデータを埋めません。errorのまま残すことで、その行は「空いていない」ではなく「まだ聞けていない」だと後から区別できます。

## つまずいたところ

ロックを掛ける範囲を関数全体にしたので、行数が増えるとロックを持っている時間も伸びます。全員が待たされる時間が長くなるので、1回のprocessPendingRowsで処理する行数に上限を設けることも検討する余地があります。

もう1つは、MAX_RETRYを増やしても直らない自由記述があることです。「平日はだいたい空いてます」のような書き方は、Geminiが5曜日分を律儀に埋めようとして、逆に形を崩しやすくなります。3回で見切りをつけて人に回す設計にしているのは、リトライ回数を増やしても解決しないケースがあるからです。

3つ目は、validateAvailability_が形だけを見ている点です。曜日と時間帯がすべてbooleanで埋まっていても、内容が自由記述の意味と食い違っていることはあります。そこは形式チェックの外側の話なので、この記事では扱いません。

## 動作条件

processPendingRowsは、onFormSubmitから直接呼ぶ形でも、数分おきの時間主導トリガーで回す形でも動きます。両方を併用すると同時実行が起きやすくなるので、LockServiceが要る理由はここにあります。

UrlFetchAppで外部にリクエストを送るため、初回実行時に承認の画面が出ます。GEMINI_API_KEYはスクリプトプロパティに保存し、コードには書きません。

tryLock(LOCK_WAIT_MS)は30秒待って取れなければfalseを返すだけで、例外は出ません。

## 残る手作業

D列が「error」のまま残った行は、自動では埋まりません。締切前に幹事がその行を見て、本人に直接都合を聞き直す作業が残ります。ここは自動化していません。

## 今日できること

Geminiの結果をJSON.parseした直後に、次の1行を足してください。

```javascript
const isValid = DAYS.every(day =>
  obj[day] && SLOTS.every(slot => typeof obj[day][slot] === 'boolean')
);
```

isValidがfalseのときにログを残すだけでも、壊れたデータがそのままヒートマップに流れる事故を防げます。

## 締め

この検証を通ったデータだけが、次の工程であるヒートマップ画面に渡ります。壊れたまま流さないことが、他の人に渡せる仕組みの最低条件です。

## 出典

- LockService: https://developers.google.com/apps-script/reference/lock/lock-service
- Gemini structured output: https://ai.google.dev/gemini-api/docs/structured-output
