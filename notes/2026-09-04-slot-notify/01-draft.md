締切の時刻がきたら、そこで初めて全員の空き状況を突き合わせます。

回答が来るたびに通知を出すと、締切前に何度も同じ内容がSlackに流れます。これを避けるため、通知の起点を「回答」ではなく「締切時刻」に置きます。時間主導トリガーを1つ、締切の日時に合わせて仕込むだけです。

## 回答のたびに鳴らすと、通知が中間報告で埋まる

回答が届くたびに通知する設計にすると、こんな流れになります。

月曜に3件、火曜に5件、水曜に2件。回答が来るたびにSlackが鳴り、内容はそのつど「まだ全員揃っていません」という中間報告です。

チャンネルに並ぶのは、どれも「まだ全員揃っていません」という同じ趣旨の投稿です。締切前に何度流しても、受け取った側が取れる行動は変わりません。

意味のある通知は、締切が来て、全員の回答が出そろった瞬間の1回だけです。それ以外は雑音になります。

## この記事の前提

このシステムでは、フォームの自由記述をGeminiが読みます。

曜日と時間帯ごとの空き状況を、true/falseのJSONにして`responses`シートのE列に書き込む形にしています。

D列の「処理状態」が`done`になっている行だけが、集計の対象です。

この記事では、そのE列がすでに埋まっている状態から、締切時刻の通知までを扱います。

## 締切時刻に1回だけ走るトリガーを作る

GASのトリガーには、フォーム送信のたびに動くイベント型と、決めた時刻に動く時間主導型があります。

日程調整の締切通知には、時間主導型を使います。回答のたびに動かす理由がないからです。

トリガー画面からの設定手順は次の通りです。

1. スクリプトエディタで時計アイコンの「トリガー」を開く
2. 「トリガーを追加」を押す
3. 実行する関数に`checkDeadlineAndNotify`を選ぶ
4. イベントのソースで「時間主導型」を選ぶ
5. 時間ベースのトリガーの種類で「特定の日付と時刻」を選ぶ
6. 締切の日付と時刻を指定して保存する

締切のたびに画面から設定し直すのは手間なので、コードから登録する形も用意しておきます。

```javascript
// 締切の日時を指定してトリガーを1つ登録する
function scheduleDeadlineNotification(deadlineDate) {
  ScriptApp.newTrigger('checkDeadlineAndNotify')
    .timeBased()
    .at(deadlineDate)
    .create();
}
```

`deadlineDate`にDateオブジェクトを渡して実行すると、その日時だけに動くトリガーが1つ登録されます。

一度実行が終わると、このトリガーは自動で削除されます。次の締切には、また新しい日時で登録し直します。

## 誰の権限で動くか

このトリガーは、登録した人のアカウント権限で動きます。共有した相手が見ているシートの上で動くわけではありません。

幹事が異動や退職でアカウントを使えなくなると、トリガーは静かに止まります。エラー通知も出ません。

シートも通知チャンネルも見た目は変わらないので、止まったこと自体に気づきにくいという点が厄介です。

他人にこの仕組みを渡すときは、権限の引き継ぎを先に決めておきます。次の幹事が自分のアカウントで`scheduleDeadlineNotification`を実行し直す形です。

## 全員が空いている枠を探す

締切が来たら、`findCommonSlots()`が`responses`シートを読み、全員が空いている枠を探します。

考え方はこうです。D列が`done`の行だけを対象にし、その人数を母数にします。曜日と時間帯の組み合わせごとに、空いている人数を数えます。

母数と同じ人数が空いていれば、そこは全員一致の枠です。

ここで壊れやすい書き方があります。

```javascript
// 壊れる例:1行でも壊れたJSONがあると、関数全体が止まる
function findCommonSlots() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  var availabilityList = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][3] !== 'done') continue;
    availabilityList.push(JSON.parse(data[i][4]));
  }
  // ここから先の集計処理
}
```

Geminiの出力が想定外の形（末尾が途中で切れているなど）で1行でも入ると、`JSON.parse`が例外を投げます。

例外はキャッチされないので、その1行のために全員分の集計が止まります。1行の不備が全体を止めない形に直します。

```javascript
function findCommonSlots() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  var data = sheet.getDataRange().getValues();

  var names = [];
  var availabilityList = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][3] !== 'done') continue;

    try {
      var availability = JSON.parse(data[i][4]);
      names.push(data[i][1]);
      availabilityList.push(availability);
    } catch (e) {
      Logger.log('E列のJSONが壊れています。行: ' + (i + 1));
      continue;
    }
  }

  var totalCount = names.length;
  if (totalCount === 0) {
    return { text: '集計対象の回答がまだありません。' };
  }

  var commonSlots = [];
  var counts = {};

  DAYS.forEach(function (day) {
    SLOTS.forEach(function (slot) {
      var key = day + '-' + slot;
      var freeCount = 0;

      for (var j = 0; j < availabilityList.length; j++) {
        var a = availabilityList[j];
        if (a[day] && a[day][slot] === true) {
          freeCount++;
        }
      }

      counts[key] = freeCount;
      if (freeCount === totalCount) {
        commonSlots.push({ day: day, slot: slot });
      }
    });
  });

  if (commonSlots.length > 0) {
    var lines = commonSlots.map(function (s) {
      return DAY_LABELS[s.day] + '曜' + SLOT_LABELS[s.slot];
    });
    return {
      text: '全員が空いている枠が見つかりました\n' + lines.join('\n') +
        '\n（回答者 ' + totalCount + '名で集計）'
    };
  }

  var bestKey = null;
  var bestCount = -1;

  Object.keys(counts).forEach(function (key) {
    if (counts[key] > bestCount) {
      bestCount = counts[key];
      bestKey = key;
    }
  });

  if (bestCount === 0) {
    return {
      text: '全員が一致する枠はありませんでした\n' +
        '回答 ' + totalCount + '名のうち、空いていると答えた人がいる枠が1つもありません\n' +
        '候補の曜日か時間帯を広げて、もう一度聞き直してください'
    };
  }

  var bestDay = bestKey.split('-')[0];
  var bestSlot = bestKey.split('-')[1];

  var absentNames = [];
  for (var k = 0; k < availabilityList.length; k++) {
    var av = availabilityList[k];
    if (!av[bestDay] || av[bestDay][bestSlot] !== true) {
      absentNames.push(names[k]);
    }
  }

  return {
    text: '全員が一致する枠はありませんでした\n' +
      '最も多くの人が空いているのは ' + DAY_LABELS[bestDay] + '曜' + SLOT_LABELS[bestSlot] +
      '（' + bestCount + '/' + totalCount + '名）\n' +
      '空いていない人: ' + absentNames.join('、')
  };
}
```

壊れたJSONの行は`Logger.log`に記録してスキップするだけにしています。落とすのはその1行だけで、他の回答者の集計は止まりません。

曜日のキーそのものが欠けている場合にも備えて、`a[day] && a[day][slot]` の形で参照しています。E列は手で書き換えられる場所なので、キーがある前提で読むと通知の処理ごと落ちます。

`bestCount` が0のときは別の文面を返します。全員が全枠を不可と答えた状態で「最も多くの人が空いているのは月曜午前（0名）」と送っても、受け取った側は動けません。候補の範囲を広げて聞き直す、という次の行動を書きます。

## 全員一致がないとき、何を通知するか

日程調整では、全員が空いている枠がそのまま見つかるとは限りません。

ここで「見つかりませんでした」だけを送ると、通知を受け取った幹事は結局シートを開いて手で見比べることになります。仕組みを作った意味が半分になります。

このシステムでは、一致がなかったときに2つの情報をセットで返します。

- 最も多くの人が空いている枠と、その人数
- その枠で空いていない人の名前

幹事は「あと誰に個別で聞けばいいか」がその場で分かります。全員に再調整を依頼しなくても、1人か2人に声をかけるだけで済む場合があるからです。

## Slackへ送る

`findCommonSlots()`が返した文字列を、そのままIncoming WebhookにPOSTします。

Webhook URLはコードに直書きせず、スクリプトプロパティに保存しておきます。

```javascript
function notifySlack_(text) {
  var webhookUrl = PropertiesService.getScriptProperties()
    .getProperty('SLACK_WEBHOOK_URL');

  if (!webhookUrl) {
    Logger.log('SLACK_WEBHOOK_URLが未設定です');
    return;
  }

  var payload = { text: text };
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(webhookUrl, options);
}
```

締切トリガーから呼ぶ入口はこれだけです。

```javascript
function checkDeadlineAndNotify() {
  var result = findCommonSlots();
  notifySlack_(result.text);
}
```

## 未回答の人を計算に入れない

締切を過ぎても、フォームにまったく回答していない人が残ることがあります。

このシステムでは、そういう人を「不可」として扱いません。D列が`done`の行だけを母数にしているので、未回答の人はそもそも計算から外れます。

「不可」に含めると、実際には都合を聞けていないだけなのに、その人のせいで枠が全部埋まらなくなります。母数から外すのは、この誤りを避けるための設計です。

## つまずきどころ

締切ちょうどの時刻に駆け込みで届いた回答は、Geminiの構造化が間に合わず、D列がまだ`pending`のまま残ることがあります。

その状態で通知が飛ぶと、駆け込みで回答した人が母数からも抜け落ちます。締切トリガーの時刻を、フォームの締切より10分ほど後ろにずらしておくと、この取りこぼしを減らせます。

もう1つは、Slack側でWebhookのURLを発行し直したときです。スクリプトプロパティの値を更新し忘れると、古いURLに向けて送り続け、通知だけが届かなくなります。

## 残る手作業

ここまでの仕組みを組んでも、手作業がすべて消えるわけではありません。

Slack Incoming WebhookのURLを発行する作業が1つ。締切の日時を関数に渡して登録する作業が、もう1つ残ります。

前者は最初の1回だけです。後者は、日程調整のたびに毎回人の手で行います。

どちらもシステムの外側にある情報だからです。Webhook URLはSlack側の管理画面でしか発行できません。締切の日時は、日程調整のたびに毎回変わります。

## 今日できること

`findCommonSlots()`を、ダミーの回答データを2〜3行入れたシートに対して手動実行してください。

実行結果のログに、全員一致の枠か、最多枠と空いていない人の名前のどちらかが出ます。

Slackへの送信を試す前に、まずこの集計ロジックが手元のシートで正しく動くことを確認しておくと、Webhookの設定でつまずいたときに原因を切り分けやすくなります。

---

締切に1回だけ通知を出す設計は、コードの量としては多くありません。変わるのは「いつ動かすか」という1点だけです。

次に自分の集計に組み込むときは、まずトリガーの種類を疑ってみてください。
