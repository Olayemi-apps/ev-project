import json
import importlib
from datetime import date
from pathlib import Path

from playwright.sync_api import sync_playwright

from .sources import SOURCES

ROOT = Path(__file__).resolve().parents[1]
SITE_DATA = ROOT / "site" / "data" / "models"
SNAP_DIR = ROOT / "ingest" / "_snapshots"

SITE_DATA.mkdir(parents=True, exist_ok=True)
SNAP_DIR.mkdir(parents=True, exist_ok=True)


def render_page(url: str) -> dict:
    from playwright.sync_api import sync_playwright

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            page.goto(url, wait_until="domcontentloaded", timeout=60000)

            html = page.content()
            text = page.inner_text("body")

            browser.close()

            return {"html": html, "text": text}

    except Exception as e:
        print(f"⚠️ Failed to load {url}: {e}")
        return None


def load_parser(name: str):
    # Parsers live in ingest/parsers/
    return importlib.import_module(f"ingest.parsers.{name}")


def base_model_json(src: dict) -> dict:
    return {
        "slug": src["slug"],
        "brand": src["brand"],
        "model": src["model"],
        "category": src["category"],
        "tagline": "",
        "highlights": [],
        "uk_readiness": {"iva_risk": "TBC", "notes": []},
        "specs": {
            "drivetrain": None,
            "battery_kwh": None,
            "range_wltp_km": None,
            "accel_0_100_s": None,
            "dc_charge_10_80_min": None,
        },
        "images": [],
        "source": {
            "official_url": src["official_url"],
            "last_checked": str(date.today()),
        },
    }


def main():
    manifest = []

    for src in SOURCES:
        print(f"Fetching: {src['slug']} from {src['official_url']}")
        snap = render_page(src["official_url"])

        if not snap:
            print(f"Skipping {src['name']} due to load failure")
            continue

        # Debug block kept for future use
        # if src["slug"] == "zeekr-001":
        #     t = (snap["text"] or "")
        #     h = (snap["html"] or "")
        #     print("[zeekr debug] text_len:", len(t), "html_len:", len(h))
        #     for needle in ["WLTP", "kWh", "0-100", "10 to 80", "Charging", "km"]:
        #         print(f"[zeekr debug] contains {needle!r} in text:", needle.lower() in t.lower())
        #         print(f"[zeekr debug] contains {needle!r} in html:", needle.lower() in h.lower())

        snap_path = SNAP_DIR / f"{src['slug']}.json"
        snap_path.write_text(
            json.dumps(
                {
                    "url": src["official_url"],
                    "fetched_on": str(date.today()),
                    "html": snap["html"],
                    "text": snap["text"],
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        parser = load_parser(src["parser"])
        model = base_model_json(src)

        parsed = parser.parse(snap["html"], snap["text"])
        for k, v in parsed.items():
            if v is None:
                continue
            model[k] = v

        out_path = SITE_DATA / f"{src['slug']}.json"
        out_path.write_text(
            json.dumps(model, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"Wrote: {out_path}")

        # Add to manifest after model is final
        manifest.append(
            {
                "slug": model["slug"],
                "brand": model["brand"],
                "model": model["model"],
                "category": model["category"],
                "tagline": model.get("tagline", ""),
                "image": (model.get("images") or [None])[0],
                "specs": model.get("specs", {}),
                "last_checked": model.get("source", {}).get("last_checked"),
            }
        )

    # Write manifest once
    index_path = SITE_DATA / "index.json"
    index_path.write_text(
        json.dumps({"models": manifest}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote: {index_path}")


if __name__ == "__main__":
    main()
