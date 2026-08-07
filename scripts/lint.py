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
    "minCharCount": 2500,
    "maxCharCount": 4000,
    "minCodeBlocks": 1,
}

KANJI = re.compile(r"[一-鿿㐀-䶿]")
KANA = re.compile(r"[぀-ゟ゠-ヿ]")

# GitHub Pages に置く before/after のデモ。
# 実物がデモ側にあるなら、本文にコードブロックが無くてもよい。
DEMO_URL = re.compile(r"https?://\S*/demo/\S*")

# 数値を伴う実績の主張。profile.md に根拠がなければ書けない（CLAUDE.md ルール3）。
#
# **ここでの検出は warning である。** 記事を止めるためではなく、
# auditor（Opus）を起動するかどうかの一次判定に使う。
# 粗く拾って auditor に渡す。判断はあちらの仕事である。
UNVERIFIED_PATTERNS: list[tuple[str, str]] = [
    (r"[0-9０-９]+\s*(?:万)?円", "金額"),
    (r"月\s*[0-9０-９]+\s*万", "月収"),
    (r"(?:売上|収益|利益)[^。]{0,10}[0-9０-９]", "収益"),
    (r"[0-9０-９]+\s*[%％][^。]{0,6}(?:削減|減|短縮|向上|増|アップ|改善)", "増減率"),
    (r"[0-9０-９]+\s*割[^。]{0,4}(?:削減|減)", "増減率"),
    (r"[0-9０-９]+\s*倍[^。]{0,8}(?:なりました|なった|増え|速く|短く|効率)", "倍率"),
    (r"[0-9０-９]+\s*(?:人|名)(?:が|に|以上|も)", "人数"),
    (r"多くの(?:人|方|読者|ユーザー|エンジニア)が", "人数"),
    (r"[0-9０-９]+\s*(?:日|週間|ヶ月|か月|カ月)で[^。]{0,8}"
     r"(?:達成|突破|到達|稼|完成|できました)", "期間実績"),
    (r"フォロワー\s*(?:数)?[^。]{0,4}[0-9０-９]+", "フォロワー数"),
    (r"[0-9０-９]+\s*(?:PV|ビュー|view)", "PV"),
    # 「スキル」「スキャン」「スキーマ」は技術記事の頻出語なので外す
    (r"スキ(?![ルャーマ])[^。]{0,6}[0-9０-９]+", "スキ数"),
]


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


def count_fences(lines: list[str]) -> int:
    """コードブロックの数を数える。

    strip_code_blocks() はコードを落としてしまうので、元の行から数える。
    開きと閉じで2本なので2で割る。
    """
    return sum(1 for l in lines if l.lstrip().startswith("```")) // 2


def check_artifact(lines: list[str], rules: dict) -> list[Finding]:
    """実物があるか。

    **実物のない記事は浅い。** 手順の説明だけでは読者の手元に何も残らない。
    プロンプト全文・コード全文・before/after のどれか1つは必ず持たせる。
    持てないならテーマ選定のほうが間違っている。
    """
    need = int(rules.get("minCodeBlocks", 0))
    if need <= 0:
        return []

    blocks = count_fences(lines)
    if blocks >= need:
        return []

    # デモ側に実物があるなら本文にコードブロックが無くてもよい
    if DEMO_URL.search("\n".join(lines)):
        return []

    return [Finding(
        "error", "no-artifact", 1,
        f"実物がない（コードブロック {blocks} / 必要 {need}、デモURLも無い）。"
        f"プロンプト全文・コード全文・before/after のどれかを載せる",
    )]


def check_unverified_claim(body: list[tuple[int, str]]) -> list[Finding]:
    """数値を伴う実績の主張を拾う。

    **warning であって error ではない。** ここで記事を止めるのではなく、
    auditor（Opus）を起動するかどうかの一次判定に使う。
    無料記事で毎回 Opus を呼ぶのをやめ、疑いが出たときだけ呼ぶための仕組みである。
    """
    findings = []
    for lineno, raw in body:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        for pat, kind in UNVERIFIED_PATTERNS:
            m = re.search(pat, line)
            if m:
                findings.append(Finding(
                    "warning", "unverified-claim", lineno,
                    f"{kind}の主張。profile.md に根拠が無ければ書けない"
                    f"（ethics-line を起動する）",
                    m.group(0)[:40],
                ))
                break   # 1行につき1件でよい。同じ箇所を何度も報告しない
    return findings


def check_char_count(count: int, rules: dict) -> list[Finding]:
    """本文の文字数。コードブロックは除いて数える（lint_file 側で除去済み）。

    実物を載せる余地を確保するために下限を上げてあるが、
    コード込みで水増しされては意味がないので、数えるのは本文だけである。
    """
    lo = int(rules.get("minCharCount", 0))
    hi = int(rules.get("maxCharCount", 0))
    out = []

    if lo and count < lo:
        # 下限の半分未満は、書きかけか構成の失敗。通さない
        level = "error" if count < lo // 2 else "warning"
        out.append(Finding(
            level, "char-count", 1,
            f"本文 {count} 字（下限 {lo}）。実物と手順を足す",
        ))
    if hi and count > hi:
        out.append(Finding(
            "warning", "char-count", 1,
            f"本文 {count} 字（上限 {hi}）。読者が離脱する",
        ))
    return out


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

def is_free_article(path: Path) -> bool:
    """無料記事の本文かどうか。

    文字数（2500〜4000字）と実物の必須化は無料記事の型に対する規定であり、
    有料noteのレター（2000字）や有料部分（5000〜8000字）には当てはまらない。
    note で崩れる記法や文体のルールは、どちらにも同じように適用する。
    """
    return path.name in ("01-draft.md", "02-final.md")


def lint_file(path: Path, voice: Voice) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    body = strip_code_blocks(lines)

    text = "".join(raw for _, raw in body)
    char_count = len(re.sub(r"\s", "", text))
    free = is_free_article(path)

    findings: list[Finding] = []
    findings += check_sentence_length(body, voice.rules)
    findings += check_kanji_ratio(body, voice.rules)
    findings += check_ng_expressions(body, voice.ng)
    findings += check_normalize(body, voice.normalize)
    findings += check_headings(body, voice.rules)
    findings += check_note_incompatible(lines)
    findings += check_style_consistency(body)
    findings += check_paragraph_length(body, voice.rules)
    findings += check_unverified_claim(body)

    # 無料記事の型に対する規定。レターと有料部分には適用しない
    if free:
        findings += check_artifact(lines, voice.rules)
        findings += check_char_count(char_count, voice.rules)

    findings.sort(key=lambda f: (f.line, f.rule))

    return {
        "file": display_path(path),
        "charCount": char_count,
        "codeBlocks": count_fences(lines),
        "freeArticle": free,
        # ethics-line（auditor）を起動すべきかの一次判定。
        # 無料記事で毎回 Opus を呼ばないための信号である。
        "needsAudit": any(f.rule == "unverified-claim" for f in findings),
        "errors": [f.to_dict() for f in findings if f.level == "error"],
        "warnings": [f.to_dict() for f in findings if f.level == "warning"],
    }


def print_human(result: dict) -> None:
    errors, warnings = result["errors"], result["warnings"]
    mark = "✕" if errors else ("△" if warnings else "○")
    print(f"\n{mark} {result['file']}  "
          f"({result['charCount']} 字 / コードブロック {result['codeBlocks']})")

    if result["needsAudit"]:
        print("   → ethics-line（auditor）を起動すること")

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
        # 03-draft.md（有料部分）も note に貼るので記法検査の対象にする。
        # .gitignore 対象なのでローカル実行時にしか存在しない。無くても落ちない
        for pat in ("notes/*/01-draft.md", "notes/*/02-final.md",
                    "notes/*/02-letter.md", "notes/*/03-draft.md"):
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
