---
description: 1週間分の記事7本（無料6本＋有料note1本）を日曜にまとめて作る
---

`research/themes.md` の在庫から7本引いて、翌日の月曜から次の日曜までの記事にします。

**これが主フローです。** `/note-daily` は1本だけ作り直したいときに使ってください。

**ユーザーが「今週の記事を作って」「1週間分お願いします」と言ったら、このコマンドを実行してください。**

## いつ実行するか

**日曜。`market-research` Actions（日曜21時 JST）のあと。**

その週の実測値を見てからテーマを確定できます。
21時より前に実行する場合は、前週のデータで判断することになる旨を `report.md` に記録します。

## ローカル実行のみ

有料noteの `03-draft.md` は `.gitignore` 対象で、クラウドで生成すると手元に残りません。
公開版プレビューの暗号化もローカルでしかできません。

## 週の並び

| 曜日 | 月 | 火 | 水 | 木 | 金 | 土 | 日 |
|---|---|---|---|---|---|---|---|
| type | free | free | free | free | free | free | **paid** |
| サブカテゴリ | 1 | 2 | 3 | 1 | 2 | 3 | **持ち回り** |

日曜の有料noteは、**その週の無料記事のどれかを土台にします。**
無料で「点」を見せ、有料で「線」または「道具」を渡す形にすると、
`letter-audit` の C3（今買う理由）を無料記事の読了直後という文脈で作れます。

## 手順

`weekly-build` スキルの手順に従ってください。要点だけ再掲します。

### 1. 在庫を確認する

`research/themes.md` の `status: pending` が **7本以上**あること。
**足りなければ停止**して `weekly-research` の実行を促してください。
その場でテーマを作らないでください。

### 2. 無料6本を並列で書く

**`writer` サブエージェントを6つ同時に起動してください。** 1本ずつ順に作らないでください。

デザイン系（サブ①）には `demo/before.html` と `after.html` も作らせます。
**外部ライブラリ・CDN・外部フォント・外部画像を使わせないでください**（Pages の CSP で落ちます）。

### 3. 決定論ゲートを全件に通す

```bash
python scripts/lint.py notes/*/01-draft.md
python scripts/dedup.py --all
```

error は直します。差し戻すときは `failures` だけを渡してください。**全文の書き直しを指示しないでください。**

### 4. LLM ゲートは絞る

- `ethics-line`（無料記事）は `lint.py` の `needsAudit` が true の記事だけ
- `reader-feedback` は**週1本だけ。月曜の記事**に掛ける

### 5. 有料noteを作る（日曜分）

```
product-concept → pricing-strategy → sales-letter → draft-writing
  → letter-audit（最大2周）→ ethics-line（full・上限なし）→ title-design
```

**`pricing-strategy` を飛ばさないでください。** 価格と天井が決まっていないと
`letter-audit` の C3 と C4 が判定できません。

過去2件の商品が A1 で落ちています。**価値軸に「減算ではない軸」を最低1本入れてください。**
「〜がなくなる／要らない」ばかりだと、理想の未来が同じ文型に収束します。

**C3 に偽の期限を使わないでください。** 書けるのは実行予定のある値上げだけです。
`pricing.json` の `priceSchedule` に登録し、`letter-meta.json` の `deadlineClaims` に記録します。

**同梱するコードは抽出して実際に走らせて確認してください。**

### 6. 仕上げ

```
thumbnail-prompt → build-report → themes.md を used に → build-demo.mjs → commit & push
```

### 7. プレビュー

```
/note-preview
```

## 報告

```
今週の7本ができました（{開始日} 〜 {終了日}）

| 曜日 | slug | 種別 | 字数 | lint | dedup |
...

## ゲート
reader-feedback（月曜の1本）: 指摘 {n} 件 → 修正済み
ethics-line: 起動 {n} 本 / 検出 {n} 件
letter-audit: {n}/16（round {n}）

## 書けなかったこと
## 人間の作業（自動化されていないもの）
## weekly-research への申し送り

次: /note-preview でコピーして note に貼れます。
```

## 絶対に守ること

- **web 検索をしない。** 在庫から引くだけです
- **在庫が7本未満なら停止する。** その場でテーマを作らない
- **自己評価しない。** ゲートの結果だけを報告する
- **`profile.md` にない実績を書かない**
- **確認を求めるために処理を止めない。** 止めてよいのは入力ファイルが欠けているときだけ
