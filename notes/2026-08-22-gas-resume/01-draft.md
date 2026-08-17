GASは、実行時間が上限に達すると、途中経過を残さずに強制終了します。

あらかじめ4分30秒で自分から処理を降り、続きを次の実行に渡す設計にすれば、同じ処理を最初からやり直す必要がなくなります。今日はその中断と再開のコードを、全文で載せます。

---

## 150件目で止まったスプレッドシート

以前の記事で、A列の問い合わせ文をGeminiに読ませ、B列に分類ラベル、C列に理由を書き込むGASを紹介しました。

このコードを、実際のデータで試したときの話です。

A列に200件の問い合わせを並べて実行しました。1件ごとにGemini APIを呼ぶため、応答待ちの時間が積み重なります。

しばらく画面を見ていると、B列がどんどん埋まっていきます。ところが150行目あたりで、埋まる速度が急に止まりました。

スクリプトエディタの「実行数」を開くと、ステータスは「失敗」とだけ表示されています。エラーメッセージは特にありません。

GASの1回の実行には、時間の上限があります。無料アカウントでは6分です。200件分の応答待ちを積み上げると、6分をあっさり超えてしまいます。

止まった時点のB列を見ると、150行目までは埋まっていて、151行目以降は空欄のままでした。

ここでもう一度「実行」ボタンを押すと、1行目からやり直すことになります。すでに分類が終わった150件分も、Geminiにもう一度読ませることになります。

API呼び出しの回数だけが無駄に増えていきます。

---

## 4分30秒で自分から降りる

対処の方向は、時間切れになる前に自分から処理を止め、続きを次の実行に引き継ぐことです。

GASの上限は6分ですが、ぴったり6分を狙うと危険です。Geminiの応答が想定より遅れたときに、区切りの前に強制終了してしまう可能性が残るからです。

そこで今回のコードでは、4分30秒を区切りにしています。余裕を持たせて、確実に自分の判断で降りられるようにする狙いです。

4分30秒が過ぎた時点で、次に処理するはずだった行番号を保存します。保存先はPropertiesServiceです。

PropertiesServiceは、スクリプトの実行が終わっても値が消えない保存領域です。次に関数が呼ばれたときも、前回保存した値をそのまま読み出せます。

行番号を保存したら、その場で1分後に自分自身を呼び出す時間主導トリガーを設置し、処理を終えます。

1分後、そのトリガーが新しい実行を始めます。新しい実行は、保存しておいた行番号を読み込み、そこから続きを処理します。

すべての行を処理し終えたら、保存していた行番号を消します。そして、自分で設置したトリガーも自分で削除します。

トリガーを消し忘れると、全件が終わったあとも1分ごとに空振りの実行が続くことになります。

---

## コード全文

以前の記事で紹介した分類処理を、この中断と再開の仕組みで包んだ形が次のコードです。

スプレッドシートの1行目は見出し行として扱います。2行目以降のA列に問い合わせ文、B列に分類ラベル、C列に判断理由が入る前提です。

```javascript
/**
 * 問い合わせ分類ジョブ(中断・再開つき)
 * 4分30秒で自分から降り、1分後のトリガーで続きから再開する。
 */

const TIME_LIMIT_MS = 4.5 * 60 * 1000; // 4分30秒
const RESUME_DELAY_MS = 60 * 1000;     // 1分後
const PROP_KEY_ROW = 'CLASSIFY_LAST_ROW';
const PROP_KEY_TRIGGER = 'CLASSIFY_TRIGGER_ID';
const SHEET_NAME = 'inquiries';
const LABELS = ['料金', '不具合', '使い方', 'その他'];

// 起点になる関数。手動実行でもトリガーからでも同じ関数を呼ぶ。
function runClassifyJob() {
  const startTime = Date.now();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const props = PropertiesService.getScriptProperties();

  let row = Number(props.getProperty(PROP_KEY_ROW)) || 2; // 1行目は見出し

  while (row <= lastRow) {
    if (Date.now() - startTime > TIME_LIMIT_MS) {
      props.setProperty(PROP_KEY_ROW, String(row));
      scheduleResume();
      return;
    }

    const text = sheet.getRange(row, 1).getValue();

    if (text === '') {
      row++;
      continue;
    }

    try {
      const result = classifyOne(text);
      sheet.getRange(row, 2).setValue(result.label);
      sheet.getRange(row, 3).setValue(result.reason);
    } catch (e) {
      sheet.getRange(row, 2).setValue('失敗');
      sheet.getRange(row, 3).setValue('スキップ: ' + e.message);
    }

    row++;
  }

  // 全件終わったので、保存値とトリガーを片付ける
  props.deleteProperty(PROP_KEY_ROW);
  clearResumeTrigger();
}

// 1分後に自分自身を呼ぶトリガーを設置する
function scheduleResume() {
  clearResumeTrigger(); // 二重登録を防ぐ

  const trigger = ScriptApp.newTrigger('runClassifyJob')
    .timeBased()
    .after(RESUME_DELAY_MS)
    .create();

  PropertiesService.getScriptProperties()
    .setProperty(PROP_KEY_TRIGGER, trigger.getUniqueId());
}

// 自分が設置したトリガーだけを、IDで特定して消す
function clearResumeTrigger() {
  const props = PropertiesService.getScriptProperties();
  const triggerId = props.getProperty(PROP_KEY_TRIGGER);

  if (!triggerId) return;

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(t);
    }
  });

  props.deleteProperty(PROP_KEY_TRIGGER);
}

// A列のテキストをGeminiに投げ、ラベルと理由を受け取る
function classifyOne(text) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + 'gemini-2.0-flash:generateContent?key=' + apiKey;

  const prompt = [
    '次の問い合わせ文を読み、以下のラベルから1つだけ選んでください。',
    'ラベル: ' + LABELS.join(' / '),
    '出力は必ず次のJSON形式のみとし、それ以外の文字を含めないでください。',
    '{"label": "選んだラベル", "reason": "選んだ理由を一文で"}',
    '',
    '--- 問い合わせ文 ---',
    text
  ].join('\n');

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 256 }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const json = JSON.parse(response.getContentText());
  const raw = json.candidates[0].content.parts[0].text;

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());

    if (LABELS.indexOf(parsed.label) === -1) {
      return { label: '未分類', reason: '想定外のラベル: ' + parsed.label };
    }

    return parsed;
  } catch (e) {
    return { label: '未分類', reason: 'JSON解析に失敗' };
  }
}
```

`runClassifyJob`が起点になる関数です。手動で実行しても、トリガーから呼ばれても、まったく同じ関数がそのまま動きます。

経過時間が4分30秒を超えたら、その時点の行番号を保存して`scheduleResume`を呼び、処理を終えます。

`scheduleResume`は、前回自分が設置したトリガーが残っていれば先に消します。そのうえで、1分後のトリガーを新しく作ります。

`classifyOne`の中でエラーが起きた行は、B列に「失敗」、C列にエラー内容を書き込んで次の行に進みます。1件の失敗で全体を止めない設計です。

---

## 動作条件

このコードはスプレッドシートのスクリプトエディタに貼って使う前提です。

Gemini APIキーは、スクリプトプロパティに`GEMINI_API_KEY`として登録しておく必要があります。プロパティの登録手順は以前の記事で紹介したものと同じです。

初回実行時には、外部URLへの接続とスプレッドシートの読み書きについて、承認画面が出ます。求められたスコープを確認してから進めてください。

時間主導トリガーの作成には上限があります。1つのスクリプトが持てるトリガーの数には上限があるため、`clearResumeTrigger`で毎回片付けておくことが重要です。

実行時間の上限そのものは、6分から縮まりません。今回のコードは、その上限に触れる前に自分から処理を止める設計にしています。

---

## つまずきやすいところ

**トリガーを消し忘れると増殖する**

`clearResumeTrigger`を呼ばずに`scheduleResume`だけを繰り返すと増殖します。1分ごとのトリガーが、実行のたびに1個ずつ増える形です。

増えたトリガーはそれぞれが同じ関数を呼びます。複数のトリガーが同時に同じ行を処理しようとして、書き込みが競合することがあります。

今回のコードでは、トリガーのIDをPropertiesServiceに保存しています。次にトリガーを設置する前に、そのIDのトリガーだけを探して消す仕組みです。

GASのトリガー一覧には、他の関数のトリガーも並ぶことがあります。名前ではなくIDで狙い撃ちしているのは、そのためです。

**JSONの形式が崩れて返ってくることがある**

Geminiの応答が、指定したJSON形式から外れることがあります。コードマークダウンで囲んで返してくることもあれば、前置きの文章を付けて返してくることもあります。

`classifyOne`では、コードマークダウンの記号だけを取り除いてから`JSON.parse`を試しています。それでも解析に失敗した場合は、ラベルを「未分類」として記録し、処理は止めずに次の行へ進みます。

**行番号が2から始まる理由**

1行目を見出し行として扱っているため、初期値を2にしています。

見出し行を使わないスプレッドシートで流用する場合は、この初期値を1に変えてください。

**6分制限を回避するライブラリという選択肢もある**

6分の制限そのものを別のプロジェクトに逃がすライブラリも存在します。今回は、外部ライブラリに依存せず、標準機能だけで完結する形を選びました。

---

## 今日できること

手元のスプレッドシートに、A列だけ埋めたテスト用のシートを10行ほど作ってみてください。

`TIME_LIMIT_MS`を4.5分ではなく10秒に変えてみてください。`runClassifyJob`を1回実行すると、途中で処理が止まります。1分後には自動で続きから再開する様子を、待たずに確認できます。

シート名は`SHEET_NAME`の値をテスト用シートの名前に合わせてください。

---

6分の壁は、回避するものではありません。先に降りて、次の実行に渡す前提で設計するものです。

処理を止める判断を自分のコード側に持たせておけば、行数がどれだけ増えても、同じ形のまま動き続けます。
