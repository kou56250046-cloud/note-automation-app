---
description: 記事を1本だけ作る。差し込みや作り直しに使う（主フローは /note-week）
---

`research/themes.md` の在庫からテーマを1本引いて記事にします。

**主フローは `/note-week` です。** 日曜に1週間分7本をまとめて作ります。
このコマンドは、**1本だけ差し込みたいとき・作り直したいとき**に使ってください。

**ユーザーが「お願いします」「今週の記事を作って」と言ったら `/note-week` を実行してください。**
「1本だけ」と明示されたときにこのコマンドを使います。

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

**ローカル実行のみです。** クラウドでは実行しないでください。
`03-draft.md` は `.gitignore` 対象なので、クラウドで生成すると手元に残りません。

```
1. product-concept
     → 00-concept.md（productType を必ず確定する）
     → profile.md が空なら productType: tool 以外を選ばない
     → 「渡すもの」の5項目が埋まらなければ停止する
2. pricing-strategy
     → pricing.json（価格 + 天井 + 根拠）
     → research/market/{最新}.json の価格中央値を必ず引用する
     → 情報密度が「低」なら有料にせず上流に戻す
3. sales-letter（letter-writer）
     → 02-letter.md, letter-meta.json
4. draft-writing（writer）
     → 03-draft.md（★追跡しない。ローカルにのみ残る）
5. letter-audit（critic / Opus 5）最大2周
     → ×が残れば failures だけ渡して sales-letter に差し戻す
     → 2周で通らなければ打ち切り、疑わしい上流工程を報告する
6. ethics-line（auditor / full モード）上限なし
     → **有料noteでは必ず実行する。** 無料記事の「検出時のみ」は適用しない
7. title-design（8案）
     → 07-titles.md、採用案を meta.json の title に書く
```

**`pricing-strategy` を飛ばさない。** 価格と天井が決まっていないと
`letter-audit` の C3（今買う理由）と C4（高い）が判定できず、
`draft-writing` も約束の範囲を知らないまま書くことになる。

### 4. 共通の仕上げ

```
1. thumbnail-prompt → notes/{slug}/06-thumbnail.md
     → 見出し画像のプロンプト。人間が Gemini に貼る
     → demo/after.html があれば、そこから配色を取って記事と揃える
2. build-report → notes/{slug}/report.md
3. themes.md の該当エントリを status: used に更新
4. git add / commit / push
```

**`thumbnail-prompt` は記事が確定してから実行してください。**
本文が変われば被写体も変わります。

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
