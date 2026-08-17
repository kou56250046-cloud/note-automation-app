# NotebookLMに、ソース同士の食い違いを先に洗い出させる質問テンプレート

themes.md の id: 2026-W34-03
選定理由: サブ③の軸。複数の記事を放り込んで要約させると、出典によって数値や前提が食い違ったまま、なめらかな1つの答えに均されて出てくる。手元で再現でき、引用チップの差で示せる。account.md が NotebookLM 側から名乗る方針なので範囲内。market4（需要277・比6.27で計測タグ中1位）。willingness3。artifact4（質問テンプレート全文と回答比較を出せる）。

今日これを選んだ理由: themes.md で day: wed に割り当て済み。曜日どおりに引いた。

## 切り口
W33-03 は出力側（カスタム指示）、W33-08 は投入側（ソース整形）を扱った。こちらは質問の側だけに絞り、3本が重ならないようにする。「NotebookLMは嘘をつかない」で終わっている既存記事に対し、嘘ではなく食い違いを平らに均してしまう点を症状として提示する。第三者が出した精度の数値は出典を明記して引用するに留め、自分の実測として書かない。手元で確認できるのは引用範囲と回答の差だけなので、そこは数値化せず並置で見せる。

## 出典
- https://note.com/ss_chiebukuro/n/necd70ebb3903
- https://uravation.com/media/notebooklm-business-prompts-guide/
- https://www.smartshoki.com/blog/generationai/notebooklm-howto/
