import requests
import random
import time

UA_POOL = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]

def fetch(url: str) -> str:
    headers = {
        "User-Agent": random.choice(UA_POOL),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }
    time.sleep(random.uniform(1.2, 2.8))
    r = requests.get(url, headers=headers, timeout=30)
    text = r.text or ""
    mid = len(text) // 2
    snippet = text[max(0, mid-200):mid+200].replace("\n", " ")[:500]

    print(f"[fetch] {url}")
    print(f"  status={r.status_code} len={len(text)}")
    print(f"  snippet={snippet!r}")
    r.raise_for_status()
    return text
