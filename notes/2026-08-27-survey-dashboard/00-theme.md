# アンケート結果を、色数と並びの2箇所だけ直して見せられるダッシュボードにする

themes.md の id: 2026-W35B-04
systemId: 2026-W35B-survey-digest（1システムを7分割した連載）
serialRole: 画面
type: free
day: thu / publishDate: 2026-08-27
category: GASと生成AIで他人に渡せる自動化システムを作る / 見せられる自動化
hashtags: GAS, UIデザイン, LP制作, 生成AI

## スコア
strength 5 / market 5 / willingness 3 / artifact 5 = 18

## 選定理由（themes.md の rationale）
strength5: account.md「木・土は必ずサブ①」の指定に直接対応する。HTML Serviceでの
ダッシュボード作りは第2版から続く得意領域。
market5: 「UIデザイン」は比5.681（需要81.0/供給14.3件/日、有料率6%）で今回の実測でも
上位。GAS界隈で「スプレッドシートの画面のまま」の記事が多い中、自動化に顔を付ける
交差点が空いているという account.md の判断根拠と一致する。
willingness3: カード型ダッシュボードは「見せられる形」を丸ごと再現でき、行動（自分の
シートに貼る）に直結しやすい。
artifact5: テンプレ丸出しの一覧表示（before）→ カテゴリ別カード＋代表コメント表示（after）
のデモと、HTML Service全文を出せる。
次点は「円グラフでアンケート結果を可視化するダッシュボード」。既出記事「AIが出した
ダッシュボードを、色数・目盛り・並びの3箇所で読める形にする」と実物（グラフの
before/after）が重複するため、グラフではなくカード型に差し替えて採用した。

## この曜日にこれを置いた理由
weekly-research が day: thu を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-24 は月曜であり、規定の日曜より1日遅い。market データは
 research/market/2026-08-24.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: 集計結果のスプレッドシートを、そのまま人に見せられるカード型ダッシュボードに
変える「見た目の直し方」だけを扱う。月〜水を読んでいなくても、「Gemini分類済みの
データがシートにある」という前提だけで、この1本の画面デモとコードが動く。
既出のグラフ系ダッシュボード記事とは、可視化の形（グラフではなくカード＋代表コメント）
で差別化する。

## 実物の計画（themes.md の artifactPlan）
before（テンプレ丸出しの一覧）/ after（カテゴリ別カード＋代表コメント）の ライブデモ＋HTML Service全文

## 出典
- https://ai.google.dev/gemini-api/docs/structured-output
