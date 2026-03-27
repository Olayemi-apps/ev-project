from typing import Dict, Any, List, Optional
from ._nextdata import extract_next_data, deep_get

def _pick_best_hero_image(page_data: Dict[str, Any]) -> Optional[str]:
    # Prefer topHero desktop image if present
    top_hero = page_data.get("topHero", {})
    img = (top_hero.get("image") or {}).get("desktop")
    return img

def _normalize_perf_specs(perf: Dict[str, Any]) -> Dict[str, Any]:
    """
    Maps NIO performance specs into your site schema.
    Example in snapshot:
      specs: [
        {"spec":"1050","unit":"km","label":"CLTC est.*"},
        {"spec":"3.8","unit":"s","label":"0-100km/h Acceleration**"},
        {"spec":"33.5","unit":"m","label":"0-100km/h Braking Distance**"}
      ]
      disclaimer: "...CLTC...150-kWh..."
    """
    out_specs = {
        "drivetrain": None,
        "battery_kwh": None,
        "range_wltp_km": None,
        "accel_0_100_s": None,
        "dc_charge_10_80_min": None
    }

    raw_specs: List[Dict[str, Any]] = perf.get("specs") or []
    disclaimer: str = perf.get("disclaimer") or ""

    # Range: store as range_cltc_km (we'll add in JSON) and keep your existing range_wltp_km null
    range_cltc = None
    accel = None

    for s in raw_specs:
        label = (s.get("label") or "").lower()
        unit = (s.get("unit") or "").lower()
        val = s.get("spec")

        if val is None:
            continue

        try:
            num = float(str(val).replace(",", "").strip())
        except ValueError:
            continue

        if "cltc" in label and unit == "km":
            range_cltc = int(round(num))
        if ("0-100" in label or "0–100" in label) and "acceleration" in label and unit == "s":
            accel = num

    # Battery kWh is mentioned in the disclaimer as 150-kWh battery pack
    battery_kwh = None
    if "150-kwh" in disclaimer.lower() or "150 kwh" in disclaimer.lower():
        battery_kwh = 150

    # Drivetrain: in driveParts slides there is "Smart Dual-Motor AWD as Standard"
    drivetrain = None
    drive_parts = perf.get("driveParts") or {}
    slides = drive_parts.get("slides") or []
    for sl in slides:
        title = (sl.get("title") or "").lower()
        if "awd" in title:
            drivetrain = "AWD"
            break

    out_specs["battery_kwh"] = battery_kwh
    out_specs["accel_0_100_s"] = accel
    out_specs["drivetrain"] = drivetrain

    # Return extras for transparency
    extras = {
        "range_standard": "CLTC",
        "range_cltc_km": range_cltc,
        "specs_disclaimer_html": disclaimer
    }

    return {"specs": out_specs, "extras": extras}

def parse(html: str, text: str) -> Dict[str, Any]:
    nd = extract_next_data(html)
    if not nd:
        # Fallback: keep minimal
        return {}

    page_data = deep_get(nd, "props.pageProps.pageData", default={})
    meta = page_data.get("meta") or {}

    # Key sections
    performance = page_data.get("performance") or {}

    normalized = _normalize_perf_specs(performance)
    hero = _pick_best_hero_image(page_data)

    title = meta.get("title") or "NIO ET7"
    desc = meta.get("description") or ""

    trims = []

    range_cltc = normalized.get("extras", {}).get("range_cltc_km")
    battery_kwh = normalized.get("specs", {}).get("battery_kwh")
    accel = normalized.get("specs", {}).get("accel_0_100_s")
    drivetrain = normalized.get("specs", {}).get("drivetrain")

    if range_cltc and battery_kwh:
        trims.append({
            "id": "150kwh-awd",
            "name": "150 kWh AWD (CLTC)",
            "availability": "China market",
            "specs": {
                "battery_kwh": battery_kwh,
                "range_cltc_km": range_cltc,
                "accel_0_100_s": accel,
                "drivetrain": drivetrain,
                "dc_charge_10_80_min": None
            },
            "notes": [
                "CLTC test cycle",
                "Final UK-delivered spec confirmed per VIN"
            ]
        })

    out: Dict[str, Any] = {
        "tagline": "Flagship electric sedan sourcing and UK import concierge.",
        "highlights": [
            "Executive sedan positioning with premium cabin technology",
            "Concierge-led sourcing, shipping, IVA preparation, and registration"
        ],
        "images": [],
        "specs": normalized.get("specs", {}),
        "trims": trims,
        "source": {
            "official_url": "https://www.nio.com/et7",
            "last_checked": None
        },
        "oem": {
            "meta_title": title,
            "meta_description": desc
        },
        "specs_meta": normalized.get("extras", {})
    }

    if hero:
        out["images"].append(hero)

    return out
