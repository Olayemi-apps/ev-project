import re
from typing import Any, Dict, Optional, List, Tuple

from ._htmlmeta import extract_og_image
from ._jsassign import extract_pagedata_modules, extract_window_initial_data


def _find_image_in_obj(obj) -> Optional[str]:
    s = str(obj)
    m = re.search(r"(https://[^\s\"']+\.(?:jpg|jpeg|png|webp))", s, re.IGNORECASE)
    if m:
        url = m.group(1)
        if "xpeng-share-icon" not in url:
            return url
    return None


def _parse_car_config_list(modules: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], Dict[str, Any], Optional[str], Optional[str]]:
    """
    Reads XPeng pageData modules.
    Uses banner-like module car_config_list for headline specs and hero.
    """
    specs = {
        "battery_kwh": None,          # not provided in your pageData snippet
        "range_wltp_km": None,
        "accel_0_100_s": None,
        "dc_charge_10_80_min": None,
        "drivetrain": None,
    }
    specs_meta = {
        "range_standard": None,
        "range_cltc_km": None,
        "specs_disclaimer_html": (
            "All technical data are subject to type approval. Data has been obtained during internal testing. "
            "The actual range may differ from the calculated WLTP range depending on driving style, speed, load, "
            "outside temperature, use of air conditioning, terrain, and vehicle condition."
        )
    }

    hero = None
    trim_hint = None

    for mod in modules:
        # XPeng sometimes changes the module label, so we key off structure:
        # a banner-like module has img_src/img_min_src AND car_config_list
        is_banner_like = (
            isinstance(mod, dict)
            and (mod.get("img_src") or mod.get("img_min_src"))
            and isinstance(mod.get("car_config_list"), list)
            and len(mod.get("car_config_list") or []) > 0
        )

        if mod.get("module") == "page_banner" or is_banner_like:
            hero = mod.get("img_src") or mod.get("img_min_src")
            car = mod.get("car_config_list") or []

            for item in car:
                hint = (item.get("hint") or "").lower()
                num_raw = (item.get("number") or "").strip()

                # Range (WLTP, note their hint typo "WLPT")
                if "wltp" in hint or "wlpt" in hint:
                    try:
                        specs["range_wltp_km"] = int(float(num_raw))
                        specs_meta["range_standard"] = "WLTP"
                    except Exception:
                        pass

                # 0–100 (AWD)
                if "0–100" in hint or "0-100" in hint:
                    try:
                        specs["accel_0_100_s"] = float(num_raw)
                    except Exception:
                        pass
                    if "awd" in hint:
                        specs["drivetrain"] = "AWD"
                        trim_hint = "AWD"

                # Charge 10–80% SOC (minutes)
                if "10-80" in hint or "10–80" in hint or "soc" in hint:
                    try:
                        specs["dc_charge_10_80_min"] = int(float(num_raw))
                    except Exception:
                        pass

            # Once we found banner-like content, stop, it is the best source for hero and headline specs
            break

    return specs, specs_meta, hero, trim_hint



def parse(html: str, text: str) -> Dict[str, Any]:
    modules = extract_pagedata_modules(html) or []
    init_data = extract_window_initial_data(html) or {}

    specs, specs_meta, hero_from_data, trim_hint = _parse_car_config_list(modules)

    # Hero: prefer page_banner image
    hero = hero_from_data

    # Fallback: try init_data image
    if not hero and init_data:
        hero = _find_image_in_obj(init_data)

    # Fallback: og:image (but skip share icon)
    if not hero:
        hero = extract_og_image(html)
        if hero and "xpeng-share-icon" in hero:
            hero = None

    # Build trims from extracted headline values
    trims = []
    has_any = any([
        specs.get("range_wltp_km") is not None,
        specs.get("accel_0_100_s") is not None,
        specs.get("dc_charge_10_80_min") is not None,
        specs.get("drivetrain") is not None,
    ])

    if has_any:
        name = "Headline configuration"
        if trim_hint == "AWD":
            name = "Headline configuration (AWD)"

        trims.append({
            "id": "headline",
            "name": name,
            "availability": "Market dependent",
            "specs": {
                "battery_kwh": specs.get("battery_kwh"),
                "range_wltp_km": specs.get("range_wltp_km"),
                "range_cltc_km": specs_meta.get("range_cltc_km"),
                "accel_0_100_s": specs.get("accel_0_100_s"),
                "drivetrain": specs.get("drivetrain"),
                "dc_charge_10_80_min": specs.get("dc_charge_10_80_min"),
            },
            "notes": [
                "WLTP figures shown when provided by OEM page content",
                "Final UK-delivered spec confirmed per VIN and build sheet"
            ]
        })

    out: Dict[str, Any] = {
        "tagline": "Luxury SUV sourcing with end-to-end UK compliance support.",
        "highlights": [
            "Comfort-first positioning for executive travel",
            "Concierge-led sourcing, shipping, IVA preparation, and registration"
        ],
        "images": [],
        "specs": specs,
        "trims": trims,
        "specs_meta": specs_meta
    }

    if hero:
        out["images"].append(hero)

    return out
