# ingest/market_intel/weekly_brief_build.py
# Stratum EV, Weekly Executive Brief (PDF)
# Input:  site/data/market-intel.json
# Output: site/data/briefs/Stratum-Weekly-Brief-YYYY-Www.pdf

import json
from datetime import datetime, timezone
from collections import Counter
import shutil

from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas


def iso_week_label(dt: datetime) -> str:
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def safe_dt(iso_str: str) -> datetime:
    try:
        d = datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d
    except Exception:
        return datetime.now(timezone.utc)


def top_n(counter: Counter, n: int):
    return counter.most_common(n)


def draw_header(c: canvas.Canvas, title: str, subtitle: str, right_text: str):
    w, h = A4
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(18 * mm, h - 22 * mm, title)

    c.setFont("Helvetica", 10)
    c.setFillColor(colors.grey)
    c.drawString(18 * mm, h - 28 * mm, subtitle)

    c.setFillColor(colors.black)
    c.setFont("Helvetica", 10)
    c.drawRightString(w - 18 * mm, h - 22 * mm, right_text)

    # Divider line
    c.setStrokeColor(colors.lightgrey)
    c.setLineWidth(1)
    c.line(18 * mm, h - 32 * mm, w - 18 * mm, h - 32 * mm)


def draw_kpi_row(c: canvas.Canvas, x: float, y: float, items):
    """
    items: list of (label, value)
    """
    box_w = 44 * mm
    box_h = 18 * mm
    gap = 6 * mm

    for i, (label, value) in enumerate(items):
        bx = x + i * (box_w + gap)
        by = y

        c.setStrokeColor(colors.lightgrey)
        c.setFillColor(colors.whitesmoke)
        c.rect(bx, by, box_w, box_h, stroke=1, fill=1)

        c.setFillColor(colors.black)
        c.setFont("Helvetica", 8)
        c.drawString(bx + 4 * mm, by + 12 * mm, label)

        c.setFont("Helvetica-Bold", 12)
        c.drawString(bx + 4 * mm, by + 4 * mm, str(value))


def draw_bullets(c: canvas.Canvas, x: float, y: float, title: str, bullets, max_lines=10):
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x, y, title)

    c.setFont("Helvetica", 9)
    y2 = y - 6 * mm

    count = 0
    for b in bullets:
        if count >= max_lines:
            break
        # Simple wrap
        text = b.strip()
        if len(text) > 110:
            text = text[:107] + "..."
        c.drawString(x, y2, f"• {text}")
        y2 -= 5 * mm
        count += 1

    return y2


def build():
    script_dir = Path(__file__).resolve().parent
    base_dir = script_dir.parents[1]  # EV/

    in_json = base_dir / "site" / "data" / "market-intel.json"
    out_dir = base_dir / "site" / "data" / "briefs"
    out_dir.mkdir(parents=True, exist_ok=True)

    if not in_json.exists():
        raise FileNotFoundError(f"Missing input JSON: {in_json}")

    data = json.loads(in_json.read_text(encoding="utf-8"))

    updated = safe_dt(data.get("updated", ""))
    week = iso_week_label(updated)

    articles = data.get("articles", []) or []
    # Keep only the last 7 days by published date, fallback to all if parsing fails
    week_articles = []
    for a in articles:
        d = safe_dt(a.get("published", ""))
        week_articles.append((d, a))
    week_articles.sort(key=lambda t: t[0], reverse=True)

    # Derive KPIs from last 7 days in the JSON itself
    # If your JSON already has kpis.total_7d, we prefer it
    kpis = data.get("kpis", {}) or {}
    total_7d = kpis.get("total_7d")
    if total_7d is None:
        total_7d = min(len(week_articles), 60)

    # Category and region distributions
    cat_counter = Counter()
    reg_counter = Counter()
    src_counter = Counter()

    for _, a in week_articles:
        cat_counter[a.get("category", "Industry")] += 1
        reg_counter[a.get("region", "Global")] += 1
        src_counter[a.get("source", "Unknown")] += 1

    top_cat = top_n(cat_counter, 1)[0][0] if cat_counter else "Industry"
    top_reg = top_n(reg_counter, 1)[0][0] if reg_counter else "Global"
    top_src = top_n(src_counter, 1)[0][0] if src_counter else "Unknown"

    brief_text = data.get("brief") or (
        f"This week’s signal: {top_cat} dominated coverage, with the highest concentration in {top_reg}."
    )

    # Select Top Stories with an executive bias (same priority idea as your UI)
    priority = {"Policy": 5, "Charging": 4, "Investment": 4, "Battery": 3, "OEM": 3, "Industry": 2}

    def story_score(a):
        return (priority.get(a.get("category", "Industry"), 1), a.get("published", ""))

    top_stories = [a for _, a in week_articles]
    top_stories.sort(key=story_score, reverse=True)
    top_stories = top_stories[:10]

    # Watchlists
    def latest_by_category(cat, n=5):
        out = []
        for _, a in week_articles:
            if a.get("category") == cat:
                out.append(a)
            if len(out) >= n:
                break
        return out

    policy_watch = latest_by_category("Policy", 5)
    charging_watch = latest_by_category("Charging", 5)

    # Output name
    stamp = updated.strftime("%Y%m%d-%H%M")
    out_pdf = out_dir / f"Stratum-Weekly-Brief-{week}-{stamp}.pdf"
    latest_json = out_dir / "latest.json"
    latest_pdf = out_dir / "latest.pdf"


    c = canvas.Canvas(str(out_pdf), pagesize=A4)
    w, h = A4

    # Page 1
    draw_header(
        c,
        title="Market Intelligence, Weekly Executive Brief",
        subtitle="Stratum EV, curated signals across OEM, policy, charging, and capital.",
        right_text=f"Week: {week}  |  Updated: {updated.strftime('%d %b %Y')}"
    )

    # Brief block
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, h - 46 * mm, "Executive Summary")

    c.setFont("Helvetica", 10)
    c.setFillColor(colors.darkslategray)
    summary = brief_text.strip()
    if len(summary) > 260:
        summary = summary[:257] + "..."
    c.drawString(18 * mm, h - 54 * mm, summary)

    # KPIs
    draw_kpi_row(
        c,
        x=18 * mm,
        y=h - 78 * mm,
        items=[
            ("Stories, last 7 days", total_7d),
            ("Top Category", top_cat),
            ("Top Region", top_reg),
            ("Top Source", top_src),
        ]
    )

    # Top stories list
    y = h - 92 * mm
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(18 * mm, y, "Top Stories")
    y -= 6 * mm

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.black)
    for i, a in enumerate(top_stories, start=1):
        title = (a.get("title") or "").strip()
        src = (a.get("source") or "Unknown").strip()
        cat = (a.get("category") or "Industry").strip()
        reg = (a.get("region") or "Global").strip()

        line = f"{i}. [{cat}, {reg}] {title} ({src})"
        if len(line) > 120:
            line = line[:117] + "..."

        c.drawString(18 * mm, y, line)
        y -= 5 * mm

        if y < 22 * mm:
            c.showPage()
            draw_header(
                c,
                title="Market Intelligence, Weekly Executive Brief",
                subtitle="Stratum EV, weekly intelligence continuation.",
                right_text=f"Week: {week}"
            )
            y = h - 44 * mm

    # Page 2: Watchlists + category distribution
    c.showPage()
    draw_header(
        c,
        title="Watchlists and Coverage",
        subtitle="Fast scan sections for policy, charging, and category focus.",
        right_text=f"Week: {week}"
    )

    y_left = h - 44 * mm
    y_left = draw_bullets(
        c,
        x=18 * mm,
        y=y_left,
        title="Policy Watch",
        bullets=[f"{a.get('title','').strip()} ({a.get('source','')})" for a in policy_watch] or ["No policy items detected this week."],
        max_lines=9
    )

    y_left -= 6 * mm
    y_left = draw_bullets(
        c,
        x=18 * mm,
        y=y_left,
        title="Charging Watch",
        bullets=[f"{a.get('title','').strip()} ({a.get('source','')})" for a in charging_watch] or ["No charging items detected this week."],
        max_lines=9
    )

    # Right side, simple category distribution bars
    x_right = 112 * mm
    y_right = h - 44 * mm

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.black)
    c.drawString(x_right, y_right, "Coverage by Category")
    y_right -= 8 * mm

    top_cats = top_n(cat_counter, 8)
    max_val = top_cats[0][1] if top_cats else 1

    for cat, val in top_cats:
        bar_w = 70 * mm * (val / max_val if max_val else 0)
        c.setFillColor(colors.lightgrey)
        c.rect(x_right, y_right - 2 * mm, 70 * mm, 4 * mm, stroke=0, fill=1)
        c.setFillColor(colors.darkblue)
        c.rect(x_right, y_right - 2 * mm, bar_w, 4 * mm, stroke=0, fill=1)

        c.setFillColor(colors.black)
        c.setFont("Helvetica", 9)
        c.drawString(x_right, y_right + 3 * mm, f"{cat}: {val}")
        y_right -= 8 * mm

    # Footer note
    c.setFillColor(colors.grey)
    c.setFont("Helvetica", 8)
    c.drawString(18 * mm, 14 * mm, "Stratum EV, Weekly Brief. Sources aggregated from configured feeds, for informational use.")
    c.save()

    # Write a pointer file for the frontend
    pointer = {
        "file": out_pdf.name,
        "week": week,
        "updated": updated.isoformat(),
        "url": f"./data/briefs/{out_pdf.name}"
    }
    latest_json.write_text(json.dumps(pointer, indent=2), encoding="utf-8")

    # Optional: also maintain a stable latest.pdf for easy sharing
    try:
        shutil.copyfile(out_pdf, latest_pdf)
    except Exception:
        pass

    print(f"Wrote PDF: {out_pdf}")


if __name__ == "__main__":
    build()
