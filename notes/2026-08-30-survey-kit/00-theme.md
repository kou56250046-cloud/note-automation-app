# アンケート自由記述 自動要約ダッシュボード完成版一式。差し替えて自分のアンケートで使う手順書

themes.md の id: 2026-W35B-07
systemId: 2026-W35B-survey-digest（1システムを7分割した連載）
serialRole: 完成版
type: paid
day: sun / publishDate: 2026-08-30
category: GASと生成AIで他人に渡せる自動化システムを作る / 差し替えて使う自動化テンプレート
hashtags: GAS, GeminiAPI, プロンプト

## スコア
strength 5 / market 4 / willingness 5 / artifact 5 = 19

## 選定理由（themes.md の rationale）
strength5: 連載の完成版そのもの。月〜土で出した6本の成果物をそのまま束ねられる。
market4: 「GAS」比6.301（需要207.0/供給32.9件/日、有料率11%）を主軸に、ハッシュタグには
「GeminiAPI」（比21.446、需要27.0/供給1.3件/日、有料率10%、総563件・母数は他タグより
小さいニッチ帯）を採用した。内容（Gemini API呼び出しを含む完成版一式）と一致するため、
NotebookLM（既定タグ）ではなくこちらを主軸にした（ヘッダーの差し戻し対応参照）。
クラスタ#6（プロンプト/AI/マジクラ、35記事、スキ中央値206、比5.8857、主なタグ
GoogleWorkspace/GAS）が「型を渡すテンプレート」が強く読まれる帯であることを示す。
willingness5: 手順を丸ごとテンプレートとして渡せる。GAS/GoogleAppsScriptの有料率
10〜11%が実測で成立しており、「差し替えるだけで動く」ことに対価が付く領域である。
4以上を満たすため paid に割り当てる。
artifact5: フォーム受信〜Gemini要約〜ダッシュボード表示〜Slack通知までの全コードと、
シート名・列名・カテゴリ一覧・Webhook URLなど「差し替える箇所だけ」をまとめた表を出せる。
次点は「経費精算レシート自動チェックシステム」の完成版だったが、系統自体を選ばなかった
（ヘッダー参照）ため、この案は候補にしていない。

## この曜日にこれを置いた理由
weekly-research が day: sun を割り当て済み。account.md の連載構成表どおりの配置。
（生成日 2026-08-24 は月曜であり、規定の日曜より1日遅い。market データは
 research/market/2026-08-24.md を当日取得しているため、判断材料は最新である）

## 切り口（themes.md の angle）
3行要約: 月〜土の6本で見せた部品（入口・要約・失敗対策・画面・通知・つまずき集）を
1つのコード一式に束ね、読者が自分のアンケートのシート名やカテゴリだけ差し替えれば
動く状態で渡す。単体で読んでも「何が手に入るか」が分かるよう、まず完成後の
ダッシュボード画面を先に見せる構成にする。
減算ではない価値軸: 「毎回シートを開いて自由記述を読み込む作業がなくなる」だけでなく、
「担当者が自分の代わりに毎朝ダッシュボードを見るだけでアンケート結果を把握できる状態に
なる」という到達・獲得の軸を明示する。これにより読み手自身の作業時間短縮（減算）に加え、
「他の人に結果を渡せる状態になる」という獲得の軸を持たせ、letter-audit のA1で
否定形の未来像に価値軸が収束するのを避ける。

## 実物の計画（themes.md の artifactPlan）
GASコード一式（入口・中核処理・失敗対策・通知）＋HTML Service一式＋ 差し替え表（シート名／列名／カテゴリ一覧／閾値／Webhook URL）

## 出典
- https://developers.google.com/apps-script/guides/triggers/installable
- https://ai.google.dev/gemini-api/docs/structured-output
- https://developers.google.com/apps-script/reference/lock/lock-service
- https://ai.google.dev/gemini-api/docs/troubleshooting
- https://zenn.dev/tmassh/articles/0a69dfd3c5af4c
