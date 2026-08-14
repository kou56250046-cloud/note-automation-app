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
   **2500〜4000字**（本文のみ。コードブロックは字数に数えない）。
   結論を先に置く。読者が今日できることを1つだけ示す。
   → notes/{slug}/01-draft.md と meta.json

   **実物を1つ以上、省略せず全文で載せてください。** プロンプト全文 /
   コード全文 / before→after のどれかです。テーマの artifactPlan に何を出すかが
   書いてあるので、それに従ってください。実物のない記事は lint.py が止めます。

5. reader-feedback を critic サブエージェントで実行する。
   **月曜だけです。** 火水金土は飛ばしてください。
   週5本すべてに掛けるとレビューにコストが集中し、テーマ選定に回す分が減ります
   （CLAUDE.md「レビューを削り、テーマ選定に投資する」）。
   指摘があれば failures だけを writer に渡して直す。全文を書き直さない。

6. notes/{slug}/02-final.md を確定する。

7. lint.py を実行し、その結果で ethics-line を呼ぶかどうかを決める。

   ```
   python3 scripts/lint.py --json notes/{slug}/02-final.md
   ```

   出力は**検査したファイルごとの配列**です。要素には `charCount` / `codeBlocks` /
   `needsAudit` / `errors` / `warnings` が入っています。

   - **error があれば直す。** E5（断定表現）は voice.md の ng に当たっています。
     no-artifact なら実物が入っていません。手順4に戻ってください
   - **`needsAudit` が true のときだけ** ethics-line を auditor サブエージェントで
     実行する。unverified-claim（金額・割合・人数・期間・フォロワー数）が
     検出された記事だけが対象です。clear になるまで繰り返す。回数制限はない
     → notes/{slug}/ethics.json
   - `needsAudit` が false なら auditor を呼ばずに次へ進む

   **無条件に auditor を呼ばないでください。** 判定を LLM から決定論コードへ
   移してあります（CLAUDE.md ルール6）。ゲートを緩めたのではありません。

8. thumbnail-prompt スキルで notes/{slug}/06-thumbnail.md を書く。
   **忘れやすい工程です。** これが無いとプレビューに見出し画像のプロンプトが出ず、
   人間が Gemini に貼るものがなくなります。

9. build-report で notes/{slug}/report.md を書く。
   以下を必ず含める。
   - どのテーマをなぜ選んだか
   - **lint.py の結果**（error / warning の全件。`needsAudit` の真偽）
   - reader-feedback で何を指摘され、どう直したか（月曜以外は「実施せず」と書く）
   - ethics-line が何を削除・修正したか（全件。呼ばなかった場合はその理由）
   - profile.md に根拠がなく書けなかったこと
   - weekly-research への申し送り

10. research/themes.md の該当エントリを status: used に更新する。
    **行末にコメントで消化の経緯を書いてよい**（`status: used   # 2026-08-14 ... として記事化`）。
    stock-alert はコメント付きでも数えます。

11. git add / commit / push する。
    コミットメッセージは「{タイトル}」の形式でよい。

## 報告

最後に以下を報告してください。自己評価（「良い記事ができました」など）は
書かないでください。ゲートの結果だけを事実として書いてください。

- slug とタイトル
- 文字数（2500〜4000 に収まっているか）と、載せた実物の種類
- lint.py の結果（error / warning の件数、`needsAudit` の真偽）
- reader-feedback の指摘件数（月曜以外は「実施せず」）
- ethics-line の検出件数と、削除・修正した内容の全件（呼ばなかった場合はその旨）
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
