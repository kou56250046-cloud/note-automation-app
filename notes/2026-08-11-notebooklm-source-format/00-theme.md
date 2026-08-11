# NotebookLM は入れる前に決まる——ソースを整形してから読ませる

themes.md の id: 2026-W33-08
選定理由: account.md サブ③「出力精度を上げるテクニック（設定・プロンプト・前処理）」の前処理側。market/2026-08-07.md でNotebookLMは比6.276で計測タグ2位。投入前のソース整形はテンプレート化した記事が見当たらないため差別化できる。整形プロンプト全文＋整形前後のソース＋同じ質問への回答before/afterを出せるためartifact5。
今日これを選んだ理由: 火曜（2026-08-11）時点で day: tue の在庫は使用済み。本日3本目として、pending freeの中で次に高いスコア（17/20）の本テーマを繰り上げて使用した。W33-03（出力側のカスタム指示）とは投入側／出力側で切り口を分けており、重複しない設計になっている。

## 切り口
カスタム指示（出力側）を扱わない。W33-03が出力側を担当するため、こちらは投入側だけに絞る。「ゴミを入れればゴミが出る」で終わっている既存記事に対し、何をどう書き換えるかをテンプレートで固定する点で差別化する。第三者が出した精度向上の数値は出典を明記して引用するに留め、自分の実測として書かない。

## 出典
- https://note.com/large_bear7730/n/n9fbe2b15daa2
- https://zenn.dev/sonicmoov/articles/bf6e52ad2fabb3
- https://www.lifehacker.jp/article/2603simple-note-taking-tweaks-make-notebooklm-smart/
- https://note.com/ai_komon/n/ndd2a1fdc500b
- https://zenn.dev/kauchi/articles/read-book-with-notebook-lm
