全員の空き状況を、名前を1人ずつ見て突き合わせるのをやめました。

曜日と時間帯のマス目に、空いている人数を色の濃さで出すだけです。目で探す作業がまるごと消えます。

前提を3行で置きます。

- 回答フォームの自由記述をGeminiが構造化し、曜日×時間帯のtrue/falseがシートに入っている状態から始めます
- 未処理の行（処理状態がpendingまたはerror）が混ざっていることもあります
- 自由記述をGeminiに投げるプロンプトや、構造化のコードはこの記事では扱いません

ここから先は、このデータを画面に変える話だけです。月〜水を読んでいなくても、この1本だけで動きます。

## 一覧表だと、なぜ突き合わせが要るのか

一覧表のままだと、回答が集まるたびに名前を1人ずつ見ていくことになります。

佐藤さんは月の午後と火の午前が空いている。鈴木さんは月の午後と水の午前が空いている。高橋さんは……と、6人分の文章を頭の中で重ねることになります。

全員が空いている枠を探すには、6人分の空き枠をすべて覚えておく必要があります。人数が増えるほど、この突き合わせは辛くなります。

一覧表そのものが悪いわけではありません。悪いのは、**空き枠を人の頭の中で交差させないと答えが出ない**構造です。

この交差を、画面の側にやらせます。曜日×時間帯のマス目を先に作り、そこに「空いている人数」を集計してから置くだけです。人が見るのは、集計済みの数字と色だけになります。

## 濃淡を離散段階にする

人数は整数です。0人、1人、2人と、飛び飛びの値しか取りません。

人数をそのまま0〜5の連続値としてHSLの明度に流し込むと、1段階あたりの明度差は9ポイント程度にしかなりません。3人と4人のように隣り合う値の差は、並べて見比べないと読み取りにくい幅にとどまります。

連続値のグラデーションは、値がなめらかに変わるデータ向けです。人数のような整数の集計には向いていません。

そこで段階を4つに絞りました。

- 0人 — ほぼ白
- 1〜2人 — 薄い青
- 3〜4人 — 濃い青
- 全員（この記事の例では5人） — 濃い青に金の枠

4段階なら、開いた瞬間に「多い・少ない・全員」が判別できます。段階の境目は人数に応じて調整してください。私はこの例では「半数未満」「半数以上」「全員」の3区分に「0人」を足して4段階にしています。

## 「全員空き」だけを別扱いにする

濃淡の4段階目は、他の段階と別の意味を持っています。

3〜4人が空いている枠は「候補」です。全員が空いている枠は「決定できる」枠です。同じ濃い青の一段階として扱うと、この違いが埋もれます。

だから全員空きのセルだけ、金の枠と「全員空き」の文字を追加しています。色の濃さだけに頼ると、色の判別が苦手な人には伝わりません。文字のラベルを添えているのはそのためです。

幹事がこの画面を開いたとき、最初に目に入るのは金の枠です。決定できる枠から先に見えるようにしています。

## 未回答を、色ではなく模様で示す

集計から抜けている人がいます。処理状態が`pending`（Geminiの処理待ち）や`error`（構造化に失敗)の行は、集計に含めていません。

含めない理由は、含めると「不可」と区別がつかなくなるからです。未回答の人を人数0として数えると、その人が本当は空いているかもしれない枠まで「不可」に見えてしまいます。

未回答は、空きでも不可でもない第3の状態です。数字が無いという事実そのものが情報なので、色の濃淡には乗せません。

私はこの状態を、グリッドの下に斜線模様の帯で示しています。個々のマス目に小さく散らすことも考えましたが、やめました。

未回答の人がどの曜日を空けているかは、まだ分かりません。特定のマス目だけに斜線を置くと「その枠だけ人数が足りない」という誤った情報になります。未回答の影響は、全部の枠に等しく及びます。だから帯として、グリッド全体にかかる形で出しています。

## 実物: before → after

名前を縦に並べただけの一覧と、曜日×時間帯のヒートマップのライブデモを置きます。

デモURL: https://kou56250046-cloud.github.io/note-automation-app/demo/2026-09-03-heatmap-view/

beforeは、回答者ごとに空いている曜日・時間帯を文章で並べた一覧です。全員の共通枠を探すには、6人分の文章を読み比べる必要があります。

afterは、5日×3時間帯のグリッドに人数を数字と色で出し、全員空きの枠を金の枠で強調し、未回答者の存在を斜線の帯で示しています。同じ6人分のデータを、表示だけ変えています。

シートの列は、A タイムスタンプ・B 回答者名・C 都合・D 処理状態・E 構造化結果・F 処理日時の並びを想定しています。

### GAS側（Code.gs）

```javascript
// config.gs に置いてある定数（この画面が使う分だけ）
const SHEET_NAME = 'responses';
const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const SLOTS = ['am', 'pm', 'eve'];

function doGet() {
  return HtmlService.createTemplateFromFile('dashboard')
    .evaluate()
    .setTitle('日程調整ヒートマップ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getHeatmapData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { counts: {}, processedCount: 0, pendingNames: [] };
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const counts = {};
  DAYS.forEach(function (day) {
    counts[day] = {};
    SLOTS.forEach(function (slot) {
      counts[day][slot] = 0;
    });
  });

  let processedCount = 0;
  const pendingNames = [];

  rows.forEach(function (row) {
    const name = row[1];    // B列: 回答者名
    const status = row[3];  // D列: 処理状態
    const rawJson = row[4]; // E列: 構造化結果

    if (status !== 'done' || !rawJson) {
      if (status === 'pending' || status === 'error') {
        pendingNames.push(name);
      }
      return;
    }

    let availability;
    try {
      availability = JSON.parse(rawJson);
    } catch (err) {
      pendingNames.push(name);
      return;
    }

    processedCount += 1;

    DAYS.forEach(function (day) {
      SLOTS.forEach(function (slot) {
        if (availability[day] && availability[day][slot] === true) {
          counts[day][slot] += 1;
        }
      });
    });
  });

  return { counts: counts, processedCount: processedCount, pendingNames: pendingNames };
}
```

### 画面側（dashboard.html）

```html
<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      background: #f5f5f7;
      margin: 0;
      padding: 24px;
      color: #1d1d1f;
    }
    h1 { font-size: 18px; margin: 0 0 16px; }
    .grid {
      display: grid;
      grid-template-columns: 60px repeat(5, 1fr);
      gap: 4px;
      margin-bottom: 14px;
    }
    .head, .rowlabel { font-size: 12px; font-weight: bold; text-align: center; padding: 6px 0; }
    .cell {
      --intensity: 0;
      position: relative;
      border-radius: 6px;
      height: 52px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: hsl(212, 70%, calc(94% - (var(--intensity) * 46%)));
      border: 1px solid rgba(0,0,0,0.06);
    }
    .cell .count { font-size: 16px; font-weight: bold; }
    .cell.full { border: 2px solid #d4a017; }
    .cell.full .count { color: #fff; }
    .cell.full .badge { font-size: 9px; color: #fff; }
    .pending-banner {
      font-size: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid rgba(212,160,23,0.4);
      background-image: repeating-linear-gradient(45deg,
        rgba(212,160,23,0.10), rgba(212,160,23,0.10) 8px,
        rgba(212,160,23,0.18) 8px, rgba(212,160,23,0.18) 16px);
    }
  </style>
</head>
<body>
  <h1>日程調整ヒートマップ</h1>
  <div class="grid" id="grid">読み込み中です</div>
  <div id="banner"></div>

  <script>
    const DAY_LABELS = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金' };
    const SLOT_LABELS = { am: '午前', pm: '午後', eve: '夜' };
    const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const SLOTS = ['am', 'pm', 'eve'];

    google.script.run.withSuccessHandler(render).getHeatmapData();

    function levelClass(count, total) {
      if (count === 0) return 'level-0';
      if (total > 0 && count === total) return 'full';
      if (count / total >= 0.5) return 'level-2';
      return 'level-1';
    }

    function render(data) {
      const grid = document.getElementById('grid');
      grid.innerHTML = '<div></div>' + DAYS.map(function (d) {
        return '<div class="head">' + DAY_LABELS[d] + '</div>';
      }).join('');

      SLOTS.forEach(function (slot) {
        grid.innerHTML += '<div class="rowlabel">' + SLOT_LABELS[slot] + '</div>';
        DAYS.forEach(function (day) {
          const count = data.counts[day][slot];
          const total = data.processedCount;
          const intensity = total > 0 ? count / total : 0;
          const cls = levelClass(count, total);
          const badge = cls === 'full' ? '<span class="badge">全員空き</span>' : '';
          grid.innerHTML +=
            '<div class="cell ' + cls + '" style="--intensity:' + intensity + '">' +
            '<span class="count">' + count + '</span>' + badge + '</div>';
        });
      });

      const banner = document.getElementById('banner');
      if (data.pendingNames.length > 0) {
        banner.className = 'pending-banner';
        banner.textContent =
          '斜線の帯 = 未回答が' + data.pendingNames.length + '人います（' +
          data.pendingNames.join('、') + '）。集計にはまだ含めていません。';
      }
    }
  </script>
</body>
</html>
```

### 変更点

一覧表からヒートマップに変えて、増えたのは3つです。

- 表の`<tr>`を、曜日×時間帯の`<div class="cell">`グリッドに変えました
- 人数を4段階に区切り、全員空きだけ金の枠を足しました
- 未処理の行を集計から外し、人数ではなく斜線の帯で存在を示しました

列の並びを変える場合は、`row[1]`〜`row[4]`の添字とE列のJSON構造だけ直せば動きます。

## つまずきどころ

1つ目。段階の境目を決めずに書き始めると、色分けの条件式がその場しのぎになります。

先に「0人」「半数未満」「半数以上」「全員」の4区分を決めてから書くと、あとで直す量が減ります。

2つ目。未処理の行をうっかり人数0として数えてしまうことです。

`status !== 'done'`のチェックを先に置き、集計のループに入れない形にしています。ここを間違えると、未回答の人が「全員不可」に紛れ込みます。

## 今日できること

**すでに曜日×時間帯の空き状況をシートに持っている人は、まず人数を4段階に区切ってください。**

連続値のグラデーションを使っている場合は、境目を決めて離散化するところから始めます。段階を区切るだけで、全員空きの枠が探しやすくなります。

## 残る手作業

未回答の人に個別に催促するかどうかは、この画面では決めません。

斜線の帯を見て、誰にいつ声をかけるかは、幹事が判断する部分として残しています。

画面ができると、次はトリガーと通知の設計が要ります。締切を過ぎたら誰に何を送るかは、金曜の記事で扱います。
