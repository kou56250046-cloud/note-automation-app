# Googleフォームの自由記述を、Geminiが読める形でシートに集める入口設計

themes.md の id: 2026-W35B-01
systemId: 2026-W35B-survey-digest（1システムを7分割した連載）
serialRole: 設計
type: free
day: mon / publishDate: 2026-08-24
category: GASと生成AIで他人に渡せる自動化システムを作る / 自動化フローの設計思想
hashtags: GoogleAppsScript, GAS, 業務効率化

## スコア
strength 5 / market 4 / willingness 2 / artifact 5 = 16

## 選定理由（themes.md の rationale）
strength5: account.md のペルソナ「GASで自動化を組んだが人に任せられない人」の入口そのもの。
installable trigger（onFormSubmit）とシート構造の設計は手元の材料だけで書ける。
market4: market/2026-08-24.md の「GAS」は需要207.0 / 供給32.9件/日で比6.301（有料率11%）。
「GoogleAppsScript」は需要90.0 / 供給20.4件/日で比4.407（有料率10%）。両方とも埋もれない帯。
willingness2: 無料記事想定。設計図だけでは行動が完結せず、次の記事（中核処理）が要る前提。
artifact5: onFormSubmitの設定手順＋シート構造の設計図（回答ID/生テキスト/処理状態列）＋
入口の受信コード全文を出せる。
次点は「経費精算レシートの受付フォーム設計」だったが、経費という題材はethics-line観点で
リスクが増えるため、この系統自体を選ばなかった（ヘッダー参照）。

## この曜日にこれを置いた理由
weekly-research が day: mon を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-24 は月曜であり、規定の日曜より1日遅い。market データは
 research/market/2026-08-24.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: フォームの自由記述をどう受け取り、どう並べればGeminiに渡しやすいかだけを扱う。
後続の「Geminiで要約する」記事を読んでいなくても、この1本で「Geminiに渡せる形の
シートが作れる」ところまでは完結する。既出の議事録要約記事とは入口の設計思想（処理状態列で
二重処理を防ぐ設計）が異なる点で差別化する。

## 実物の計画（themes.md の artifactPlan）
onFormSubmit installable triggerの設定手順＋シート構造の設計図（列定義）＋ 受信〜シート書き込みのGASコード全文

## 出典
- https://developers.google.com/apps-script/guides/triggers/installable
