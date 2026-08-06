/**
 * crypto-util.mjs — ブラウザの Web Crypto API と互換な暗号化
 *
 * note-factory-dashboard.html の復号処理と同じ形式で出力する。
 *
 *   base64( salt[16] || iv[12] || ciphertext || authTag[16] )
 *   鍵導出: PBKDF2 / SHA-256 / 310,000 回 / 32 bytes
 *   暗号:   AES-GCM-256
 *
 * Web Crypto の AES-GCM は認証タグを ciphertext の末尾に含む仕様だが、
 * Node の crypto は getAuthTag() で別に返す。連結しないと復号できない。
 *
 * 依存なし（Node 標準モジュールのみ）。
 */

import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export const ITERATIONS = 310000;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

/** 合言葉の最低文字数。暗号文が公開されるため、短いと辞書攻撃で破られる。 */
const MIN_LENGTH = 8;
const RECOMMENDED_LENGTH = 15;

export function encrypt(plaintext, passphrase) {
  assertPassphrase(passphrase);

  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LEN, 'sha256');

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Web Crypto が期待する順序。tag を末尾に連結する
  return Buffer.concat([salt, iv, ct, tag]).toString('base64');
}

/** 自己検証用。ビルド時に往復して壊れていないか確かめる。 */
export function decrypt(b64, passphrase) {
  const raw = Buffer.from(b64, 'base64');
  const salt = raw.subarray(0, SALT_LEN);
  const iv = raw.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = raw.subarray(raw.length - TAG_LEN);
  const ct = raw.subarray(SALT_LEN + IV_LEN, raw.length - TAG_LEN);

  const key = pbkdf2Sync(passphrase, salt, ITERATIONS, KEY_LEN, 'sha256');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

function assertPassphrase(pass) {
  if (!pass || typeof pass !== 'string') {
    throw new Error('合言葉が指定されていません');
  }
  if (pass.length < MIN_LENGTH) {
    throw new Error(
      `合言葉が ${pass.length} 文字です。${MIN_LENGTH} 文字以上にしてください。\n` +
      '暗号文は公開されるため、短いと辞書攻撃で破られます。'
    );
  }
  if (pass.length < RECOMMENDED_LENGTH) {
    console.warn(
      `[crypto] 合言葉が ${pass.length} 文字です。${RECOMMENDED_LENGTH} 文字以上を推奨します`
    );
  }
}

/**
 * 合言葉を取得する。
 *   1. 環境変数 DASHBOARD_PASSPHRASE（Actions ではこちら）
 *   2. secrets/passphrase.txt（ローカル。.gitignore 対象）
 */
export function loadPassphrase() {
  const env = process.env.DASHBOARD_PASSPHRASE;
  if (env && env.trim()) return env.trim();

  const file = join(ROOT, 'secrets', 'passphrase.txt');
  if (existsSync(file)) {
    const s = readFileSync(file, 'utf-8').trim();
    if (s) return s;
  }

  return null;
}

export const PASSPHRASE_HELP = `
合言葉が見つかりません。以下のどちらかで指定してください。

  ローカル: secrets/passphrase.txt に書く（.gitignore 対象）
            mkdir -p secrets && echo "あなたの合言葉" > secrets/passphrase.txt

  Actions:  リポジトリの Settings → Secrets → Actions に
            DASHBOARD_PASSPHRASE を登録する

暗号文は公開されるため、${RECOMMENDED_LENGTH} 文字以上の推測しにくいフレーズにしてください。
`.trim();
