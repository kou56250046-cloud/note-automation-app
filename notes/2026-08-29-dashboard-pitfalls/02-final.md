GASのHTML Serviceで作った画面は、公開した瞬間と、運用が始まった瞬間で別の崩れ方をします。

この記事では、公開したあとに実際に踏んだ5箇所を、before→afterのコードでそのまま直します。

このシステムは、アンケートの自由記述をGASとGeminiで自動要約し、HTML Serviceのダッシュボードで公開する仕組みです。

この記事は、そのダッシュボードを実際に人へ共有し、自由記述のクセ（長文・カテゴリ増加・絵文字混入）に晒したあとに起きる、見た目の崩れだけを扱います。

初期デザインの作り方を読んでいなくても、HTML Serviceで画面を公開しているなら踏む可能性がある崩れなので、この1本で完結します。

---

## 1. デプロイ設定で共有相手が画面を開けない

自分の画面では動くのに、URLを渡した相手だけ「アクセスできません」と表示される状態です。

原因は、Web Appのデプロイ設定にある2つの項目です。

**Execute as（実行者）**は、スクリプトを誰の権限で動かすかを決めます。「自分」を選ぶと、共有相手はあなたの権限で読み取りだけを行う形になります。

もう一つの選択肢である「アクセスしているユーザーとして実行」を選ぶと、開いた人自身の権限でスクリプトが動きます。共有相手にもGoogleアカウントでのアクセス権限が必要になるため、社内向けの用途に向いています。

**Who has access（アクセスできるユーザー）**は、誰が画面を開けるかを決めます。既定は「自分のみ」です。ここを変えないまま、いくらURLを渡しても相手は開けません。

修正はデプロイ設定の画面で、Who has accessを「自分のみ」から「全員」または「同じドメインの全員」に変更するだけです。

公式ドキュメントにも、この2項目の組み合わせでアクセス範囲が決まる、と明記されています。

出典: https://developers.google.com/apps-script/guides/web

ここで注意が要ります。**「全員」にすると、URLを知っている人なら誰でも画面を開けます。**

社内の限定的な共有であれば「同じドメインの全員」を選び、外部に渡すURLは別途アクセス制御を検討したほうがよい設定です。

「渡せる画面にする」と「誰にでも見せる画面にする」は別の話なので、共有相手の範囲を決めてから設定を選びます。

## 2. 自由記述が長文だとカードが縦に間延びする

自由記述をそのまま全文表示すると、1件だけ3行のカードの隣に、20行のカードが並びます。

高さがバラバラになり、一覧としての見やすさが崩れます。

before（全文表示）

```css
.comment-text {
  font-size: 14px;
  line-height: 1.6;
}
```

after（3行で省略し、クリックで全文をモーダル表示する）

```css
.comment-text {
  font-size: 14px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  cursor: pointer;
}

.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  align-items: center;
  justify-content: center;
}

.modal-overlay.active {
  display: flex;
}

.modal-box {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
  max-width: 480px;
  max-height: 70vh;
  overflow-y: auto;
}
```

```javascript
document.querySelectorAll('.comment-text').forEach(function (el) {
  el.addEventListener('click', function () {
    var full = el.dataset.full;
    document.getElementById('modalBody').textContent = full;
    document.getElementById('modalOverlay').classList.add('active');
  });
});

document.getElementById('modalOverlay').addEventListener('click', function (e) {
  if (e.target === this) this.classList.remove('active');
});
```

カード側のHTMLには、省略前の全文を`data-full`属性に持たせておきます。

`textContent`で全文を差し込んでいるので、自由記述にHTMLタグが混じっていても、そのままタグとして表示されず安全です。

## 3. カテゴリが8種類以上に増えると固定幅カードが崩れる

初期のカテゴリは4〜5種類だったのに、運用が進むと8種類、10種類と増えていきます。

固定幅のカードを横並びにしていると、画面の右端からはみ出し、横スクロールが発生します。

before（固定幅で横並び）

```css
.category-row {
  display: block;
}

.category-card {
  width: 220px;
  display: inline-block;
  margin-right: 12px;
}
```

after（flexboxで折り返す）

```css
.category-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.category-card {
  flex: 1 1 220px;
  max-width: 280px;
}
```

`flex: 1 1 220px`は、基準幅220pxを保ちつつ、余った幅を均等に伸ばし、入りきらなければ次の行に折り返す指定です。

カテゴリが何種類に増えても、横スクロールを起こさずに並びます。

`gap`でカード同士の間隔を指定できるので、`margin-right`を個別に打ち消す調整も不要になります。

## 4. スマホ幅でカードの右側がはみ出す

PCで確認して問題なかった画面が、スマホで開くと右側が切れて、横にスクロールしないと見えない状態になります。

原因は、カード幅をpxで固定していることと、`box-sizing`の指定漏れです。

before

```css
.category-card {
  width: 220px;
  padding: 16px;
}
```

`width: 220px`に`padding: 16px`が加わると、実際の描画幅は252pxになります。**`box-sizing: border-box`を書き忘れると、paddingの分だけ幅がはみ出します。**

左右合わせて32pxのpaddingが、指定した220pxの外側に足されるためです。

after

```css
.category-card {
  width: 220px;
  padding: 16px;
  box-sizing: border-box;
}

@media (max-width: 640px) {
  .category-row {
    flex-direction: column;
  }

  .category-card {
    width: 100%;
  }
}
```

`box-sizing: border-box`を指定すると、paddingを含めた220pxで描画されます。

さらにメディアクエリで640px以下のときに1列表示へ切り替えると、スマホ幅でも右側が切れなくなります。

## 5. 代表コメントに絵文字や記号が混じると高さが不揃いになる

自由記述の代表コメントをカードに載せると、絵文字や記号入りの行だけ高さが変わり、カードの並びがガタつきます。

絵文字はフォントによって行の高さを押し上げるため、`line-height`を指定していないと、行によって高さがずれます。

絵文字は「👍」「🎉」のように、通常の文字より縦方向に大きく描画されるフォントが多いためです。

before

```css
.rep-comment {
  font-size: 14px;
}
```

after

```css
.rep-comment {
  font-size: 14px;
  line-height: 1.5;
  min-height: 63px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

`line-height: 1.5`で行の高さを固定し、`-webkit-line-clamp: 3`で3行までに揃えます。

そのうえで`min-height`を、フォントサイズ14px・行間1.5・3行分に相当する63px前後に指定すると、コメントが1行だけの短いカードでも、高さが他のカードと揃います。

---

## 今日できること

まず、公開しているWeb AppのURLを、自分以外の端末かブラウザのプライベートウィンドウで開いてください。

開けなければ、デプロイ設定のWho has accessを確認するところから始めます。

次に、スマホの実機かブラウザの検証ツールで幅を640px以下にして、カードが1列になるか確認します。

見た目の崩れは、共有相手が画面を開けて初めて気づけるものが大半です。開けない状態のままでは、残り4つの崩れにすら出会えません。

## おわりに

今回の5箇所は、どれも公開したあと、実際に人へ共有したり、自由記述の量や中身が増えたりして初めて表面化するものでした。

初期デザインを作った時点では気づけない崩れなので、公開後にもう一度、共有相手の画面とスマホ幅の両方で見直す価値があります。

今回の5箇所はどれもCSSとJSの範囲で直せるため、サーバー側のコードは変更していません。
