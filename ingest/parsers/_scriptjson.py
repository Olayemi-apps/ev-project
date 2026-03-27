import json
import re
from typing import Any, Dict, List, Optional

_SCRIPT_RE = re.compile(r"<script[^>]*>(.*?)</script>", re.DOTALL | re.IGNORECASE)

def iter_script_contents(html: str) -> List[str]:
    return [m.group(1).strip() for m in _SCRIPT_RE.finditer(html) if m.group(1).strip()]

def try_parse_json(text: str) -> Optional[Any]:
    text = text.strip()
    if not text:
        return None
    # Pure JSON only, ignore JS like "window.__xxx = ..."
    if not (text.startswith("{") or text.startswith("[")):
        return None
    try:
        return json.loads(text)
    except Exception:
        return None

def find_objects_with_keywords(obj: Any, keywords: List[str], found: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    if found is None:
        found = []
    kw = [k.lower() for k in keywords]

    if isinstance(obj, dict):
        blob = json.dumps(obj, ensure_ascii=False).lower()
        if any(k in blob for k in kw):
            found.append(obj)
        for v in obj.values():
            find_objects_with_keywords(v, keywords, found)

    elif isinstance(obj, list):
        for item in obj:
            find_objects_with_keywords(item, keywords, found)

    return found
