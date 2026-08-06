---
description: 今日の記事を1本作る。在庫から引いてゲートを通すまで自動で回す
---

`research/themes.md` の在庫から今日のテーマを1本引いて記事にします。

**ユーザーが「お願いします」と言ったときも、このコマンドを実行してください。**

**web 検索をしません。** 在庫から引くだけです。これが毎日投稿を成立させています。

## 手順

### 1. 前提を確認する

| 確認 | 欠けていたら |
|---|---|
| `knowledge/account.md` | 停止して `/note-init` を促す |
| `knowledge/voice.md` | 停止して報告 |
| `knowledge/profile.md` | 停止して報告（空でよいがファイルは要る） |
| `research/themes.md` に `status: pending` が1本以上 | **停止して `weekly-research` を促す** |

**在庫が空のときに、その場でテーマを作らないでください。** 停止します。

### 2. 今日のテーマを引く

```
themes.md から status: pending かつ day が今日の曜日 のものを探す
  → 見つかった: それを使う
  → 見つからない: pending のうち type: free で最高スコアのものを使う
     （その場合「曜日の割り当てから繰り上げた」と report に書く）
```

`slug` は `YYYY-MM-DD-{英数字の短い識別子}` にする。
`notes/{slug}/00-theme.md` に引いたテーマと選定理由を書く。

### 3. type で分岐する

#### `type: free` の場合

```
1. daily-article（writer / Sonnet 5 / effort: medium）
     → 01-draft.md, meta.json
2. reader-feedback（critic）1周
     → 指摘があれば writer に failures だけ渡して修正
3. ethics-line（auditor / light モード）
     → E3・E5 のみ検出。clear になるまで上限なし
4. 02-final.md を確定
```

#### `type: paid` の場合

**ローカル実行のみです。** クラウド（Routine）では実行しないでください。
`03-draft.md` は `.gitignore` 対象なので、クラウドで生成すると手元に残りません。

```
1. product-concept
     → 00-concept.md（productType を必ず確定する）
     → profile.md が空なら productType: tool 以外を選ばない
2. sales-letter（letter-writer）
     → 02-letter.md, letter-meta.json
3. draft-writing（writer）
     → 03-draft.md
4. letter-audit（critic / Opus 5）最大2周
     → ×が残れば failures だけ渡して sales-letter に差し戻す
     → 2周で通らなければ打ち切り、疑わしい上流工程を報告する
5. ethics-line（auditor / full モード）上限なし
6. title-design（8案）
```

### 4. 共通の仕上げ

```
1. build-report → notes/{slug}/report.md
2. themes.md の該当エントリを status: used に更新
3. git add / commit / push
```

**`03-draft.md` は `.gitignore` で除外されるため、push しても含まれません。** 正常です。

### 5. 報告

## 報告の形式

```
記事ができました — {slug}

種別: 無料記事 / 有料note（tool）
タイトル: {title}
カテゴリ: {category}
文字数: {n} 字

## ゲート
reader-feedback: 指摘 {n} 件 → 修正済み
ethics-line（light）: 検出 {n} 件
  - E3「多くの人が」を削除（母数の根拠なし）

## 書けなかったこと
- {profile.md に根拠がなく諦めた主張}

## weekly-research への申し送り
- {sources が足りなかった、など}

次: /note-preview でコピーして note に貼れます。
```

## 絶対に守ること

- **web 検索をしない。** 調べたくなったら `report.md` に申し送りを書く
- **在庫が空なら停止する。** その場でテーマを作らない
- **自己評価しない。** 「良い記事ができました」と書かない。ゲートの結果だけを報告する
- **`profile.md` にない実績を書かない。** 足りなければ「書けなかったこと」に記録する
- **`type: paid` をクラウドで実行しない。** ローカルのみ
