Gemini分類済みのアンケート回答を、そのままシートで人に見せると誰も読みません。

行が並ぶだけの画面では、どこから手を付ければいいか分からないからです。同じ数字を見ているのに、画面の見せ方だけで伝わり方が変わります。

私は最初、集計結果を「回答ID」「カテゴリ」「感情スコア」「要約」の4列がそのまま並ぶ画面で共有しました。開いた相手から「結局どこを見ればいいのか」と聞き返され、直すことにしました。

この記事で直すのは2箇所だけです。色数を3色に絞ることと、並び順をネガティブが多い順にすることです。

前提を3行で置きます。

- Gemini APIで自由記述を分類し、要約・カテゴリ・感情スコアがシートに入っている状態から始めます
- 感情スコアは -1（ネガティブ）から1（ポジティブ）までの数値です
- 分類のプロンプトやAPI呼び出しのコードは、この記事では扱いません

ここから先は、このデータをHTML Serviceのカード画面に変える話だけです。月〜水の記事を読んでいなくても、この1本だけで画面が動きます。

## 色を感情の3段階にしか使わない

Gemini分類済みのデータには、カテゴリがいくつも入っています。

「機能要望」「使いにくい」「価格への不満」「満足」「UIの見た目」「バグ報告」のように、カテゴリごとに違う色を割り当てたくなります。

私は最初にこれをやりました。カテゴリの数だけ色を用意し、カードの枠線に塗り分けました。

7カテゴリなら7色です。画面はにぎやかになりましたが、開いてすぐには何も読み取れなくなりました。

色が5色を超えると、人は「どこが重要か」ではなく「どこが目立つか」で見てしまいます。しかも色とカテゴリ名の対応を、開くたびに覚え直す必要が出ます。

そこで色を、感情スコアの3段階だけに絞り直しました。

- ネガティブ（スコア -1〜-0.34）はカードの左枠を赤にします
- ふつう（スコア -0.33〜0.33）はグレーにします
- ポジティブ（スコア 0.34〜1）は緑にします

赤・グレー・緑の3色は、CSSでは `#d64545` `#9a9a9a` `#3a9a5c` として定義しています。赤・グレー・緑の組み合わせは、信号機と同じ並びなので説明なしでも伝わります。初めて開く人でも、赤いカードから見ればいいと直感的に分かります。

カテゴリの違いは色ではなく、カードの見出しテキストで示します。

色は「感情」という1つの軸だけに使い、「カテゴリ」という別の軸には使いません。

2つの軸を同時に色で表そうとすると、どちらの軸も読み取れなくなります。軸が2つあるなら、片方はテキストに任せます。

色だけに頼ると、色の判別が苦手な人には伝わりません。私はカードの見出しに「機能要望」のようなカテゴリ名をそのまま出し、色は感情の補助情報として使うようにしています。感情の3色は、カテゴリが何個に増えても変わりません。

## 並びを、ネガティブが多い順にする

もう1箇所だけ直します。カードを並べる順番です。

件数の多い順に並べると、単に回答が多いカテゴリが先頭に来ます。

たとえば「使いにくい」が20件のうち3件だけネガティブで、「価格への不満」が8件のうち7件がネガティブだったとします。件数順だと「使いにくい」が上に来てしまい、対応が急ぎの「価格への不満」は下に埋もれます。件数だけを見ていると、緊急度の高いカテゴリを見逃します。

回答が多いことと、対応が急ぎであることは別の話です。

私はこの画面で、ネガティブ件数の多いカテゴリから先に並べています。

画面を開いた瞬間に、対応が必要なところから目に入る並びです。画面を開く人が最初に見るのは、常に対応が急ぎのカードです。

件数もポジティブ件数もカードには表示しますが、並び替えの基準には使いません。

並び替えの基準を1つに決めておくと、開くたびにどこを見るか迷わずに済みます。ネガティブ件数が同じカテゴリ同士は、シートに最初に登場した順のままになります。

## 実物: before → after

テンプレ丸出しの一覧表示と、カード型ダッシュボードのライブデモを置きます。

デモURL: https://kou56250046-cloud.github.io/note-automation-app/demo/2026-08-27-survey-dashboard/

before は、シートの行がそのまま並ぶ一覧です。カテゴリも感情も文字でしか分かりません。並び順もシートに入力された順のままです。

after は、カテゴリ別のカードに件数と代表コメントを載せ、感情を3色の左枠で示し、ネガティブが多い順に並べています。このデモには10件のダミー回答を用意し、同じデータをbeforeとafterで表示だけ変えています。

シートの列は、A回答ID・B自由記述・C処理状態・D要約・Eカテゴリ・F感情スコアの並びを想定しています。

### GAS側（Code.gs）

```javascript
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('アンケート結果ダッシュボード')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getSurveyCards() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('回答');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const grouped = {};

  rows.forEach(function (row) {
    const summary = row[3];  // D列: 要約
    const category = row[4]; // E列: カテゴリ
    const score = Number(row[5]); // F列: 感情スコア

    if (!category) return;

    if (!grouped[category]) {
      grouped[category] = {
        category: category,
        total: 0,
        negative: 0,
        neutral: 0,
        positive: 0,
        sample: summary
      };
    }

    const card = grouped[category];
    card.total += 1;

    if (score <= -0.34) {
      card.negative += 1;
      card.sample = summary; // ネガティブの代表コメントを優先する
    } else if (score >= 0.34) {
      card.positive += 1;
    } else {
      card.neutral += 1;
    }
  });

  return Object.values(grouped).sort(function (a, b) {
    return b.negative - a.negative;
  });
}
```

### index.html（テンプレート側）

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
    .cards { display: flex; flex-direction: column; gap: 12px; }
    .card {
      background: #fff;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border-left: 6px solid #ccc;
    }
    .card.negative { border-left-color: #d64545; }
    .card.neutral  { border-left-color: #9a9a9a; }
    .card.positive { border-left-color: #3a9a5c; }
    .card-title { font-weight: bold; margin-bottom: 4px; }
    .card-counts { font-size: 13px; color: #555; margin-bottom: 8px; }
    .card-sample { font-size: 14px; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>アンケート結果ダッシュボード</h1>
  <div class="cards" id="cards">読み込み中です</div>

  <script>
    google.script.run.withSuccessHandler(render).getSurveyCards();

    function dominantClass(card) {
      if (card.negative >= card.positive && card.negative >= card.neutral) return 'negative';
      if (card.positive >= card.neutral) return 'positive';
      return 'neutral';
    }

    function render(cards) {
      const container = document.getElementById('cards');
      container.innerHTML = '';

      cards.forEach(function (card) {
        const el = document.createElement('div');
        el.className = 'card ' + dominantClass(card);
        el.innerHTML =
          '<div class="card-title">' + card.category + '</div>' +
          '<div class="card-counts">件数 ' + card.total +
          '（ネガティブ ' + card.negative + '）</div>' +
          '<div class="card-sample">' + card.sample + '</div>';
        container.appendChild(el);
      });
    }
  </script>
</body>
</html>
```

### 変更点のCSS

before から after で変えたのは、この3箇所です。

- 一覧の `<table>` を、カードの `<div class="card">` に変えました
- 感情スコアの数値表示を、3色の `border-left` に置き換えました
- 並び順を、サーバー側の `sort()` でネガティブ件数の降順に変えました

列の並びを変える場合は、`row[3]`〜`row[5]` の添字だけ直せば動きます。

```css
/* before: 行が並ぶだけの表 */
table { width: 100%; border-collapse: collapse; }
td, th { border: 1px solid #ddd; padding: 6px; font-size: 13px; }

/* after: 感情を3色の左枠だけで示すカード */
.card { border-left: 6px solid #ccc; border-radius: 8px; padding: 16px; }
.card.negative { border-left-color: #d64545; }
.card.neutral  { border-left-color: #9a9a9a; }
.card.positive { border-left-color: #3a9a5c; }
```

## つまずきどころ

1つ目。感情スコアの境界値を決めずに書き始めると、色分けの条件式がその場しのぎになります。

先に3段階の境界（-0.34と0.33）を決めてからコードを書くと、あとで直す量が減ります。スコアの範囲を3等分しただけの単純な境界ですが、迷いが消えます。

2つ目。カテゴリごとに色を変える誘惑は、実装の途中で必ず出ます。

私は一度カテゴリ色を試し、感情の3色と混ざって読めなくなったので外しました。色を増やしたくなったら、「その色は何の軸を示すか」を自分に聞き直すようにしています。

3つ目。ネガティブとポジティブの件数が同数のカテゴリが出ることがあります。

私のコードでは `dominantClass` 関数で、ネガティブを優先して判定しています。同数のときに紛れさせず、対応漏れが起きにくい側に倒す判断です。

3箇所とも、色や並びのルールを先に決めてからコードに落とし込む点は共通しています。

## 今日できること

すでにカテゴリ別の集計をシートに持っている人は、まず感情スコアの色を3色に絞ってください。自分のシートで動かして、色が3つ以上に増えていないか確認してください。

カテゴリごとの色分けをすでに実装している場合は、それを外して感情の3色だけに戻すところから始めます。色と並びさえ直せば、あとのカードのレイアウトはそのままで構いません。

この1本で、シートのデータがそのまま人に見せられる形になりました。画面ができると、次は「誰が・いつ見るか」という運用の話が残ります。

トリガーと権限の設計は、金曜の記事で扱います。
