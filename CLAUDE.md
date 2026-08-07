# note-factory

Claude Code で「ひとり出版社」を組み、リサーチから記事生成までを自動化するリポジトリ。

**週7本を投稿する。** 無料記事5本＋有料note 2本。

## 人間の仕事は2つだけ

1. プレビュー画面から本文をコピーして、note に貼って投稿する
2. ダッシュボードで管理する

それ以外（調査・リサーチ・分析・テーマ決め・記事生成）はすべて機械側で完結させる。
**確認を求めるために処理を止めない。** 止めてよいのは、入力ファイルが欠けているときだけ。

---

## 二層モデル

部署ではなく、**周期**で分ける。リサーチを日次でやるとトークンが尽きるからである。

| 層 | 役割 | 周期 | 実行 |
|---|---|---|---|
| **市場計測層** | 需要と供給を実測する | 日曜1回 | `note_market.py`（Actions・**LLM を使わない**） |
| **週次リサーチ層** | 1週間分のテーマを仕込む | 月曜1回 | `weekly-research`（Routine） |
| **日次生成層** | 在庫から1本引いて記事にする | 毎日 | `daily-build`（Routine）／有料はローカル |
| **決定論ゲート層** | 文体・重複・note記法を機械判定する | push のたび | GitHub Actions（**LLM を使わない**） |
| **経営** | 投稿と管理 | 随時 | プレビュー画面 / ダッシュボード |

**日次の生成では web 検索をしない。** 在庫（`research/themes.md`）から引くだけにする。これが毎日投稿を成立させている唯一の理由である。

### 週の並び

`weekly-research` が月曜に7本のテーマを仕込み、各テーマに `type` と曜日を割り当てる。

| 曜日 | 月 | 火 | 水 | 木 | 金 | 土 | 日 |
|---|---|---|---|---|---|---|---|
| type | free | free | free | **paid** | free | free | **paid** |
| 実行 | Routine | Routine | Routine | **ローカル** | Routine | Routine | **ローカル** |

`daily-build` の cron は `0 6 * * 1,2,3,5,6`（月火水金土）とし、有料noteの日は動かさない。
有料部分の本文（`03-draft.md`）を追跡しないため、クラウドで生成すると手元に残らないからである。

---

## コマンド

| コマンド | 動作 | 実行場所 |
|---|---|---|
| `/note-init` | 初回のみ。カテゴリとペルソナを確定する | ローカル |
| `/note-daily` | 今日の記事を1本作る | ローカル（有料は必須） |
| `/note-preview` | プレビューを生成して `localhost:5173` で開く | **ローカルのみ** |
| `/note-revise {slug} "指示"` | 差し戻して再生成 | ローカル |
| `/note-letter {slug}` | 有料noteのレター診断ループ | ローカル |
| `/note-review` | ボトルネックを診断して次の1手を1つ決める | ローカル |

### 記事1本を作ると出るもの

```
notes/{slug}/
  02-final.md        本文（2500〜4000字＋実物）
  06-thumbnail.md    見出し画像のプロンプト（Gemini に貼る）
  demo/              before.html / after.html（デザイン系のみ）
  report.md          判断ログ
```

**プレビューにはこれが全部そろって出る。** 本文のコピー、ハッシュタグのコピー、
before/after の並置、見出し画像プロンプトのコピーが1画面で終わる。

**ユーザーが「お願いします」と言ったら `/note-daily` を実行する。**

---

## 商品の型

**有料noteには2つの型がある。混同すると `letter-audit` が構造的に通らない。**

| 型 | 再現性の根拠 | `profile.md` | 例 |
|---|---|---|---|
| `tool`（道具型） | **成果物そのものの検証可能性** | **不要** | スキル定義集、プロンプト集、設計図、テンプレート |
| `experience`（体験談型） | 書き手の実績 | **必須** | 「月5万を達成した手順」 |

道具型は「買った人が手元でコピペして動かせるか」で再現性を担保する。書き手が何者かは関係ない。動くかどうかはコードとテンプレートが証明する。

**実績が貯まるまでは `tool` だけを作る。** `experience` は `profile.md` に「天井を下げられる実績」と「自分以外の結果」が揃ってから解禁する。

`00-concept.md` の先頭に `productType` を必ず書く。書かれていなければ生成を止める。

---

## 絶対のルール

### 1. 生成だけのスキルを作らない

すべてのスキルは「良し悪しを決める物差し」を持つこと。
物差しのないスキルは、自動フローに組み込まない。

**物差しはコードでもよい。** 決定論的に判定できるものは LLM に考えさせず `scripts/` に置く。
文体・表記ゆれ・note で崩れる記法・既出記事との重複は、すべてコードの担当である。

### 2. 依存関係を飛ばさない

前工程の出力ファイルが存在しない状態で次のスキルを実行しない。
欠けていたら**停止して、実行すべきスキル名を伝える**。推測で埋めない。

### 3. 実績・体験・第三者の結果を創作しない

書いてよいのは以下だけ。

- `knowledge/profile.md` に根拠があるもの
- `data/` の実測値
- 出典を明記した第三者の情報

**`profile.md` が空でも記事は書ける。** そのときは実績を要する主張を書かないだけである。
足りないものを埋めるために創作しない。書かずに「足りない」と報告する。

`type: experience` の有料noteだけは `profile.md` の実数値を必須とする。無い状態で着手しない。

### 4. カテゴリの範囲外を書かない

`knowledge/account.md` の主カテゴリ1つ＋サブカテゴリ2〜3つが、書いてよい範囲のすべてである。

範囲外のテーマは**在庫に入れない**。捨てるのではなく `knowledge/learnings.md` に理由付きで記録し、四半期ごとに見直す。

note のアルゴリズムはアカウント単位で「この人は何の人か」を学習する。カテゴリが散ると推薦されなくなる。

### 5. 書き手に自己評価をさせない

執筆スキルは判定しない。判定は独立したコンテキストを持つサブエージェントが行う。
`letter-writer` や `writer` に「良い出来かどうか」を聞かない。

### 6. ゲートを人間の承認で代替しない。代替してよいのは決定論コードだけである

「これでよろしいですか」と聞いて先に進むのは、ゲートを通したことにならない。

**有料noteでは `letter-audit` と `ethics-line` を必ず実行する。** 売る以上、
景品表示法・特定商取引法のリスクが実在する。ここは削らない。

**無料記事では `lint.py` が E3・E5 を一次判定し、検出があったときだけ `auditor` を起動する。**

| 項目 | 一次判定 | 起動条件 |
|---|---|---|
| E5（断定表現） | `voice.md` の `ng` を部分一致で検出 | error なので必ず直す |
| E3（裏付けのない実績） | `unverified-claim`（金額・割合・人数・期間・フォロワー数） | 検出時のみ `auditor` |

これはゲートを緩めたのではなく、**判定を LLM から決定論コードへ移した**（ルール1）。
人間の承認で代替してはならないという原則は変えていない。

**漏れるもの:** 数値を伴わない婉曲な実績主張は機械では拾えない。
週1本の `reader-feedback` と月次レビューで検出する。漏れを承知でコストを取っている。

---

## 品質ゲート

| ゲート | 見るもの | 対象 | 上限 | 実行 |
|---|---|---|---|---|
| `scripts/lint.py` | 文体・表記・note で崩れる記法・**実物の有無**・**実績主張** | 全記事 | — | Actions（**トークン0**） |
| `scripts/dedup.py` | 既出記事との重複 | 全記事 | 0.85超でブロック | Actions（**トークン0**） |
| `scripts/note_market.py` | 需要と供給。テーマ選定の根拠 | 週次 | — | Actions（**トークン0**） |
| `reader-feedback` | 離脱しないか | 無料記事 | **週1本だけ** | `critic` |
| `letter-audit` | 売れるか（16項目） | 有料note | 2周 | `critic` |
| **`ethics-line`** | やってはいけないことをしていないか | **有料note必須／無料は検出時のみ** | **上限なし** | `auditor` |

**`ethics-line` だけ上限がない理由:** 景品表示法・特定商取引法に関わるため。
他は品質の問題だが、これは法的な問題である。妥協しない。

### レビューを削り、テーマ選定に投資する

**浅い記事はレビューでは直らない。テーマ選定の時点で決まっている。**

初版はレビュー（`reader-feedback` / `ethics-line`）に週10回の LLM 呼び出しを注ぎ、
テーマを決める市場分析には web 検索15件しか使っていなかった。それで浅い記事が出た。

配分を逆にする。

| 施策 | 変化 |
|---|---|
| `reader-feedback` を週5本 → **週1本**（日曜にサンプリング） | critic 呼び出し −4/週 |
| 無料記事の `ethics-line` を `lint.py` の一次判定に置換 | Opus 呼び出し 週5 → **ほぼ0** |
| `weekly-research` の web 検索を 15件 → **5件** | 週次の最大コスト源が 1/3 |
| `note_market.py` が需要と供給を実測（Python） | **トークン0** |

**分析の質を上げながら、総消費は下がる。** 増やしたのは計算であって推論ではない。

### 実物のない記事を通さない

**すべての記事は実物を1つ以上持つ。** プロンプト全文・コード全文・before/after のどれか。

`lint.py` の `no-artifact` が error で止める。実物が用意できないテーマは、
そもそも `weekly-research` の `artifact` 軸（2以下は在庫に入れない）で落ちる。

**`critic` と `auditor` を兼務させない理由:** 目的が違う。
critic は「売れるか」を見る。auditor は「嘘がないか」を見る。
同じエージェントにやらせると、売るための表現を守ろうとして線引きが甘くなる。

---

## モデル配分

| 用途 | モデル | effort | 理由 |
|---|---|---|---|
| **市場計測** | **なし（Python）** | — | **`note_market.py`。推論ではなく計算である** |
| 日次記事の執筆 | Sonnet 5 | `medium` | 量が多い。Opus 5 との品質差が出にくい |
| 週次リサーチ | Sonnet 5 | `high` | 需要の数値は market データが担うので検索は5件 |
| 有料noteの本文・レター | Sonnet 5 | `high` | 同上 |
| `letter-audit`（`critic`） | **Opus 5** | `high` | 判定の精度が売上に直結する |
| **`ethics-line`（`auditor`）** | **Opus 5** | `high` | **法的リスク。呼ぶ回数は減らすが、呼ぶときは Opus** |

**`ethics-line` のモデルは下げない。** 減らしたのは呼ぶ**回数**であって精度ではない。
無料記事では `lint.py` が一次判定し、検出時だけ Opus を呼ぶ（ルール6）。

Sonnet 5 は新トークナイザで、同じ日本語が旧モデル比で約30%多いトークンになる。
`max_tokens` は思考＋本文の合計上限なので、記事が途中で切れたらここを疑う。

---

## サブエージェントに渡してよい情報

| エージェント | 渡すもの | **渡してはいけないもの** |
|---|---|---|
| `researcher` | account, 検索結果 | — |
| `writer` | theme, account, profile, voice | — |
| `letter-writer` | concept, account, profile, voice, competitors | — |
| `critic` | 本文, persona | **執筆の経緯、コンセプトの狙い、書き手の意図** |
| `auditor` | 本文, deadlineClaims, profile | **売る文脈、価格、ローンチ計画** |

この分離が崩れると、ゲートが機能しなくなる。

---

## 差し戻しの作法

差し戻すときは `failures` だけを渡す。**全文の書き直しを指示しない。**
○だった箇所を壊されると振り出しに戻る。

上限で解消しない場合は、記事ではなく上流（コンセプト・価格・対象読者・テーマ選定）の問題である可能性が高い。
自動修正を諦めて、疑わしい工程名を添えて人間に回す。

---

## 投稿の受け渡し

**ブラウザ自動操作は使わない。** 記事は HTML にレンダリングし、人間がコピーして note に貼る。

出力は2系統ある。

| 出力 | 場所 | 有料部分 | どこから使うか |
|---|---|---|---|
| ローカル | `preview/` | **平文** | PC。git 管理外 |
| 公開 | `preview/public/` | **暗号化** | **スマホ**。GitHub Pages |

```
記事生成 → notes/{slug}/02-final.md（無料）/ 03-draft.md（有料）
  ↓ build-preview.mjs           → preview/            （ローカル確認）
  ↓ build-preview.mjs --public  → preview/public/     （公開・暗号化）
  ↓ build-demo.mjs              → demo/{slug}/        （before/after。暗号化しない）
  ↓ commit & push → deploy-pages
人間が「本文をコピー」を押す → note に貼る → 公開
```

### before/after はライブデモにする

**画像を手で貼らせない。** note はコピペ投稿なので、画像を挟むと人間の作業が増える。

`notes/{slug}/demo/before.html` と `after.html` を置くと、`build-demo.mjs` が
`demo/{slug}/` に並置ビューを生成し、Pages で配信する。記事にはURLを載せる。

**`build-preview.mjs` とは別系統である。** あちらは投稿済みを自動除外するが、
デモは**投稿したあとにこそ読者が踏む**ため、除外ロジックを共有できない。
暗号化も不要なので Actions でもローカルでも組み立てられる。

**投稿キューからも確認できる。** `meta.json` に `demo` があると、
投稿キューの一覧にボタンが出て、記事ページには before/after が並んで埋め込まれる。
**投稿前に、読者が見る画面をそのまま確認できる。**

デモページごと iframe に入れると入れ子になってスクロールが三重になるため、
`before.html` と `after.html` を直接並べ、`transform: scale(.5)` で全体を収めている。

クリップボードには `text/html` と `text/plain` を同時に書き込む。
note のエディタは `text/html` を読むので、見出し・太字・リスト・引用・区切り線が保持される。

**`file://` では動かない。** `navigator.clipboard.write()` はセキュアコンテキストを要求するため、必ず `localhost` か HTTPS 経由で開く。

### 有料部分の暗号化

**公開版の有料部分は AES-GCM-256 で暗号化する。合言葉はブラウザで復号する。**

```
base64( salt[16] || iv[12] || ciphertext+tag )
PBKDF2 / SHA-256 / 310,000回 / AES-GCM-256
```

ダッシュボードと同じ形式である。合言葉は `secrets/passphrase.txt`（`.gitignore` 対象）。

**暗号化はローカルでしか行えない。** `03-draft.md` は `.gitignore` 対象で GitHub Actions 上に存在しないため、暗号文をコミットして持ち込む。`deploy-pages` は暗号化せず、配るだけである。

**合言葉が唯一の防御である。** 公開URLは推測できるので、15文字以上にする。

### 投稿済みの扱い

公開版は**投稿済みを自動で除外する。** note の記事と同じ内容が2箇所に残らないようにするためである。

| 判定 | 条件 |
|---|---|
| `meta.json` の `posted: true` | 明示的に投稿済み |
| `publishDate` が今日より前 | 予定日を過ぎている＝投稿したとみなす |

静的サイトからサーバーに書き戻せないため、**日付を唯一の自動判定材料**にしている。

### 検索エンジンに拾わせない

公開版には `noindex` を付け、`robots.txt` で `Disallow: /` にする。
note の記事より先にインデックスされると重複コンテンツ扱いになるからである。

**note で崩れる記法は書かない。** `lint.py` が検出する。

| 記法 | note | 対応 |
|---|---|---|
| テーブル | **非対応** | 箇条書きにする |
| 脚注 | 非対応 | 本文に展開する |
| 3階層以上のリスト | 崩れる | 2階層までにする |
| 水平線 `---` | 区切り線になる | 使ってよい |

---

## リポジトリは public。有料部分だけ追跡しない

リポジトリ: https://github.com/kou56250046-cloud/note-automation-app

public にする理由は、GitHub Pages と Actions の無料枠を使えるからである。

**ただし有料noteの本文を追跡してはならない。** public repo に置けば誰でも読め、商品価値が消える。以下を `.gitignore` で除外する。

| 対象 | 追跡 | 理由 |
|---|:---:|---|
| `notes/**/03-draft.md` | ✕ | **有料部分の本文。平文なので絶対に追跡しない** |
| `preview/*`（直下） | ✕ | ローカル確認用。有料部分が平文で入る |
| `secrets/` | ✕ | 合言葉 |
| **`preview/public/`** | **○** | **有料部分は暗号化済み。Pages 配信に必要** |
| **`demo/`** | **○** | **無料記事の作例。読者に見せるものなので隠す理由がない** |
| `notes/**/demo/` | ○ | デモの元ファイル |
| `notes/**/02-letter.md` | ○ | note 上でも無料公開する部分 |
| `research/market/*.md` `*.json` | ○ | 需要と供給の実測。テーマ選定の根拠として残す |
| `research/market/raw/` | ✕ | 生キャッシュ。毎週千件規模で積むと膨らむ |
| `data/dashboard.json` | ✕ | **平文の中間ファイル。** 暗号化して ENC に埋めたら不要 |
| `data/history.jsonl` | ○ | フォロワー数の蓄積。**Pages には配信しない** |

**この制約から2つが決まる。**

1. **有料noteの生成はローカル実行のみ。** Routines はクラウドで動いてコミットするため、追跡しないファイルを手元に残せない。`daily-build` は無料記事だけを担当し（月火水金土）、有料noteは木・日にローカルで作る。
2. **公開版プレビューの生成もローカルのみ。** `03-draft.md` が Actions 上に存在しないため、そこでは暗号化すらできない。ローカルで暗号化し、生成物をコミットして持ち込む。

ダッシュボードと投稿キューは GitHub Pages で配信する。**スマホから投稿できる。**

### ダッシュボードの更新

**ダッシュボードは `data/` を読まない。** `note-factory-dashboard.html` の
`const ENC = "..."` に暗号化データを埋め込む自己完結型である。

```
python scripts/note_market.py --write-dashboard   # data/dashboard.json を作る
node scripts/encrypt.mjs --from data/dashboard.json  # ENC に埋め込む
git commit && push                                # deploy-pages が配信する
```

| ファイル | 追跡 | 理由 |
|---|:---:|---|
| `data/dashboard.json` | ✕ | 平文の中間ファイル。埋め込んだら不要 |
| `data/history.jsonl` | ○ | フォロワー数の蓄積。**失うと履歴が戻らない** |
| `note-factory-dashboard.html` | ○ | ENC は暗号化済み |

**`data/` を Pages に配信しない。** `history.jsonl` にフォロワー数が平文で入るため、
配信する理由のないものを公開範囲に置かない。

**取れないものは作らない。** note の公開 API にはコメント数も過去のフォロワー履歴も無い。
`followerHistory` と記事ごとの `curve` は**今日から1点ずつ積む**。
売上は手入力（ダッシュボードに入力欄がある）。

---

## GitHub Actions で記事を生成しない

Claude Code Action は Anthropic API キーによる従量課金であり、サブスク枠の外になる。
**生成は Routines かローカルに置く。** Actions が担当するのは LLM を使わない処理だけである。

| Actions | 何をするか | LLM |
|---|---|---|
| `lint-and-dedup` | 文体・記法・実物の有無・重複を判定する | 使わない |
| **`market-research`** | **需要と供給を実測する（日曜21時 JST）** | **使わない** |
| `deploy-pages` | ダッシュボード・投稿キュー・デモを配信する | 使わない |
| `fetch-metrics` | 数値を取得して暗号化する | 使わない |
| `stock-alert` | 在庫が3本未満なら Issue を立てる | 使わない |

**`market-research` はこの原則に抵触しない。** やるのは生成ではなく計測である。

---

## ファイル配置

```
knowledge/
  account.md          account-design の出力。カテゴリとペルソナ。ここが全記事の範囲を決める
  profile.md          実績。profile-accumulator が自動で追記する。当面は空でよい
  voice.md            文体・禁止表現。lint.py が参照する
  products.md
  learnings.md        却下理由・範囲外テーマの記録

research/
  accounts/{genre}.md 競合アカウントの解剖（有料note着手時に更新する）
  market/
    hashtags.txt      note_market.py が測るタグ。カテゴリを変えたらここも変える
    {date}.md         **需要と供給の要約。weekly-research が読むのはこれだけ**
    {date}.json       数値の全量。ダッシュボード用
    raw/              生キャッシュ（.gitignore 対象）
  themes.md           ネタ在庫。週1で7本仕込み、毎日1本消化する
  trends/{date}.md

notes/{slug}/
  00-theme.md         themes.md から引いた1本と選定理由
  01-draft.md         本文
  02-final.md         修正・レイアウト済み
  meta.json           タイトル / カテゴリ / ハッシュタグ / type / 公開予定日 / demo / artifacts
  06-thumbnail.md     見出し画像のプロンプト。プレビューからコピーして Gemini に貼る
  report.md           判断ログ

  # 有料noteのときだけ追加される
  00-concept.md       productType を含む
  02-letter.md        無料部分（セールスレター）。追跡してよい
  pricing.json        価格・天井・根拠（pricing-strategy の出力）
  letter-meta.json    レターの構造メタ
  07-titles.md        タイトル8案と採点（title-design の出力）
  03-draft.md         有料部分。★.gitignore 対象。ローカルにのみ存在する
  audit.json          letter-audit の判定結果
  ethics.json         ethics-line の検出結果

notes/{slug}/demo/    before.html / after.html。★AI×Webデザインの記事だけ
demo/{slug}/          build-demo.mjs の出力。**Pages で配信する。追跡する**
preview/              build-preview.mjs の出力（.gitignore 対象）
data/                 metrics.json / history.jsonl / revenue.json
scripts/              build-preview.mjs / build-demo.mjs / serve.mjs / fetch-public.mjs
                      encrypt.mjs / lint.py / dedup.py / note_market.py
routines/             Routines のプロンプト定義（自己完結形式）
```

---

## ログ

自動フローで行った判断は、すべて `notes/{slug}/report.md` に残す。
特に以下は必ず記録する。**人間が過程を見ないので、記録がないと改善できない。**

- どのテーマをなぜ選んだか（スコアと次点）
- 各ゲートで何回差し戻したか、何が×だったか
- `ethics-line` が何を削除・修正したか（**全件**）
- `severity: review` として人間に回した項目
- `lint.py` / `dedup.py` の警告（ブロックされなかったものも含む）

---

## 在庫が切れたら止まる

**毎日投稿の唯一の停止要因は `research/themes.md` の枯渇である。**

`stock-alert` Actions が毎朝チェックし、未使用テーマが3本未満なら Issue を立てる。
在庫が切れた状態で記事を書かない。空の在庫を埋めるために、その場でテーマを作らない。
