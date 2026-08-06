#!/usr/bin/env node
/**
 * encrypt.mjs — ダッシュボードの埋め込みデータを暗号化する
 *
 * note-factory-dashboard.html の `const ENC = "..."` を書き換える。
 * ブラウザは合言葉でこれを復号して表示する。
 *
 * 使い方:
 *   node scripts/encrypt.mjs --rekey "旧合言葉"
 *       既存の ENC を旧合言葉で復号し、secrets/passphrase.txt の合言葉で
 *       暗号化し直す。合言葉を変えたときに使う。
 *
 *   node scripts/encrypt.mjs --from data/dashboard.json
 *       JSON を読んで暗号化する。fetch-metrics が数値を取得したあとに使う。
 *
 *   node scripts/encrypt.mjs --dump
 *       現在の中身を標準出力に出す（確認用。ファイルには書かない）
 *
 * 依存なし（Node 標準モジュールのみ）。
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encrypt, decrypt, loadPassphrase, PASSPHRASE_HELP } from './crypto-util.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DASHBOARD = join(ROOT, 'note-factory-dashboard.html');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? true) : null;
};

function readEnc(html) {
  const m = html.match(/const ENC = "([^"]+)"/);
  if (!m) {
    console.error('[encrypt] note-factory-dashboard.html に ENC が見つかりません');
    process.exit(1);
  }
  return m[1];
}

function writeEnc(html, enc) {
  return html.replace(/const ENC = "[^"]+"/, `const ENC = "${enc}"`);
}

function main() {
  const pass = loadPassphrase();
  if (!pass) {
    console.error('[encrypt] 合言葉が見つかりません。\n');
    console.error(PASSPHRASE_HELP);
    process.exit(1);
  }

  if (!existsSync(DASHBOARD)) {
    console.error(`[encrypt] ${DASHBOARD} がありません`);
    process.exit(1);
  }

  const html = readFileSync(DASHBOARD, 'utf-8');
  const rekey = flag('--rekey');
  const from = flag('--from');
  const dump = args.includes('--dump');

  let data;

  if (from) {
    const p = join(ROOT, String(from));
    if (!existsSync(p)) {
      console.error(`[encrypt] ${from} がありません`);
      process.exit(1);
    }
    data = JSON.parse(readFileSync(p, 'utf-8'));
    console.log(`[encrypt] ${from} を読みました`);
  } else {
    // 既存の ENC を復号する。--rekey なら旧合言葉、無ければ現在の合言葉
    const oldPass = typeof rekey === 'string' ? rekey : pass;
    try {
      data = JSON.parse(decrypt(readEnc(html), oldPass));
    } catch {
      console.error('[encrypt] 既存データを復号できません。');
      console.error('  合言葉を変えた場合は --rekey "旧合言葉" を指定してください。');
      process.exit(1);
    }
    console.log('[encrypt] 既存データを復号しました');
  }

  if (dump) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // デモデータの目印。
  // profile-accumulator が架空の数値を実績として拾うと
  // CLAUDE.md ルール3（実績を創作しない）に違反する。
  if (data.isDemo === undefined) {
    const looksDemo = !existsSync(join(ROOT, 'data', 'dashboard.json'));
    data.isDemo = looksDemo;
    if (looksDemo) {
      console.log('[encrypt] isDemo: true を付けました（実データがまだ無いため）');
      console.log('[encrypt] このデータを実績として引用してはいけません');
    }
  }

  const enc = encrypt(JSON.stringify(data), pass);

  // 書き戻す前に往復を確認する。壊れたまま push すると開けなくなる
  try {
    JSON.parse(decrypt(enc, pass));
  } catch {
    console.error('[encrypt] 検証に失敗しました。書き込みを中止します');
    process.exit(1);
  }

  writeFileSync(DASHBOARD, writeEnc(html, enc), 'utf-8');
  console.log(`[encrypt] 暗号化しました（${enc.length} 文字）`);
  console.log('[encrypt] 合言葉は secrets/passphrase.txt のものです');
}

main();
