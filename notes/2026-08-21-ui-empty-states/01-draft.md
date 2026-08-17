AIに一覧画面を作らせると、データがそろった状態しか出てきません。

登録した直後で0件のとき、通信を待っている数百ミリ秒、回線が落ちたとき。

この3つを自分で足すだけで、人に見せられる画面になります。

作ったコードは、この記事にそのまま全文置きました。


## スクリーンショットが撮れない瞬間

デモ画面は、いつもデータが入った状態で見せています。

実際の画面はそうではありません。

アカウントを作った直後は、当然データが0件です。

APIの応答を待っている間も、画面には何かが表示されています。

回線が切れたときや、サーバーが落ちたときもあります。

AIに「一覧画面を作って」とだけ頼むと、この3つはたいてい出てきません。

理由は単純です。

AIに渡したサンプルデータには、いつも数件のデータが入っています。

学習の元になった実装例の多くも、データがそろった状態のスクリーンショットです。

0件・読み込み中・失敗という「欠けた状態」は、AIが自分から思いつく対象ではありません。

新しく作ったテナントで開くと、テーブルの見出し行だけが残ります。

検索条件を絞りすぎたときも、同じ見た目になります。

見た目がほぼ白紙なので、動作確認をしている途中なのか、機能が壊れているのか、その場では区別できません。

読み込み中も同様です。

一瞬だけ白い画面が挟まると、クリックが効いていないと誤解されることがあります。

エラーの場合はさらに深刻です。

画面に何の変化もないまま止まると、通信が終わったのか、まだ続いているのか判断できません。


## 直す箇所は見た目ではなく画面の数

以前の記事では、AIが出した画面の余白・階層・色数を直しました。

今回は見た目を直しません。

画面そのものの数を増やします。

UIの状態を体系立てて説明する記事は、探すといくつか見つかります。

多くは、理想・空・読み込み中・一部だけそろった状態・エラーという、5つの状態を並べる設計論です。

今回はそこまで広げません。

AIの出力に**あとから足す3つ**だけに絞ります。

空、読み込み中、エラーです。

AIは、渡したサンプルデータの形をそのまま表示ロジックに使います。

サンプルが3件あれば3件用のレイアウトしか用意されません。

0件になったときの分岐や、通信中の分岐は、指示しない限り生成されません。

エラー時の分岐も同じです。

失敗したときにどう表示するかは、成功したときのレスポンスからは推測できません。

だからこそ、3つとも指示する側が明示する必要があります。

一部だけデータがそろった状態(Partial state)は、今回は扱いません。

無限スクロールやページ送りの実装によって、形が大きく変わるからです。

一覧画面ごとに実装が異なるので、共通の型として渡しにくいところがあります。

一覧画面の設計そのものではなく、AIが最初から作らない3画面をどう埋めるかに絞っています。

まずは、どの画面にも共通して起きる3つから埋めるほうが、手を動かしやすいと考えています。


## 作例

問い合わせ一覧という、よくある管理画面を例にしました。

左がAIの出力そのまま、右が3状態を足したものです。

https://kou56250046-cloud.github.io/note-automation-app/demo/2026-08-21-ui-empty-states/

右側の画面には、上部に4つのボタンがあります。

通常・空・読み込み中・エラーです。

押すたびに、同じ画面の中身だけが切り替わります。

ページの遷移も、外部の画像もありません。

CSSとJavaScriptだけで、見た目とふるまいの両方を表現しています。

beforeとafterは、テーブルの列構成をそろえてあります。

差分が分かりやすいように、あえて崩していません。

スマートフォンの画面幅でも、レイアウトは大きく崩れません。


## 空の状態を作る

before では、データが0件になったときの表示がありません。

テーブルのタグだけが残り、見出し行の下に何も並ばない状態になります。

これでは、壊れているのか、まだ何も無いのかが読者に伝わりません。

after では、テーブルの代わりに文言を1つ置きました。

「問い合わせはまだありません」という短い一文と、枠線だけのアイコンです。

画像は使っていません。CSSの枠線だけで表現しています。

アイコンは、既存のアイキャッチ画像を流用しないほうが安全です。

サイズや色が本文と合わず、浮いて見えることがあります。

枠線だけの図形なら、どんな配色の画面に置いても馴染みます。

文言は「まだ登録がありません」のように、状態を説明するだけでも成立します。

登録ボタンへの導線を足す場合は、主役にしすぎないよう、控えめな大きさにしてください。


## 読み込み中を作る

before では、通信を待っている間、画面は真っ白のままです。

真っ白な画面は、止まっているのか動いているのか区別できません。

after では、表の行数と同じ本数の帯を並べました。

グレーの帯が横に流れるアニメーションを、CSSだけで付けています。

画像やライブラリのアイコンは使っていません。

背景のグラデーションを大きくして、位置をずらしているだけです。

帯の色は、背景よりわずかに濃い程度にとどめてください。

コントラストが強すぎると、読み込み中であることよりも帯自体が目立ってしまいます。

アニメーションの速さも重要です。

動きが速すぎると落ち着かず、遅すぎると止まって見えます。

1秒から1.5秒程度で1周する速さが、扱いやすい範囲です。

帯の本数を数えれば、読者は何件分を待っているかを推測できます。


## エラーの状態を作る

before では、通信が失敗しても、画面には何の反応もありません。

読者は、待てばいいのか、リロードすればいいのか分かりません。

after では、「データを取得できませんでした」という文言と、再読み込みボタンを1つ置きました。

ボタンを押すと、読み込み中の表示を経て、通常の状態に戻ります。

`alert` は使っていません。画面の中だけで状態が変わります。

エラーの文言は、原因を断定しすぎないほうが安全です。

通信なのか、サーバー側の不具合なのか、画面側では判別できないことが多くあります。

「データを取得できませんでした」のように、事実だけを伝える言い方にとどめています。

再読み込みボタンを押しても直らない場合に備えて、問い合わせ先を添えておくと親切です。

今回の作例では、ボタンの動作を通常状態に戻すだけの簡単な処理にしています。


## AIへの指示と生成されたコード

after を作るときに使った指示の全文です。

```
この一覧画面に、次の3つの状態を追加してください。既存の表は変更しないでください。

1. 空の状態
   データが0件のときに表示する状態です。
   テーブルの代わりに、中央に「問い合わせはまだありません」という文言と、
   小さいアイコンを1つ置いてください。画像は使わず、CSSかSVGで表現してください。

2. 読み込み中の状態
   APIの応答を待っている間に表示する状態です。
   表の行数と同じ本数のスケルトン(グレーの帯)を並べてください。
   点滅または横方向に流れるアニメーションを、CSSだけで付けてください。

3. エラーの状態
   通信に失敗したときに表示する状態です。
   「データを取得できませんでした」という文言と、
   「再読み込み」ボタンを1つ置いてください。ボタンの動作は空でよいです。

切り替えは、画面上部に「通常」「空」「読み込み中」「エラー」の
4つのボタンを置き、クリックした状態だけを表示する形にしてください。
外部ライブラリやCDNは使わず、素のJavaScriptで実装してください。
alert・confirm・promptは使わないでください。
```

指示を3つに分けているのは、あとから数えて確認できるようにするためです。

「エラーハンドリングも入れて」だけでは、コンソールにログを出す程度で終わることが多くあります。

画面に何を表示するかまで、こちらで指定する必要があります。

切り替えの方法まで指定しているのは、指定しないとボタンではなくリンク遷移になったり、
別のページとして作られたりするためです。

state を切り替えている部分を含む、動く単位のコードです。

```html
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>after — 空・読み込み中・エラーを足した一覧画面</title>
<style>
  :root {
    --paper: #f6f3ec; --surface: #ffffff; --line: #e6e0d0;
    --ink: #221f19; --ink-2: #85796a; --accent: #2456e0;
    --bad: #a24a42; --bad-soft: rgba(162,74,66,.08);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, "Hiragino Kaku Gothic ProN", sans-serif;
    background: var(--paper); color: var(--ink); padding: 40px 48px; }
  .app { max-width: 920px; margin: 0 auto; }
  .statebar { display: flex; gap: 8px; margin-bottom: 24px; }
  .statebar button {
    font-family: inherit; font-size: 13px; font-weight: 600;
    padding: 8px 16px; border-radius: 999px; border: 1px solid var(--line);
    background: var(--surface); color: var(--ink-2); cursor: pointer;
  }
  .statebar button.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .panel { background: var(--surface); border: 1px solid var(--line);
    border-radius: 10px; padding: 24px 28px; min-height: 300px; }

  /* 空 */
  .state-empty { display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 260px; color: var(--ink-2); }
  .state-empty .icon { width: 48px; height: 48px; border: 2px dashed var(--line);
    border-radius: 10px; margin-bottom: 16px; }

  /* 読み込み中 */
  .skeleton-row { height: 16px; border-radius: 4px; margin-bottom: 14px;
    background: linear-gradient(90deg, var(--line) 25%, #f0ead9 37%, var(--line) 63%);
    background-size: 400% 100%; animation: shimmer 1.4s ease infinite; }
  @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }

  /* エラー */
  .state-error { display: flex; flex-direction: column; align-items: center;
    justify-content: center; height: 260px; color: var(--bad); text-align: center; }
  .state-error button { font-family: inherit; font-size: 13px; font-weight: 600;
    padding: 8px 20px; border-radius: 6px; border: 1px solid var(--bad);
    background: var(--bad-soft); color: var(--bad); cursor: pointer; }

  [hidden] { display: none !important; }
</style>
</head>
<body>
  <div class="app">
    <header><h1>問い合わせ一覧</h1></header>

    <div class="statebar">
      <button type="button" data-state="normal" class="active">通常</button>
      <button type="button" data-state="empty">空</button>
      <button type="button" data-state="loading">読み込み中</button>
      <button type="button" data-state="error">エラー</button>
    </div>

    <div class="panel">
      <table id="state-normal">
        <thead><tr><th>ID</th><th>件名</th><th>送信者</th><th>受信日時</th><th>状態</th></tr></thead>
        <tbody>
          <tr><td>#1042</td><td>料金プランについて</td><td>山田 太郎</td><td>08/21 09:12</td><td>未対応</td></tr>
          <tr><td>#1041</td><td>ログインできない</td><td>佐藤 花子</td><td>08/21 08:47</td><td>未対応</td></tr>
        </tbody>
      </table>

      <div id="state-empty" class="state-empty" hidden>
        <div class="icon"></div>
        <p>問い合わせはまだありません</p>
      </div>

      <div id="state-loading" hidden>
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
        <div class="skeleton-row"></div>
      </div>

      <div id="state-error" class="state-error" hidden>
        <p>データを取得できませんでした</p>
        <button type="button" id="retry">再読み込み</button>
      </div>
    </div>
  </div>

  <script>
    var buttons = document.querySelectorAll('.statebar button');
    var panels = {
      normal:  document.getElementById('state-normal'),
      empty:   document.getElementById('state-empty'),
      loading: document.getElementById('state-loading'),
      error:   document.getElementById('state-error')
    };
    function showState(name) {
      Object.keys(panels).forEach(function (key) {
        panels[key].hidden = key !== name;
      });
      buttons.forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.state === name);
      });
    }
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () { showState(btn.dataset.state); });
    });
    document.getElementById('retry').addEventListener('click', function () {
      showState('loading');
      setTimeout(function () { showState('normal'); }, 900);
    });
  </script>
</body>
</html>
```

state を切り替える仕組みは単純です。

4つの `div`（またはテーブル）を用意し、ボタンを押した名前と一致するものだけを表示します。

`hidden` 属性を使っているので、CSSの `display` を個別に切り替える処理を書かずに済みます。

読み込み中の帯は、表の行と同じ数だけ並べています。

行数が変わっても崩れないように、`.skeleton-row` を後から増やすだけで対応できる形にしてあります。

デモには全文の完成形を置いてあるので、そのままコピーして手元で開けます。


## つまずきどころ

2つあります。

1つ目は、**空の状態を「データなし」の一言で済ませてしまうこと**です。

一言だけだと、読者は次に何をすればいいか分かりません。

可能なら、次の行動につながる一文を添えてください。

2つ目は、**読み込み中の帯の本数を固定してしまうこと**です。

表の行数と帯の本数がずれると、切り替わった瞬間に画面の高さが動きます。

行数が変わる画面では、帯の本数も表の想定行数に合わせてください。

3つ目は、**エラーの文言を専門用語のまま出してしまうこと**です。

「500 Internal Server Error」のような表示は、読者にとって意味を持ちません。

何が起きたかではなく、次に何をすればいいかを書くほうが伝わります。

専門用語を使うときは、隣に一言だけ言い換えを添えると親切です。


## 今日できること

**自分の一覧画面で、データを空にしてスクリーンショットを撮ってください。**

真っ白になったり、見出し行だけが残っていたら、空の状態がありません。

そこから、空・読み込み中・エラーの順に足していくと、画面の抜けが減っていきます。

スクリーンショットは、エラー状態でも1枚撮っておくと、あとで見比べるときに役立ちます。

余裕があれば、読み込み中の状態も1枚残しておくとよいです。


AIが作る画面は、データがそろった一瞬しか想定していません。

その前後にある3つの状態を、自分の手で足す必要があります。

次に画面を出すとき、この3つを先に確認してください。
