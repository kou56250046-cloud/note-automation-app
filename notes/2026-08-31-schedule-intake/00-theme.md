# 参加者の空き状況を自由記述で集める。日程調整フォームの入口設計

themes.md の id: 2026-W36-01
systemId: 2026-W36-schedule-heatmap（1システムを7分割した連載）
serialRole: 設計
type: free
day: mon / publishDate: 2026-08-31
category: GASと生成AIで他人に渡せる自動化システムを作る / 自動化フローの設計思想
hashtags: GoogleAppsScript, GAS, 業務効率化

## スコア
strength 5 / market 4 / willingness 2 / artifact 5 = 16

## 選定理由（themes.md の rationale）
strength5: account.md のペルソナ「GASで自動化を組んだが人に任せられない人」の入口そのもの。
「◯曜午前は無理、火水木ならいつでも」という自由記述の都合を、Geminiに渡しやすい形で
シートに集める設計は手元の材料だけで書ける。W35B-01（フォーム→シート入口）と同じ骨格だが、
対象データが「アンケートの感想」ではなく「日程の都合」であり、シート構造（回答者名列・
自由記述列・処理状態列に加え、今回は締切日時の管理が必須になる点）が異なる。
market4: market/2026-08-29.md の「GAS」は需要227.5 / 供給23.5件/日で比9.683（有料率11%、
総12,422件）。「GoogleAppsScript」は需要92.5 / 供給10.4件/日で比8.879（有料率13%、総5,374件）。
どちらも計測17タグ中の上位帯。今週この帯を複数回使うため5ではなく4とした。
willingness2: 無料記事想定。設計図だけでは行動が完結せず、次の記事（中核処理）が要る前提。
artifact5: onFormSubmit installable triggerの設定手順＋シート構造の設計図（回答者名/
自由記述/締切日時/処理状態列）＋受信〜シート書き込みのGASコード全文を出せる。
次点: 「経費申請の受付フォーム設計」は同じ骨格で検討したが、金額・経費という題材は
ethics-line観点でリスクが増えるため、この系統自体を選ばなかった（下の除外理由を参照）。

## この曜日にこれを置いた理由
weekly-research が day: mon を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-29 は土曜であり、規定の日曜より1日早い。market データは
 research/market/2026-08-29.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: 参加者が自由記述で答えた日程の都合をどう受け取り、どう並べればGeminiに渡しやすいか
だけを扱う。後続の「Geminiで空き状況を構造化する」記事を読んでいなくても、この1本で
「Geminiに渡せる形のシートが作れる」ところまでは完結する。既出のアンケート要約の入口設計
（W35B-01）とは、締切日時の管理列を持つ点と、対象データが感想ではなく日程の都合である点で
差別化する。

## 実物の計画（themes.md の artifactPlan）
onFormSubmit installable triggerの設定手順＋シート構造の設計図（列定義）＋ 受信〜シート書き込みのGASコード全文

## 出典
- https://developers.google.com/apps-script/guides/triggers/installable
