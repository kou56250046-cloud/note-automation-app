# アンケート自動集計のトリガーと権限。ネガティブな回答だけSlackに通知する設定

themes.md の id: 2026-W35B-05
systemId: 2026-W35B-survey-digest（1システムを7分割した連載）
serialRole: 運用
type: free
day: fri / publishDate: 2026-08-28
category: GASと生成AIで他人に渡せる自動化システムを作る / 自動化フローの設計思想
hashtags: GoogleAppsScript, GAS, 業務効率化

## スコア
strength 4 / market 4 / willingness 2 / artifact 5 = 15

## 選定理由（themes.md の rationale）
strength4: account.md サブ2「権限・スコープ・実行ユーザー。他人に渡すときに必ず詰まる
場所」に対応する。トリガー実行者の権限周りは調べ直しがやや必要なためstrength5ではなく4。
market4: 「GAS」比6.301（需要207.0/供給32.9件/日、有料率11%）、「GoogleAppsScript」比4.407
（需要90.0/供給20.4件/日、有料率10%）。
willingness2: 無料記事想定。通知の仕組みを知っても、Slack Webhook URLの発行など
読者側の準備工程が別途残る。
artifact5: 時間主導トリガーの設定手順＋ネガティブ回答（感情スコアが閾値以下）を検出して
Slack Incoming WebhookにPOSTする通知コード全文を出せる。
次点は無し（このスロットは運用面の権限・通知に固定されており、他候補を比較していない）。

## この曜日にこれを置いた理由
weekly-research が day: fri を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-24 は月曜であり、規定の日曜より1日遅い。market データは
 research/market/2026-08-24.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: 「誰の権限でトリガーが動くか」「ネガティブな回答だけをどう検出して通知するか」の
2点だけを扱う。他の曜日を読んでいなくても、既にGeminiの出力（感情スコア）がシートに
ある前提だけで、この1本の通知設定が再現できる。
既出のGASトリガー記事（動かない原因の切り分け）とは、対象が「動かない」ではなく
「権限と通知の設計」である点で差別化する。

## 実物の計画（themes.md の artifactPlan）
時間主導トリガーの設定手順＋実行権限（誰の権限で動くか）の確認手順＋ ネガティブ回答検出→Slack通知のGASコード全文

## 出典
- https://zenn.dev/tmassh/articles/0a69dfd3c5af4c
