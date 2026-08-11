# themes — ネタ在庫
#
# status: pending  未使用
#         used     記事化済み
#         rejected 却下（人間のボタン操作、またはカテゴリ改訂による範囲外）
#
# 日次生成はここから1本引くだけ。web 検索はしない。
#
# ============================================================
# 2026-08-07 W32 を全て rejected にした
# ------------------------------------------------------------
# 主カテゴリを「Claude Code の運用と保守」から
# 「生成AIで見せられる成果物を作る」に改訂したため、
# W32 の在庫は全て範囲外になった。
#
# 実測（research/market/2026-08-06.md）で ClaudeCode タグの
# 需要÷供給が 0.064（1日425件投稿・スキ中央値27）と判明し、
# カテゴリごと破棄している。理由は knowledge/learnings.md の
# 「カテゴリ改訂の記録」に残した。
#
# **同日に W33 を7本仕込み、在庫は復旧している。** 下の W33 を参照。
# ============================================================
#
# ============================================================
# 2026-08-07 weekly-research を手動実行（在庫 6 → 7）
# ------------------------------------------------------------
# W33-05 が記事化済み（notes/2026-08-07-lp-firstview/meta.json の
# themeId）にもかかわらず status: pending のままだったため used に直した。
# 実質在庫が6本になっていたので、手順2「7本になるまで補充」に従い
# W33-08 を1本だけ足している。7本を無条件に足してはいない。
#
# 補充枠をサブ③にしたのは、木(サブ①paid) と土(サブ②) に挟まれる
# 金曜にサブ①を置くと木と連続するためである（手順8）。
# 実行順のサブカテゴリは 土2 → 日3 → 月1 → 火2 → 水3 → 木1 → 金3 で連続なし。
# ============================================================

- id: 2026-W32-01
  title: 「スキルが起動しない・呼ばれない」を3手順で切り分ける
  type: free
  day: mon
  category: Claude Codeの運用と保守 / トラブルシューティング
  score:
    strength: 5
    market: 4
    willingness: 2
    total: 11
  rationale: |
    strength5: account.md のペルソナ「frontmatter を3回書き直した人」に直接対応する。
    working directory のスコープ、frontmatter のキー表記ゆれ（ハイフン/アンダースコア混在）、
    description の文字数上限、model パラメータがスラッシュ起動でしか効かない、
    サブエージェントのセッション上限（CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION）といった
    具体的な原因が複数の一次情報で確認できており、手元の材料だけで書ける。
    market4: 「スキルの作り方」記事は多数あるが、起動しない/呼ばれないケースを
    切り分け手順としてまとめた記事は見当たらなかった（ai-tech.md 空白地帯1と符合）。
    willingness2: 無料記事想定。情報を知れば手元で直せる内容で、成果物の受け渡しは発生しない。
    次点: 「Claude Code Skills の書き方完全ガイド」は情報量が多いが、主題が「作り方」であり
    account.md の禁止事項（入門・インストール手順）に抵触するため候補から外した。
  angle: 「原因一覧」ではなく「上から順に確認する3手順」の形にする。ai-tech.md で確認した
    3アカウントはいずれも成功事例中心で、失敗の切り分けフローを持つ記事がない点で差別化する。
  sources:
    - https://qiita.com/KM-Eye/items/ceeb51dadcf3726c045d
    - https://zenn.dev/cti1650/articles/claude-code-frontmatter-token-measurement
    - https://qiita.com/kawabe0201/items/e1a7dfbd7f363001f66e
    - https://dev.classmethod.jp/articles/claude-code-skill-model-not-switching/
    - https://blog.serverworks.co.jp/claude-code-subagents-guide
    - https://fyve.co.jp/claude-code/articles/claude-code-subagent-limit
    - https://zenn.dev/genda_jp/articles/16d35ffa464d65
  status: used
- id: 2026-W32-02
  title: 何にトークンを使っているか——/context で見える化してから減らす
  type: free
  day: tue
  category: Claude Codeの運用と保守 / コストとトークン設計
  score:
    strength: 4
    market: 4
    willingness: 3
    total: 11
  rationale: |
    strength4: CLAUDE.md 自体が「LLM に考えさせない判定はコードへ」「web検索は週次に集約」という
    トークン設計方針を実践しており、その考え方を一般化できる。
    market4: ai-tech.md 空白地帯2「個人開発者向けの API コスト管理ノウハウ」は調査範囲で
    見つからなかった。/context・/compact・/clear の使い方記事はあるが、
    「何にどれだけ使っているかを見立ててから削る」という順序で書いた記事は少ない。
    willingness3: 考え方の提示が中心で、丸ごと渡せるテンプレートまでは至らないため中程度。
    次点: 「Claude Code トークンを最大90%削減する10のリポジトリ」はツール紹介が中心で
    account.md のペルソナ（詰まっている個人開発者）にはオーバースペック。市場性は高いが
    強みが弱い（手元の運用経験と結びつかない）ため落とした。
  angle: ツール紹介ではなく「自分のプロジェクトのどこにトークンを使っているかを
    棚卸しする手順」に絞る。note-automation の週次/日次分離の実例を根拠として使う。
  sources:
    - https://blog.nextscape.net/archives/2026/06/03/093108
    - https://qiita.com/Yasushi-Mo/items/0071f71ba102d2125c13
    - https://y-agent.github.io/inside-claude-code/04-context-compaction.html
    - https://pasqualepillitteri.it/en/news/1181/claude-code-token-10-github-repos-savings
  status: rejected   # 2026-08-07 カテゴリ改訂により範囲外

- id: 2026-W32-03
  title: 「依存関係を飛ばさない」設計——止まる場所を先に決めておく
  type: free
  day: wed
  category: Claude Codeの運用と保守 / 壊れにくい設計
  score:
    strength: 5
    market: 3
    willingness: 2
    total: 10
  rationale: |
    strength5: CLAUDE.md ルール2「前工程の出力ファイルが無い状態で次を実行しない。
    欠けていたら停止して実行すべきスキル名を伝える」という自分の設計思想をそのまま素材にできる。
    market3: 責任分離・description の書き方といったベストプラクティス記事はあるが、
    「失敗を前提に、どこで止めるかを先に決める」という視点の記事は少なく、中程度の市場性。
    willingness2: 考え方の提示が中心で無料記事向き。
    次点: 「Claude Code エージェント設計 3分離パターン（計画・生成・評価）」は情報として
    近いが、Anthropic 公式記事の要約に留まりやすく、手元の実例（本リポジトリの
    critic/auditor 分離）と組み合わせないと差別化できない。今回はテーマとしては採用せず、
    本記事の中の一事例として引用する形にとどめる。
  angle: 「動くように作る」ではなく「止まる場所を先に決める」という逆方向の設計指針にする。
    account.md の直接競合（作り方の商品化）とは主題がずれるため安全な角度。
  sources:
    - https://qiita.com/nogataka/items/efe8eb9df612d2211221
    - https://qiita.com/nogataka/items/dc115e441ad1552e35ce
    - https://code.claude.com/docs/ja/best-practices
    - https://uravation.com/media/claude-code-best-practices-top10-2026/
  status: rejected   # 2026-08-07 カテゴリ改訂により範囲外

- id: 2026-W32-04
  title: 自動化パイプラインが止まったときの診断フローチャート＋ログ確認スクリプト集
  type: paid
  day: thu
  execution: local
  category: Claude Codeの運用と保守 / トラブルシューティング
  score:
    strength: 5
    market: 4
    willingness: 5
    total: 14
  rationale: |
    strength5: 「設定ファイルの記述が効いていない」「ゲートが構造的に通らない」は
    本リポジトリ自身の運用ルール（CLAUDE.md の階層・行数・@import 構文、
    permissions と hooks の使い分け）と直結しており、手元の設計をそのまま素材にできる。
    market4: ai-tech.md 空白地帯1にどんぴしゃ。CLAUDE.md が無視される原因を診断的に
    整理した記事はあるが（unbx.dev の「6つの原因」）、それをスクリプト・チェックリスト化して
    配布している道具型の商品は確認できなかった。
    willingness5: 「配置」「行数」「@import」「permissions vs hooks」「ゲートの
    構造的な失敗」を横断するフローチャートと、ログ確認用のスクリプト一式を
    丸ごと渡せる。詰まった時間を直接削減するため支払い意欲が高いと判定した。
    次点: 月火水金土の無料記事（起動しない/生成が切れる）と重複しないよう、
    有料note は「設定ファイルが効かない」「ゲートが通らない」の2つに絞り込んだ。
    4つの原因を全部無料で出すと有料版の価値が薄まるため、意図的に配分を分けている。
  angle: 説明記事ではなく「フローチャート＋grep/lint実行スクリプトのテンプレート」を
    渡す道具型。買った人が自分のリポジトリにそのままコピーして使える形にする。
  sources:
    - https://qiita.com/godhexagon/items/5ad55f1a7723ec095429
    - https://zenn.dev/rhythmcan/articles/40da82caa3e788
    - https://unbx.dev/ja/blog/claude-code-ignores-claude-md
    - https://python-engineer.co.jp/08-claude-md-effective/
    - https://qiita.com/enomoso_pm/items/623bd77ce2bb89569e3d
    - https://zenn.dev/ux_xu/articles/4f57169b0dd820
    - https://fyve.co.jp/claude-code/articles/claude-code-subagent-limit
  productTypeHint: tool
  status: rejected   # 2026-08-07 カテゴリ改訂により範囲外

- id: 2026-W32-05
  title: 生成が途中で切れる原因を3つに切り分ける——出力上限・圧縮・権限詰まり
  type: free
  day: fri
  category: Claude Codeの運用と保守 / トラブルシューティング
  score:
    strength: 4
    market: 3
    willingness: 2
    total: 9
  rationale: |
    strength4: CLAUDE.md 自身が「max_tokens は思考＋本文の合計上限。記事が途中で
    切れたらここを疑う」と明記しており、実際の運用知見と一致する。
    market3: CLAUDE_CODE_MAX_OUTPUT_TOKENS の存在や compaction の仕組みを
    説明する記事は複数あるが、「出力上限／自動圧縮／権限待ちで止まる」の3系統を
    切り分ける形でまとめた記事は見当たらなかった。ただし個別の情報は既に出回っており
    月・木ほどの空白ではないため3点とした。
    willingness2: 環境変数の設定を知れば解決するケースが多く、成果物の受け渡しは
    発生しにくい。無料記事向き。
    次点: 「Context Rot を避けるため120Kトークン以下に抑える」という運用テクニックは
    面白いが、account.md のペルソナ（詰まって止まっている人）よりも上級者向けの
    最適化テーマであり、今週は見送った。
  angle: 「上限を上げる」で終わらせず、3つの原因（出力トークン上限／自動要約による
    文脈欠落／hooks・permissionsでの待機）を切り分けるチェック順序を提示する。
  sources:
    - https://note.com/real_pansy2412/n/n0ad534273b7b
    - https://code.claude.com/docs/ja/errors
    - https://zenn.dev/okamyuji/articles/claude-code-token-limit-survival-guide
    - https://deepwiki.com/anthropics/claude-code/3.3-context-window-and-compaction
    - https://note.com/kawaidesign/n/n067cab520432
  status: rejected   # 2026-08-07 カテゴリ改訂により範囲外

- id: 2026-W32-06
  title: モデルとエフォートの配分——Sonnet/Opusをどこで切り替えるか
  type: free
  day: sat
  category: Claude Codeの運用と保守 / コストとトークン設計
  score:
    strength: 4
    market: 3
    willingness: 3
    total: 10
  rationale: |
    strength4: CLAUDE.md の「モデル配分」表（日次執筆はSonnet、letter-audit/ethics-line
    はOpus、理由まで明記）をそのまま実例として使える。
    market3: Max20x vs API従量課金、プロンプトキャッシュといった料金比較記事は多いが、
    「どの工程にどのモデル・エフォートを割り当てるか」という配分設計の記事は少ない。
    willingness3: 考え方の提示にとどまるが、月額固定費に直結するため中程度と判定。
    次点: 「Claude Code Usage Limits 2026（5時間キャップ・週次上限）」という制度解説は
    market性は高いが強み4未満（一次情報の翻訳に近く、手元の設計と直結しない）ため
    テーマ本体ではなく本記事内の裏付けとして使うにとどめた。
  angle: 料金プランの比較ではなく「工程ごとにモデルとエフォートをどう割り振れば
    法的リスク（ethics-line）とコストを両立できるか」という配分の視点で書く。
  sources:
    - https://www.morphllm.com/claude-code-usage-limits
    - https://ai-revolution.co.jp/media/claude-code-cost-optimization/
    - https://www.qes.co.jp/media/claudecode/a925
    - https://aiagent-navi.com/ai-agent/claude-code-billing-guide/
    - https://support.anthropic.com/ja/articles/11145838-max-プランでの-claude-code-の使用
  status: rejected   # 2026-08-07 カテゴリ改訂により範囲外

- id: 2026-W32-07
  title: 壊れにくいスキル・エージェント定義の雛形とチェックリスト
  type: paid
  day: sun
  execution: local
  category: Claude Codeの運用と保守 / 壊れにくい設計
  score:
    strength: 5
    market: 3
    willingness: 4
    total: 12
  rationale: |
    strength5: 本リポジトリの skills/agents の実装（物差しを持つスキル、
    critic/auditor の分離、依存関係チェック）をそのまま雛形化できる。
    market3: エージェント設計のベストプラクティス記事はあるが（Anthropic公式・Qiita）、
    コピーしてすぐ使える frontmatter 雛形＋依存チェックスクリプトまで配布している
    ものは見当たらなかった。ただし「作り方」に寄りすぎると江守義樹氏の領域と
    重なるため、主題は「壊れにくくするための型」に絞り、3点とやや抑えめに判定した。
    willingness4: スキル定義・エージェント定義のテンプレート一式と、依存関係の
    有無を機械的にチェックするスクリプトを丸ごと渡せる。自作するより速いという
    痛みに直結するため4とした。
    次点: 「Claude Code Agent Teams 設計」は複数プロジェクト並列管理という
    より上級者向けの話で、account.md のペルソナ（まだ詰まっている段階）には
    早いと判断し見送った。
  angle: 「動く構成の作り方」ではなく「壊れにくくするための最小限の型」に絞る。
    productType の書き方、依存関係の書き方、判断基準の持たせ方をテンプレート化し、
    パイプライン全体の構築手順そのものは扱わない（直接競合を避ける一線を明示）。
  sources:
    - https://code.claude.com/docs/ja/sub-agents
    - https://qiita.com/nogataka/items/efe8eb9df612d2211221
    - https://qiita.com/nogataka/items/dc115e441ad1552e35ce
    - https://code.claude.com/docs/ja/best-practices
    - https://qiita.com/nogataka/items/4787c956aeb547b1421c
  productTypeHint: tool
  status: rejected   # 2026-08-07 カテゴリ改訂により範囲外

# ============================================================
# 2026-W33（2026-08-07 仕込み）
# 新カテゴリ「生成AIで人に見せられる成果物を作る」の初回在庫。
# 市場性は research/market/2026-08-07.md の実測を引用している。
# 4軸スコア（強み / 市場性 / 支払い意欲 / artifact）。artifact 2以下は入れない。
# ============================================================

- id: 2026-W33-01
  title: AIが作った管理画面を「余白・階層・色数」の3箇所だけ直す
  type: free
  day: mon
  category: 生成AIで見せられる成果物を作る / AI×Webデザイン
  hashtags: [Webデザイン, UIデザイン, LP制作, 生成AI]
  score:
    strength: 5
    market: 5
    willingness: 3
    artifact: 5
    total: 18
  rationale: |
    strength5: account.md のペルソナ「作れたが画面がテンプレ丸出しで見せられない人」に直撃する。
    サブ①のど真ん中。
    market5: market/2026-08-07.md のタグ「Webデザイン」は需要374 / 供給47.9件/日で比 7.801、
    「UIデザイン」は 88.5 / 14.6 で比 6.07。どちらも計測した14タグ中の最上位帯である。
    クラスタ #9（デザイン / AI / UI）はスキ中央値156、記事数28で比 5.5714。
    willingness3: 情報を知れば手元で直せる。成果物の受け渡しは木曜の有料noteに寄せる。
    artifact5: before/after のデモページ、変更点の CSS、指示したプロンプト全文の3点すべてを出せる。
    次点: 「Claude Code に design.md を書かせる」は市場性は同等だが、
    artifact が設定ファイル1つに留まり before/after を見せられないため木曜の有料note側に回した。
  artifactPlan: |
    notes/{slug}/demo/before.html と after.html を作り、build-demo.mjs で並置ビューを生成する。
    記事には デモURL ＋ 変更した CSS の差分 ＋ Claude Code に投げたプロンプト全文 を載せる。
  angle: 「デザインを学ぶ」ではなく「AIの出力を3箇所だけ直す」。
    直す箇所を数え上げられる形にして、読者が自分の画面で再現できるようにする。
  sources:
    - https://fyve.co.jp/claude-code/articles/claude-code-ui-design-guide
    - https://qiita.com/sarap422/items/36fdabedda0fb8693b3f
    - https://zenn.dev/rescuenow/articles/08b9496054a86a
  status: used   # 2026-08-11 notes/2026-08-11-ui-3points として記事化（曜日から繰り上げ）

- id: 2026-W33-02
  title: Gemini + GAS で議事録を要約する。コードとプロンプトの全文
  type: free
  day: tue
  category: 生成AIで見せられる成果物を作る / Gemini+GASの自動化
  hashtags: [GAS, GoogleAppsScript, 業務効率化, Gemini]
  score:
    strength: 4
    market: 5
    willingness: 4
    artifact: 5
    total: 18
  rationale: |
    strength4: サブ②のど真ん中。手元で動かして確認できる。
    market5: market/2026-08-07.md のタグ「GAS」は需要118 / 供給19.7件/日で比 5.985、
    「GoogleAppsScript」は 84 / 14.2 で比 5.908。さらに有料率が GAS 10% /
    GoogleAppsScript 13% と、計測タグの中で高い部類にある。売れている領域である。
    willingness4: コードを丸ごと渡せる。時間の削減に直結する。
    artifact5: GASコード全文、プロンプト全文、動作条件（トリガー・スコープ・APIキーの置き場）を出せる。
    次点: 「Gemini API のモデル選択」は情報としては近いが、実物がコード断片に留まり
    artifact が3止まりのため落とした。
  artifactPlan: |
    UrlFetchApp で Gemini API を叩く GAS を動く単位で全文掲載する。
    APIキーは PropertiesService に置く形にし、ハードコードしない書き方をそのまま見せる。
    動作条件（必要なスコープ、トリガー設定、実行時間の上限）を明記する。
  angle: 「GASでAIが使える」という紹介ではなく、議事録要約という1用途に絞ってコードを完成させる。
    汎用フレームワークを作らない。1つのことをする短いコードを渡す。
  sources:
    - https://qiita.com/btncon/items/d6c241b58818b062ba2d
    - https://qiita.com/kazukichi_0914/items/4e21ddfaaf961b526f8e
    - https://qiita.com/kazukichi_0914/items/0ab3e790f860a8850dff
    - https://codelabs.developers.google.com/codelabs/gemini-workspace?hl=ja
  status: used   # 2026-08-11 notes/2026-08-11-gas-minutes として記事化

- id: 2026-W33-03
  title: NotebookLM のカスタム指示で、出力のブレを止める
  type: free
  day: wed
  category: 生成AIで見せられる成果物を作る / NotebookLM・精度向上
  hashtags: [NotebookLM, Gemini, プロンプト, 生成AI]
  score:
    strength: 4
    market: 5
    willingness: 3
    artifact: 4
    total: 16
  rationale: |
    strength4: サブ③の軸。account.md が「プロンプト」「ClaudeCode」を主語にせず
    NotebookLM 側から名乗る方針にしているため、この切り口は範囲のど真ん中にある。
    market5: market/2026-08-07.md のタグ「NotebookLM」は需要277 / 供給44.1件/日で比 6.276。
    需要の絶対値がタグ中2位（Webデザイン374に次ぐ）。クラスタ #4（NotebookLM / note / Gemini）は
    記事数83・スキ中央値156。参照タグの「プロンプト」は比 0.266 で埋もれるため主軸にしない。
    willingness3: 設定を知れば手元で再現できる。日曜の有料noteでフロー全体を渡す。
    artifact4: カスタム指示の全文と、適用前後の出力の実物を並べられる。
    コードではないため5には届かない。
    次点: 「NotebookLM で音声解説を作る」は市場性が高いが、成果物が音声で
    note の記事内に実物を置けないため artifact 2 と判定して落とした。
  artifactPlan: |
    カスタム指示のテキスト全文（コピーしてそのまま貼れる形）と、
    同じ質問に対する「指示なし」「指示あり」の出力を並べて載せる。
  angle: 機能紹介ではなく「同じ質問で出力が毎回変わる」という具体的な症状から入り、
    カスタム指示を止血策として提示する。
  sources:
    - https://googleworkspace.tscloud.co.jp/gemini/notebooklm-custom-instructions
    - https://note.com/re_birth_ai/n/nf22eb4aa5d93
    - https://www.i3design.jp/in-pocket/how-to-use-notebooklm/
  status: used   # 2026-08-11 notes/2026-08-11-notebooklm-custom として記事化（曜日から繰り上げ）

- id: 2026-W33-04
  title: AIにUIを作らせる指示テンプレート集（design.md 雛形つき）
  type: paid
  day: thu
  execution: local
  category: 生成AIで見せられる成果物を作る / AI×Webデザイン
  hashtags: [Webデザイン, UIデザイン, LP制作, 生成AI]
  score:
    strength: 5
    market: 5
    willingness: 5
    artifact: 5
    total: 20
  rationale: |
    strength5: サブ①の中核。無料記事（月・金）で見せた直し方を、
    「毎回同じ品質で出させる型」としてまとめられる。
    market5: Webデザイン 比7.801 / UIデザイン 比6.07。ただし有料率は
    Webデザイン4% / UIデザイン1% と低い。売っている人が少ない領域である。
    LP制作は有料率16%で比3.427。デザイン系で有料が成立している前例はここにある。
    willingness5: テンプレートを丸ごと渡せる。毎回プロンプトを書き直す手間が消える。
    artifact5: design.md の雛形、指示テンプレート、before/after の作例をすべて渡せる。
    次点: 「Claude Design と Claude Code の使い分け」は市場性は高いが、
    渡せる成果物が手順書だけになり willingness 3 と判定した。
  productTypeHint: tool
  artifactPlan: |
    design.md の雛形（コピーして使える完全版）、
    用途別の指示テンプレート（LP / 管理画面 / ダッシュボード / フォーム）、
    before/after の作例、動作条件（どのモデル・どの参照方法で効くか）、
    最初の1歩（まず design.md を置いて @参照する）、
    できないこと（既存デザインの完全再現は扱わない）。
  angle: 「デザインの原則を教える」のではなく「AIに毎回同じ品質を出させる型を渡す」。
    出し惜しみせず雛形の全文を有料部分に置く。無料部分では1テンプレートを丸ごと公開する。
  sources:
    - https://manabinoyakata.com/2026/04/24/design-md-guide
    - https://fyve.co.jp/claude-code/articles/claude-code-ui-design-guide
    - https://www.divx.co.jp/media/395
    - https://ai-pedia.jp/guides/claude-design-tutorial/
  status: used   # 2026-08-11 notes/2026-08-11-ui-templates として記事化（ローカル・木曜から繰り上げ）

- id: 2026-W33-05
  title: LP のファーストビューを、AIの出力から3手で直す
  type: free
  day: fri
  category: 生成AIで見せられる成果物を作る / AI×Webデザイン
  hashtags: [LP制作, Webデザイン, UIデザイン, 生成AI]
  score:
    strength: 5
    market: 4
    willingness: 3
    artifact: 5
    total: 17
  rationale: |
    strength5: サブ①。月曜が管理画面、金曜が LP と対象を分けることで
    dedup.py の重複判定を避けつつ、同じサブカテゴリを週3本に配分できる。
    market4: market/2026-08-07.md のタグ「LP制作」は需要38.5 / 供給11.2件/日で比 3.427。
    Webデザイン(7.801) より低いが、有料率16%と計測タグ中3位で、買われている領域である。
    需要の絶対値が小さいため5ではなく4とした。
    willingness3: 無料記事の範囲。テンプレート化は木曜の有料noteに寄せる。
    artifact5: before/after のデモ、CSS の差分、プロンプト全文を出せる。
    次点: 「LPの構成テンプレート」は artifact は高いが、木曜の有料noteと
    正面から重なるため無料記事には回さなかった。
  artifactPlan: |
    ファーストビュー単体の before.html / after.html を作り、デモページで並置する。
    変更した CSS と、AI に投げた修正指示の全文を載せる。
  angle: ページ全体を扱わない。ファーストビューという1画面に絞り、
    3手（余白・視線誘導・コントラスト）に限定する。
  sources:
    - https://www.furi-ten.com/claude-code-for-web-design/
    - https://fyve.co.jp/claude-code/articles/claude-code-ui-design-guide
    - https://qiita.com/sarap422/items/36fdabedda0fb8693b3f
  status: used   # 2026-08-07 notes/2026-08-07-lp-firstview として記事化（公開予定 08-08）

- id: 2026-W33-06
  title: GAS のトリガーと権限で止まる3箇所。動くコードつき
  type: free
  day: sat
  category: 生成AIで見せられる成果物を作る / Gemini+GASの自動化
  hashtags: [GAS, GoogleAppsScript, 業務効率化, Gemini]
  score:
    strength: 4
    market: 4
    willingness: 3
    artifact: 5
    total: 16
  rationale: |
    strength4: サブ②。火曜が「作る」、土曜が「動かし続ける」で対象を分ける。
    market4: GAS 比5.985 / GoogleAppsScript 比5.908。火曜と同じタグ帯だが、
    同一タグで週2本を出すため市場性は同値ではなく1段下げて評価した。
    dedup.py の重複判定を通すため angle を明確に分けている。
    willingness3: 設定を知れば直せる。成果物の受け渡しは限定的。
    artifact5: 動作確認用の短い GAS、トリガー設定の手順、権限スコープの記述を全文で出せる。
    次点: 「GAS の実行時間6分制限を回避する」は artifact は高いが、
    火曜・土曜と合わせて3本目の GAS 記事になり週の配分が偏るため見送った。
  artifactPlan: |
    トリガーが動いているかを確認する短い GAS（ログ出力のみ）を全文掲載する。
    appsscript.json のスコープ記述、時間主導トリガーの設定手順、
    実行ログの読み方を実物で示す。
  angle: エラー一覧ではなく「上から順に見る3箇所」という切り分け手順にする。
    火曜の記事（作る）で動かなかった人が、土曜（直す）に来る導線にする。
  sources:
    - https://qiita.com/kazukichi_0914/items/0ab3e790f860a8850dff
    - https://codelabs.developers.google.com/codelabs/gemini-workspace?hl=ja
    - https://smartcodes.jp/education/articles/apps-script-gemini-ai-assistant/
  status: used   # 2026-08-11 notes/2026-08-11-gas-trigger-debug として記事化（曜日から繰り上げ）

- id: 2026-W33-07
  title: NotebookLM と Deep Research をつなぐ調査フロー一式
  type: paid
  day: sun
  execution: local
  category: 生成AIで見せられる成果物を作る / NotebookLM・精度向上
  hashtags: [NotebookLM, Gemini, プロンプト, 生成AI]
  score:
    strength: 4
    market: 5
    willingness: 4
    artifact: 4
    total: 17
  rationale: |
    strength4: サブ③。水曜のカスタム指示を土台に、調査から出力までの
    フロー全体を渡す形にできる。
    market5: NotebookLM 比6.276、需要277はタグ中2位。有料率7%。
    クラスタ #4 は記事数83・スキ中央値156 で、読まれている領域である。
    willingness4: フローとプロンプト一式を丸ごと渡せる。
    artifact4: プロンプト集と設定の全文、実際の出力例を渡せる。
    コードではないため5には届かない。
    次点: 「Gemini Deep Research の使い方」単体は市場性が高いが、
    Gemini タグの比が 0.203 と埋もれる帯にあり、NotebookLM 側から
    名乗るほうが到達すると判断した（account.md の方針と一致）。
  productTypeHint: tool
  artifactPlan: |
    調査テーマの分解プロンプト、Deep Research への投げ方、
    結果を NotebookLM に取り込む手順、カスタム指示の全文、出力テンプレート。
    動作条件（必要なプラン）と、できないこと（一次情報の正確性は保証しない）を明記する。
  angle: ツール紹介ではなく「1つの調査を最後まで通す1本の線」として渡す。
    水曜の無料記事でカスタム指示だけを公開し、フロー全体を有料にする。
  sources:
    - https://googleworkspace.tscloud.co.jp/gemini/notebooklm-custom-instructions
    - https://manabinoba.blog/complete-guide-to-notebooklm/
    - https://rutinelabo.com/notebooklm-guide-2026/
  status: pending   # 2026-08-11 着手したが letter-audit が2周不合格で打ち切り。
                     # notes/2026-08-11-notebooklm-deepresearch/report.md 参照。
                     # product-concept で価値軸を追加してから再着手すること（used にしない）

# ------------------------------------------------------------
# 2026-08-07 の手動補充分（W33-05 の消化に対する1本）
# ------------------------------------------------------------

- id: 2026-W33-08
  title: NotebookLM は入れる前に決まる——ソースを整形してから読ませる
  type: free
  day: fri
  category: 生成AIで見せられる成果物を作る / NotebookLM・精度向上
  hashtags: [NotebookLM, Gemini, プロンプト, 生成AI]
  score:
    strength: 5
    market: 4
    willingness: 3
    artifact: 5
    total: 17
  rationale: |
    strength5: account.md のサブ③が「出力精度を上げるテクニック（設定・プロンプト・前処理）」を
    明示しており、その前処理側にあたる。手元で NotebookLM に同じ質問を投げ、
    整形前後の回答を並べるだけで書ける。外部の実績や体験を要さない。
    market4: market/2026-08-07.md で NotebookLM は需要277 / 供給44.1件/日、比 6.276 で計測タグ2位。
    ただし総記事数25,288で、上位例（スライド生成・音声化）は既に厚い。
    「スライド生成プロンプト集」は16サイトをまとめた記事まで存在し飽和している。
    投入前のソース整形は、言及はあってもテンプレート化した記事が見当たらないため4とした。
    需要の絶対値が Webデザイン(374) に劣るため5にはしない。
    willingness3: 無料記事の範囲。整形テンプレートを配って終わる。
    NotebookLM で金を取る形は日曜の W33-07（Deep Research との調査フロー一式）に寄せてある。
    artifact5: 整形プロンプト全文＋整形前/後のソース＋同じ質問への回答の before/after を出せる。
    次点: 「NotebookLM のスライド生成を制御する」は artifact は高いが、
    プロンプト集が既に多数あり market が 2 まで落ちるため在庫に入れなかった。
    次点2: 「大きい PDF を分割して読ませる」は前処理の一種だが、
    ファイルサイズ制限の話に寄り、成果物が残らないため落とした。
  artifactPlan: |
    整形用プロンプト全文（AI に元テキストを渡して構造化させる形）と、
    整形前のソース（べた書きテキスト）／整形後のソース（見出し＋Key-Value）を全文で載せる。
    同じ質問を両方のノートブックに投げ、回答と引用範囲の差を並置する。
  angle: |
    カスタム指示（出力側）を扱わない。W33-03 が出力側を担当するため、
    こちらは投入側だけに絞る。「ゴミを入れればゴミが出る」で終わっている既存記事に対し、
    何をどう書き換えるかをテンプレートで固定する点で差別化する。
    第三者が出した精度向上の数値（例: マークダウン整形で正確性が約40%向上）は
    出典を明記して引用するに留め、自分の実測として書かない。
    手元で確認できるのは引用範囲の広さと回答の当たり外れだけであり、
    そこは数値化せず before/after の並置で見せる。
  sources:
    - https://note.com/large_bear7730/n/n9fbe2b15daa2
    - https://zenn.dev/sonicmoov/articles/bf6e52ad2fabb3
    - https://www.lifehacker.jp/article/2603simple-note-taking-tweaks-make-notebooklm-smart/
    - https://note.com/ai_komon/n/ndd2a1fdc500b
    - https://zenn.dev/kauchi/articles/read-book-with-notebook-lm
  status: used   # 2026-08-11 notes/2026-08-11-notebooklm-source-format として記事化（曜日から繰り上げ）
