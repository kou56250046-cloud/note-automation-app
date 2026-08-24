# 二重実行と429エラーを防ぐ。壊れるアンケート集計コードと直したコード

themes.md の id: 2026-W35B-03
systemId: 2026-W35B-survey-digest（1システムを7分割した連載）
serialRole: 失敗
type: free
day: wed / publishDate: 2026-08-26
category: GASと生成AIで他人に渡せる自動化システムを作る / 自動化フローの設計思想
hashtags: GoogleAppsScript, GAS, 業務効率化

## スコア
strength 5 / market 4 / willingness 2 / artifact 5 = 16

## 選定理由（themes.md の rationale）
strength5: 旧W35-02（LockServiceの二重実行）・旧W35-05（Gemini API 429の再試行）が
「連載の水（失敗時の扱い）の材料」としてlearnings.mdに再利用可と明記されており、
手元の材料をそのまま使える。
market4: 「GAS」比6.301（需要207.0/供給32.9件/日、有料率11%）、「GoogleAppsScript」比4.407
（需要90.0/供給20.4件/日、有料率10%）。
willingness2: 無料記事想定。トラブル対処は知って終わりに近く、成果物の受け渡しは発生しない。
artifact5: 「同じ回答を2回処理してしまうコード→LockServiceのtryLockで直したコード」と
「Gemini 429で処理が止まるコード→指数バックオフで直したコード」の2対を出せる。
次点は無し（この2本の材料は既に確定しており、他候補と比較する必要がなかった）。

## この曜日にこれを置いた理由
weekly-research が day: wed を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-24 は月曜であり、規定の日曜より1日遅い。market データは
 research/market/2026-08-24.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: 「フォーム回答が同時に2件来たときに同じ行を2回処理してしまう」「Geminiが429を
返すと処理がそこで止まる」の2つの壊れ方と直し方だけを扱う。月・火を読んでいなくても、
「GASから外部APIを叩く自動化」であれば業種を問わず適用できる形で書く。
既出のGASトリガー記事（起動しない原因の切り分け）とは、扱う障害の種類（起動しない/
二重に走る・止まる）が異なる点で差別化する。

## 実物の計画（themes.md の artifactPlan）
壊れるコード（二重処理／429で停止）→ 直したコード（LockService.tryLock／ 指数バックオフ付きリトライ）の対を2組

## 出典
- https://developers.google.com/apps-script/reference/lock/lock-service
- https://ai.google.dev/gemini-api/docs/troubleshooting
