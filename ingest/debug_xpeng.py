import json
import re
from pathlib import Path

snap = json.loads(Path("_snapshots/xpeng-g9.json").read_text(encoding="utf-8"))
html = snap["html"]

needles = [
    "__NEXT_DATA__",
    "__NUXT__",
    "__INITIAL_STATE__",
    "window.__",
    "pageProps",
    "pageData",
    "apollo",
    "graphql",
    "spec",
    "battery",
    "kWh",
    "WLTP",
    "CLTC",
    "range",
    "acceleration",
]

print("HTML length:", len(html))

for n in needles:
    idx = html.lower().find(n.lower())
    print(f"{n:18}:", "FOUND at" if idx != -1 else "not found", idx if idx != -1 else "")

# If we find window.__SOMETHING__ = { ... }, show a nearby snippet
m = re.search(r"window\.__[A-Z0-9_]+\s*=\s*\{", html)
if m:
    start = max(0, m.start() - 200)
    end = min(len(html), m.start() + 1200)
    print("\n--- window.__* assignment snippet ---\n")
    print(html[start:end])

# If we find __NUXT__ = { ... }
m2 = re.search(r"__NUXT__\s*=\s*\{", html)
if m2:
    start = max(0, m2.start() - 200)
    end = min(len(html), m2.start() + 1200)
    print("\n--- __NUXT__ snippet ---\n")
    print(html[start:end])

# List external JS files referenced (sometimes data is in those bundles)
scripts = re.findall(r'<script[^>]+src="([^"]+)"', html, flags=re.IGNORECASE)
print("\nScript src count:", len(scripts))
for s in scripts[:20]:
    print(" -", s)
