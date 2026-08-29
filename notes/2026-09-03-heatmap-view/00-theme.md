# 全員の空き状況を、色の濃淡で一目にするヒートマップダッシュボード

themes.md の id: 2026-W36-04
systemId: 2026-W36-schedule-heatmap（1システムを7分割した連載）
serialRole: 画面
type: free
day: thu / publishDate: 2026-09-03
category: GASと生成AIで他人に渡せる自動化システムを作る / 見せられる自動化
hashtags: GAS, UIデザイン, LP制作, 生成AI

## スコア
strength 5 / market 5 / willingness 3 / artifact 5 = 18

## 選定理由（themes.md の rationale）
strength5: account.md「木・土は必ずサブ①」の指定に直接対応する。HTML Serviceでの
ダッシュボード作りは第2版から続く得意領域。
market5: market/2026-08-29.md の「UIデザイン」は需要81.0 / 供給13.2件/日で比6.123
（有料率8%、総15,169件）。今回の実測でも上位帯。GAS界隈で「スプレッドシートの画面のまま」
の記事が多い中、自動化に顔を付ける交差点が空いているというaccount.mdの判断根拠と一致する。
willingness3: ヒートマップは「全員が空いている枠が一目でわかる」形を丸ごと再現でき、
行動（自分のシートに貼る）に直結しやすい。
artifact5: 名前を縦に列挙しただけのbefore（ただの一覧表）→曜日×時間帯のグリッドで
空き人数を色の濃淡（CSS grid + HSLのintensity変数）で見せるafterのデモと、
HTML Service全文を出せる。CSS gridでのヒートマップ実装（HSLのhueを強度で変える手法、
intensity変数を0〜1で持たせる手法）は一次情報で確認済み。
次点: 「棒グラフで各曜日の空き人数を示す」も検討したが、既出記事「AIが出したダッシュボードを、
色数・目盛り・並びの3箇所で読める形にする」（W34-01）と実物（グラフのbefore/after）が
重複するため、グリッドヒートマップに差し替えて採用した。

## この曜日にこれを置いた理由
weekly-research が day: thu を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-29 は土曜であり、規定の日曜より1日早い。market データは
 research/market/2026-08-29.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: 集計結果のスプレッドシートを、そのまま人に見せられる「全員の空き状況が一目で
わかるヒートマップ」に変える見た目の直し方だけを扱う。月〜水を読んでいなくても、
「Gemini構造化済みの空き状況データがシートにある」という前提だけで、この1本の画面デモと
コードが動く。既出のグラフ系・カード系ダッシュボード記事とは、可視化の形（グリッド＋
色の濃淡）で明確に差別化する。

## 実物の計画（themes.md の artifactPlan）
before（名前を縦に列挙しただけの一覧表）/ after（曜日×時間帯グリッドで 空き人数を色の濃淡表示するヒートマップ）のライブデモ＋HTML Service全文

## 出典
- https://expensive.toys/blog/pure-CSS-heatmap
- https://codelibrary.opendatasoft.com/widget-tricks/heatmaps-custom/
