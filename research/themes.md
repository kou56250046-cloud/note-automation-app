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
#
# ============================================================
# 2026-08-14 weekly-research を手動実行（在庫 1 → 7）
# ------------------------------------------------------------
# W33 は 08-07 と 08-11 に7本中6本を消化し、pending は W33-07 の1本だけになっていた。
# しかも W33-07 は letter-audit が2周不合格で打ち切っており、実質の在庫は0本である。
# 手順2「7本になるまで補充」に従い W34 を6本仕込んだ（7本を無条件に足していない）。
#
# 市場データは research/market/2026-08-09.md（最新の実測）を引用している。
# 08-07 から順位が動いているため、スコアの根拠も差し替えた。
#   GoogleAppsScript 7.854（1位・有料率14%） / UIデザイン 7.246 / NotebookLM 6.27
#   GAS 5.364（有料率12%） / LP制作 3.908 / Webデザイン 2.971（7.801 から後退）
# **Webデザインが供給増で 2.971 まで落ちた。** サブ①の主軸タグを
# 「Webデザイン」から「UIデザイン」へ寄せ、hashtags の並び順を入れ替えている。
#
# 曜日は account.md の配分表どおり 月1 火2 水3 木1(paid) 金1 土2 日3。
# 日曜は既存の W33-07 が埋めているため補充していない。
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
  status: used   # 2026-08-17 notes/2026-08-23-research-flow として記事化（公開予定 08-23）。
                 # 2026-08-11 の初回着手（notes/2026-08-11-notebooklm-deepresearch）は
                 # letter-audit が2周不合格で打ち切り。申し送りどおり product-concept に戻り、
                 # 価値軸を5本定義してから起こし直して round 2 で 16/16 合格。
                 # 旧ディレクトリは meta.json を持たないため公開対象にならない。

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

# ============================================================
# 2026-W34（2026-08-14 仕込み）
# 市場性は research/market/2026-08-09.md の実測を引用している。
# 4軸スコア（強み / 市場性 / 支払い意欲 / artifact）。artifact 2以下は入れない。
# ============================================================

- id: 2026-W34-01
  title: AIが出したダッシュボードを、色数・目盛り・並びの3箇所で読める形にする
  type: free
  day: mon
  category: 生成AIで見せられる成果物を作る / AI×Webデザイン
  hashtags: [UIデザイン, Webデザイン, LP制作, 生成AI]
  score:
    strength: 5
    market: 4
    willingness: 3
    artifact: 5
    total: 17
  rationale: |
    strength5: account.md のペルソナ「作れたが画面がテンプレ丸出しで見せられない人」に直撃する。
    AI に管理画面を作らせるとグラフだけは必ず付いてくるが、系列ごとに違う色が割り当てられ、
    目盛りが自動で 0 始まりでなくなる。手元で before/after を作れる。
    market4: market/2026-08-09.md の「UIデザイン」は需要86.5 / 供給11.9件/日で比 7.246、
    計測14タグ中2位。クラスタ #9（デザイン / AI / UI）は記事数20・スキ中央値52.5・比 2.625。
    ただし「Webデザイン」が 08-07 の 7.801 から **2.971 まで後退**している（供給42.4件/日）。
    サブ①全体の空きが縮んだため、08-07 時点の5ではなく4とした。
    willingness3: 直し方を知れば手元で再現できる。型として渡す形は木曜の有料noteに寄せる。
    artifact5: before/after のデモページ、変更した CSS、AI への修正指示の全文を全部出せる。
    次点: 「BIツールのダッシュボード設計7原則」は市場性はあるが、
    読者の手元が変わらない解説記事になり artifact が2まで落ちるため落とした。
    次点2: 「カラーユニバーサルデザイン」は重要だが、主題が配色理論そのものになり
    account.md の「新概念の解説だけの記事を書かない」に寄るため単体では扱わない。
    本記事の中で、色だけに情報を持たせない根拠として引用するにとどめる。
  artifactPlan: |
    notes/{slug}/demo/before.html と after.html を作り、build-demo.mjs で並置ビューを生成する。
    グラフは外部ライブラリを使わず、SVG または CSS だけで描いて自己完結させる
    （Pages 配信で CDN を踏まないため）。
    記事には デモURL ＋ 変更した CSS の差分 ＋ AI に投げた修正指示の全文 を載せる。
  angle: |
    W33-01（管理画面の余白・階層・色数）とはグラフを扱う点で分ける。
    あちらはフォームとテーブルが対象で、こちらは図の描画そのものである。
    「デザインの原則」を教えず、直す箇所を3つに数え上げる形にする。
    色数（系列ごとの色を捨てて1色＋強調1色にする）、目盛り（棒グラフの原点を0に戻す）、
    並び（最重要の数値を左上に置く）の3点に限定する。
  sources:
    - https://goodpatch.com/blog/dashboard-design
    - https://zenn.dev/bitkey_dev/articles/ef48e093ab780c
    - https://sophiate.co.jp/ダッシュボードのレイアウト原則：ひと目で状態がわかる/
    - https://natic.sojitz-ti.com/insight/dashboard_design/
  status: used   # 2026-08-17 notes/2026-08-17-dashboard-3points として記事化（曜日どおり月曜）

- id: 2026-W34-02
  title: 問い合わせの一覧をGeminiに仕分けさせる。スプレッドシート用GASの全文
  type: free
  day: tue
  category: 生成AIで見せられる成果物を作る / Gemini+GASの自動化
  hashtags: [GoogleAppsScript, GAS, 業務効率化, Gemini]
  score:
    strength: 4
    market: 5
    willingness: 4
    artifact: 5
    total: 18
  rationale: |
    strength4: サブ②のど真ん中。手元のスプレッドシートで動かして確認できる。
    外部の実績も第三者の結果も要らない。
    market5: market/2026-08-09.md の「GoogleAppsScript」は需要80.5 / 供給10.2件/日で
    比 7.854 と **計測14タグ中1位**。有料率も14%で最上位である。「GAS」は 131 / 24.4 で比 5.364、
    有料率12%。書く人が少なく、かつ金が動いている領域である。
    willingness4: 分類作業そのものを消せる。コードを丸ごと渡せる。
    artifact5: GASコード全文、分類プロンプト全文、動作条件（トリガー・スコープ・
    APIキーの置き場・1日あたりの実行上限）を出せる。
    次点: 「Gmail を Gemini で自動仕分けしてラベルを付ける」は同じ骨格だが、
    受信箱を触るため読者が試すときの心理的な壁が高い。まずスプレッドシートの列を
    埋めるだけの形にした。Gmail 版は次の週の候補として残す。
    次点2: 「Gemini とスプレッドシートの連携方法まとめ」は3つのアプローチ
    （標準機能 / アドオン / GAS）の比較記事になり、手元に残るコードが消えるため落とした。
  artifactPlan: |
    UrlFetchApp で Gemini API を叩き、A列のテキストを読んで B列に分類ラベル、
    C列に判断理由を書き込む GAS を、動く単位で全文掲載する。
    分類先のラベルは配列で先頭に定義し、読者が自分のカテゴリに差し替えられる形にする。
    APIキーは PropertiesService に置き、ハードコードしない書き方をそのまま見せる。
    レスポンスが JSON で返らなかったときのフォールバック（未分類として残す）まで含める。
    動作条件（必要なスコープ、実行時間、行数が多いときは W34-06 の分割実行に回す）を明記する。
  angle: |
    W33-02（議事録要約）と同じ「GAS から Gemini を呼ぶ」骨格を使うが、
    出力が自由文ではなく**決められたラベルのどれか**である点で分ける。
    要約は多少ブレても読めるが、分類はブレると使えない。
    そのため記事の主題を「選択肢を固定して、想定外の答えを返させない書き方」に置く。
    汎用の分類フレームワークを作らない。1つの列を埋める短いコードを渡す。
  sources:
    - https://qiita.com/kazukichi_0914/items/4e21ddfaaf961b526f8e
    - https://kaire.jp/blog/gas-gemini-automation-2026/
    - https://note.com/samuraijuku_biz/n/nfae097c1e23f
    - https://qiita.com/aipacommander/items/faba7f0674b7c7b0111d
  status: used   # 2026-08-17 notes/2026-08-18-gas-classify として記事化（公開予定 08-18）

- id: 2026-W34-03
  title: NotebookLMに、ソース同士の食い違いを先に洗い出させる質問テンプレート
  type: free
  day: wed
  category: 生成AIで見せられる成果物を作る / NotebookLM・精度向上
  hashtags: [NotebookLM, Gemini, プロンプト, 生成AI]
  score:
    strength: 4
    market: 4
    willingness: 3
    artifact: 4
    total: 15
  rationale: |
    strength4: サブ③の軸。複数の記事を放り込んで要約させると、
    出典によって数値や前提が食い違ったまま、なめらかな1つの答えに均されて出てくる。
    手元で再現でき、引用チップの差で示せる。account.md が NotebookLM 側から名乗る方針なので範囲内。
    market4: market/2026-08-09.md の「NotebookLM」は需要277 / 供給44.2件/日で比 6.27、
    需要の絶対値は計測タグ中1位。クラスタ #8（Google / NotebookLM / AI）は記事数72・スキ中央値87。
    ただし総記事数25,402で、上位例（スライド生成・音声化）は既に厚い。
    「ソースを全部読んでくれない問題」に言及した記事はあるが、
    食い違いを検出させる質問をテンプレート化したものは見当たらないため4とした。
    willingness3: 質問文を配って終わる。金を取る形は日曜の W33-07 に寄せてある。
    artifact4: 質問テンプレート全文と、同一ノートブックでの「素の質問」「テンプレート」の
    回答比較を出せる。コードではないため5には届かない。
    次点: 「NotebookLM のスライド生成を制御する」は market は高いが、
    プロンプト集が既に飽和しており（W33-08 の判定と同じ）在庫に入れない。
    次点2: 「音声解説の使い方」は成果物が音声で、note の記事内に実物を置けないため artifact 2。
  artifactPlan: |
    食い違い検出用の質問テンプレート全文（コピーしてそのまま貼れる形）を載せる。
    構成は「主張の一覧化 → 出典ごとの数値の抜き出し → 一致/不一致の仕分け →
    不一致だけを残す」の4段。
    同じ3ソースに対して「要約して」と投げた回答と、テンプレートを投げた回答を並置し、
    引用チップがどのソースを指しているかの差まで見せる。
  angle: |
    W33-03 は出力側（カスタム指示）、W33-08 は投入側（ソース整形）を扱った。
    こちらは**質問の側**だけに絞り、3本が重ならないようにする。
    「NotebookLM は嘘をつかない」で終わっている既存記事に対し、
    嘘ではなく**食い違いを平らに均してしまう**点を症状として提示する。
    第三者が出した精度の数値は出典を明記して引用するに留め、自分の実測として書かない。
    手元で確認できるのは引用範囲と回答の差だけなので、そこは数値化せず並置で見せる。
  sources:
    - https://note.com/ss_chiebukuro/n/necd70ebb3903
    - https://uravation.com/media/notebooklm-business-prompts-guide/
    - https://www.smartshoki.com/blog/generationai/notebooklm-howto/
  status: used   # 2026-08-19 notes/2026-08-19-notebooklm-conflict として記事化（曜日どおり水曜）

- id: 2026-W34-04
  title: AIに毎回同じ見た目を出させる tokens.css 一式と、逸脱を見つけるチェックスクリプト
  type: paid
  day: thu
  execution: local
  category: 生成AIで見せられる成果物を作る / AI×Webデザイン
  hashtags: [UIデザイン, LP制作, Webデザイン, 生成AI]
  score:
    strength: 5
    market: 4
    willingness: 4
    artifact: 5
    total: 18
  rationale: |
    strength5: サブ①の中核。月曜・金曜の無料記事で「直し方」を見せ、
    有料noteでは「毎回そこから始まる状態」を作る道具を渡す。
    W33-04 が指示テンプレート（言葉）だったのに対し、こちらは値の定義（ファイル）である。
    market4: UIデザイン 比7.246 / LP制作 比3.908。
    ただし有料率は UIデザイン1% と極端に低く、LP制作12%・GoogleAppsScript14% に劣る。
    **デザイン系は読まれるが売られていない領域である。** 需要の空きは大きいので4、
    有料が成立している前例が薄いため5にはしない。
    willingness4: 毎回プロンプトを書き直す手間と、出力のたびに色が変わる問題を同時に消せる。
    自分で作るより速いと感じられる形になっている。ただし UIデザインの有料率1%を踏まえ、
    5ではなく4とした（価格は 980〜1,480円 の下側から入る想定）。
    artifact5: tokens.css の完全版、AI への渡し方、逸脱検出スクリプト、作例まで全部渡せる。
    次点: 「Figma のバリアブルから CSS 変数を書き出す」は市場性はあるが、
    Figma を持っていない読者が実行できず、account.md のペルソナ
    （コードは書けるがデザインで詰まっている人）から外れるため落とした。
    次点2: 「AI生成UIが全部同じ青になる問題」は金曜の無料記事側に近く、
    有料の骨格にすると値の定義まで届かないため無料記事の角度として残した。
  productTypeHint: tool
  artifactPlan: |
    tokens.css の完全版（色・タイポ・余白・角丸・影を CSS カスタムプロパティで定義し、
    ライト/ダークの両方を持つ）。
    トークンを使わせるための指示文（AI に @参照させる形と、貼り付けて渡す形の両方）。
    逸脱を検出するチェックスクリプト（生成された CSS/HTML を走査し、
    トークンを経由しない生の色コード・px 値を一覧にする Node スクリプト）。
    用途別の作例（LP / 管理画面 / フォーム）。
    動作条件（どのモデル・どの参照方法で効くか）、最初の1歩、
    できないこと（既存デザインの完全再現とブランド設計そのものは扱わない）。
  angle: |
    W33-04 は「何を指示するか」を渡した。こちらは「何を指示しても崩れない土台」を渡す。
    デザインの原則を教えるのではなく、**値を先に固定して AI の裁量を奪う**という方向にする。
    出し惜しみせず tokens.css の全文とスクリプト全文を有料部分に置く。
    無料部分では色のトークンだけを完全公開する。
  sources:
    - https://zenn.dev/pepabo/articles/74653f4d78eb7b
    - https://zenn.dev/silverbirder/articles/2078e4a8a2603f
    - https://www.mitsue.co.jp/knowledge/blog/x-tech/202606/24_1330.html
    - https://fumufumuui.com/posts/design-token
  status: used   # 2026-08-17 notes/2026-08-20-design-tokens として記事化（公開予定 08-20）。
                 # letter-audit は round 3 で 16/16 合格（A1 が2周落ち、product-concept で
                 # 価値軸「見え方（他者の目）」を追加して解消）。

- id: 2026-W34-05
  title: AIが作らない3画面——空・読み込み中・エラーを足す
  type: free
  day: fri
  category: 生成AIで見せられる成果物を作る / AI×Webデザイン
  hashtags: [UIデザイン, Webデザイン, LP制作, 生成AI]
  score:
    strength: 5
    market: 4
    willingness: 3
    artifact: 5
    total: 17
  rationale: |
    strength5: AI に画面を作らせると、データが理想的に揃った状態しか出てこない。
    ペルソナ「作れたが人に見せられない人」がスクリーンショットを撮るときに崩れるのは、
    たいていデータが0件のときである。手元で再現でき、before/after を作れる。
    market4: UIデザイン 比7.246 / Webデザイン 比2.971。
    UI Stack（5つの状態）を解説した記事は複数あるが（POSTD・Qiita・note）、
    いずれも設計論であり、**AI の出力に後から足す**という文脈の記事は見当たらない。
    デザイナー向けの記事はあるが、AI にコードを書かせる読者向けの実装記事がないため4とした。
    willingness3: 3つの状態を足すだけなので、知れば手元で再現できる。無料記事の範囲。
    artifact5: 空・読み込み中・エラーの3状態を含む after.html と、
    AI に投げた追加指示の全文、before/after のデモを出せる。
    次点: 「UI Stack の5つの状態を解説する」は情報としては上位互換だが、
    Partial state を含めると解説記事に寄り、実物が薄くなる。
    AI が最も落とす3つに絞ったほうが読者の画面が変わる。
    次点2: 「エラーメッセージの書き方」は主題が文言になり、
    サブ①の「画面が変わる」条件から外れるため落とした。
  artifactPlan: |
    notes/{slug}/demo/before.html（理想状態だけの一覧画面）と
    after.html（空・読み込み中・エラーの3状態を切り替えられる画面）を作り、
    build-demo.mjs で並置する。
    AI に「この3状態を足して」と投げた指示の全文と、生成された HTML/CSS を載せる。
    状態の切り替えはボタン1つで、外部ライブラリを使わず素の JS で書く。
  angle: |
    W33-01（余白・階層・色数）と W34-01（グラフ）は**見た目**を直す記事だが、
    こちらは**画面の数**を増やす記事である。同じ「3箇所直す」型に見えて対象が違う。
    「UI には5つの状態がある」という設計論から入らない。
    「0件のときにスクリーンショットが撮れない」という症状から入り、
    AI が落とす3つだけを足す。Partial state は扱わないと明記する。
  sources:
    - https://postd.cc/how-to-fix-a-bad-user-interface-part1/
    - https://qiita.com/KokiSakano/items/edc1e4384478273661d4
    - https://u-site.jp/alertbox/empty-state-interface-design
    - https://fumufumuui.com/posts/empty-state
  status: used   # 2026-08-21 notes/2026-08-21-ui-empty-states として記事化

- id: 2026-W34-06
  title: GASは6分で止まる前に自分で降りる——分割実行のコード全文
  type: free
  day: sat
  category: 生成AIで見せられる成果物を作る / Gemini+GASの自動化
  hashtags: [GoogleAppsScript, GAS, 業務効率化, Gemini]
  score:
    strength: 4
    market: 5
    willingness: 3
    artifact: 5
    total: 17
  rationale: |
    strength4: サブ②。火曜（W34-02）で作った分類 GAS は、行数が増えると必ずここに当たる。
    Gemini API の呼び出しは1行あたり数秒かかるため、100行程度で6分を超える。
    火曜の記事の続きとして手元で再現できる。
    market5: GoogleAppsScript 比 7.854（1位・有料率14%）/ GAS 比 5.364（有料率12%）。
    6分制限の解説記事は多い（TCD・officeの杜・ジドウカblog 等）が、
    いずれも汎用のループを対象にしており、**API 呼び出しのように1件が遅い処理**を
    途中から再開する形で書いたものは少ない。タグの空きが大きいため5とした。
    willingness3: コードを渡せるが、痛みは「止まる」であって「時間が消える」ではない。
    火曜より1段低く見る。
    artifact5: 中断と再開を含む GAS 全文、スクリプトプロパティの読み書き、
    トリガーの自動設置と削除、実行ログの読み方を全部出せる。
    次点: 「6分制限を回避するライブラリ（BackgroundRunnerApp 等）の紹介」は
    account.md「書かないこと1」のツール紹介に当たり、読者の手元にコードが残らない。
    存在は本文で1行触れるにとどめ、主題にしない。
    次点2: 「GAS の制限・上限まとめ」は一覧記事になり実物が出ないため落とした。
  artifactPlan: |
    経過時間を測って 4分30秒 で自分から降り、処理済みの行番号を
    PropertiesService に保存し、1分後の時間主導トリガーを設置して終了する GAS を全文掲載する。
    再開時に前回の続きから始まること、全件終わったらトリガーを自分で消すこと、
    途中で失敗した行をスキップして記録することまで含める。
    火曜（W34-02）の分類スクリプトをそのまま包める形にする。
  angle: |
    W33-06（トリガーと権限で止まる3箇所）は**動かない**話だった。
    こちらは**動くが途中で終わる**話で、症状が違う。dedup を通すため、
    トリガーの設定手順そのものは繰り返さず、既存記事へのリンクで済ませる。
    「6分の壁を突破する」という言い方をしない。突破ではなく、
    先に降りて次の実行に引き継ぐという設計として書く。
  sources:
    - https://tcd-theme.com/2021/05/gas.html
    - https://data-x.jp/blog/gastimeout/
    - https://uncle-gas.com/avoid-timeout-error/
    - https://web-breeze.net/gas-running-over-time-limit/
  status: used   # 2026-08-17 notes/2026-08-22-gas-resume として記事化（公開予定 08-22）

# ============================================================
# 2026-W35（2026-08-20 仕込み）
# ------------------------------------------------------------
# pending 0本を確認したため、7本すべてを新規に仕込んだ（補充ではなく全量生成）。
# 市場性は research/market/2026-08-20.md の実測を引用している。
#   UIデザイン 5.767(有料率2%) / GAS 5.107(6%) / NotebookLM 4.411(12%) /
#   LP制作 3.632(13%) / GoogleAppsScript 3.113(11%) / Webデザイン 2.586(10%)。
#   クラスタ #7 NotebookLM/Gemini/マジクラ が比 2.7328 で最上位。
#   Webデザインは 08-07 の 7.801 から一貫して後退している（今回2.586）。
# 4軸スコア（強み / 市場性 / 支払い意欲 / artifact）。artifact 2以下は入れない。
#
# サブ1（AI×Webデザイン）は無料5本＋有料2本を既に消化しており、
# 管理画面・LP・ダッシュボード（グラフ）・一覧の空/読込/エラー・トークン定義を
# 触っている。今週は「表・フォーム以外」の指示に従い、
# 印刷/OGP（シェアカードの見た目）とレスポンシブ（幅で崩れる）の2つを新規に開いた。
#
# サブ2（Gemini+GAS）は「作る／止まる／再開する」を消化済みのため、
# 今週は「安定して動き続けるための防御」側（二重実行の排他制御・429リトライ）に寄せた。
# この2本を土台に、日曜の有料noteで初めてサブ2（GAS）に有料を割り当てる。
# 過去の有料noteはサブ1×2本・サブ3×1本に偏っており、サブ2は無料4本のまま
# 有料が1本も無かった。GAS/GoogleAppsScriptは有料率6%/11%と成立している領域であり、
# ここに手を付けていないのは在庫設計の偏りだと判断した。
#
# サブ3（NotebookLM）は「投入側／出力側／質問側」を消化済みのため、
# 今週は「保存側（ノート機能で回答を使い捨てにしない）」と
# 「整理側（複数トピックをノートブックで分ける）」の2つに寄せた。
#
# 曜日順は account.md の配分表どおり 月1 火2 水3 木1 金2 土3 日(持ち回り=2)。
# 隣接するサブカテゴリの連続は無い（月1→火2→水3→木1→金2→土3→日2）。
#
# 有料noteの価値軸には「減算ではない到達・獲得」を1本ずつ添えた
# （W35-01: シェア画像を人に送れる状態になる／W35-04: どの幅で開かれても崩れないと言える状態になる／
#  W35-07: 翌朝ログを見るだけで成功したと分かる状態になる）。
#
# web検索は5件（一次情報の裏取りのみ。需要はmarketデータが担当）。
#   - OGP画像の推奨サイズ（1200×630, 1.91:1）
#   - GAS LockService（tryLock/waitLock, Document/Script/User Lock）
#   - Gemini API 429 と指数バックオフ（公式Python SDKは自動リトライを持つ）
#   - iOS Safari の input 自動ズーム（font-size 16px未満で発生, Android は非該当）
#   - CSS clamp() によるレスポンシブフォントサイズ（MDN）
# ============================================================
#
# ============================================================
# 2026-08-21 W35 の7本を全て rejected にした（第3版への改訂）
# ------------------------------------------------------------
# knowledge/account.md を第3版（主カテゴリ「GAS と生成AI で他人に渡せる
# 自動化システムを作る」）に改訂したため、W35 の在庫は使えなくなった。
#
# 個々のテーマが範囲外になったのではない。**週の構成が変わった**ためである。
# 第3版から週は「1つの自動化システムを7つに割った連載」になり、
# 7本は同じ systemId を共有していなければならない。W35 は単発7本であり、
# 連載として組み直せない（月=OGP画像 / 火=LockService / 水=NotebookLM…と
# 題材がばらばらで、1つのシステムに束ねられない）。
#
# **端数の補充をしない**（weekly-research の改訂に合わせた）。
# 一部を残して足すと、連載の7分割が崩れる。
#
# 個別のテーマ自体は第3版でも生きているものがある。次の連載を仕込むときに
# 部品として再利用してよい。
#   W35-02 LockService の2重実行 → 連載の「水（失敗時の扱い）」の材料
#   W35-05 Gemini API 429 の再試行 → 同上
#   W35-07 排他制御と自動リトライの安定運転キット → 連載の「日（完成版）」の骨格
# ============================================================

- id: 2026-W35-01
  title: AIが出したOGP・シェアカードを、はみ出しと潰れの2箇所だけ直す
  type: free
  day: mon
  category: 生成AIで見せられる成果物を作る / AI×Webデザイン
  hashtags: [UIデザイン, LP制作, Webデザイン, 生成AI]
  score:
    strength: 5
    market: 4
    willingness: 3
    artifact: 5
    total: 17
  rationale: |
    strength5: account.md のペルソナ「作れたが人に見せられない人」の最後の接点がここにある。
    記事やLPそのものは直しても、SNSでURLを貼ったときに出るシェアカードは
    見落とされがちで、AIに「OGP画像を作って」と投げるとテキストが安全域からはみ出したり、
    Twitter Cardの正方形トリミング（中央630×630pxが切り出される）を考慮せず
    情報が端に寄って消える。手元で再現・修正できる。
    market4: market/2026-08-20.md の「UIデザイン」は比5.767（有料率2%）で計測タグ中1位。
    「LP制作」は比3.632（有料率13%）で、OGPはLPと同じ「人に見せる面」として扱われる領域。
    Webデザインは2.586まで後退しているため、UIデザイン側の語りを主軸にした。
    willingness3: 直し方（安全域・コントラスト・階層）を知れば手元で再現できる範囲。
    無料記事として置き、テンプレート化は有料note（W35-07とは別系統のため今回は据え置き）。
    artifact5: 1200×630のOGPカードを模したHTML/CSSのbefore/afterデモ、変更したCSS差分、
    AIに投げた修正指示の全文を出せる。
    次点: 「AI生成のPDF/印刷レイアウトを整える」は印刷側の候補として検討したが、
    PDFレンダリングには外部ライブラリかブラウザ印刷APIが要り、
    W34-01が定めた「CDNを踏まず自己完結させる」制約の下では
    before/afterのライブデモを組みにくく artifact が3に落ちるため見送った。
  artifactPlan: |
    demo/before.html（AIが素で出しがちなOGPカード：文字が安全域からはみ出す、
    コントラスト不足、Twitter Cardの中央トリミングを考慮していない配置）と
    demo/after.html（1200×630・アスペクト比1.91:1を守り、630×630の中央安全域に
    主要情報を収め、文字階層とコントラストを直したもの）を作り、
    build-demo.mjs で並置する。CSSの差分と、AIに投げた修正指示の全文を本文に載せる。
  angle: |
    「デザインの綺麗さ」ではなく「どこで切り取られても壊れないか」という視点に絞る。
    SNSでシェアされた瞬間に読者がどう見るかという到達点から逆算する。
    価値軸は「作業が減る」だけでなく、「作ったものをそのまま人に送れる状態になる」
    という獲得側の軸も持たせている。
  sources:
    - https://lifestyle.assist-all.co.jp/ogp-image-size-optimization-1200x630/
    - https://apollo-optimize.com/blog/ogp-guide-settings-and-image-size/
  status: rejected

- id: 2026-W35-02
  title: GASが2重に走ってGeminiを2回呼ぶ問題。LockServiceで止めるコード全文
  type: free
  day: tue
  category: 生成AIで見せられる成果物を作る / Gemini+GASの自動化
  hashtags: [GAS, GoogleAppsScript, 業務効率化, Gemini]
  score:
    strength: 4
    market: 4
    willingness: 3
    artifact: 5
    total: 16
  rationale: |
    strength4: サブ②。W34-02（問い合わせ仕分けGAS）やW33-02（議事録要約GAS）のように
    トリガーでGemini APIを呼ぶ構成では、フォーム送信の二重発火や
    時間主導トリガーの実行時間超過による再入で同じ行を2回処理し、
    Gemini呼び出しが無駄に倍になる（課金にも直結する）。手元で再現・検証できる。
    market4: market/2026-08-20.md の「GAS」は比5.107（有料率6%）、
    「GoogleAppsScript」は比3.113（有料率11%）。既に週3本この帯を使っているため
    5ではなく4とした。
    willingness3: LockServiceの使い方を知れば手元で直せる範囲。テンプレート化して
    まとめて渡す形は金曜のリトライ実装とあわせて日曜の有料noteに寄せる。
    artifact5: LockService（tryLock/waitLock、Script Lock）を使った排他制御コード全文と、
    ロックなし/ありでの二重実行の実行ログ比較を出せる。
    次点: 「GASの実行ログをSlack Webhookに通知する」は運用上有用だが、
    Slack側の設定（Webhook URL発行）まで読者に要求する分、
    再現の手間がコードだけで完結せず、今回は本文中の応用例として触れるにとどめた。
  artifactPlan: |
    LockService.getScriptLock() で tryLock(タイムアウト指定) → 処理 → finally で
    releaseLock() する形の完全なGAS関数を掲載する。ロック取得に失敗したときに
    処理をスキップしてログに残す分岐、フォーム送信トリガーと時間主導トリガーが
    同時に発火するケースの実行ログ（ロックなし＝重複処理／ロックあり＝片方待機）を
    並べて示す。
  angle: |
    W34-02（分類させる）・W34-06（6分で自分から降りる）の続きにあたるが、
    症状は「動かない」「途中で終わる」ではなく「気づかないうちに2回動いている」
    という点で異なる。処理が終わってから初めて気づく類の不具合として提示する。
  sources:
    - https://qiita.com/kyamadahoge/items/f5d3fafb2eea97af42fe
    - https://web-breeze.net/gas-lockservice/
  status: rejected

- id: 2026-W35-03
  title: NotebookLMの回答を、その場で消費しない。ノート機能で積み重ねる型
  type: free
  day: wed
  category: 生成AIで見せられる成果物を作る / NotebookLM・精度向上
  hashtags: [NotebookLM, Gemini, プロンプト, 生成AI]
  score:
    strength: 4
    market: 4
    willingness: 3
    artifact: 4
    total: 15
  rationale: |
    strength4: サブ③。W33-08（投入側）・W33-03（出力側）・W34-03（質問側）に対し、
    今週は「回答をどう残すか（保存側）」という第4の側面に寄せる。
    account.md がサブ③を「出力精度を上げるテクニック」と定義しており、
    毎回同じ質問を聞き直すこと自体が精度低下（前回の文脈が引き継がれない）の
    原因になっている点と結びつけて書ける。
    market4: market/2026-08-20.md の「NotebookLM」は比4.411（有料率12%）で
    計測タグ中3位、かつ有料率は全タグ中最高。クラスタ #7（NotebookLM/Gemini/マジクラ）は
    比2.7328で全クラスタ最上位であり、この領域自体が最も稼働している。
    willingness3: 保存の型を知れば手元で再現できる範囲。フロー全体の道具化は
    既存の有料note（W33-07、研究フロー一式）に譲る。
    artifact4: ノートに残す際のフォーマット（質問・引用・結論を分けたテンプレート）の
    全文と、ノート化した場合／しなかった場合で次の質問への回答が変わる比較を出せるが、
    コードではないため5には届かない。
    次点: 「NotebookLMをチームに共有する設定」は保存側と近い候補として検討したが、
    共有権限の設定画面を説明するだけになりコード・プロンプト・before/afterのいずれも
    出せず artifact 2 と判定して落とした（詳細は除外リスト参照）。
  artifactPlan: |
    NotebookLMの「ノート」欄に残す際のテンプレート全文（質問／引用元チップ／
    結論／未解決の疑問、の4区分でメモを構造化する形）を掲載する。
    同じトピックで3回質問した場合の、ノートに残しながら進めたときの回答と、
    毎回チャットだけで完結させたときの回答（前提を聞き直す羽目になる例）を並置する。
  angle: |
    「メモを取りましょう」という一般論にしない。NotebookLMのチャット欄は
    セッションが流れると参照しづらくなるという具体的な症状から入り、
    ノート機能という既存UIの使い方を型として固定する。
    W34-03（食い違いを洗い出す質問）とは、こちらが「後に残すか」、
    あちらが「その場でどう聞くか」という時系列で分かれる。
  sources:
    - https://www.i3design.jp/in-pocket/how-to-use-notebooklm/
  status: rejected

- id: 2026-W35-04
  title: AIが出したレイアウトが、スマホ幅で崩れる2箇所を直す
  type: free
  day: thu
  category: 生成AIで見せられる成果物を作る / AI×Webデザイン
  hashtags: [UIデザイン, Webデザイン, LP制作, 生成AI]
  score:
    strength: 5
    market: 4
    willingness: 3
    artifact: 5
    total: 17
  rationale: |
    strength5: AIにPCで見た構図だけを確認して「良い」と言うと、幅の狭い画面で
    要素が横にはみ出す・文字が固定px指定で読みにくくなるといった崩れが残る。
    ペルソナが人に画面を見せるのはスマホ経由であることが多く、この崩れは
    受注や評価に直結する。手元で再現・修正できる。
    market4: market/2026-08-20.md の「UIデザイン」は比5.767（有料率2%）、
    「Webデザイン」は比2.586（有料率10%）。Webデザインの後退が続いているため
    UIデザイン側を主軸タグにした。
    willingness3: 直し方（clamp()での可変フォント、横スクロールの原因除去）を
    知れば手元で再現できる範囲。テンプレート化は日曜の有料note（サブ2）とは
    系統が異なるため今回は無料側に据え置く。
    artifact5: 375px幅で崩れるbefore.htmlと、直したafter.htmlのライブデモ、
    変更したCSS差分、AIに投げた修正指示の全文を出せる。
    次点: 「文字組み（行長・行間の最適化）」は候補として検討したが、
    今回のレスポンシブ崩れの症状（横スクロール・固定px）とテーマが重なる部分が多く、
    1本にまとめるとタイトルと本文の焦点がぼやけるため、今週は見送り次回以降の候補とした。
  artifactPlan: |
    demo/before.html（固定px幅のカード、横スクロールが発生する画像、
    16px未満のinput font-sizeでiOS Safariが自動ズームする状態）と
    demo/after.html（clamp()での可変フォント、min()/max-widthでの横はみ出し防止、
    input font-sizeを16px以上に固定した状態）を並置する。
    変更したCSSの差分と、AIに投げた修正指示の全文を載せる。
  angle: |
    「レスポンシブ対応をしましょう」という一般論にしない。W34-01（グラフ）・
    W34-05（空/読込/エラー）が「見た目」「画面の数」を扱ったのに対し、
    こちらは「同じ画面がどの幅で開かれても壊れないか」という軸で分ける。
    表・フォーム単体は扱わず、レイアウト全体の崩れに絞る。
  sources:
    - https://developer.mozilla.org/ja/docs/Web/CSS/clamp
    - https://webrandum.net/css-ios-safari-input-zoom/
  status: rejected

- id: 2026-W35-05
  title: Gemini APIが429で落ちたときに、自動で待って再試行するGASコード
  type: free
  day: fri
  category: 生成AIで見せられる成果物を作る / Gemini+GASの自動化
  hashtags: [GAS, GoogleAppsScript, 業務効率化, Gemini]
  score:
    strength: 4
    market: 4
    willingness: 3
    artifact: 5
    total: 16
  rationale: |
    strength4: W33-02・W34-02のように行ごとにGemini APIを呼ぶ構成は、
    件数が増えるとレート制限（429）に当たりやすい。UrlFetchAppには
    公式SDKのような自動リトライが無いため、自分で書く必要がある。
    手元のスプレッドシートで実際に再現できる。
    market4: market/2026-08-20.md の「GAS」比5.107（有料率6%）、
    「GoogleAppsScript」比3.113（有料率11%）。火曜と同じタグ帯のため
    週内配分を踏まえ4とした。
    willingness3: リトライの書き方を知れば手元で直せる範囲。まとめて渡す形は
    火曜の排他制御とあわせて日曜の有料noteに寄せる。
    artifact5: 指数バックオフ＋ジッターを入れたリトライ関数の全文と、
    429を意図的に起こした場合の実行ログ（待機時間が段階的に伸びる様子）を出せる。
    次点: 「Gemini APIの料金プラン比較（無料/従量課金）」は429対策の文脈で
    調べる過程で見つかったが、account.md「書かないこと1」の料金比較に該当するため
    在庫に入れなかった（詳細は除外リスト参照）。
  artifactPlan: |
    UrlFetchApp.fetch の muteHttpExceptions を使い、レスポンスコードが429か
    5xx系だった場合に Utilities.sleep で待機時間を倍々にしながら
    最大リトライ回数まで再試行するGAS関数の全文を掲載する。
    待機時間に乱数（ジッター）を混ぜて同時に大量のリクエストが再試行で
    ぶつからないようにする書き方まで含める。429を強制的に起こすテスト方法
    （短時間に大量リクエストを送る）と、そのときの実行ログを示す。
  angle: |
    W35-02（二重実行を止める）と対になる「安定して動き続ける」側の記事。
    あちらは「同時に2つ動かない」、こちらは「1つが失敗しても自分で立て直す」
    という別の失敗モードを扱う。公式SDKが標準搭載する挙動をGASでは
    自分で書く必要があるという前提から入る。
  sources:
    - https://ai.google.dev/gemini-api/docs/troubleshooting
    - https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/deploy/error-code-429
  status: rejected

- id: 2026-W35-06
  title: NotebookLMは1冊にまとめない。トピックで分けると精度が変わる
  type: free
  day: sat
  category: 生成AIで見せられる成果物を作る / NotebookLM・精度向上
  hashtags: [NotebookLM, Gemini, プロンプト, 生成AI]
  score:
    strength: 4
    market: 4
    willingness: 3
    artifact: 4
    total: 15
  rationale: |
    strength4: サブ③。ソースを増やすほど便利だと思って1つのノートブックに
    複数トピックを詰め込むと、関係の薄いソースが引用候補として混ざり、
    回答の的が広がって精度が落ちる。W33-08（投入前のソース整形）が
    「1つのソースの質」を扱ったのに対し、こちらは「ノートブック単位の
    範囲の切り方」を扱う。
    market4: market/2026-08-20.md の「NotebookLM」比4.411（有料率12%）。
    クラスタ #7（NotebookLM/Gemini/マジクラ）比2.7328で全クラスタ最上位。
    「スライド生成」等の使い方記事は厚いが、ノートブックの分割基準を
    扱った記事は調査範囲で見当たらなかった。
    willingness3: 分割基準を知れば手元で再現できる範囲。
    artifact4: 分割前後の同一質問への回答比較（引用ソース数・的外れな引用の有無）と、
    分割の判断基準テンプレートを出せるが、コードではないため5には届かない。
    次点: 「NotebookLMをチームに共有する設定」は整理側の候補として重なる部分が
    あったが、共有権限の設定説明に留まりコード・プロンプト・before/afterの
    いずれも出せないため artifact 2 と判定し落とした（除外リスト参照、W35-03と同一候補）。
  artifactPlan: |
    1つのノートブックに複数トピック（例: 議事録要約の設計 と 経費精算の
    ルール）のソースを混在させた状態と、トピックごとに分割した状態で、
    同じ質問（「議事録の要約でやってはいけないことは？」）を投げたときの
    回答と引用チップの出所を並置する。分割するかどうかの判断基準
    （ソース数の目安、トピックの重なり具合をチェックする質問リスト）を
    テンプレートとして掲載する。
  angle: |
    「ソースは多いほど良い」という前提を疑う記事にする。
    W34-03（食い違いを洗い出す）は複数ソース間の矛盾を扱ったが、
    こちらは矛盾ではなく無関係な混入による精度低下を扱う点で症状が異なる。
  sources:
    - https://www.smartshoki.com/blog/generationai/notebooklm-howto/
  status: rejected

- id: 2026-W35-07
  title: 夜間も落ちずに動くGAS。排他制御と自動リトライをまとめた安定運転キット
  type: paid
  day: sun
  category: 生成AIで見せられる成果物を作る / Gemini+GASの自動化
  hashtags: [GAS, GoogleAppsScript, 業務効率化, Gemini]
  score:
    strength: 5
    market: 4
    willingness: 5
    artifact: 5
    total: 19
  rationale: |
    strength5: 火曜（W35-02・排他制御）と金曜（W35-05・429リトライ）を土台にし、
    既出のW34-06（6分で自分から降りる分割実行）と組み合わせて1つの
    ライブラリファイルにまとめられる。3本とも本リポジトリの実運用
    （note-automationのGitHub Actionsが「LLMを使わない処理だけをcronで
    起こす」設計にしている考え方）と地続きで、手元の設計をそのまま素材にできる。
    market4: market/2026-08-20.md の「GAS」比5.107（有料率6%）、
    「GoogleAppsScript」比3.113（有料率11%）。有料noteは既にサブ1が2本
    （UI指示テンプレート・tokens.css）、サブ3が1本（調査フロー一式）あるが、
    サブ2（GAS）には有料noteが1本も無い。有料率が成立している領域を
    無料記事だけで消費していたのは在庫設計の偏りであり、今回で埋める。
    willingness5: 排他制御・リトライ・6分対応という3つの防御をバラバラに
    自分で組むと数時間かかる実装を、1つのimportableなライブラリとして
    丸ごと渡せる。夜間バッチや大量行の処理で「気づいたら壊れていた」を
    防ぐ直接的な価値があり、時間だけでなく心理的な負担（翌朝ログを見るまで
    不安）を下げる点で支払い意欲は高いと判定した。
    artifact5: 排他制御ラッパー・リトライラッパー・中断再開スニペットを
    1ファイルに統合したGASコード全文、導入手順、意図的に429と二重発火を
    起こした場合の実行ログ（成功で終わることの証跡）を渡せる。
    次点: 「GASの実行時間・APIクォータの一覧まとめ」は市場性はあるが
    一覧記事になり実物が出ないため見送った。「Slack通知の追加」は
    Webhook設定という外部依存が増えるため、コアのキットには含めず
    有料部分内のオプション章として触れるに留める（本体の再現性を損なわないため）。
  productTypeHint: tool
  artifactPlan: |
    lock.gs（排他制御ラッパー）・retry.gs（指数バックオフ＋ジッターの
    リトライラッパー）・resume.gs（4分30秒で自分から降りて時間主導トリガーで
    再開するスニペット、W34-06の発展形）を1つのライブラリとして統合した
    コード全文。呼び出し側から3つを組み合わせて使うサンプル（火曜の
    分類処理を包む形）。導入手順（プロジェクトへの貼り付け方、
    スクリプトプロパティの初期設定）。意図的に二重発火と429エラーを
    起こしたときの実行ログ（両方とも成功で終わる様子）。
    動作条件（対応するトリガー種別、スクリプトの実行時間上限との関係）と、
    できないこと（Google側のクォータ自体を増やすものではない）を明記する。
  angle: |
    無料記事（火曜・金曜）は「1つの防御」をそれぞれ渡したが、
    有料note では「3つを組み合わせて、夜間に人が見ていなくても
    動き続ける状態」を渡す。価値軸は「作業が減る」だけでなく、
    「翌朝ログを見るだけで、成功したと分かる状態になる」という
    到達・獲得の軸を中心に置く。無料記事の読了直後に「じゃあ組み合わせたら
    どうなるのか」という文脈で今買う理由（C3）を作る。
  sources:
    - https://qiita.com/kyamadahoge/items/f5d3fafb2eea97af42fe
    - https://ai.google.dev/gemini-api/docs/troubleshooting
  status: rejected
