import json
import re
from typing import Any, Dict, Optional

_NUXT_ASSIGN_RE = re.compile(
    r'window\.__NUXT__\s*=\s*(\{.*?\})\s*;',
    re.DOTALL | re.IGNORECASE
)

def extract_nuxt_state(html: str) -> Optional[Dict[str, Any]]:
    """
    Extracts window.__NUXT__ if it is assigned as plain JSON object.
    If Zeekr uses a function wrapper, this will return None and we will fallback.
    """
    m = _NUXT_ASSIGN_RE.search(html)
    if not m:
        return None
    raw = m.group(1)
    try:
        return json.loads(raw)
    except Exception:
        return None
