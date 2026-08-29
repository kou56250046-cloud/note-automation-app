# 集計のトリガーと権限。全員が空いている枠が決まったらSlackに通知する設定

themes.md の id: 2026-W36-05
systemId: 2026-W36-schedule-heatmap（1システムを7分割した連載）
serialRole: 運用
type: free
day: fri / publishDate: 2026-09-04
category: GASと生成AIで他人に渡せる自動化システムを作る / 自動化フローの設計思想
hashtags: GoogleAppsScript, GAS, 業務効率化

## スコア
strength 4 / market 4 / willingness 2 / artifact 5 = 15

## 選定理由（themes.md の rationale）
strength4: account.md サブ2「権限・スコープ・実行ユーザー。他人に渡すときに必ず詰まる
場所」に対応する。トリガー実行者の権限周りは調べ直しがやや必要なためstrength5ではなく4。
market4: 「GAS」比9.683（需要227.5/供給23.5件/日、有料率11%）、「GoogleAppsScript」比8.879
（需要92.5/供給10.4件/日、有料率13%）。
willingness2: 無料記事想定。通知の仕組みを知っても、Slack Webhook URLの発行など
読者側の準備工程が別途残る。
artifact5: 締切時刻に走る時間主導トリガーの設定手順＋実行権限（誰の権限で動くか）の
確認手順＋全員一致の空き枠を検出してSlack Incoming WebhookにPOSTする通知コード全文を出せる。
次点: 「回答が集まるたびに即時通知する」形も検討したが、締切前に何度も通知が飛ぶと
読者側の運用が煩雑になるため、締切後の一括集計・通知に絞った。

## この曜日にこれを置いた理由
weekly-research が day: fri を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-29 は土曜であり、規定の日曜より1日早い。market データは
 research/market/2026-08-29.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: 「誰の権限でトリガーが動くか」「全員が空いている枠をどう検出して通知するか」の
2点だけを扱う。他の曜日を読んでいなくても、既にGeminiの出力（曜日×時間帯の空き状況）が
シートにある前提だけで、この1本の通知設定が再現できる。既出のGASトリガー記事（動かない
原因の切り分け）とは、対象が「動かない」ではなく「権限と通知の設計」である点で差別化する。

## 実物の計画（themes.md の artifactPlan）
締切時刻に走る時間主導トリガーの設定手順＋実行権限の確認手順＋ 全員一致の空き枠検出→Slack通知のGASコード全文

## 出典
- https://developers.google.com/apps-script/guides/triggers/installable
