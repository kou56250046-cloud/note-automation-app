自由記述のアンケートは、Geminiに投げるだけでは終わりません。

出力の形を先に決めておかないと、あとの工程が毎回壊れます。

この記事では、自由記述1件をGeminiに渡し、要約・カテゴリ・感情スコアのJSONを受け取るところまでを扱います。プロンプトとコードは全文を載せます。

## 前提 — シートに自由記述が1件入っている

フォームの回答をスプレッドシートのB列に書き込むところまでは、別の記事で扱いました。

この記事はそこから先だけを扱います。前提はこの3行です。

- B列に自由記述のテキストが1件入っている
- C列・D列・E列は空いている
- Gemini APIのキーは、まだどこにも設定していない

この3行さえ満たしていれば、他の記事を読んでいなくてもこの先を再現できます。

リトライやLockServiceによる排他制御、実行結果を表示する画面は、この記事では扱いません。ここでは1件のテキストを渡して、JSONを受け取るところまでに絞ります。

## 自由記述で何が壊れるか

自由記述は、選択式のアンケートと違って形が決まっていません。

「価格が高い」と一言で終わる回答もあれば、要望と不満が1つの文に混ざっている回答もあります。

これをそのままGeminiに投げて、返ってきた文章を自分でパースしようとすると、毎回壊れます。

ある回答では「カテゴリ:機能要望」と返り、別の回答では「分類は機能要望です」と返ることがあるからです。

説明文が先頭に付いたり、JSONがコードフェンスで囲まれて返ってきたりすることもあります。

後段でシートに書き込む処理や、画面に表示する処理は、この揺れを吸収できません。

だから、出力の形を先に固定します。

## 出力の形をJSONで固定する

Gemini APIには`responseSchema`という仕組みがあります。

これを指定すると、Geminiは自由な文章ではなく、決めた型のJSONだけを返します。

公式ドキュメントはこちらです。
https://ai.google.dev/gemini-api/docs/structured-output

プロンプトの文面だけで「JSONで返して」と頼む方法もありますが、それだと説明文が混ざる揺れが残ります。

`responseSchema`はAPI側の設定なので、プロンプトの書き方に依存せずに型を固定できます。

`type`には`OBJECT`ならオブジェクト、`STRING`なら文字列、`NUMBER`なら数値のように、フィールドごとに型を指定します。

この記事では、次の3つのフィールドを1回の呼び出しで同時に返させます。

- summary: 40字以内の要約
- category: 5つの選択肢から1つだけ選ぶ分類
- sentimentScore: -1.0から1.0の感情スコア

要約だけを返す使い方や、固定ラベルに振り分けるだけの使い方もありますが、この3つは同じ1件の自由記述から出た値です。

分けて3回呼び出すと、同じ回答に対して要約とカテゴリの解釈がずれる場合があります。

1回の呼び出しでまとめて返すことで、あとで画面に並べたときに3つの値が食い違わない形にしています。

分類の選択肢と感情スコアの尺度は、あとで差し替えられるように分けて書きます。

分類だけを固定ラベルに振り分ける仕組みと違い、ここでは要約と感情スコアも同時に固定します。

## プロンプト全文

Geminiに渡すプロンプトです。コピーしてそのまま使えます。

```
あなたはアンケートの自由記述を分析する担当者です。
以下の自由記述を読み、次の3つを出力してください。

1. summary: 内容を1文(40字以内)で要約する
2. category: 次の5つから最も近いものを1つだけ選ぶ
   「機能要望」「不具合報告」「価格に関する意見」「UIの使いにくさ」「その他」
3. sentimentScore: 記述全体の感情を-1.0(強い不満)から1.0(強い満足)の
   数値で表す。中立は0.0とする

出力は指定されたJSON形式のみとし、説明文を含めないでください。

自由記述:
"""
{{ここに自由記述のテキストを差し込む}}
"""
```

カテゴリ名は、あとの差し替え箇所の一覧で示す配列と、必ず同じ文字列にそろえます。

## responseSchemaでJSON型を固定するコード全文

プロンプトだけでは、出力の型までは固定できません。

`generationConfig`に`responseSchema`を渡して、GASからGemini APIを呼び出すコードの全文です。

```
function summarizeFreeText(text) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error('スクリプトプロパティに GEMINI_API_KEY がありません');
  }

  const model = 'gemini-2.0-flash';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + model + ':generateContent?key=' + apiKey;

  const prompt = buildPrompt(text);

  const payload = {
    contents: [
      { role: 'user', parts: [{ text: prompt }] }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          summary: { type: 'STRING' },
          category: {
            type: 'STRING',
            enum: ['機能要望', '不具合報告', '価格に関する意見', 'UIの使いにくさ', 'その他']
          },
          sentimentScore: { type: 'NUMBER' }
        },
        required: ['summary', 'category', 'sentimentScore']
      }
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const status = response.getResponseCode();
  const body = JSON.parse(response.getContentText());

  if (status !== 200) {
    throw new Error('Gemini API がエラーを返しました: ' + status + ' ' + response.getContentText());
  }

  const jsonText = body.candidates[0].content.parts[0].text;
  return JSON.parse(jsonText);
}

function buildPrompt(freeText) {
  return 'あなたはアンケートの自由記述を分析する担当者です。\n'
    + '以下の自由記述を読み、次の3つを出力してください。\n\n'
    + '1. summary: 内容を1文(40字以内)で要約する\n'
    + '2. category: 次の5つから最も近いものを1つだけ選ぶ\n'
    + '   「機能要望」「不具合報告」「価格に関する意見」「UIの使いにくさ」「その他」\n'
    + '3. sentimentScore: 記述全体の感情を-1.0(強い不満)から1.0(強い満足)の\n'
    + '   数値で表す。中立は0.0とする\n\n'
    + '出力は指定されたJSON形式のみとし、説明文を含めないでください。\n\n'
    + '自由記述:\n"""\n' + freeText + '\n"""';
}
```

`muteHttpExceptions: true`を指定すると、Gemini APIがエラーを返してもGASの実行が止まらず、ステータスコードを確認してから例外を投げられます。

モデルは速度重視で`gemini-2.0-flash`を選びました。別のモデル名にそのまま差し替えられます。

呼び出す側は、B列の値を渡して結果をC〜E列に書き込むだけです。

```
function processOneRow(sheet, row) {
  const freeText = sheet.getRange(row, 2).getValue(); // B列
  if (!freeText) return;

  const result = summarizeFreeText(freeText);

  sheet.getRange(row, 3).setValue(result.summary);        // C列
  sheet.getRange(row, 4).setValue(result.category);       // D列
  sheet.getRange(row, 5).setValue(result.sentimentScore); // E列
}
```

APIキーは、コードに直書きせず`PropertiesService`のスクリプトプロパティに置きます。

スクリプトエディタの「プロジェクトの設定」から「スクリプト プロパティ」を開き、`GEMINI_API_KEY`という名前でキーを追加してください。

## 差し替え箇所の一覧

このコードを別の用途に転用するとき、変える場所は4つです。

- カテゴリの選択肢: プロンプト内の5つの文字列と、`responseSchema`の`enum`配列を同時に変える
- 感情スコアの尺度: -1.0〜1.0以外にする場合は、プロンプトの説明文と`sentimentScore`の型定義をそろえる
- モデル名: `summarizeFreeText`内の`model`変数。速度重視かコスト重視かで選ぶ
- APIキーの置き場所: スクリプトプロパティの`GEMINI_API_KEY`という名前を変えたら、取得する行も合わせる

カテゴリの選択肢だけ変えて`enum`配列を変え忘れると、プロンプトとスキーマの選択肢がずれます。

## つまずいた場所

`enum`は文字列の配列で渡します。日本語の選択肢をそのまま入れて動きます。

ただし選択肢の文字列を、プロンプト側とスキーマ側で1文字でも違えると、Geminiが選んだ結果とスキーマの制約がかみ合わなくなります。

私はプロンプトの選択肢を先に書き換えて、`responseSchema`の`enum`を直し忘れたことがあります。

レスポンス自体はエラーになりませんが、返ってくるカテゴリが古い選択肢のままになりました。

差し替えるときは、プロンプトとスキーマの両方を、同じ配列からコピーする形にしておくと事故が減ります。

感情スコアの型を`NUMBER`にしておくと、シートに書き込んだ値も数値として扱われます。文字列として返ってくる形だと、あとで集計するときに変換の手間が増えます。

## 今日できること

`PropertiesService`のスクリプトプロパティに、`GEMINI_API_KEY`という名前でAPIキーを1つ登録してください。

登録できたら、`summarizeFreeText`関数に自由記述のテキストを1件渡して、実行ログでJSONの形を確認できます。

APIキーが登録されていない状態で実行すると、`summarizeFreeText`はその場でエラーを投げて止まります。

## 締め

出力の形を固定しておくと、この先の工程が壊れにくくなります。

次は、この呼び出しが失敗したときに、どう扱うかを書きます。
