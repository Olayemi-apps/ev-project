import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "site" / "data" / "models"
INDEX_PATH = MODELS_DIR / "index.json"

print("MODELS_DIR:", MODELS_DIR)

all_models = []
required = ["slug", "brand", "model"]

for file in MODELS_DIR.iterdir():

    if file.suffix != ".json":
        continue

    if file.name in ["index.json", "featured.json", "market-intel.json"]:
        continue

    try:
        with open(file, "r", encoding="utf-8") as f:
            model_data = json.load(f)

        # ✅ Required field validation
        missing = False
        for field in required:
            if not model_data.get(field):
                print(f"Missing {field} in {file.name}")
                missing = True

        if missing:
            continue

        # ✅ Derived fields
        model_data["last_checked"] = datetime.utcnow().isoformat()

        specs = model_data.get("specs", {})
        range_km = specs.get("range_wltp_km")

        if range_km:
            model_data["range_miles"] = round(range_km * 0.621)

        # ✅ Image handling
        images = model_data.get("images") or []
        image = images[0] if images else None

        # ✅ Append cleaned model
        all_models.append({
            "slug": model_data.get("slug"),
            "brand": model_data.get("brand"),
            "model": model_data.get("model"),
            "category": model_data.get("category"),
            "tagline": model_data.get("tagline"),
            "image": image,
            "specs": specs,
            "range_miles": model_data.get("range_miles"),
            "last_checked": model_data.get("last_checked")
        })

    except Exception as e:
        print(f"Error reading {file.name}: {e}")

# ✅ Duplicate + missing slug check
slugs = set()

for model in all_models:
    if not model["slug"]:
        print("Missing slug:", model)

    if model["slug"] in slugs:
        print("Duplicate slug:", model["slug"])

    slugs.add(model["slug"])

# ✅ Sort for UI consistency
all_models.sort(key=lambda x: (x.get("brand") or "", x.get("model") or ""))

# ✅ Write index
with open(INDEX_PATH, "w", encoding="utf-8") as f:
    json.dump({"models": all_models}, f, indent=2)

print(f"Rebuilt index.json with {len(all_models)} models")

import subprocess

# Generate sitemap after models update
subprocess.run(["python", "ingest/generate_sitemap.py"])