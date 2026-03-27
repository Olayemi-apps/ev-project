import json
import re
from typing import Any, Dict, Optional 


_NEXT_DATA_RE = re.compile(
    r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE
)

def extract_next_data(html: str) -> Optional[Dict[str, Any]]:
    m = _NEXT_DATA_RE.search(html)
    if not m:
        return None
    raw = m.group(1).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None

def deep_get(d: Dict[str, Any], path: str, default=None):
    cur: Any = d
    for key in path.split("."):
        if isinstance(cur, dict) and key in cur:
            cur = cur[key]
        else:
            return default
    return cur