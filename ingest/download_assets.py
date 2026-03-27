import json
import os
from pathlib import Path
from urllib.parse import urlparse
import requests

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
MODELS_DIR = SITE / "data" / "models"
ASSETS_DIR = SITE / "assets" / "models"

# Set to true ONLY if you have rights to use the images
ALLOW_OEM_ASSET_DOWNLOAD = False

def safe_filename(url: str) -> str:
    path = urlparse(url).path
    name = os.path.basename(path)
    return name or "image.jpg"

def download(url: str, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(url, timeout=60)
    r.raise_for_status()
    out_path.write_bytes(r.content)

def main():
    if not ALLOW_OEM_ASSET_DOWNLOAD:
        print("OEM asset download disabled. Set ALLOW_OEM_ASSET_DOWNLOAD=True only if licensed.")
        return

    for jf in MODELS_DIR.glob("*.json"):
        data = json.loads(jf.read_text(encoding="utf-8"))
        slug = data["slug"]
        images = data.get("images") or []
        if not images:
            continue

        local_images = []
        for url in images:
            if not url.startswith("http"):
                local_images.append(url)
                continue

            fn = safe_filename(url)
            out = ASSETS_DIR / slug / fn
            download(url, out)
            local_images.append(f"/assets/models/{slug}/{fn}")
            print("Downloaded", url, "->", out)

        data["images"] = local_images
        jf.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print("Updated", jf.name)

if __name__ == "__main__":
    main()
