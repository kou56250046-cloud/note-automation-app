# Geminiに自由記述の空き時間を構造化させる。プロンプトと呼び出しコードの全文

themes.md の id: 2026-W36-02
systemId: 2026-W36-schedule-heatmap（1システムを7分割した連載）
serialRole: 中核
type: free
day: tue / publishDate: 2026-09-01
category: GASと生成AIで他人に渡せる自動化システムを作る / 差し替えて使う自動化テンプレート
hashtags: GAS, GeminiAPI, プロンプト

## スコア
strength 5 / market 5 / willingness 2 / artifact 5 = 17

## 選定理由（themes.md の rationale）
strength5: account.md サブ3「Gemini APIは自動化の材料として扱う」にど真ん中で対応する。
「火水木ならいつでも」のような自由記述を、曜日×時間帯のboolean配列に変換する処理は
要約でも固定ラベルへの分類でもなく、**抽出・正規化**という別の変換タイプであり、
既出の議事録要約（要約）・問い合わせ仕分け（固定ラベル分類）・アンケート要約
（要約＋感情スコア）のいずれとも中核処理の形が異なる。
market5: market/2026-08-29.md の「GeminiAPI」は需要27.0 / 供給1.4件/日で比19.747
（有料率8%、総570件）。計測17タグ中1位。総570件は他タグより母数が小さいニッチ帯である点を
明記する。ハッシュタグにはこちらを主軸に採用した（内容と直接一致するため、既定のNotebookLM
ではなくGeminiAPIを使う。理由はW35B以降と同じ判断基準）。「GAS」比9.683も高い帯。
willingness2: 無料記事想定。プロンプトを知っても、自分のシートに繋ぎ込む工程がまだ残る。
artifact5: 曜日×時間帯のboolean配列（例: {"mon":{"am":false,"pm":true}, ...}）を返す
responseSchemaの定義＋プロンプト全文＋UrlFetchAppでのGemini API呼び出しコード全文を出せる。
次点: 「バグ報告の重複検出＋優先度判定」は中核処理がW35B-02（要約＋カテゴリ＋感情スコアの
JSON化）と構造的に酷似し、分類・スコアリングという同じ変換タイプになるためこの系統は
選ばなかった（下の除外理由を参照）。

## この曜日にこれを置いた理由
weekly-research が day: tue を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-29 は土曜であり、規定の日曜より1日早い。market データは
 research/market/2026-08-29.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: シートの自由記述列に「都合」が1件入っている状態から、Geminiに投げて曜日×時間帯の
空き/不可を表すJSONを受け取るところまでを、この1本だけで再現できるようにする。
既出の「要約する」「分類する」記事とは、出力が固定ラベルでも自由文でもなく**構造化された
スケジュール配列**である点で明確に異なる変換を扱う。

## 実物の計画（themes.md の artifactPlan）
曜日×時間帯のboolean配列を返すresponseSchema定義＋自由記述を構造化させる プロンプト全文＋UrlFetchAppでのGemini API呼び出しコード全文

## 出典
- https://ai.google.dev/gemini-api/docs/structured-output
