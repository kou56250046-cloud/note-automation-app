---
description: 記事を HTML にして、ローカル確認と公開ページの両方を用意する
---

投稿待ちの記事をコピペできる状態にします。**スマホからも投稿できます。**

## 出力先は2つある

| 出力 | 場所 | 有料部分 | 用途 |
|---|---|---|---|
| ローカル | `preview/` | **平文** | PC での確認。git 管理外 |
| 公開 | `preview/public/` | **暗号化** | GitHub Pages でスマホから |

**有料部分の暗号化はローカルでしか行えません。** `03-draft.md` は `.gitignore` 対象で
GitHub Actions 上に存在しないためです。したがって暗号文をコミットして持ち込みます。

## 手順

### 1. 合言葉を確認する

```bash
cat secrets/passphrase.txt
```

無ければ作ります。**15文字以上**にしてください。暗号文が公開されるため、
短いと辞書攻撃で破られます。

```bash
mkdir -p secrets
echo "あなたの長い合言葉をここに" > secrets/passphrase.txt
```

`secrets/` は `.gitignore` 対象なのでコミットされません。

### 2. 両方をビルドする

```bash
node scripts/build-preview.mjs            # ローカル確認用
node scripts/build-preview.mjs --public   # 公開用（有料部分を暗号化）
```

公開用では以下が自動で行われます。

- 有料部分を AES-GCM-256 で暗号化
- **投稿済みの記事を除外**（`publishDate` が過去 or `meta.json` の `posted: true`）
- `noindex` を付与（note の記事より先にインデックスされると重複扱いになる）

### 3. 公開用をコミットして push する

```bash
git add preview/public
git commit -m "プレビューを更新"
git push
```

push すると `deploy-pages` が走り、GitHub Pages が更新されます。
このワークフローは**配信前に検査**し、有料部分が平文だったり `noindex` が無ければ公開を止めます。

### 4. ローカルで確認する

```bash
node scripts/serve.mjs
```

`http://localhost:5173` が開きます。

## ユーザーに伝えること

```
プレビューを更新しました。

## PC から
localhost:5173

## スマホから
https://kou56250046-cloud.github.io/note-automation-app/posts/

有料noteは合言葉を1回入れれば、次回以降は自動で開きます。
共用の端末で使ったときは「合言葉を消す」を押してください。

## 貼り方
無料記事: 「本文をコピー」→ note に貼る
有料note: 「無料部分をコピー」→ 貼る → 有料エリアを設定 → 「有料部分をコピー」→ 貼る

見出し・太字・リスト・引用・区切り線は保持されます。
```

## 投稿したあと

**何もしなくても消えます。** `publishDate` を過ぎた記事は次回のビルドで自動的に
公開ページから除外されます。

予定より早く投稿した場合は `meta.json` に `"posted": true` を追加すると、
次のビルドで消えます。

## ゲートに引っかかっている記事があるとき

プレビュー画面に `lint` / `dedup` の結果が出ます。**エラーがある記事は貼らないでください。**

| 結果 | 対応 |
|---|---|
| lint エラー | `/note-revise {slug} "指摘内容"` で修正する |
| dedup が 0.85 超 | 切り口を変えるか、その記事を捨てる |
| dedup が 0.70〜0.85 | 判断して通す。`report.md` に記録されている |

**有料部分の検査はここでしかできません。** Actions 上に `03-draft.md` が無いためです。

## 注意

- **`preview/` 直下は絶対にコミットしないでください。** 有料部分が平文で入っています
  （`.gitignore` で除外済みですが、`git add -f` で強制追加しないこと）
- 公開URLは推測できます。リポジトリが public なので「見つかりにくいから安全」は成り立ちません。
  **有料部分の防御は合言葉だけです**
