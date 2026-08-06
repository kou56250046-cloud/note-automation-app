# themes — ネタ在庫
#
# status: pending  未使用
#         used     記事化済み
#         rejected 人間が却下（ダッシュボードの却下ボタン）
#
# 日次生成はここから1本引くだけ。web 検索はしない。

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
  status: pending

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
  status: pending

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
  status: pending

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
  status: pending

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
  status: pending

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
  status: pending
