#!/usr/bin/env python3
"""dedup.py — 既出記事との重複チェッカー

毎日投稿で最も現実的な事故はネタの反復である。3週間で同じことを言い始める。
LLM に判定させると毎回トークンを食うが、ここでは実行時間数秒・トークン0で済む。

日本語は分かち書きが必要なため単語 TF-IDF は形態素解析に依存する。
代わりに **文字3-gram** の TF-IDF を使う。日本語の短文類似度では
文字 N-gram のほうが安定し、依存ライブラリも要らない。

依存なし（標準ライブラリのみ）。

使い方:
    python scripts/dedup.py notes/2026-08-10-foo/01-draft.md
    python scripts/dedup.py --all
    python scripts/dedup.py notes/2026-08-10-foo/01-draft.md --json

終了コード:
    0  ブロックなし
    1  類似度がブロック閾値を超えた
"""

from __future__ import annotations

import argparse
import glob
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

BLOCK_THRESHOLD = 0.85   # これを超えたら記事を通さない
WARN_THRESHOLD = 0.70    # これを超えたら report.md に記録して通す
NGRAM = 3
MIN_CHARS = 200          # これ未満の記事は判定しない（短すぎて偶然一致する）


def display_path(path: Path) -> str:
    """表示用のパス。リポジトリ外のファイルも扱えるようにする。"""
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


# --------------------------------------------------------------------------
# テキストの正規化
# --------------------------------------------------------------------------

def load_body(path: Path) -> str:
    """記事本文を読み、比較に使わない部分を落とす。

    コードブロックは必ず除去する。同じライブラリを扱う記事は
    コードが似るため、残すと無関係な記事まで高い類似度になる。
    """
    text = path.read_text(encoding="utf-8")

    # コードブロック
    text = re.sub(r"```.*?```", "", text, flags=re.S)
    # インラインコード
    text = re.sub(r"`[^`]*`", "", text)
    # URL
    text = re.sub(r"https?://\S+", "", text)
    # Markdown 記号
    text = re.sub(r"[#>*_\-|\[\]()!]", "", text)
    # 空白
    text = re.sub(r"\s+", "", text)

    return text


def ngrams(text: str, n: int = NGRAM) -> list[str]:
    if len(text) < n:
        return []
    return [text[i:i + n] for i in range(len(text) - n + 1)]


# --------------------------------------------------------------------------
# TF-IDF とコサイン類似度
# --------------------------------------------------------------------------

def build_idf(docs: list[list[str]]) -> dict[str, float]:
    """スムージング付き IDF。文書数が少ないうちも極端な値にならないようにする。"""
    n_docs = len(docs)
    df: Counter[str] = Counter()
    for d in docs:
        for g in set(d):
            df[g] += 1
    return {g: math.log((n_docs + 1) / (c + 1)) + 1.0 for g, c in df.items()}


def tfidf(doc: list[str], idf: dict[str, float]) -> dict[str, float]:
    if not doc:
        return {}
    counts = Counter(doc)
    total = sum(counts.values())
    vec = {g: (c / total) * idf.get(g, 1.0) for g, c in counts.items()}

    norm = math.sqrt(sum(v * v for v in vec.values()))
    if norm == 0:
        return {}
    return {g: v / norm for g, v in vec.items()}


def cosine(a: dict[str, float], b: dict[str, float]) -> float:
    """両方とも正規化済みなので内積がそのままコサイン類似度になる。"""
    if len(a) > len(b):
        a, b = b, a
    return sum(v * b.get(g, 0.0) for g, v in a.items())


# --------------------------------------------------------------------------
# 収集
# --------------------------------------------------------------------------

def collect_published() -> list[tuple[Path, str]]:
    """既出記事を集める。

    02-final.md があればそれを使い、無ければ 01-draft.md を使う。
    同じ記事を二重に数えないため。
    """
    out: list[tuple[Path, str]] = []
    for note_dir in sorted((REPO_ROOT / "notes").glob("*")):
        if not note_dir.is_dir():
            continue
        for name in ("02-final.md", "01-draft.md", "02-letter.md"):
            p = note_dir / name
            if p.exists():
                body = load_body(p)
                if len(body) >= MIN_CHARS:
                    out.append((p, body))
                break
    return out


def title_of(note_dir: Path) -> str:
    meta = note_dir / "meta.json"
    if meta.exists():
        try:
            return json.loads(meta.read_text(encoding="utf-8")).get("title", note_dir.name)
        except json.JSONDecodeError:
            pass
    return note_dir.name


# --------------------------------------------------------------------------
# 判定
# --------------------------------------------------------------------------

def check(target: Path, published: list[tuple[Path, str]]) -> dict:
    body = load_body(target)
    rel = display_path(target)
    # collect_published() は絶対パスを返す。target が相対パスのままだと
    # parent の比較が一致せず、自分自身と比較して類似度 1.00 になる。
    target_dir = target.resolve().parent

    if len(body) < MIN_CHARS:
        return {
            "file": rel,
            "skipped": f"本文が {len(body)} 字（{MIN_CHARS} 字未満）のため判定しない",
            "matches": [],
            "blocked": False,
        }

    # 自分自身と、同じ記事ディレクトリの別ファイルは比較対象から外す
    others = [(p, t) for p, t in published if p.resolve().parent != target_dir]
    if not others:
        return {
            "file": rel,
            "skipped": "比較対象となる既出記事がない",
            "matches": [],
            "blocked": False,
        }

    docs = [ngrams(body)] + [ngrams(t) for _, t in others]
    idf = build_idf(docs)

    target_vec = tfidf(docs[0], idf)
    matches = []
    for (p, _), doc in zip(others, docs[1:]):
        score = cosine(target_vec, tfidf(doc, idf))
        if score >= WARN_THRESHOLD:
            matches.append({
                "against": display_path(p),
                "title": title_of(p.parent),
                "similarity": round(score, 4),
                "level": "block" if score > BLOCK_THRESHOLD else "warn",
            })

    matches.sort(key=lambda m: -m["similarity"])
    top = max((m["similarity"] for m in matches), default=0.0)

    return {
        "file": rel,
        "comparedWith": len(others),
        "maxSimilarity": round(top, 4),
        "matches": matches,
        "blocked": any(m["level"] == "block" for m in matches),
    }


def print_human(r: dict) -> None:
    if r.get("skipped"):
        print(f"\n－ {r['file']}\n   {r['skipped']}")
        return

    mark = "✕" if r["blocked"] else ("△" if r["matches"] else "○")
    print(f"\n{mark} {r['file']}")
    print(f"   既出 {r['comparedWith']} 本と比較 / 最大類似度 {r['maxSimilarity']:.2f}")

    if not r["matches"]:
        print("   重複なし")
        return

    for m in r["matches"]:
        tag = "BLOCK" if m["level"] == "block" else "warn "
        print(f"   {tag}  {m['similarity']:.2f}  {m['title']}")
        print(f"            {m['against']}")

    if r["blocked"]:
        print(f"\n   → 類似度が {BLOCK_THRESHOLD} を超えています。")
        print("      切り口を変えるか、themes.md の angle を見直してください。")


def main() -> int:
    # global 宣言は関数の先頭に置く。
    # add_argument の default= で参照するより後に書くと SyntaxError になる。
    global BLOCK_THRESHOLD, WARN_THRESHOLD

    # Windows のコンソールは既定が cp932 で、日本語の出力が化ける。
    for stream in (sys.stdout, sys.stderr):
        if (stream.encoding or "").lower() not in ("utf-8", "utf8"):
            try:
                stream.reconfigure(encoding="utf-8")
            except (AttributeError, ValueError):
                pass

    ap = argparse.ArgumentParser(description="既出記事との重複チェッカー")
    ap.add_argument("paths", nargs="*", help="検査するファイル")
    ap.add_argument("--all", action="store_true", help="notes/ 配下を全部検査する")
    ap.add_argument("--json", action="store_true", help="JSON で出力する")
    ap.add_argument("--block-threshold", type=float, default=BLOCK_THRESHOLD)
    ap.add_argument("--warn-threshold", type=float, default=WARN_THRESHOLD)
    args = ap.parse_args()

    BLOCK_THRESHOLD = args.block_threshold
    WARN_THRESHOLD = args.warn_threshold

    published = collect_published()

    targets: list[Path] = []
    if args.all:
        targets = [p for p, _ in published]
    for p in args.paths:
        targets += [Path(x) for x in glob.glob(p)] or [Path(p)]

    targets = [t for t in dict.fromkeys(targets) if t.exists()]
    if not targets:
        print("[dedup] 検査対象がありません", file=sys.stderr)
        return 0

    results = [check(t, published) for t in targets]

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        for r in results:
            print_human(r)
        n_block = sum(1 for r in results if r["blocked"])
        print(f"\n{len(results)} ファイル / ブロック {n_block} 件")

    return 1 if any(r["blocked"] for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
