import json
import re
from typing import Any, Dict, List, Optional

_OG_IMAGE_RE = re.compile(
    r'<meta\s+property=["\']og:image["\']\s+content=["\'](.*?)["\']\s*/?>',
    re.IGNORECASE
)

_LD_JSON_RE = re.compile(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.DOTALL | re.IGNORECASE
)

def extract_og_image(html: str) -> Optional[str]:
    m = _OG_IMAGE_RE.search(html)
    return m.group(1).strip() if m else None

def extract_ld_json_blocks(html: str) -> List[Dict[str, Any]]:
    blocks: List[Dict[str, Any]] = []
    for m in _LD_JSON_RE.finditer(html):
        raw = m.group(1).strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
            # ld+json can be a dict or list
            if isinstance(data, dict):
                blocks.append(data)
            elif isinstance(data, list):
                blocks.extend([x for x in data if isinstance(x, dict)])
        except Exception:
            continue
    return blocks

_TWITTER_IMAGE_RE = re.compile(
    r'<meta\s+name=["\']twitter:image["\']\s+content=["\'](.*?)["\']\s*/?>',
    re.IGNORECASE
)

def extract_twitter_image(html: str) -> Optional[str]:
    m = _TWITTER_IMAGE_RE.search(html)
    return m.group(1).strip() if m else None

