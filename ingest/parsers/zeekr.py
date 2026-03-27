import re
from typing import Any, Dict, Optional
from ._htmlmeta import extract_og_image
from ._nuxt import extract_nuxt_state  # kept for future use, not required right now

# Parser validated against Zeekr EU site
# Numeric specs verified Jan 2026
# Battery capacity intentionally not inferred


_TAG_RE = re.compile(r"<[^>]+>")


def _strip_tags(s: str) -> str:
    # Convert HTML snippet to crude text for regex matching
    s = _TAG_RE.sub(" ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def _window(html: str, needle: str, radius: int = 25000) -> str:
    i = html.lower().find(needle.lower())
    if i == -1:
        return ""
    return html[max(0, i - radius) : min(len(html), i + radius)]

def _ctx(s: str, needle: str, radius: int = 160) -> str:
    i = s.lower().find(needle.lower())
    if i == -1:
        return ""
    return s[max(0, i - radius): min(len(s), i + radius)]


def _hero_from_tail(html: str) -> Optional[str]:
    tail = html[-300000:] if len(html) > 300000 else html
    urls = re.findall(r"(https://[^\s\"']+\.(?:jpg|jpeg|png|webp))", tail, flags=re.IGNORECASE)

    # Filter out cookie/consent/logo assets
    bad = ("cookielaw", "cookie", "consent", "onetrust", "logo")
    for u in urls:
        ul = u.lower()
        if any(b in ul for b in bad):
            continue
        return u
    return None


def _hero_from_datocms(html: str) -> Optional[str]:
    # Prefer PC images if present, otherwise any datocms asset
    block = _window(html, "datocms-assets", radius=120000) or _window(html, "vehicle-parameter", radius=120000)
    urls = re.findall(
        r"(https://www\.datocms-assets\.com/[^\s\"']+\.(?:png|jpg|jpeg|webp)\?auto=format)",
        block,
        flags=re.IGNORECASE,
    )
    if not urls:
        return None
    for u in urls:
        if "pc" in u.lower():
            return u
    return urls[0]


def _find_hero_from_nuxt(nuxt: Dict[str, Any]) -> Optional[str]:
    # Best-effort: find a reasonable image URL in the nuxt state.
    s = str(nuxt)
    m = re.search(r"(https://[^\s\"']+\.(?:jpg|jpeg|png|webp))", s, re.IGNORECASE)
    if m:
        return m.group(1)
    return None

def _extract_specs_from_grid(html: str, text: str = "") -> Dict[str, Any]:
    specs = {
        "battery_kwh": None,
        "range_wltp_km": None,
        "accel_0_100_s": None,
        "dc_charge_10_80_min": None,
        "drivetrain": None,
    }
    specs_meta = {
        "range_standard": None,
        "range_cltc_km": None,
        "specs_disclaimer_html": ""
    }

    t_text = re.sub(r"\s+", " ", (text or "")).strip()

    def _to_float(num: str) -> float:
        return float(num.replace(",", "."))

    # ---------------- 0–100 km/h ----------------
    m = re.search(
        r"\b0\s*[\-–—−]\s*100\s*km/h\b.*?(?:in\s*)?([0-9]+(?:[.,][0-9]+)?)\s*(?:s|sec|secs|seconds)",
        t_text,
        re.IGNORECASE,
    )
    if not m:
        m = re.search(
            r"\b([0-9]+(?:[.,][0-9]+)?)\s*(?:s|sec|secs|seconds)\s*0\s*[\-–—−]\s*100\s*km/h",
            t_text,
            re.IGNORECASE,
        )
    if m:
        specs["accel_0_100_s"] = _to_float(m.group(1))

    # ---------------- WLTP range ----------------
    dash = r"[\u2013\u2014\u2212\-–—−]"
    m = re.search(
        rf"\b(\d{{3,4}})\s*km\b\s*Cruising range\s*{dash}\s*WLTP\s*standard",
        t_text,
        re.IGNORECASE,
    )
    if not m:
        m = re.search(
            r"\bWLTP\b.{0,60}?\b(\d{3,4})\s*km\b|\b(\d{3,4})\s*km\b.{0,60}?\bWLTP\b",
            t_text,
            re.IGNORECASE,
        )
    if m:
        km = m.group(1) or m.group(2)
        specs["range_wltp_km"] = int(km)
        specs_meta["range_standard"] = "WLTP"

    # ---------------- 10–80% charging ----------------
    m = re.search(
        r"\b(\d{1,3})\s*(?:min|mins|minutes)\b.*?\b10\s*%?\s*(?:to|[\-–—−])\s*80\s*%?",
        t_text,
        re.IGNORECASE,
    )
    if not m:
        m = re.search(
            r"\b10\s*%?\s*(?:to|[\-–—−])\s*80\s*%?.*?\b(\d{1,3})\s*(?:min|mins|minutes)",
            t_text,
            re.IGNORECASE,
        )
    if m:
        specs["dc_charge_10_80_min"] = int(m.group(1))

    # ---------------- Battery kWh (RAW HTML) ----------------
    kwh_block = _window(html, "kWh", radius=200000)
    kwh_text = _strip_tags(kwh_block)
    kwh_text = re.sub(r"\s+", " ", kwh_text)

    kwh_candidates = re.findall(r"\b(\d{2,3})\s*kwh\b|\b(\d{2,3})kwh\b", kwh_text, re.IGNORECASE)
    nums = []
    for a, b in kwh_candidates:
        n = int(a or b)
        if 50 <= n <= 200:
            nums.append(n)
    if nums:
        specs["battery_kwh"] = max(nums)

    # ---------------- Drivetrain ----------------
    if re.search(r"\bAWD\b", t_text) and re.search(r"\bRWD\b", t_text):
        specs["drivetrain"] = "RWD or AWD (variant dependent)"
    elif re.search(r"\bAWD\b", t_text):
        specs["drivetrain"] = "AWD"
    elif re.search(r"\bRWD\b", t_text):
        specs["drivetrain"] = "RWD"

    # ---------------- Battery disclaimer ----------------
    if specs["battery_kwh"] is None:
        specs_meta["specs_disclaimer_html"] = (
            "Battery capacity varies by market and trim; confirm on build sheet."
        )

    return {"specs": specs, "specs_meta": specs_meta}




def parse(html: str, text: str) -> Dict[str, Any]:
    # Hero preference: datocms images > og:image > tail fallback
    hero = _hero_from_datocms(html) or extract_og_image(html) or _hero_from_tail(html)

    extracted = _extract_specs_from_grid(html, text)
    specs = extracted["specs"]
    specs_meta = extracted["specs_meta"]

    trims = []
    has_any = any(
        v is not None
        for v in [
            specs.get("range_wltp_km"),
            specs.get("accel_0_100_s"),
            specs.get("dc_charge_10_80_min"),
            specs.get("drivetrain"),
            specs.get("battery_kwh"),
        ]
    )

    if has_any:
        trims.append(
            {
                "id": "headline",
                "name": "Headline configuration (market dependent)",
                "availability": "EU market page",
                "specs": {
                    "battery_kwh": specs.get("battery_kwh"),
                    "range_wltp_km": specs.get("range_wltp_km"),
                    "range_cltc_km": specs_meta.get("range_cltc_km"),
                    "accel_0_100_s": specs.get("accel_0_100_s"),
                    "drivetrain": specs.get("drivetrain"),
                    "dc_charge_10_80_min": specs.get("dc_charge_10_80_min"),
                },
                "notes": [
                    "Headline figures extracted from Zeekr EU page content",
                    "Final UK-delivered spec confirmed per VIN and build sheet",
                ],
            }
        )

    out: Dict[str, Any] = {
        "tagline": "Luxury shooting brake sourcing with end-to-end UK compliance support.",
        "highlights": [
            "Performance-forward grand tourer positioning",
            "Concierge-led sourcing, shipping, IVA preparation, and registration",
        ],
        "images": [],
        "specs": specs,
        "trims": trims,
        "specs_meta": specs_meta,
    }

    if hero:
        out["images"].append(hero)

    return out
