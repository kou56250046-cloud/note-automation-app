#!/usr/bin/env python3
"""note_market.py — note の公開データから市場を機械的に解剖する

**このスクリプトはトークンを消費しない。** LLM に「何が読まれているか」を
推測させる代わりに、note の公開 API から実データを取り、集計とクラスタリングを
Python で完結させる。LLM が読むのは最後に出力される20〜30行の要約表だけである。

生の JSON を LLM に渡すとコンテキストが汚れてトークンが跳ねる。
Python が要約まで作り切ることが、この設計の要点である。

## なぜハッシュタグ単位なのか

note のフリーワード検索 API（`/api/v3/searchnote`）は 404 で、
`/api/v3/notes?q=` は q を無視して新着一覧を返す。実測で確認済みである。
一方 `/api/v3/hashtags/{tag}/notes` は関連記事を返し、`order=popular` で
人気順に並ぶ。さらに `data.count` にそのタグの総記事数が入る。

タグ単位で測ることには、代替手段がないという以上の利点がある。
**測った結果がそのまま「どのタグを付けて投稿すべきか」になる。**

## 需要と供給の測り方

    需要 = order=popular の上位50件のスキ中央値
           → そのタグで上位に入ったときの到達点

    供給 = 新着50件が何時間分かから求める1日あたりの投稿数
           → 埋もれる速さ

    gapScore = 需要 ÷ 供給速度
           → 高いほど「読まれるのに書く人が少ない」

やること:
    1. 収集    タグごとに popular と新着を1ページずつ。raw/{date}.jsonl にキャッシュ
    2. 集計    タグ別の需要・供給・有料率／全体のスキ分布
    3. クラスタ タイトルを文字 N-gram の TF-IDF でベクトル化し k-means で分ける
               （ベクトル化は dedup.py の実装をそのまま使う。二重に書かない）
    4. 出力    research/market/{date}.md  ← weekly-research が読むのはこれだけ
               research/market/{date}.json ← 数値の全量。ダッシュボード用

依存なし（標準ライブラリのみ）。pip install が要らないので Actions が速い。

使い方:
    python scripts/note_market.py --dry-run        # 2タグだけ試す
    python scripts/note_market.py                  # 本実行
    python scripts/note_market.py --update-profile # profile.md の実績も更新する
    python scripts/note_market.py --force          # 当日のキャッシュを捨てて取り直す

終了コード:
    0  正常
    1  収集できたデータが少なすぎて分析にならない
    2  実行エラー
"""

from __future__ import annotations

import argparse
import json
import math
import random
import re
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MARKET_DIR = REPO_ROOT / "research" / "market"
RAW_DIR = MARKET_DIR / "raw"
TAGS_PATH = MARKET_DIR / "hashtags.txt"
PROFILE_PATH = REPO_ROOT / "knowledge" / "profile.md"

# dedup.py の TF-IDF をそのまま使う。同じものを二度書かない。
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dedup import build_idf, cosine, ngrams, tfidf  # noqa: E402

JST = timezone(timedelta(hours=9))

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# 公開 API のみを使う。ログインを要する範囲には触れない。
API_HASHTAG = "https://note.com/api/v3/hashtags/{tag}/notes"
API_CREATOR = "https://note.com/api/v2/creators/{urlname}"
API_CONTENTS = "https://note.com/api/v2/creators/{urlname}/contents"
API_NOTE = "https://note.com/api/v3/notes/{key}"

REQUEST_INTERVAL = 1.5   # 秒。相手のサーバに負荷をかけない
MAX_REQUESTS = 50        # 1回の実行で叩く上限
MIN_NOTES = 80           # これ未満だとクラスタリングが意味を持たない

SELF_URLNAME = "kou_cosmos7"

DEFAULT_TAGS = ["GAS", "GoogleAppsScript", "UIデザイン", "NotebookLM", "生成AI"]

# タイトルから単語候補を取る。形態素解析は使わない。
# 英数字の連なり／カタカナ2文字以上／漢字2文字以上を語とみなす。
TOKEN = re.compile(r"[A-Za-z][A-Za-z0-9+#.\-]*|[ァ-ヴー]{2,}|[一-鿿]{2,}")

# 煽り型かどうかの判定。voice.md の ng とは別物で、
# ここでは「市場で効いているか」を実測するためだけに使う。
HYPE_PATTERNS = [
    r"【[^】]+】", r"の正体", r"本当は", r"あなた", r"知らない", r"知らなきゃ",
    r"衝撃", r"やばい", r"ヤバい", r"必見", r"驚愕", r"損してる", r"\d割",
    r"たった", r"だけで", r"すごい",
]
CONCRETE_PATTERNS = [
    r"[A-Za-z]{3,}",          # ツール名などの英字
    r"\d",                    # 数字
    r"手順", r"設定", r"実装", r"コード", r"テンプレ", r"作り方", r"やり方",
    r"プロンプト", r"構築", r"自動化",
]


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------

class Fetcher:
    """レート制御とリクエスト上限を持つ取得器。

    上限を持たせるのは、事故で相手に連続アクセスしないためである。
    """

    def __init__(self, max_requests: int = MAX_REQUESTS, interval: float = REQUEST_INTERVAL):
        self.max_requests = max_requests
        self.interval = interval
        self.count = 0
        self.errors: list[str] = []
        self._last = 0.0

    @property
    def exhausted(self) -> bool:
        return self.count >= self.max_requests

    def get(self, url: str, params: dict | None = None) -> dict | None:
        if self.exhausted:
            return None

        if params:
            url = f"{url}?{urllib.parse.urlencode(params)}"

        wait = self.interval - (time.time() - self._last)
        if wait > 0:
            time.sleep(wait)

        req = urllib.request.Request(url, headers={
            "User-Agent": UA,
            "Accept": "application/json",
        })

        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=30) as res:
                    self.count += 1
                    self._last = time.time()
                    return json.loads(res.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                # 404 は「そのタグが無い」など正常な結果なので黙って諦める
                if e.code == 404:
                    self.count += 1
                    self._last = time.time()
                    self.errors.append(f"404 {url}")
                    return None
                if attempt == 2:
                    self.errors.append(f"{e.code} {url}")
                time.sleep(2.0 * (attempt + 1))
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
                if attempt == 2:
                    self.errors.append(f"{type(e).__name__} {url}")
                time.sleep(2.0 * (attempt + 1))

        self._last = time.time()
        return None


# --------------------------------------------------------------------------
# 正規化
#
# v3（ハッシュタグ）は snake_case、v2（クリエイター）は camelCase を返す。
# 呼ぶ側で場合分けしないよう、ここで1つの形に均す。
# --------------------------------------------------------------------------

def parse_dt(s: str) -> datetime | None:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def normalize_note(raw: dict, tag: str, order: str) -> dict | None:
    key = raw.get("key") or raw.get("id")
    name = raw.get("name")
    if not key or not name:
        return None

    user = raw.get("user") or {}
    return {
        "key": str(key),
        "title": str(name),
        "like": int(raw.get("like_count") or raw.get("likeCount") or 0),
        "price": int(raw.get("price") or 0),
        "publishAt": raw.get("publish_at") or raw.get("publishAt") or "",
        "author": user.get("urlname") or raw.get("urlname") or "",
        "isLimited": bool(raw.get("is_limited") or raw.get("isLimited") or False),
        "tag": tag,
        "order": order,
    }


def extract(payload: dict | None) -> tuple[list[dict], int | None]:
    """API のレスポンスから記事の配列と総件数を取り出す。

    エンドポイントごとに data の形が違う（配列だったり notes だったり）ため
    ここで吸収する。
    """
    if not payload:
        return [], None
    data = payload.get("data", payload)
    if isinstance(data, list):
        return [x for x in data if isinstance(x, dict)], None
    if isinstance(data, dict):
        for k in ("notes", "contents"):
            v = data.get(k)
            if isinstance(v, list):
                return [x for x in v if isinstance(x, dict)], data.get("count")
    return [], None


# --------------------------------------------------------------------------
# 収集
# --------------------------------------------------------------------------

def load_tags(path: Path) -> list[str]:
    """hashtags.txt を読む。1行1タグ。`;` 以降はコメント。

    タグ名自体が `#` を含みうるので、コメント記号には `;` を使う。
    account.md をパースしない。設定は設定として独立させたほうが壊れにくい。
    """
    if not path.exists():
        return list(DEFAULT_TAGS)

    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.split(";")[0].strip().lstrip("#").strip()
        if line:
            out.append(line)
    return out or list(DEFAULT_TAGS)


def supply_per_day(notes: list[dict]) -> float:
    """新着ページの投稿間隔から1日あたりの投稿数を出す。

    50件が何時間で積まれたかを見る。埋もれる速さそのものである。
    """
    dts = sorted(d for d in (parse_dt(n["publishAt"]) for n in notes) if d)
    if len(dts) < 2:
        return 0.0
    span = (dts[-1] - dts[0]).total_seconds()
    if span <= 0:
        # 同一時刻に50件（＝1時間未満に集中）。下限を1時間とみなす
        return len(dts) * 24.0
    return len(dts) / (span / 86400.0)


def collect(fetcher: Fetcher, tags: list[str]) -> tuple[list[dict], list[dict]]:
    """タグごとに popular と新着を1ページずつ取る。"""
    seen: dict[str, dict] = {}
    stats: list[dict] = []

    for tag in tags:
        if fetcher.exhausted:
            break
        url = API_HASHTAG.format(tag=urllib.parse.quote(tag))

        pop_raw, total = extract(fetcher.get(url, {"page": 1, "order": "popular"}))
        new_raw, total2 = extract(fetcher.get(url, {"page": 1}))
        total = total or total2

        popular = [x for x in (normalize_note(r, tag, "popular") for r in pop_raw) if x]
        newest = [x for x in (normalize_note(r, tag, "new") for r in new_raw) if x]

        if not popular and not newest:
            continue

        for n in popular + newest:
            seen.setdefault(n["key"], n)

        likes = [n["like"] for n in popular]
        rate = supply_per_day(newest)
        demand = statistics.median(likes) if likes else 0
        paid = [n for n in popular + newest if n["price"] > 0]

        stats.append({
            "tag": tag,
            "totalCount": total,
            "demand": demand,
            "demandP90": round(percentile(likes, 0.90), 1),
            "supplyPerDay": round(rate, 1),
            "gapScore": round(demand / rate, 3) if rate else 0.0,
            "paidRatio": round(len(paid) / max(1, len(popular) + len(newest)), 3),
            "topTitles": [n["title"][:44] for n in
                          sorted(popular, key=lambda x: -x["like"])[:2]],
        })

    stats.sort(key=lambda s: -s["gapScore"])
    return list(seen.values()), stats


def collect_self(fetcher: Fetcher, urlname: str) -> dict:
    """自分のアカウントを取る。市場の中で自分がどこにいるかの基準線になる。"""
    prof = fetcher.get(API_CREATOR.format(urlname=urlname)) or {}
    data = prof.get("data", {}) if isinstance(prof, dict) else {}

    notes: list[dict] = []
    for page in range(1, 8):   # 26本なら2ページで終わる。上限は保険
        if fetcher.exhausted:
            break
        payload = fetcher.get(API_CONTENTS.format(urlname=urlname),
                              {"kind": "note", "page": page})
        rows, _ = extract(payload)
        for raw in rows:
            n = normalize_note(raw, "self", "self")
            if n:
                notes.append(n)

        d = (payload or {}).get("data", {})
        if not rows or (isinstance(d, dict) and d.get("isLastPage")):
            break

    return {
        "urlname": urlname,
        "nickname": data.get("nickname", ""),
        "profile": data.get("profile", ""),
        "followerCount": data.get("followerCount"),
        "noteCount": data.get("noteCount"),
        "notes": notes,
    }


# --------------------------------------------------------------------------
# 集計
# --------------------------------------------------------------------------

def percentile(values: list[int], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    if len(s) == 1:
        return float(s[0])
    pos = (len(s) - 1) * p
    lo, hi = math.floor(pos), math.ceil(pos)
    if lo == hi:
        return float(s[int(pos)])
    return s[lo] * (hi - pos) + s[hi] * (pos - lo)


def summarize(notes: list[dict]) -> dict:
    popular = [n for n in notes if n["order"] == "popular"]
    likes = [n["like"] for n in popular] or [n["like"] for n in notes]
    paid = [n for n in notes if n["price"] > 0]
    prices = [n["price"] for n in paid]

    hours = Counter()
    for n in notes:
        d = parse_dt(n["publishAt"])
        if d:
            hours[d.astimezone(JST).hour] += 1

    authors = Counter(n["author"] for n in notes if n["author"])

    return {
        "count": len(notes),
        "popularCount": len(popular),
        "likeMedian": statistics.median(likes) if likes else 0,
        "likeP90": round(percentile(likes, 0.90), 1),
        "likeMax": max(likes) if likes else 0,
        "paidRatio": round(len(paid) / len(notes), 4) if notes else 0.0,
        "priceMedian": statistics.median(prices) if prices else 0,
        "topHours": [h for h, _ in hours.most_common(3)],
        "uniqueAuthors": len(authors),
        "topAuthors": authors.most_common(5),
    }


def title_style_report(notes: list[dict]) -> dict:
    """煽り型と具体物型のどちらがスキを取っているかを実測する。

    voice.md は煽りを禁止している。その判断が市場で正しいかは別問題である。
    方針を変えるためではなく、方針の代償を数字で把握するために測る。

    人気順で取った記事だけを対象にする。新着はスキが付く前なので、
    混ぜると全部0になって比較にならない。
    """
    popular = [n for n in notes if n["order"] == "popular"]
    hype, concrete, plain = [], [], []
    for n in popular:
        t = n["title"]
        if any(re.search(p, t) for p in HYPE_PATTERNS):
            hype.append(n["like"])
        elif any(re.search(p, t) for p in CONCRETE_PATTERNS):
            concrete.append(n["like"])
        else:
            plain.append(n["like"])

    def stat(xs):
        return {
            "n": len(xs),
            "likeMedian": statistics.median(xs) if xs else 0,
            "likeP90": round(percentile(xs, 0.90), 1),
        }

    return {"hype": stat(hype), "concrete": stat(concrete), "plain": stat(plain)}


# --------------------------------------------------------------------------
# クラスタリング
# --------------------------------------------------------------------------

def centroid(members: list[dict[str, float]]) -> dict[str, float]:
    acc: dict[str, float] = {}
    for v in members:
        for g, x in v.items():
            acc[g] = acc.get(g, 0.0) + x
    norm = math.sqrt(sum(x * x for x in acc.values()))
    if norm == 0:
        return {}
    return {g: x / norm for g, x in acc.items()}


def kmeans(vecs: list[dict[str, float]], k: int, seed: int = 42,
           max_iter: int = 20) -> list[int]:
    """コサイン類似度による k-means。

    seed を固定して決定論にする。同じ入力で毎回違う結果が出ると、
    report.md に残したクラスタ番号が後から検証できなくなる。
    """
    if k >= len(vecs):
        return list(range(len(vecs)))

    rnd = random.Random(seed)

    # k-means++ 風の初期化。最初の1点だけ乱数で選び、以降は遠いものを選ぶ
    centers = [dict(vecs[rnd.randrange(len(vecs))])]
    while len(centers) < k:
        d2 = []
        for v in vecs:
            best = max((cosine(v, c) for c in centers), default=0.0)
            d2.append((1.0 - best) ** 2)
        total = sum(d2)
        if total <= 0:
            centers.append(dict(vecs[rnd.randrange(len(vecs))]))
            continue
        r = rnd.random() * total
        acc = 0.0
        for i, x in enumerate(d2):
            acc += x
            if acc >= r:
                centers.append(dict(vecs[i]))
                break

    labels = [0] * len(vecs)
    for _ in range(max_iter):
        changed = False
        for i, v in enumerate(vecs):
            best_j, best_s = 0, -1.0
            for j, c in enumerate(centers):
                s = cosine(v, c)
                if s > best_s:
                    best_j, best_s = j, s
            if labels[i] != best_j:
                labels[i] = best_j
                changed = True

        for j in range(len(centers)):
            members = [vecs[i] for i, l in enumerate(labels) if l == j]
            if members:
                centers[j] = centroid(members)

        if not changed:
            break

    return labels


def cluster_notes(notes: list[dict], seed: int = 42) -> list[dict]:
    """タイトルをクラスタに分け、クラスタごとに需要と供給を出す。

    人気順で取った記事だけを使う。新着はスキが付く前で需要を測れない。
    """
    target = [n for n in notes if n["order"] == "popular"] or notes

    # タイトルは短いので 2-gram を使う。3-gram だと共通部分が拾えない
    docs = [ngrams(n["title"], 2) for n in target]
    idf = build_idf(docs)
    vecs = [tfidf(d, idf) for d in docs]

    keep = [i for i, v in enumerate(vecs) if v]
    if len(keep) < 8:
        return []

    k = max(4, min(12, int(math.sqrt(len(keep) / 2))))
    labels = kmeans([vecs[i] for i in keep], k, seed=seed)

    groups: dict[int, list[int]] = {}
    for pos, i in enumerate(keep):
        groups.setdefault(labels[pos], []).append(i)

    out = []
    for label, idxs in groups.items():
        members = [target[i] for i in idxs]
        likes = [m["like"] for m in members]
        words = Counter()
        for m in members:
            for w in set(TOKEN.findall(m["title"])):
                words[w] += 1

        supply = len(members)
        demand = statistics.median(likes) if likes else 0
        out.append({
            "id": label,
            "label": " / ".join(w for w, _ in words.most_common(3)) or "（語なし）",
            "supply": supply,
            "likeMedian": demand,
            "likeP90": round(percentile(likes, 0.90), 1),
            "gapScore": round(demand / supply, 4) if supply else 0.0,
            "paidRatio": round(sum(1 for m in members if m["price"] > 0) / supply, 3),
            "tags": [t for t, _ in Counter(m["tag"] for m in members).most_common(2)],
            "examples": [m["title"][:44] for m in
                         sorted(members, key=lambda x: -x["like"])[:3]],
        })

    out.sort(key=lambda c: -c["gapScore"])
    return out


# --------------------------------------------------------------------------
# 出力
# --------------------------------------------------------------------------

def build_markdown(date: str, overall: dict, tags: list[dict], clusters: list[dict],
                   styles: dict, me: dict, errors: list[str]) -> str:
    L = []
    A = L.append

    A(f"# market — {date}")
    A("")
    A("`scripts/note_market.py` が生成する。**手で編集しない。**")
    A("")
    A("`weekly-research` はこのファイルだけを読む。生の JSON は読まない。")
    A("")
    A(f"収集 {overall['count']} 件（うち人気順 {overall['popularCount']} 件）"
      f" / タグ {len(tags)} 本 / 著者 {overall['uniqueAuthors']} 人")
    A("")

    A("## タグ（需要÷供給の高い順）")
    A("")
    A("**上位ほど「読まれるのに書く人が少ない」。** ここから投稿タグを選ぶ。")
    A("")
    A("- 需要 = そのタグの人気上位50件のスキ中央値")
    A("- 供給 = 新着50件の投稿間隔から求めた1日あたりの投稿数")
    A("")
    A("| タグ | 需要 | 供給/日 | 比 | 総記事数 | 有料率 |")
    A("|---|---|---|---|---|---|")
    for t in tags:
        total = f"{t['totalCount']:,}" if t["totalCount"] else "—"
        A(f"| {t['tag']} | {t['demand']} | {t['supplyPerDay']} | {t['gapScore']} "
          f"| {total} | {t['paidRatio'] * 100:.0f}% |")
    A("")
    for t in tags[:3]:
        A(f"- **{t['tag']}** の上位例")
        for e in t["topTitles"]:
            A(f"  - {e}")
    A("")

    A("## クラスタ（タグ横断のテーマの塊）")
    A("")
    A("| # | 代表語 | 記事数 | スキ中央値 | 比 | 主なタグ |")
    A("|---|---|---|---|---|---|")
    for c in clusters:
        A(f"| {c['id']} | {c['label']} | {c['supply']} | {c['likeMedian']} | "
          f"{c['gapScore']} | {', '.join(c['tags'])} |")
    A("")
    for c in clusters[:3]:
        A(f"- **#{c['id']} {c['label']}** の上位例")
        for e in c["examples"]:
            A(f"  - {e}")
    A("")

    A("## 全体")
    A("")
    A(f"- 人気記事のスキ中央値: {overall['likeMedian']} / p90 {overall['likeP90']}"
      f"（最大 {overall['likeMax']}）")
    A(f"- 有料率: {overall['paidRatio'] * 100:.1f}%"
      + (f" / 価格中央値 {overall['priceMedian']:.0f}円" if overall['priceMedian'] else ""))
    A(f"- 投稿が多い時刻: {', '.join(f'{h}時' for h in overall['topHours'])}")
    A("")

    A("## タイトル型の実測")
    A("")
    A("`voice.md` は煽りを禁止している。その代償を把握するために測る。**方針は変えない。**")
    A("")
    for k, jp in (("hype", "煽り型"), ("concrete", "具体物型"), ("plain", "その他")):
        s = styles[k]
        A(f"- {jp}: {s['n']}件 / スキ中央値 {s['likeMedian']} / p90 {s['likeP90']}")
    A("")

    if me.get("notes"):
        likes = [n["like"] for n in me["notes"]]
        med = statistics.median(likes)
        A("## 自分の位置")
        A("")
        A(f"- `{me['urlname']}`（{me['nickname']}）")
        A(f"- 記事 {me.get('noteCount')} 本 / フォロワー {me.get('followerCount')} 人")
        A(f"- スキ中央値 {med} / 最大 {max(likes)}（取得できた {len(likes)} 本）")
        A("")
        A("> **この数値は旧ジャンル（日常・脳科学）のものである。**")
        A("> AI技術ジャンルでの実績ではない。引用するときは必ず前提を添える。")
        A("")

    if errors:
        A("## 取得できなかったもの")
        A("")
        for e in errors[:10]:
            A(f"- {e}")
        A("")

    return "\n".join(L) + "\n"


DATA_DIR = REPO_ROOT / "data"
HISTORY_PATH = DATA_DIR / "history.jsonl"
DASHBOARD_PATH = DATA_DIR / "dashboard.json"
NOTES_DIR = REPO_ROOT / "notes"


def fetch_note_details(fetcher: Fetcher, notes: list[dict]) -> dict[str, dict]:
    """自分の記事の詳細を1本ずつ取る。

    一覧 API（`/contents`）はスキ数しか返さない。コメント数とシェア数は
    記事詳細（`/api/v3/notes/{key}`）にしかない。

    **ビュー数（PV）は公開 API に無い。** 記事詳細の120フィールドを調べても
    view / pv に当たるものが存在しない。note の管理画面でしか見られない。
    取れないものを推定で埋めない（CLAUDE.md ルール3）。

    記事数ぶんリクエストするので、呼ぶのは `--write-dashboard` のときだけにする。
    """
    out: dict[str, dict] = {}
    for n in notes:
        if fetcher.exhausted:
            break
        payload = fetcher.get(API_NOTE.format(key=n["key"]))
        d = (payload or {}).get("data") or {}
        if not d:
            continue
        out[n["key"]] = {
            "comments": int(d.get("comment_count") or 0),
            "shares": int(d.get("note_share_total_count") or 0),
            "anonymousLikes": int(d.get("anonymous_like_count") or 0),
        }
    return out


def build_dashboard(me: dict, date: str, details: dict[str, dict] | None = None) -> str:
    """ダッシュボードが読む JSON を作る。

    埋め込みは `node scripts/encrypt.mjs --from data/dashboard.json` が行う。
    ここでは平文の JSON を置くだけである。

    **取れないものは作らない。** note の公開 API にはコメント数も
    過去のフォロワー履歴も無い。埋められない項目は 0 か空にして、
    ダッシュボード側で「まだ無い」と分かる形にする。
    履歴は今日から積む（data/history.jsonl）。
    """
    notes = me.get("notes", [])
    if not notes:
        return "自アカウントの記事を取得できなかったため dashboard.json を書かなかった"

    details = details or {}
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now(JST).strftime("%Y-%m-%d")
    likes_total = sum(n["like"] for n in notes)
    comments_total = sum(details.get(n["key"], {}).get("comments", 0) for n in notes)
    shares_total = sum(details.get(n["key"], {}).get("shares", 0) for n in notes)

    # ---- 履歴を積む。1日1行。同じ日は上書きする ----
    rows: dict[str, dict] = {}
    if HISTORY_PATH.exists():
        for line in HISTORY_PATH.read_text(encoding="utf-8").splitlines():
            if line.strip():
                try:
                    r = json.loads(line)
                    rows[r["date"]] = r
                except (json.JSONDecodeError, KeyError):
                    continue
    rows[today] = {
        "date": today,
        "followers": me.get("followerCount") or 0,
        "noteCount": me.get("noteCount") or len(notes),
        "totalLikes": likes_total,
        "totalComments": comments_total,
        "totalShares": shares_total,
    }
    with HISTORY_PATH.open("w", encoding="utf-8") as f:
        for k in sorted(rows):
            f.write(json.dumps(rows[k], ensure_ascii=False) + "\n")

    history = [rows[k] for k in sorted(rows)]

    # ---- 記事ごとの指標 ----
    now = datetime.now(JST)
    followers = me.get("followerCount") or 0
    articles = []
    for n in notes:
        pub = parse_dt(n["publishAt"])
        days = max(0, (now - pub.astimezone(JST)).days) if pub else 0
        title = n["title"]
        hype = any(re.search(p, title) for p in HYPE_PATTERNS)
        concrete = any(re.search(p, title) for p in CONCRETE_PATTERNS)

        det = details.get(n["key"], {})
        articles.append({
            "key": n["key"],
            "slug": n["key"],
            "title": title,
            "publishedAt": n["publishAt"][:10] if n["publishAt"] else "",
            "isPaid": n["price"] > 0,
            "price": n["price"],
            "likes": n["like"],
            # 記事詳細 API から取る。--write-dashboard のときだけ埋まる
            "comments": det.get("comments", 0),
            "shares": det.get("shares", 0),
            "titleType": "hype" if hype else ("concrete" if concrete else "plain"),
            # 公開時点のフォロワー数は遡って取れない
            "followersAtPublish": None,
            "likeRate": round(n["like"] / followers, 4) if followers else 0,
            "daysSincePublish": days,
            "dailyLikes": round(n["like"] / days, 3) if days else 0,
            # 日別の推移は今日から積む。1日1点ずつ増える
            "curve": [[days, n["like"]]],
            "systemization": {"snsPosted": False, "crossLinked": False},
        })
    articles.sort(key=lambda a: a["publishedAt"], reverse=True)

    # ---- 制作中の記事（notes/ の状態から） ----
    pipeline = []
    if NOTES_DIR.exists():
        for d in sorted(NOTES_DIR.iterdir()):
            meta_p = d / "meta.json"
            if not d.is_dir() or not meta_p.exists():
                continue
            try:
                meta = json.loads(meta_p.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            if (d / "02-final.md").exists() or (d / "02-letter.md").exists():
                stage, idx = "完成", 3
            elif (d / "01-draft.md").exists():
                stage, idx = "初稿", 2
            else:
                stage, idx = "着手", 1
            pipeline.append({
                "slug": d.name,
                "title": meta.get("title", d.name),
                "stage": stage,
                "stageIndex": idx,
                "updatedAt": meta.get("publishDate", today),
            })

    revenue = {"months": []}
    rev_p = DATA_DIR / "revenue.json"
    if rev_p.exists():
        try:
            revenue = json.loads(rev_p.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass

    data = {
        "updatedAt": datetime.now(JST).isoformat(timespec="seconds"),
        "account": {
            "urlname": me["urlname"],
            "nickname": me.get("nickname", ""),
            "followerCount": followers,
            "noteCount": me.get("noteCount") or len(notes),
        },
        "totals": {
            "likes": likes_total,
            "comments": comments_total,
            "shares": shares_total,
            # ビュー数は note の公開 API に無い。取れないものを推定で埋めない
            "views": None,
            "paidCount": sum(1 for n in notes if n["price"] > 0),
            "freeCount": sum(1 for n in notes if n["price"] == 0),
        },
        "hasDetails": bool(details),
        "articles": articles,
        "followerHistory": [
            {"date": r["date"], "followers": r["followers"]} for r in history
        ],
        "pipeline": pipeline,
        "revenue": revenue,
        "autolog": [{
            "ts": datetime.now(JST).strftime("%Y-%m-%d %H:%M"),
            "r": "note_market",
            "st": "ok",
            "ms": 0,
            "msg": f"実測 {len(notes)} 本 / フォロワー {followers}",
            "detail": f"history {len(history)} 日分",
        }],
        # 実データなので警告を出さない。デモに戻すときだけ true にする
        "isDemo": False,
    }

    DASHBOARD_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return (f"data/dashboard.json を書いた（記事 {len(articles)} 本 / "
            f"履歴 {len(history)} 日分）。"
            "反映は node scripts/encrypt.mjs --from data/dashboard.json")


AUTO_BEGIN = "<!-- AUTO:note-metrics -->"
AUTO_END = "<!-- /AUTO:note-metrics -->"


def update_profile(me: dict, date: str) -> str:
    """profile.md の実績欄を実測値で更新する。

    **前提を必ず書く。** 旧ジャンルで得た数値を AI技術記事の文脈で使うと
    読者を誤認させるため、ここで前提を落とすことは許されない（CLAUDE.md ルール3）。

    「書けないこと」セクションは自動で編集しない。文脈があるため、
    account.md の書き換えに合わせて人間が判断する。
    """
    if not PROFILE_PATH.exists():
        return "profile.md が無いため更新しなかった"

    likes = [n["like"] for n in me.get("notes", [])]
    if not likes:
        return "自アカウントの記事を取得できなかったため更新しなかった"

    dates = sorted(d for d in (parse_dt(n["publishAt"]) for n in me["notes"]) if d)
    span = (f"{dates[0]:%Y-%m-%d} 〜 {dates[-1]:%Y-%m-%d}" if dates else "不明")

    block = "\n".join([
        AUTO_BEGIN,
        f"### {date} note アカウントの実測値",
        "",
        f"- 数値: 記事 {me.get('noteCount')} 本 / フォロワー {me.get('followerCount')} 人 "
        f"/ スキ中央値 {statistics.median(likes)}"
        f"（取得 {len(likes)} 本、最大 {max(likes)}）",
        f"- 出所: note 公開 API（`GET /api/v2/creators/{me['urlname']}`）を "
        "`scripts/note_market.py` が取得",
        f"- 期間: {span} に投稿した分",
        "- 前提: **日常・脳科学ジャンルでの数値である。AI技術ジャンルの実績ではない。**",
        "  この前提を省いて引用してはならない。省いた引用は `ethics-line` の E3 に当たる",
        AUTO_END,
    ])

    text = PROFILE_PATH.read_text(encoding="utf-8")

    if AUTO_BEGIN in text and AUTO_END in text:
        text = re.sub(re.escape(AUTO_BEGIN) + r".*?" + re.escape(AUTO_END),
                      lambda _: block, text, flags=re.S)
        action = "更新した"
    else:
        m = re.search(r"(## 実績\n.*?)（まだない）", text, flags=re.S)
        if not m:
            return "profile.md の実績欄が見つからなかった（手で確認すること）"
        text = text[:m.end(1)] + block + text[m.end():]
        action = "追記した"

    PROFILE_PATH.write_text(text, encoding="utf-8")
    return (f"profile.md の実績を{action}。"
            "「書けないこと」からフォロワー数・読者数の項目を外すかは手で判断すること")


# --------------------------------------------------------------------------
# 実行
# --------------------------------------------------------------------------

def main() -> int:
    for stream in (sys.stdout, sys.stderr):
        if (stream.encoding or "").lower() not in ("utf-8", "utf8"):
            try:
                stream.reconfigure(encoding="utf-8")
            except (AttributeError, ValueError):
                pass

    ap = argparse.ArgumentParser(description="note の公開データから市場を解剖する")
    ap.add_argument("--dry-run", action="store_true",
                    help="先頭2タグだけ取り、ファイルを書かない")
    ap.add_argument("--force", action="store_true", help="当日のキャッシュを無視する")
    ap.add_argument("--max-requests", type=int, default=MAX_REQUESTS)
    ap.add_argument("--tags", type=Path, default=TAGS_PATH)
    ap.add_argument("--self", dest="self_urlname", default=SELF_URLNAME,
                    help="基準線にする自分の urlname。'-' で無効化")
    ap.add_argument("--update-profile", action="store_true",
                    help="knowledge/profile.md の実績を実測値で更新する")
    ap.add_argument("--write-dashboard", action="store_true",
                    help="data/dashboard.json を書き、data/history.jsonl に実測を積む")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    date = datetime.now(JST).strftime("%Y-%m-%d")
    raw_path = RAW_DIR / f"{date}.jsonl"

    tags = load_tags(args.tags)
    if args.dry_run:
        tags = tags[:2]

    notes: list[dict] = []
    tag_stats: list[dict] = []
    me: dict = {}
    fetcher = Fetcher(max_requests=args.max_requests)

    # キャッシュがあれば使う。同じ日に何度も相手を叩かないため。
    if raw_path.exists() and not args.force and not args.dry_run:
        print(f"[market] キャッシュを使う: {raw_path.name}")
        for line in raw_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            rec = json.loads(line)
            kind = rec.get("_kind")
            if kind == "self":
                me = rec["self"]
            elif kind == "tagstats":
                tag_stats = rec["tagStats"]
            else:
                notes.append(rec)
    else:
        print(f"[market] 収集開始 タグ {len(tags)} 本"
              f"（1タグにつき人気順と新着で2リクエスト）")
        notes, tag_stats = collect(fetcher, tags)
        if args.self_urlname and args.self_urlname != "-":
            me = collect_self(fetcher, args.self_urlname)
        print(f"[market] {fetcher.count} リクエスト / {len(notes)} 件")

        if not args.dry_run:
            RAW_DIR.mkdir(parents=True, exist_ok=True)
            with raw_path.open("w", encoding="utf-8") as f:
                for n in notes:
                    f.write(json.dumps(n, ensure_ascii=False) + "\n")
                f.write(json.dumps({"_kind": "tagstats", "tagStats": tag_stats},
                                   ensure_ascii=False) + "\n")
                if me:
                    f.write(json.dumps({"_kind": "self", "self": me},
                                       ensure_ascii=False) + "\n")

    if len(notes) < MIN_NOTES:
        print(f"[market] 収集できたのが {len(notes)} 件で、"
              f"分析に必要な {MIN_NOTES} 件に届かない", file=sys.stderr)
        for e in fetcher.errors[:5]:
            print(f"         {e}", file=sys.stderr)
        if not args.dry_run:
            return 1

    overall = summarize(notes)
    clusters = cluster_notes(notes, seed=args.seed)
    styles = title_style_report(notes)

    md = build_markdown(date, overall, tag_stats, clusters, styles, me, fetcher.errors)

    if args.dry_run:
        print("\n--- dry-run（ファイルは書かない）---\n")
        print(md)
        return 0

    MARKET_DIR.mkdir(parents=True, exist_ok=True)
    (MARKET_DIR / f"{date}.md").write_text(md, encoding="utf-8")
    (MARKET_DIR / f"{date}.json").write_text(json.dumps({
        "date": date,
        "tags": tag_stats,
        "overall": overall,
        "clusters": clusters,
        "titleStyles": styles,
        "self": {k: v for k, v in me.items() if k != "notes"},
        "selfLikeMedian": (statistics.median([n["like"] for n in me["notes"]])
                           if me.get("notes") else None),
        "errors": fetcher.errors,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[market] research/market/{date}.md を書きました")
    if tag_stats:
        print("[market] タグ上位: " + ", ".join(
            f"{t['tag']}({t['gapScore']})" for t in tag_stats[:3]))

    if args.update_profile:
        print(f"[market] {update_profile(me, date)}")

    if args.write_dashboard:
        # コメント数とシェア数は記事詳細にしかない。記事数ぶん叩くので
        # ここでリクエスト枠を足す（タグの計測とは別勘定にする）
        details = {}
        if me.get("notes"):
            fetcher.max_requests = fetcher.count + len(me["notes"]) + 2
            details = fetch_note_details(fetcher, me["notes"])
            print(f"[market] 記事詳細 {len(details)} 本を取得しました")
        print(f"[market] {build_dashboard(me, date, details)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
