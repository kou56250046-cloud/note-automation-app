# AIが作らない3画面——空・読み込み中・エラーを足す

themes.md の id: 2026-W34-05
選定理由: strength5: AIに画面を作らせると、データが理想的に揃った状態しか出てこない。ペルソナ「作れたが人に見せられない人」がスクリーンショットを撮るときに崩れるのは、たいていデータが0件のときである。手元で再現でき、before/afterを作れる。market4: UIデザイン 比7.246 / Webデザイン 比2.971。UI Stack（5つの状態）を解説した記事は複数あるが（POSTD・Qiita・note）、いずれも設計論であり、AIの出力に後から足すという文脈の記事は見当たらない。デザイナー向けの記事はあるが、AIにコードを書かせる読者向けの実装記事がないため4とした。willingness3: 3つの状態を足すだけなので、知れば手元で再現できる。無料記事の範囲。artifact5: 空・読み込み中・エラーの3状態を含むafter.htmlと、AIに投げた追加指示の全文、before/afterのデモを出せる。
今日これを選んだ理由: themes.md の day: fri 割り当てどおり。金曜枠として選定した。

## 切り口
W33-01（余白・階層・色数）とW34-01（グラフ）は見た目を直す記事だが、こちらは画面の数を増やす記事である。同じ「3箇所直す」型に見えて対象が違う。「UIには5つの状態がある」という設計論から入らない。「0件のときにスクリーンショットが撮れない」という症状から入り、AIが落とす3つだけを足す。Partial state は扱わないと明記する。

## 出典
- https://postd.cc/how-to-fix-a-bad-user-interface-part1/
- https://qiita.com/KokiSakano/items/edc1e4384478273661d4
- https://u-site.jp/alertbox/empty-state-interface-design
- https://fumufumuui.com/posts/empty-state
