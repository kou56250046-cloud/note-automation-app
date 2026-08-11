# 生成ログ — 2026-08-11-gas-minutes

日付: 2026-08-11（火）
種別: 無料記事
タイトル: Gemini + GAS で議事録を要約する。コードとプロンプトの全文
文字数: 2955 字（lint.py 実測。コードブロック2個を除く）

---

## テーマ選定

引いたテーマ: Gemini + GAS で議事録を要約する。コードとプロンプトの全文（themes.md の id: 2026-W33-02）

スコア: 強み4 / 市場性5 / 支払い意欲4 / artifact5 = 18/20

選定理由:
サブ②（Gemini+GASの自動化）のど真ん中。`market/2026-08-07.md` 実測で GAS 需要118/供給19.7件/日（比5.985）、
GoogleAppsScript 需要84/供給14.2件/日（比5.908）。有料率も GAS 10% / GoogleAppsScript 13% と高い領域。
GASコード全文・プロンプト全文・動作条件の3点を渡せるため artifact5。

次点: 「Gemini API のモデル選択」は情報としては近いが、実物がコード断片に留まり artifact が3止まりのため
themes.md の時点で既に落とされている。

今日これを選んだ理由: day: tue かつ status: pending がこの1本のみだったため、曜日の割り当てどおりに使用。
繰り上げ（曜日不一致の代替）はしていない。

---

## ゲートの結果

| ゲート | 結果 | 差し戻し |
|---|---|---|
| lint.py | エラー1件 → 修正 → エラー0 / 警告4件 | 1回 |
| dedup.py | 最大類似度 0.00（既出1本と比較） | — |
| ethics-line | **未実行**（lint.py の needsAudit が false のため対象外） | — |
| reader-feedback | **未実行**（週1本・日曜サンプリングの方針のため、火曜の本記事は対象外） | — |

### lint.py

- **error**: L299「非常に」（ng-expression、空虚な強調）→「議事録が1万字を超えるような場合」に修正して解消
- warn: 見出し間隔（目安300字）を3箇所で下回る。「何を作るか」「プロンプト全文（構造だけを取り出したもの）」「動作条件」の直前
- warn: L221「故に」→「したがって」の normalize 指摘。**誤検出と判断し修正していない**。
  該当箇所は「事故になります」であり、「故に」はこの単語の部分一致にすぎない（`voice.md` の normalize は部分一致方式のため発生した）

### dedup.py

- 既出記事は `2026-08-07-lp-firstview` の1本のみ。最大類似度0.00で重複なし

### ethics-line が実行されなかった理由

`lint.py --json` の `needsAudit` が `false`。`unverified-claim`（金額・割合・人数・期間・フォロワー数のパターン）に
該当する記述が本文に無かったため、CLAUDE.md ルール6の「検出時のみ auditor を起動する」の対象外だった。

### 人間に回した項目（severity: review）

- なし

---

## 書けなかったこと

`profile.md` の実績は「日常・脳科学ジャンルでの数値」であり、AI技術ジャンルの実績としては引用できない
（`profile.md` L40 の前提に明記）。そのため以下は一切書いていない。

- 「このコードで作業時間が◯分短縮した」など効果の数値
- 「多くの人が使っている」など利用者数の主張
- 自分や第三者の運用実績・体験談

代わりに、成果物（GASコード・プロンプト）そのものの検証可能性のみを再現性の根拠にした。

---

## 上流への申し送り

| 宛先 | 内容 |
|---|---|
| `weekly-research` | 特になし。`sources` 4件で手順の裏付けは足りていた |
| `account-design` | — |

---

## 運用上の発見（この記事本体とは別件）

`routines/daily-build.md` に記載のプロンプトは、無料記事でも毎回 `reader-feedback` を1周実行する手順になっている。
一方 `.claude/skills/editorial/daily-article/SKILL.md` と CLAUDE.md 本体は「reader-feedback は週1本・日曜サンプリング」
という後発の方針（Opus/critic呼び出し削減のコスト最適化）を採用済みであり、`routines/daily-build.md` はこの改訂前の
古い記述のまま残っていた。

今回クラウド Routine（`daily-build` / `trig_01HmLtZ1EqekWQCHzy5nHNPV`）を新規登録した際、
`routines/daily-build.md` のプロンプトをそのまま転記したため、**登録済みのクラウド版は現行の SKILL.md より
reader-feedback を多く呼ぶ状態になっている。** 次回のメンテナンスで
`routines/daily-build.md` の記述と、登録済み Routine のプロンプトの両方を SKILL.md に合わせて更新する必要がある。
