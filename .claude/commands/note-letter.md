---
description: セールスレターを書いて、合格するまで診断ループを回す
---

`notes/$1/` のセールスレターを、3つのゲートを通過するまで自動で仕上げます。

## 手順

1. **入力を確認する**
   - `notes/$1/00-concept.md` が存在するか
   - `knowledge/personas/` に対象ペルソナがあるか
   - `knowledge/profile.md` に実数値があるか
   - 1つでも欠けていたら、その工程のスキル名を伝えて**停止する**

2. **`sales-letter` を実行**（`letter-writer` サブエージェント）
   - `02-letter.md` と `letter-meta.json` を生成

3. **診断ループ**（最大3周）
   ```
   letter-audit を critic サブエージェントで実行
     → audit.json の pass が true なら抜ける
     → false なら failures だけを letter-writer に渡して差し戻す
     → 3周しても通らなければ打ち切り、上流の見直しを提案する
   ```

4. **`ethics-line` を実行**（`auditor` サブエージェント）
   - **回数制限なし。** `clear: true` になるまで繰り返す
   - `severity: review` の項目は修正せず、人間への確認事項として残す

5. **報告**
   - 何周したか
   - どの項目で落ちたか
   - ethics-line が何を削除・修正したか（**必ず全件報告する**）
   - `severity: review` の項目があれば、判断を仰ぐ

## 報告の形式

```
レター完成 — {slug}

診断: 合格（16/16） / 2周
  round 1: C3「今買う理由がない」で不合格
  round 2: 合格

線引き: 1件を修正
  E1 「3日間限定」を削除（実行予定が未定のため）

要確認: 1件
  E3 「読者の1人が10万円を達成」の出典が profile.md にない
```
