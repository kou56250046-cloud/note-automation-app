# アンケートの自由記述をGeminiで要約・分類する。プロンプトと呼び出しコードの全文

themes.md の id: 2026-W35B-02
systemId: 2026-W35B-survey-digest（1システムを7分割した連載）
serialRole: 中核
type: free
day: tue / publishDate: 2026-08-25
category: GASと生成AIで他人に渡せる自動化システムを作る / 差し替えて使う自動化テンプレート
hashtags: GAS, GeminiAPI, プロンプト

## スコア
strength 5 / market 4 / willingness 2 / artifact 5 = 16

## 選定理由（themes.md の rationale）
strength5: account.md サブ3「Gemini APIは自動化の材料として扱う」にど真ん中で対応する。
market4: 「GAS」は比6.301（需要207.0/供給32.9件/日、有料率11%）で全体の主軸。ハッシュタグには
「GeminiAPI」（比21.446、需要27.0/供給1.3件/日、有料率10%、総563件・計測タグ中1位）を採用した。
総563件は他タグより母数が小さいニッチ帯である点をここに明記する。内容（Gemini呼び出しコード）
と直接一致するため、NotebookLM（既定タグ）ではなくこちらを主軸にした（ヘッダーの差し戻し対応参照）。
willingness2: 無料記事想定。プロンプトを知っても、自分のシートに繋ぎ込む工程がまだ残る。
artifact5: 要約＋カテゴリ＋感情スコアを返すプロンプト全文と、responseSchemaでJSON型を固定した
UrlFetchApp呼び出しコード全文を出せる。
次点は「問い合わせ返信文自動生成（多言語対応）」。既出記事「問い合わせをGeminiで自動仕分けする」
と中核処理が同型でdedup.py に高類似度で引っかかるリスクが高く、この系統自体を選ばなかった。

## この曜日にこれを置いた理由
weekly-research が day: tue を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-24 は月曜であり、規定の日曜より1日遅い。market データは
 research/market/2026-08-24.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: シートのB列に自由記述が1件入っている状態から、Geminiに投げて要約・カテゴリ・
感情スコアのJSONを受け取るところまでを、この1本だけで再現できるようにする。
既出の「問い合わせをGeminiで自動仕分けする」が固定ラベルへのルーティングだったのに対し、
こちらは自由記述の要約と感情スコアという、出力の形が異なる変換を扱う点で差別化する。

## 実物の計画（themes.md の artifactPlan）
要約・カテゴリ分類・感情スコアを返すプロンプト全文＋responseSchema定義＋ UrlFetchAppでのGemini API呼び出しコード全文

## 出典
- https://ai.google.dev/gemini-api/docs/structured-output
