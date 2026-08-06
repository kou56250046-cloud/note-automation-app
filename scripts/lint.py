#!/usr/bin/env python3
"""lint.py — note 記事の文体・記法チェッカー

LLM を使わない。GitHub Actions で走らせてトークンを消費せずに判定する。
knowledge/voice.md の rules / ng / normalize ブロックを読んで検査する。

依存なし（標準ライブラリのみ）。pip install が要らないので Actions が速い。

使い方:
    python scripts/lint.py notes/2026-08-10-foo/01-draft.md
    python scripts/lint.py notes/*/02-final.md --json
    python scripts/lint.py --all

終了コード:
    0  エラーなし（警告はあってもよい）
    1  エラーあり（記事を通さない）
    2  実行エラー（voice.md が無いなど）
"""

from __future__ import annotations

import argparse
import glob
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VOICE_PATH = REPO_ROOT / "knowledge" / "voice.md"

# voice.md に rules が無い場合の既定値
DEFAULT_RULES = {
    "maxSentenceLength": 60,
    "hardSentenceLength": 100,
    "maxKanjiRatio": 0.40,
    "maxParagraphLines": 5,
    "minHeadingInterval": 300,
}

KANJI = re.compile(r"[一-鿿㐀-䶿]")
KANA = re.compile(r"[぀-ゟ゠-ヿ]")


def display_path(path: Path) -> str:
    """表示用のパス。リポジトリ外のファイルも扱えるようにする。"""
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)


# --------------------------------------------------------------------------
# 検出結果
# --------------------------------------------------------------------------

@dataclass
class Finding:
    level: str          # "error" | "warning"
    rule: str
    line: int
    message: str
    excerpt: str = ""

    def to_dict(self) -> dict:
        return {
            "level": self.level,
            "rule": self.rule,
            "line": self.line,
            "message": self.message,
            "excerpt": self.excerpt,
        }


@dataclass
class Voice:
    rules: dict = field(default_factory=lambda: dict(DEFAULT_RULES))
    ng: list[tuple[str, str]] = field(default_factory=list)        # (表現, コメント)
    normalize: list[tuple[str, str]] = field(default_factory=list)  # (誤, 正)


# --------------------------------------------------------------------------
# voice.md のパース
# --------------------------------------------------------------------------

def parse_voice(path: Path) -> Voice:
    """voice.md から rules / ng / normalize の3ブロックだけを読む。

    それ以外の記述は人間向けの説明なので無視する。
    """
    if not path.exists():
        print(f"[lint] voice.md が見つかりません: {path}", file=sys.stderr)
        sys.exit(2)

    text = path.read_text(encoding="utf-8")
    voice = Voice()

    for lang, body in re.findall(r"```(\w+)\n(.*?)```", text, re.S):
        if lang == "rules":
            for line in body.splitlines():
                m = re.match(r"\s*(\w+)\s*:\s*([\d.]+)", line)
                if m:
                    key, raw = m.group(1), m.group(2)
                    voice.rules[key] = float(raw) if "." in raw else int(raw)

        elif lang == "ng":
            for line in body.splitlines():
                line = line.rstrip()
                if not line.strip():
                    continue
                expr, _, comment = line.partition("#")
                expr = expr.strip()
                if expr:
                    voice.ng.append((expr, comment.strip()))

        elif lang == "normalize":
            for line in body.splitlines():
                # 「- 事が -> ことが」のように行頭に - が付く形式も許容する
                line = line.strip().lstrip("- ").strip()
                if "->" not in line:
                    continue
                wrong, _, right = line.partition("->")
                wrong, right = wrong.strip(), right.strip()
                if wrong and right:
                    voice.normalize.append((wrong, right))

    return voice


# --------------------------------------------------------------------------
# 本文の前処理
# --------------------------------------------------------------------------

def strip_code_blocks(lines: list[str]) -> list[tuple[int, str]]:
    """コードブロックを除いた (行番号, 本文) を返す。

    コードに日本語の文体ルールを当てても意味がないため除外する。
    行番号は元ファイルのものを保つ（1始まり）。
    """
    out: list[tuple[int, str]] = []
    in_fence = False
    for i, raw in enumerate(lines, start=1):
        if raw.lstrip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        out.append((i, raw))
    return out


def split_sentences(text: str) -> list[str]:
    """句点で文に分割する。形態素解析は使わない。"""
    parts = re.split(r"(?<=[。！？])", text)
    return [p.strip() for p in parts if p.strip()]


# --------------------------------------------------------------------------
# 各検査
# --------------------------------------------------------------------------

def check_sentence_length(body: list[tuple[int, str]], rules: dict) -> list[Finding]:
    soft = rules["maxSentenceLength"]
    hard = rules["hardSentenceLength"]
    findings = []

    for lineno, raw in body:
        line = raw.strip()
        # 見出し・リスト記号・引用符は文字数に数えない
        if not line or line.startswith("#"):
            continue
        stripped = re.sub(r"^[\s>\-*+]+|^\d+\.\s*", "", line)

        for sent in split_sentences(stripped):
            n = len(sent)
            if n > hard:
                findings.append(Finding(
                    "error", "sentence-length", lineno,
                    f"一文が {n} 文字（上限 {hard}）。読点で切るか2文に分ける",
                    sent[:40] + "…",
                ))
            elif n > soft:
                findings.append(Finding(
                    "warning", "sentence-length", lineno,
                    f"一文が {n} 文字（目安 {soft}）",
                    sent[:40] + "…",
                ))
    return findings


def check_kanji_ratio(body: list[tuple[int, str]], rules: dict) -> list[Finding]:
    """記事全体の漢字比率。漢字が多いと画面が黒く見えて読まれない。"""
    text = "".join(
        raw for _, raw in body if not raw.strip().startswith("#")
    )
    kanji = len(KANJI.findall(text))
    kana = len(KANA.findall(text))
    total = kanji + kana
    if total < 100:
        return []

    ratio = kanji / total
    limit = rules["maxKanjiRatio"]
    if ratio > limit:
        return [Finding(
            "warning", "kanji-ratio", 1,
            f"漢字比率 {ratio:.0%}（目安 {limit:.0%}）。"
            f"normalize の対象語を開くと下がる",
        )]
    return []


def check_ng_expressions(body: list[tuple[int, str]], ng: list[tuple[str, str]]) -> list[Finding]:
    """voice.md の禁止表現。ethics-line を待たずに機械が先に潰す。"""
    findings = []
    for lineno, raw in body:
        for expr, comment in ng:
            if expr in raw:
                note = f"（{comment}）" if comment else ""
                findings.append(Finding(
                    "error", "ng-expression", lineno,
                    f"禁止表現「{expr}」{note}",
                    raw.strip()[:60],
                ))
    return findings


def check_normalize(body: list[tuple[int, str]], pairs: list[tuple[str, str]]) -> list[Finding]:
    findings = []
    for lineno, raw in body:
        for wrong, right in pairs:
            if wrong in raw:
                findings.append(Finding(
                    "warning", "normalize", lineno,
                    f"「{wrong}」→「{right}」に開く",
                    raw.strip()[:60],
                ))
    return findings


def check_headings(body: list[tuple[int, str]], rules: dict) -> list[Finding]:
    """見出しの階層と間隔。

    H1 は使わない。note では記事タイトルが H1 相当になるため、
    本文に H1 があると階層が二重になる。
    """
    findings = []
    # 初期値は 1。最初の見出しが H2 なら通り、いきなり H3 ならエラーになる。
    # 2 にすると「H2 が一度も無いまま H3 が来る」ケースを取りこぼす。
    prev_level = 1
    last_heading_line = None
    chars_since = 0

    for lineno, raw in body:
        m = re.match(r"^(#{1,6})\s+(.*)", raw)
        if not m:
            chars_since += len(raw.strip())
            continue

        level = len(m.group(1))
        title = m.group(2).strip()

        if level == 1:
            findings.append(Finding(
                "error", "heading-h1", lineno,
                "H1 は使わない。note ではタイトルが H1 相当になる。H2 にする",
                title[:40],
            ))
        elif level > prev_level + 1:
            findings.append(Finding(
                "error", "heading-skip", lineno,
                f"H{prev_level} から H{level} に飛んでいる。階層を1つずつ下げる",
                title[:40],
            ))

        if last_heading_line is not None and chars_since < rules["minHeadingInterval"]:
            findings.append(Finding(
                "warning", "heading-interval", lineno,
                f"前の見出しから {chars_since} 文字（目安 {rules['minHeadingInterval']}）。"
                f"見出しが多すぎる",
                title[:40],
            ))

        # 実際のレベルで更新する。max(level, 2) にすると
        # 「H1 のあと H2 を飛ばして H3」が2段飛びとして検出されなくなる。
        prev_level = level
        last_heading_line = lineno
        chars_since = 0

    return findings


def check_note_incompatible(lines: list[str]) -> list[Finding]:
    """note で崩れる記法。

    これは voice.md ではなくプラットフォームの仕様なのでハードコードする。
    """
    findings = []
    in_fence = False
    table_run = 0

    for i, raw in enumerate(lines, start=1):
        if raw.lstrip().startswith("```"):
            in_fence = not in_fence
            table_run = 0
            continue
        if in_fence:
            continue

        line = raw.rstrip()

        # テーブル（note は非対応）
        if line.strip().startswith("|") and line.strip().endswith("|"):
            table_run += 1
            if table_run == 2:
                findings.append(Finding(
                    "error", "note-table", i - 1,
                    "note はテーブルに対応していない。箇条書きにする",
                    line.strip()[:50],
                ))
        else:
            table_run = 0

        # 脚注
        if re.search(r"\[\^[^\]]+\]", line):
            findings.append(Finding(
                "error", "note-footnote", i,
                "note は脚注に対応していない。本文に展開する",
                line.strip()[:50],
            ))

        # 3階層以上のリスト
        m = re.match(r"^(\s+)([-*+]|\d+\.)\s", raw)
        if m:
            indent = len(m.group(1).replace("\t", "    "))
            if indent >= 4:
                findings.append(Finding(
                    "error", "note-list-depth", i,
                    f"3階層以上のリストは note で崩れる（インデント {indent}）。2階層までにする",
                    line.strip()[:50],
                ))

    return findings


def check_style_consistency(body: list[tuple[int, str]]) -> list[Finding]:
    """ですます調と である調の混在。"""
    desu = da = 0
    first_da_line = None

    for lineno, raw in body:
        line = raw.strip()
        if not line or line.startswith(("#", ">", "-", "*", "|")):
            continue
        for sent in split_sentences(line):
            if re.search(r"(です|ます|ました|ません|でしょう)[。！？]$", sent):
                desu += 1
            elif re.search(r"(だ|である|だった|ではない)[。！？]$", sent):
                da += 1
                if first_da_line is None:
                    first_da_line = lineno

    total = desu + da
    if total < 5:
        return []

    minority = min(desu, da)
    if minority > 0 and minority / total > 0.15:
        return [Finding(
            "warning", "style-mix", first_da_line or 1,
            f"ですます調 {desu} 文 / である調 {da} 文が混在している。統一する",
        )]
    return []


def check_paragraph_length(body: list[tuple[int, str]], rules: dict) -> list[Finding]:
    """段落が長いとスマホで塊に見えて読み飛ばされる。"""
    findings = []
    run = 0
    start = 0
    limit = rules["maxParagraphLines"]

    for lineno, raw in body:
        line = raw.strip()
        if not line or line.startswith(("#", "-", "*", ">", "|")):
            if run > limit:
                findings.append(Finding(
                    "warning", "paragraph-length", start,
                    f"{run} 行続いている（目安 {limit}）。空行を入れる",
                ))
            run = 0
            continue
        if run == 0:
            start = lineno
        run += 1

    if run > limit:
        findings.append(Finding(
            "warning", "paragraph-length", start,
            f"{run} 行続いている（目安 {limit}）。空行を入れる",
        ))
    return findings


# --------------------------------------------------------------------------
# 実行
# --------------------------------------------------------------------------

def lint_file(path: Path, voice: Voice) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    body = strip_code_blocks(lines)

    findings: list[Finding] = []
    findings += check_sentence_length(body, voice.rules)
    findings += check_kanji_ratio(body, voice.rules)
    findings += check_ng_expressions(body, voice.ng)
    findings += check_normalize(body, voice.normalize)
    findings += check_headings(body, voice.rules)
    findings += check_note_incompatible(lines)
    findings += check_style_consistency(body)
    findings += check_paragraph_length(body, voice.rules)

    findings.sort(key=lambda f: (f.line, f.rule))

    text = "".join(raw for _, raw in body)
    return {
        "file": display_path(path),
        "charCount": len(re.sub(r"\s", "", text)),
        "errors": [f.to_dict() for f in findings if f.level == "error"],
        "warnings": [f.to_dict() for f in findings if f.level == "warning"],
    }


def print_human(result: dict) -> None:
    errors, warnings = result["errors"], result["warnings"]
    mark = "✕" if errors else ("△" if warnings else "○")
    print(f"\n{mark} {result['file']}  ({result['charCount']} 字)")

    if not errors and not warnings:
        print("   問題なし")
        return

    for f in errors:
        print(f"   ERROR   L{f['line']:>4}  [{f['rule']}] {f['message']}")
        if f["excerpt"]:
            print(f"                    → {f['excerpt']}")
    for f in warnings:
        print(f"   warn    L{f['line']:>4}  [{f['rule']}] {f['message']}")
        if f["excerpt"]:
            print(f"                    → {f['excerpt']}")


def main() -> int:
    # Windows のコンソールは既定が cp932 で、日本語の出力が化ける。
    # Actions（Linux）では不要だが、ローカル実行のために揃えておく。
    for stream in (sys.stdout, sys.stderr):
        if (stream.encoding or "").lower() not in ("utf-8", "utf8"):
            try:
                stream.reconfigure(encoding="utf-8")
            except (AttributeError, ValueError):
                pass

    ap = argparse.ArgumentParser(description="note 記事の文体・記法チェッカー")
    ap.add_argument("paths", nargs="*", help="検査するファイル")
    ap.add_argument("--all", action="store_true",
                    help="notes/ 配下の 01-draft.md と 02-final.md を全部検査する")
    ap.add_argument("--json", action="store_true", help="JSON で出力する")
    args = ap.parse_args()

    targets: list[Path] = []
    if args.all:
        for pat in ("notes/*/01-draft.md", "notes/*/02-final.md", "notes/*/02-letter.md"):
            targets += [Path(p) for p in glob.glob(str(REPO_ROOT / pat))]
    for p in args.paths:
        targets += [Path(x) for x in glob.glob(p)] or [Path(p)]

    targets = [t for t in dict.fromkeys(targets) if t.exists()]
    if not targets:
        print("[lint] 検査対象がありません", file=sys.stderr)
        return 0

    voice = parse_voice(VOICE_PATH)
    results = [lint_file(t, voice) for t in targets]

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        for r in results:
            print_human(r)
        n_err = sum(len(r["errors"]) for r in results)
        n_warn = sum(len(r["warnings"]) for r in results)
        print(f"\n{len(results)} ファイル / エラー {n_err} 件 / 警告 {n_warn} 件")

    return 1 if any(r["errors"] for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
