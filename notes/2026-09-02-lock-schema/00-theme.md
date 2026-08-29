# 同時送信の二重書き込みとGeminiの形式崩れを防ぐ。壊れる集計コードと直したコード

themes.md の id: 2026-W36-03
systemId: 2026-W36-schedule-heatmap（1システムを7分割した連載）
serialRole: 失敗
type: free
day: wed / publishDate: 2026-09-02
category: GASと生成AIで他人に渡せる自動化システムを作る / 自動化フローの設計思想
hashtags: GoogleAppsScript, GAS, 業務効率化

## スコア
strength 5 / market 4 / willingness 2 / artifact 5 = 16

## 選定理由（themes.md の rationale）
strength5: learnings.mdに「連載の水（失敗時の扱い）の材料として再利用可」と明記されている
LockServiceの排他制御と、Geminiのレスポンス検証の材料をそのまま使えるが、対象を
「同時にフォームが2件送信されてシートの同じ行を2回処理する」ケースに置き換えている点、
加えてGeminiが期待したJSON形式（曜日×時間帯の配列）で返らなかったときのバリデーションと
再試行という、水曜特有の失敗モードを扱う点でW35B-03とは題材が異なる。
market4: 「GAS」比9.683（需要227.5/供給23.5件/日、有料率11%）、「GoogleAppsScript」比8.879
（需要92.5/供給10.4件/日、有料率13%）。
willingness2: 無料記事想定。トラブル対処は知って終わりに近く、成果物の受け渡しは発生しない。
artifact5: 「同時送信でシートの同じ行を2回処理してしまうコード→LockService.tryLockで
直したコード」と「Geminiのレスポンスが期待したJSON形式で返らず落ちるコード→スキーマ検証＋
最大3回の再試行で直したコード」の2対を出せる。
次点: 「同一人物の再送信を検出して上書きする」処理も検討したが、メールアドレス突合の
仕組みまで含めると水曜1本に収まらないため、今回は同時実行の排他制御とJSON形式の検証に絞った。

## この曜日にこれを置いた理由
weekly-research が day: wed を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-29 は土曜であり、規定の日曜より1日早い。market データは
 research/market/2026-08-29.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: 「フォームが同時に2件送信されたときに同じ行を2回処理してしまう」「Geminiが
期待した形式のJSONを返さないと処理が落ちる」の2つの壊れ方と直し方だけを扱う。月・火を
読んでいなくても、「GASから外部APIを叩く自動化」であれば業種を問わず適用できる形で書く。
既出のアンケート集計の失敗対応（W35B-03）とは、対象データと失敗モード（429ではなく
形式崩れ）が異なる点で差別化する。

## 実物の計画（themes.md の artifactPlan）
壊れるコード（同時送信の二重処理／Geminiの形式崩れで落ちる）→ 直したコード （LockService.tryLock／スキーマ検証つき再試行）の対を2組

## 出典
- https://developers.google.com/apps-script/reference/lock/lock-service
- https://ai.google.dev/gemini-api/docs/structured-output
