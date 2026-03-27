import json
import re
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import feedparser
from dateutil import parser as dtparser
from pathlib import Path
import tempfile
import os

SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parents[1]

SOURCES_FILE = SCRIPT_DIR / "sources.json"

DATA_DIR = BASE_DIR / "site" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

ROOT_OUT = DATA_DIR / "market-intel.json"


# ======================================
# AUTO ANALYSIS ENGINE
# ======================================

def generate_analysis(summary, category):
    text = summary.lower()

    # ------------------------------------------------
    # BASE MACRO FRAMING
    # ------------------------------------------------
    executive_summary = (
        "The development reflects a material shift within the EV ecosystem, "
        "with implications for capital allocation, competitive positioning, "
        "and medium-term structural dynamics across OEMs and the supply chain."
    )

    market_implication = (
        "Signal suggests incremental sector evolution rather than immediate structural disruption."
    )

    capital_signal = (
        "Capital positioning appears stable, with no immediate evidence of systemic reallocation."
    )

    strategic_impact = (
        "Supports gradual competitive recalibration within existing industry structures."
    )

    executive_takeaway = (
        "Development reinforces steady sector progression with contained risk profile."
    )

    # ------------------------------------------------
    # SIGNAL CLASSIFICATION DEFAULTS
    # ------------------------------------------------
    risk_level = "Low"
    capital_intensity = "Medium"
    signal_horizon = "Cyclical"
    outlook_3_6m = "Neutral"

    # ------------------------------------------------
    # IPO / LISTING EVENTS
    # ------------------------------------------------
    if "ipo" in text or "listing" in text:

        executive_summary = (
            "Public market entry signals capital market validation of EV sector maturity, "
            "potentially expanding institutional participation and liquidity depth."
        )

        market_implication = (
            "Listing activity enhances valuation transparency and may recalibrate "
            "competitive access to public capital."
        )

        capital_signal = (
            "Transition to public capital markets broadens funding optionality "
            "and supports long-term expansion initiatives."
        )

        strategic_impact = (
            "Improved capital flexibility may accelerate capacity scaling and strengthen "
            "competitive positioning."
        )

        executive_takeaway = (
            "IPO activity reflects normalization of EV players within institutional capital frameworks."
        )

        capital_intensity = "High"
        signal_horizon = "Structural"
        outlook_3_6m = "Positive"

    # ------------------------------------------------
    # FUNDING / INVESTMENT
    # ------------------------------------------------
    elif "funding" in text or "investment" in text:

        executive_summary = (
            "Fresh capital deployment underscores sustained investor conviction "
            "in long-duration EV growth trajectories."
        )

        market_implication = (
            "Incremental funding strengthens balance sheet resilience and enhances "
            "capacity expansion flexibility."
        )

        capital_signal = (
            "Private capital inflows reinforce sector attractiveness "
            "and sustain elevated competitive intensity."
        )

        strategic_impact = (
            "Enhanced liquidity buffers extend execution runway and mitigate near-term scaling risk."
        )

        executive_takeaway = (
            "Capital momentum remains supportive of medium-term EV expansion dynamics."
        )

        capital_intensity = "High"
        signal_horizon = "Structural"
        outlook_3_6m = "Positive"

    # ------------------------------------------------
    # OPERATIONAL RISK EVENTS
    # ------------------------------------------------
    elif "recall" in text or "delay" in text or "lawsuit" in text:

        executive_summary = (
            "Operational disruption introduces execution risk exposure and potential "
            "margin compression through remediation costs."
        )

        market_implication = (
            "Short-term operational stress may shift competitive share "
            "toward more resilient peers."
        )

        capital_signal = (
            "Cost absorption may constrain discretionary capital allocation in the near term."
        )

        strategic_impact = (
            "Execution credibility becomes a differentiating factor under tightening quality scrutiny."
        )

        executive_takeaway = (
            "Operational risk exposure modestly elevates sector execution sensitivity."
        )

        risk_level = "Elevated"
        outlook_3_6m = "Cautious"

    # ------------------------------------------------
    # SALES / GROWTH ACCELERATION
    # ------------------------------------------------
    elif "sales" in text or "record" in text or "surge" in text or "growth" in text:

        executive_summary = (
            "Demand acceleration reinforces adoption momentum and strengthens revenue visibility "
            "across leading OEM platforms."
        )

        market_implication = (
            "Sustained volume growth may pressure lagging competitors "
            "and intensify capacity scaling requirements."
        )

        capital_signal = (
            "Improved throughput enhances internal capital generation capacity."
        )

        strategic_impact = (
            "Operating leverage compounds as scale advantages expand."
        )

        executive_takeaway = (
            "Adoption momentum strengthens structural EV penetration trajectory."
        )

        outlook_3_6m = "Positive"

    # ------------------------------------------------
    # POLICY / REGULATION
    # ------------------------------------------------
    elif "policy" in text or "regulation" in text or "tariff" in text:

        signal_horizon = "Structural"
        risk_level = "Moderate"

    # ------------------------------------------------
    # RETURN OBJECT
    # ------------------------------------------------
    return {
        "executive_summary": executive_summary,
        "market_implication": market_implication,
        "capital_signal": capital_signal,
        "strategic_impact": strategic_impact,
        "executive_takeaway": executive_takeaway,
        "risk_level": risk_level,
        "capital_intensity": capital_intensity,
        "signal_horizon": signal_horizon,
        "outlook_3_6m": outlook_3_6m
    }

# ======================================
# SIGNAL SCORE ENGINE
# ======================================

def compute_signal_score(title: str, summary: str, category: str) -> int:
    text = (title + " " + summary).lower()
    score = 0

    high_impact = [
        "ipo", "merger", "acquisition", "funding",
        "recall", "ban", "tariff", "subsidy",
        "lawsuit", "gigafactory",
        "price increase", "withdraw", "shortage",
        "surge", "record", "collapse"
    ]

    for word in high_impact:
        if word in text:
            score += 15

    if category in ["Investment", "Policy"]:
        score += 10

    return min(score, 100)


# ======================================
# RISK / OPPORTUNITY CLASSIFIER
# ======================================

# ======================================
# ADVANCED SENTIMENT ENGINE
# ======================================

def classify_signal_sentiment(title: str, summary: str, category: str, signal_score: int) -> dict:
    text = (title + " " + summary).lower()

    risk_weights = {
        "ban": 4,
        "recall": 5,
        "probe": 3,
        "lawsuit": 4,
        "delay": 2,
        "cut": 2,
        "collapse": 5,
        "tariff": 3,
        "investigation": 3,
        "bankruptcy": 6
    }

    opportunity_weights = {
        "funding": 3,
        "grant": 3,
        "expansion": 3,
        "growth": 3,
        "approval": 2,
        "record": 2,
        "launch": 2,
        "partnership": 2,
        "investment": 3,
        "subsidy": 2
    }

    risk_score = 0
    opportunity_score = 0

    for word, weight in risk_weights.items():
        if word in text:
            risk_score += weight

    for word, weight in opportunity_weights.items():
        if word in text:
            opportunity_score += weight

    # Category adjustment
    if category == "Policy":
        risk_score += 1
    if category == "Investment":
        opportunity_score += 1

    # Intensity multiplier from signal_score
    intensity_boost = signal_score / 25
    risk_score *= (1 + intensity_boost)
    opportunity_score *= (1 + intensity_boost)

    if risk_score > opportunity_score:
        label = "risk"
        confidence = min(int((risk_score / (risk_score + opportunity_score + 0.01)) * 100), 95)
    elif opportunity_score > risk_score:
        label = "opportunity"
        confidence = min(int((opportunity_score / (risk_score + opportunity_score + 0.01)) * 100), 95)
    else:
        label = "neutral"
        confidence = 50

    return {
        "label": label,
        "confidence": confidence,
        "risk_score": round(risk_score, 2),
        "opportunity_score": round(opportunity_score, 2)
    }


# ======================================
# HELPERS
# ======================================

def safe_parse_date(s):
    if not s:
        return None
    try:
        return dtparser.parse(s)
    except Exception:
        return None


def norm_text(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def classify_category(title: str, summary: str, keywords_map: dict) -> str:
    text = (title + " " + summary).lower()

    # ------------------------------------------------
    # STRICT CHARGING CLASSIFICATION
    # Prevent false positives like "supercharged engine"
    # ------------------------------------------------
    charging_keywords = [
        "charging network",
        "charging station",
        "fast charger",
        "fast-charging",
        "ultra fast charging",
        "supercharger",
        "dc fast charging",
        "charging infrastructure",
        "charging corridor",
        "ev charger",
        "charging rollout",
        "charging deployment"
    ]

    for kw in charging_keywords:
        if kw in text:
            return "Charging"

    # ------------------------------------------------
    # NORMAL CATEGORY CLASSIFICATION
    # ------------------------------------------------
    for cat in ["Policy", "Investment", "Battery", "OEM"]:
        for kw in keywords_map.get(cat, []):
            if kw.lower() in text:
                return cat

    return "Industry"


def classify_region(title: str, summary: str, region_hints: dict) -> str:
    text = (title + " " + summary).lower()
    for region, hints in region_hints.items():
        for h in hints:
            if h.lower() in text:
                return region
    return "Global"


def week_bucket(dt: datetime) -> str:
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


# ======================================
# BUILD PIPELINE
# ======================================

def build():
    with open(SOURCES_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    feeds = cfg["feeds"]
    keywords_map = cfg["keywords"]
    region_hints = cfg["region_hints"]

    articles = []
    seen = set()

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=14)

    for src in feeds:
        parsed = feedparser.parse(src["url"])
        source_name = src["name"]

        for entry in parsed.entries[:40]:

            title = norm_text(getattr(entry, "title", ""))
            link = norm_text(getattr(entry, "link", ""))
            summary = norm_text(
                getattr(entry, "summary", "") or
                getattr(entry, "description", "") or
                ""
            )

            if not title or not link:
                continue

            key = (title.lower(), link.lower())
            if key in seen:
                continue
            seen.add(key)

            published_raw = getattr(entry, "published", None) or getattr(entry, "updated", None)
            published_dt = safe_parse_date(published_raw) or now

            if not published_dt.tzinfo:
                published_dt = published_dt.replace(tzinfo=timezone.utc)

            if published_dt < cutoff:
                continue

            category = classify_category(title, summary, keywords_map)
            region = classify_region(title, summary, region_hints)

            def strip_html(text: str) -> str:
                return re.sub(r"<[^>]+>", "", text or "")

            clean_summary = strip_html(summary).strip()

            # ---- Build article object ----
            article = {
                "id": re.sub(r"[^a-z0-9]+", "-", (source_name + "-" + title).lower())[:80],
                "title": title,
                "link": link,
                "source": source_name,
                "category": category,
                "region": region,
                "published": published_dt.isoformat(),
                "week": week_bucket(published_dt),
                "summary": clean_summary
            }

            # ---- Intelligence layer ----
            article["analysis"] = generate_analysis(
                article["summary"],
                article["category"]
            )

            article["signal_score"] = compute_signal_score(
                article["title"],
                article["summary"],
                article["category"]
            )

            sentiment = classify_signal_sentiment(
                article["title"],
                article["summary"],
                article["category"],
                article["signal_score"]
            )

            article["signal_sentiment"] = sentiment

            article["signal_score"]
            article["signal_sentiment"]

            # ------------------------------------------------
            # STRATUM IMPACT INDEX
            # ------------------------------------------------

            analysis = article["analysis"]

            impact = article["signal_score"]

            # Risk weighting
            risk_map = {
                "Low": 0,
                "Moderate": 5,
                "Elevated": 10
            }
            impact += risk_map.get(analysis.get("risk_level"), 0)

            # Capital intensity weighting
            capital_map = {
                "Low": 0,
                "Medium": 5,
                "High": 10
            }
            impact += capital_map.get(analysis.get("capital_intensity"), 0)

            # Structural weighting
            horizon_map = {
                "Cyclical": 0,
                "Structural": 10,
                "Tactical": 3
            }
            impact += horizon_map.get(analysis.get("signal_horizon"), 0)

            # Outlook weighting
            outlook_map = {
                "Cautious": -5,
                "Neutral": 0,
                "Positive": 5
            }
            impact += outlook_map.get(analysis.get("outlook_3_6m"), 0)

            # Clamp range 0–100
            impact = max(0, min(impact, 100))

            article["stratum_impact_index"] = impact

            articles.append(article)

    # ------------------------------------------------
    # INTELLIGENCE RANKING
    # Sort by Stratum Impact Index first, then recency
    # ------------------------------------------------
    articles.sort(
        key=lambda a: (
            a.get("stratum_impact_index", 0),
            a["published"]
        ),
        reverse=True
    )

    # ---- KPI Layer ----
    def in_last(days: int, a):
        dt = safe_parse_date(a["published"])
        return dt and dt >= (now - timedelta(days=days))

    last7 = [a for a in articles if in_last(7, a)]
    prev7 = [
        a for a in articles
        if safe_parse_date(a["published"]) and
        (now - timedelta(days=14)) <= safe_parse_date(a["published"]) < (now - timedelta(days=7))
    ]

    def count_by(field: str, rows):
        d = defaultdict(int)
        for r in rows:
            d[r[field]] += 1
        return dict(sorted(d.items(), key=lambda x: x[1], reverse=True))

    kpis = {
    "total_7d": len(last7),
    "total_7d_delta": len(last7) - len(prev7),
    "by_category_7d": count_by("category", last7),
    "by_region_7d": count_by("region", last7),
    "top_sources_7d": count_by("source", last7)
    }

    # ------------------------------------------------
    # SIGNAL MOMENTUM (week over week narrative shift)
    # ------------------------------------------------

    cat_now = count_by("category", last7)
    cat_prev = count_by("category", prev7)

    momentum = {}

    all_cats = set(list(cat_now.keys()) + list(cat_prev.keys()))

    for c in all_cats:
        momentum[c] = cat_now.get(c, 0) - cat_prev.get(c, 0)

    kpis["category_momentum"] = dict(sorted(momentum.items(), key=lambda x: x[1], reverse=True))
    
    # ---- Executive Brief ----
    top_cat = next(iter(kpis["by_category_7d"].keys()), "Industry")
    top_reg = next(iter(kpis["by_region_7d"].keys()), "Global")
    avg_score = int(sum(a["signal_score"] for a in last7) / len(last7)) if last7 else 0

    bias_count = defaultdict(int)
    for a in last7:
        label = a.get("signal_sentiment", {}).get("label", "neutral")
        bias_count[label] += 1

    top_bias = max(bias_count, key=bias_count.get) if bias_count else "neutral"

    brief = (
        f"This week’s signal environment shows dominant activity in {top_cat}, "
        f"with concentration in {top_reg}. Average signal intensity scored {avg_score}. "
        f"Bias skew: {top_bias}."
    )

    out = {
        "updated": now.isoformat(),
        "brief": brief,
        "kpis": kpis,
        "articles": articles[:120]
    }

    tmp_fd, tmp_path = tempfile.mkstemp(prefix="market-intel-", suffix=".json", dir=str(DATA_DIR))
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, ROOT_OUT)
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


if __name__ == "__main__":
    build()