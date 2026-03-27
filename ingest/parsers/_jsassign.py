import json
import re
from typing import Any, Dict, List, Optional

# Captures: window.__INITIAL_DATA__ = { ... };
# Non-greedy up to the first ";"
_JS_ASSIGN_RE = re.compile(
    r'window\.__INITIAL_DATA__\s*=\s*(\{.*?\})\s*;',
    re.DOTALL | re.IGNORECASE
)

def extract_window_initial_data(html: str) -> Optional[Dict[str, Any]]:
    m = _JS_ASSIGN_RE.search(html)
    if not m:
        return None

    raw = m.group(1)

    # The blob contains escaped sequences like \u002F which JSON can parse fine.
    try:
        return json.loads(raw)
    except Exception:
        return None
    
_PAGEDATA_RE = re.compile(
    r'pageData"\s*:\s*\{\s*"data"\s*:\s*"(.+?)"\s*\}\s*,',
    re.DOTALL
)

def _find_after(haystack: str, needle: str, start: int = 0) -> int:
    idx = haystack.find(needle, start)
    return idx if idx != -1 else -1

def _extract_json_string_value(s: str, start_quote_idx: int) -> Optional[str]:
    """
    Given s and the index of the opening quote of a JSON string,
    return the decoded Python string value, handling escapes.
    """
    if start_quote_idx < 0 or start_quote_idx >= len(s) or s[start_quote_idx] != '"':
        return None

    # Find the end quote, respecting escapes
    i = start_quote_idx + 1
    escaped = False
    while i < len(s):
        ch = s[i]
        if escaped:
            escaped = False
        else:
            if ch == '\\':
                escaped = True
            elif ch == '"':
                raw = s[start_quote_idx:i+1]  # includes quotes
                try:
                    return json.loads(raw)     # decode escapes
                except Exception:
                    return None
        i += 1
    return None


def extract_pagedata_modules(html: str) -> Optional[List[Dict[str, Any]]]:
    """
    XPeng embeds page data roughly like:
      ... pageData":{"data":"[{\\"module\\": ... }]", ...}
    This function scans and extracts the pageData.data string safely, then parses it.
    """
    # 1) Find "pageData" occurrence
    idx = html.find("pageData")
    if idx == -1:
        return None

    # 2) From there, find the "data" key (allow for escaped quotes in between)
    # We'll search forward for the substring '"data"' (unescaped) first, then a fallback for '\\"data\\"'
    data_key_idx = _find_after(html, '"data"', idx)
    if data_key_idx == -1:
        data_key_idx = _find_after(html, '\\"data\\"', idx)
    if data_key_idx == -1:
        return None

    # 3) Find the colon after the data key
    colon_idx = html.find(":", data_key_idx)
    if colon_idx == -1:
        return None

    # 4) Find the opening quote of the string value after the colon
    # Skip whitespace
    j = colon_idx + 1
    while j < len(html) and html[j] in " \t\r\n":
        j += 1

    # Sometimes the quote is escaped (\"), handle both
    if j < len(html) and html[j] == "\\" and j + 1 < len(html) and html[j+1] == '"':
        # value starts at the quote after backslash, but it's part of an escaped quote in the raw HTML,
        # so we need to treat it as a literal quote for decoding by json.loads.
        # Build a synthetic JSON string starting here by replacing \" with "
        # Easiest: step forward to the actual quote char and decode using a small slice later.
        j = j + 1

    if j >= len(html) or html[j] != '"':
        return None

    # 5) Decode the JSON string value
    decoded_str = _extract_json_string_value(html, j)
    if not decoded_str:
        return None

    # 6) decoded_str itself is JSON (a list of modules)
    try:
        modules = json.loads(decoded_str)
        if isinstance(modules, list):
            return modules
        return None
    except Exception:
        return None


