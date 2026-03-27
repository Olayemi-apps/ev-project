import json
from pathlib import Path

snap = json.loads(Path("_snapshots/xpeng-g9.json").read_text(encoding="utf-8"))
html = snap["html"]

def dump_window(label: str, needle: str, radius: int = 4000):
    idx = html.lower().find(needle.lower())
    if idx == -1:
        print(f"{label}: needle not found")
        return
    start = max(0, idx - radius)
    end = min(len(html), idx + radius)
    out = html[start:end]
    Path(f"_snapshots/_xpeng_{label}.html").write_text(out, encoding="utf-8")
    print(f"{label}: wrote _snapshots/_xpeng_{label}.html  (idx={idx})")

dump_window("wltp", "WLTP")
dump_window("kwh", "kWh")
dump_window("spec", "spec")
dump_window("pagedata", "pageData")
