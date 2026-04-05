import json
from datetime import datetime
from pathlib import Path

# === PATHS ===
BASE_URL = "https://stratumev.com"
MODELS_PATH = Path("site/data/models/index.json")
OUTPUT_PATH = Path("site/sitemap.xml")

# === STATIC PAGES ===
STATIC_PAGES = [
    "",
    "about.html",
    "services.html",
    "market-intelligence.html",
    "featured.html",
    "store.html",
    "compare.html",
    "contact.html",
    "model.html",
    "story.html",
    "uk-compliance-led-sourcing.html",
    "ev-evolution.html",
    "ev-history.html",
    "innovation.html"
]

def generate_sitemap():
    today = datetime.utcnow().date().isoformat()

    urls = []

    # === STATIC URLS ===
    for page in STATIC_PAGES:
        loc = f"{BASE_URL}/{page}" if page else BASE_URL
        urls.append(f"""
  <url>
    <loc>{loc}</loc>
    <lastmod>{today}</lastmod>
    <priority>0.8</priority>
  </url>""")

    # === MODEL URLS ===
    if MODELS_PATH.exists():
        with open(MODELS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        for model in data.get("models", []):
            slug = model.get("slug")
            if not slug:
                continue

            url = f"{BASE_URL}/model.html?slug={slug}"

            urls.append(f"""
  <url>
    <loc>{url}</loc>
    <lastmod>{today}</lastmod>
    <priority>0.9</priority>
  </url>""")

    # === BUILD XML ===
    sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{''.join(urls)}
</urlset>
"""

    # === WRITE FILE ===
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(sitemap)

    print(f"✅ sitemap.xml generated at {OUTPUT_PATH}")


if __name__ == "__main__":
    generate_sitemap()