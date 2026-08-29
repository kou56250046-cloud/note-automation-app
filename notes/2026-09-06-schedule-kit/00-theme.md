# 日程調整ヒートマップ完成版一式。差し替えて自分の会議調整で使う手順書

themes.md の id: 2026-W36-07
systemId: 2026-W36-schedule-heatmap（1システムを7分割した連載）
serialRole: 完成版
type: paid
day: sun / publishDate: 2026-09-06
category: GASと生成AIで他人に渡せる自動化システムを作る / 差し替えて使う自動化テンプレート
hashtags: GAS, GeminiAPI, プロンプト

## スコア
strength 5 / market 4 / willingness 5 / artifact 5 = 19

## 選定理由（themes.md の rationale）
strength5: 連載の完成版そのもの。月〜土で出した6本の成果物をそのまま束ねられる。
market4: 「GAS」比9.683（需要227.5/供給23.5件/日、有料率11%）を主軸に、ハッシュタグには
「GeminiAPI」（比19.747、需要27.0/供給1.4件/日、有料率8%、総570件・母数は他タグより
小さいニッチ帯）を採用した。内容（Gemini API呼び出しを含む完成版一式）と一致するため、
NotebookLM（既定タグ）ではなくこちらを主軸にした（W35B以降と同じ判断基準）。
「GoogleAppsScript」比8.879（有料率13%）も高く、日程調整のような社内業務での
「差し替えるだけで動く」需要が実測に整合している。
willingness5: 手順を丸ごとテンプレートとして渡せる。GAS/GoogleAppsScriptの有料率
11〜13%が実測で成立しており、「差し替えるだけで動く」ことに対価が付く領域である。
候補日程を出すたびに手作業で空き状況を突き合わせる作業は、参加人数が増えるほど
時間コストが直線的に増えるため、支払い意欲は高いと判定した。4以上を満たすためpaidに割り当てる。
artifact5: フォーム受信〜Gemini構造化〜ヒートマップ表示〜Slack通知までの全コードと、
シート名・列名・時間帯の粒度（午前/午後 or 1時間単位）・締切日時・Webhook URLなど
「差し替える箇所だけ」をまとめた表を出せる。
次点: 「バグ報告トラッカーの完成版」「社内ヘルプデスクの故障報告システムの完成版」は
いずれも中核処理が既出の分類・スコアリングと同型になるため、この系統自体を選ばなかった
（下の除外理由を参照）。

## この曜日にこれを置いた理由
weekly-research が day: sun を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-29 は土曜であり、規定の日曜より1日早い。market データは
 research/market/2026-08-29.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: 月〜土の6本で見せた部品（入口・構造化・失敗対策・画面・通知・つまずき集）を
1つのコード一式に束ね、読者が自分の会議調整のシート名や時間帯の粒度だけ差し替えれば
動く状態で渡す。単体で読んでも「何が手に入るか」が分かるよう、まず完成後の
ヒートマップ画面を先に見せる構成にする。
減算ではない価値軸: 「候補日を手作業で突き合わせる時間がなくなる」だけでなく、
「幹事役が個別にメッセージを送って都合を聞き直さなくても、全員が空いている枠が
自然に見える状態になる」という到達・獲得の軸を明示する。これにより読み手自身の
作業時間短縮（減算）に加え、「参加者に負担をかけずに済む状態になる」という獲得の軸を
持たせ、letter-audit のA1で否定形の未来像に価値軸が収束するのを避ける。

## 実物の計画（themes.md の artifactPlan）
GASコード一式（入口・中核処理・失敗対策・通知）＋HTML Service一式＋ 差し替え表（シート名／列名／時間帯の粒度／締切日時／Webhook URL）

## 出典
- https://developers.google.com/apps-script/guides/triggers/installable
- https://ai.google.dev/gemini-api/docs/structured-output
- https://developers.google.com/apps-script/reference/lock/lock-service
- https://expensive.toys/blog/pure-CSS-heatmap
