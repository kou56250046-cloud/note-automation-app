# daily-build

無料記事を1本作る Routine。

| 項目 | 設定 |
|---|---|
| cron | `0 6 * * 1,2,3,5,6`（月火水金土 06:00 JST） |
| モデル | Sonnet 5 |
| effort | medium |
| 消費 | 1/日（週5回） |

**木・日は動かさない。** 有料noteの日であり、`03-draft.md` を追跡しないため
クラウドで生成すると手元に残らない。有料noteはローカルで `/note-daily` を実行する。

---

## Routines の制約

- **承認なしで実行される。** 途中で人間に確認を求めない
- **前回の文脈を持ち越さない。** 「前回の続き」は機能しない
- **ブラウザ操作ができない。** note への投稿は人間が行う

以下のプロンプトは、この制約を前提に自己完結して書かれている。

---

## プロンプト（Routines に登録する本文）

```
このリポジトリで今日の無料記事を1本作ってください。

まず CLAUDE.md を読み、そこに書かれたルールをすべて守ってください。
特に以下は絶対です。

- web 検索をしない。research/themes.md の在庫から引くだけにする
- profile.md に根拠のない実績・数字・体験を書かない
- knowledge/account.md のカテゴリ範囲を出ない
- 書いたものを自分で評価しない

## 手順

1. 前提を確認する。1つでも欠けたら、その場で停止して理由を報告する
   - knowledge/account.md がある
   - knowledge/voice.md がある
   - knowledge/profile.md がある（空でよい）
   - research/themes.md に status: pending のテーマが1本以上ある

   在庫が空のときに、その場でテーマを作らないでください。停止してください。

2. themes.md から今日の曜日（day）かつ status: pending のテーマを1本引く。
   見つからなければ type: free で最もスコアの高いものを使い、
   「曜日の割り当てから繰り上げた」と report.md に記録する。

   type: paid のテーマしか残っていない場合は、記事を作らずに停止し、
   「有料noteはローカル実行が必要」と報告してください。

3. slug を YYYY-MM-DD-{短い英数字の識別子} の形で決め、
   notes/{slug}/00-theme.md に引いたテーマと選定理由を書く。

4. daily-article スキルに従って本文を書く（writer サブエージェント）。
   1500〜2500字。結論を先に置く。読者が今日できることを1つだけ示す。
   → notes/{slug}/01-draft.md と meta.json

5. reader-feedback を critic サブエージェントで1周実行する。
   指摘があれば failures だけを writer に渡して直す。全文を書き直さない。

6. ethics-line を auditor サブエージェントで実行する（light モード）。
   検出項目は E3（裏付けのない実績）と E5（断定表現）の2つ。
   clear になるまで繰り返す。回数制限はない。
   → notes/{slug}/ethics.json

7. notes/{slug}/02-final.md を確定する。

8. build-report で notes/{slug}/report.md を書く。
   以下を必ず含める。
   - どのテーマをなぜ選んだか
   - reader-feedback で何を指摘され、どう直したか
   - ethics-line が何を削除・修正したか（全件）
   - profile.md に根拠がなく書けなかったこと
   - weekly-research への申し送り

9. research/themes.md の該当エントリを status: used に更新する。

10. git add / commit / push する。
    コミットメッセージは「{タイトル}」の形式でよい。

## 報告

最後に以下を報告してください。自己評価（「良い記事ができました」など）は
書かないでください。ゲートの結果だけを事実として書いてください。

- slug とタイトル
- 文字数
- reader-feedback の指摘件数
- ethics-line の検出件数と、削除・修正した内容の全件
- 書けなかったこと
- 在庫の残数
```

---

## 実行後に起きること

1. push をトリガーに `lint-and-dedup` Actions が走る（トークン0）
2. `dedup.py` が類似度0.85超を検出したらブロックされ、Actions が赤くなる
3. 人間は週1回 `/note-preview` を実行してコピペする

## 停止したときの対処

| 停止理由 | 対処 |
|---|---|
| 在庫が空 | `weekly-research` を手動実行する |
| `type: paid` しか残っていない | ローカルで `/note-daily` を実行する |
| `account.md` が無い | `/note-init` を実行する |
