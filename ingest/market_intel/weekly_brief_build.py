# ingest/market_intel/weekly_brief_build.py

import json
from datetime import datetime, timezone
from collections import Counter
import shutil
from pathlib import Path

from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas


# =========================
# HELPERS
# =========================

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


# =========================
# STYLES
# =========================

styles = getSampleStyleSheet()

body_style = ParagraphStyle(
    "Body",
    parent=styles["Normal"],
    fontSize=9,
    leading=12,
    textColor=colors.black
)

small_style = ParagraphStyle(
    "Small",
    parent=styles["Normal"],
    fontSize=8,
    leading=10,
    textColor=colors.grey
)


# =========================
# DRAW FUNCTIONS
# =========================

def draw_header(c, title, subtitle, right_text):
    w, h = A4

    logo_path = Path(__file__).resolve().parents[2] / "site/assets/img/brand/stratum-ev-logo-clean-h48.png"
    if logo_path.exists():
       c.drawImage(
        str(logo_path),
        18 * mm,
        h - 24 * mm,
        width=26 * mm,
        height=8 * mm,
        preserveAspectRatio=True,
        mask='auto'
    )

    c.setFont("Helvetica-Bold", 15)
    c.drawString(52 * mm, h - 22 * mm, f"{title}™")

    c.setFont("Helvetica", 9)
    c.setFillColor(colors.grey)
    c.drawString(50 * mm, h - 30 * mm, subtitle)

    c.setFillColor(colors.black)
    c.setFont("Helvetica", 9)
    c.drawRightString(w - 18 * mm, h - 34 * mm, right_text)

    # 🔥 CLASSIFICATION BAR
    c.setFont("Helvetica-Bold", 7)
    c.setFillColorRGB(0.6, 0.6, 0.6)

    c.drawRightString(
        w - 18 * mm,
        h - 40 * mm,
        "CONFIDENTIAL • STRATUMEV INTELLIGENCE"
    )

    c.setStrokeColor(colors.lightgrey)
    c.line(18 * mm, h - 36 * mm, w - 18 * mm, h - 36 * mm)

def draw_watermark(c, text="StratumEV™ Intelligence"):
    w, h = A4

    c.saveState()

    # Light grey, subtle
    c.setFillColorRGB(0.92, 0.94, 0.97)

    # Large font
    c.setFont("Helvetica-Bold", 60)

    # Rotate for diagonal watermark
    c.translate(w / 2, h / 2)
    c.rotate(45)

    # Centered draw
    c.drawCentredString(0, 0, text)

    c.restoreState()

# ==========================
# FOOTER
# ===========================

def draw_footer(c):
    w, h = A4

    c.setStrokeColor(colors.lightgrey)
    c.setLineWidth(0.5)

    # Divider line
    c.line(18 * mm, 16 * mm, w - 18 * mm, 16 * mm)

    # Left side branding
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.grey)
    c.drawString(18 * mm, 10 * mm, "StratumEV™ Market Intelligence")

    # Center
    c.drawCentredString(w / 2, 10 * mm, "Signal over noise")

    # Right side page number
    page_num = c.getPageNumber()
    c.drawRightString(w - 18 * mm, 10 * mm, f"Page {page_num}")


def draw_kpis(c, y, items):
    x = 18 * mm
    box_w = 42 * mm
    gap = 8 * mm

    for i, (label, value) in enumerate(items):
        bx = x + i * (box_w + gap)

        c.setFillColorRGB(0.95, 0.97, 1)
        c.setStrokeColorRGB(0.15, 0.35, 0.7)
        c.rect(bx, y, box_w, 16 * mm, stroke=1, fill=1)

        c.setFont("Helvetica", 7)
        c.setFillColor(colors.grey)
        c.drawString(bx + 4 * mm, y + 10 * mm, label)

        c.setFont("Helvetica-Bold", 12)
        c.setFillColor(colors.black)
        c.drawString(bx + 4 * mm, y + 4 * mm, str(value))


def draw_exec_panel(c, h, risk, opp, conf, strength):
    c.setFillColorRGB(0.94, 0.96, 1)
    c.setStrokeColorRGB(0.15, 0.35, 0.7)
    c.setLineWidth(0.6)

    c.rect(18 * mm, h - 105 * mm, 170 * mm, 28 * mm, stroke=1, fill=1)

    c.setFont("Helvetica", 8)
    c.setFillColor(colors.grey)
    c.drawString(20 * mm, h - 74 * mm, "KEY TAKEAWAY")

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.black)
    c.drawString(20 * mm, h - 80 * mm, "Executive Signal")

    c.setFont("Helvetica", 9)
   # Structured insight text (multi-line, wrapped)
    insight_text = (
        f"<b>Risk:</b> {risk}<br/>"
        f"<b>Opportunity:</b> {opp}<br/>"
        f"<b>Signal Strength:</b> {strength} ({conf}% confidence)"
    )

    p = Paragraph(insight_text, body_style)
    p.wrapOn(c, 160 * mm, 20 * mm)
    p.drawOn(c, 20 * mm, h - 100 * mm)

def generate_why_it_matters(article):
    cat = article.get("category", "Industry")
    reg = article.get("region", "Global")

    if cat == "Policy":
        return f"Potential regulatory impact in {reg}, with downstream effects on OEM strategy and pricing."

    elif cat == "Charging":
        return f"Signals infrastructure momentum in {reg}, affecting EV adoption rates and network competitiveness."

    elif cat == "Battery":
        return f"Impacts cost curve and supply chain dynamics, critical for OEM margins and scaling."

    elif cat == "OEM":
        return f"Reflects competitive positioning shifts in {reg}, influencing market share trajectory."

    elif cat == "Investment":
        return f"Indicates capital flow direction, highlighting where market confidence is building."

    else:
        return f"Contributes to broader industry narrative shaping across {reg}."
    

def draw_top_stories(c, stories, y_start):
    y = y_start

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.black)
    c.drawString(18 * mm, y, "Top Stories")
    y -= 6 * mm

    c.setStrokeColor(colors.lightgrey)
    c.setLineWidth(0.5)
    c.line(18 * mm, y, 190 * mm, y)
    y -= 8 * mm

    for i, article in enumerate(stories, 1):

        title = article.get("title", "")
        cat = article.get("category", "")
        reg = article.get("region", "")
        src = article.get("source", "")

        line = f"[{cat}, {reg}] {title} ({src})"

        # =========================
        # 🔥 TOP 3 STORIES (WITH INSIGHT)
        # =========================
        if i <= 3:

            # Number
            c.setFont("Helvetica-Bold", 11)
            c.setFillColor(colors.black)
            c.drawString(18 * mm, y, f"{i}")

            # Title (bold)
            p = Paragraph(f"<b>{line}</b>", body_style)
            w, h_text = p.wrap(155 * mm, 30 * mm)
            p.drawOn(c, 28 * mm, y - h_text + 3)

            y -= (h_text + 2 * mm)

            # 🔥 WHY IT MATTERS
            insight = generate_why_it_matters(article)

            p2 = Paragraph(
                f"<font color='#555555'><b>Why it matters:</b> {insight}</font>",
                small_style
            )
            w2, h2 = p2.wrap(155 * mm, 20 * mm)
            p2.drawOn(c, 28 * mm, y - h2)

            y -= (h2 + 4 * mm)

            # Divider
            c.setStrokeColor(colors.grey)
            c.setLineWidth(0.5)
            c.line(28 * mm, y + 2, 190 * mm, y + 2)

            y -= 4 * mm

        # =========================
        # STANDARD STORIES
        # =========================
        else:

            c.setFont("Helvetica", 8)
            c.setFillColor(colors.grey)
            c.drawString(18 * mm, y, f"{i}.")

            p = Paragraph(line, small_style)
            w, h_text = p.wrap(160 * mm, 20 * mm)
            p.drawOn(c, 25 * mm, y - h_text + 2)

            y -= (h_text + 2 * mm)

            c.setStrokeColor(colors.lightgrey)
            c.setLineWidth(0.25)
            c.line(25 * mm, y + 2, 190 * mm, y + 2)

            y -= 2 * mm

    return y


def draw_two_column(c, left_items, right_items):
    w, h = A4

    col_w = 75 * mm
    left_x = 18 * mm
    right_x = 115 * mm

    y_left = h - 60 * mm
    y_right = h - 60 * mm

    c.setFont("Helvetica-Bold", 11)
    c.drawString(left_x, y_left, "Policy Watch")
    c.drawString(right_x, y_right, "Charging Watch")

    y_left -= 8 * mm
    y_right -= 8 * mm

    for item in left_items:
        p = Paragraph(f"• {item}", small_style)
        w, h_text = p.wrap(col_w, 100 * mm)
        p.drawOn(c, left_x, y_left - h_text)
        y_left -= (h_text + 3 * mm)

    for item in right_items:
        p = Paragraph(f"• {item}", small_style)
        w, h_text = p.wrap(col_w, 100 * mm)
        p.drawOn(c, right_x, y_right - h_text)
        y_right -= (h_text + 3 * mm)


# =========================
# MAIN BUILD
# =========================

def build():

    base_dir = Path(__file__).resolve().parents[2]

    data = json.loads((base_dir / "site/data/market-intel.json").read_text(encoding="utf-8"))

    updated = safe_dt(data.get("updated", ""))
    week = iso_week_label(updated)

    articles = sorted(
        [(safe_dt(a.get("published")), a) for a in data.get("articles", [])],
        reverse=True
    )

    kpis = data.get("kpis", {})
    total_7d = kpis.get("total_7d", len(articles))

    cat_counter = Counter(a[1].get("category", "Industry") for a in articles)
    reg_counter = Counter(a[1].get("region", "Global") for a in articles)
    src_counter = Counter(a[1].get("source", "Unknown") for a in articles)

    top_cat = top_n(cat_counter, 1)[0][0]
    top_reg = top_n(reg_counter, 1)[0][0]
    top_src = top_n(src_counter, 1)[0][0]

    brief = data.get("brief", "")

    exec_insight = data.get("executive_insight", {})
    risk = exec_insight.get("risk_factor", "")
    opp = exec_insight.get("opportunity_signal", "")
    conf = exec_insight.get("confidence", 0)
    strength = exec_insight.get("signal_strength", "Low")

    stories = [a[1] for a in articles[:10]]

    policy_watch = [a[1].get("title") for a in articles if a[1].get("category") == "Policy"][:6]
    charging_watch = [a[1].get("title") for a in articles if a[1].get("category") == "Charging"][:6]

    out_dir = base_dir / "site/data/briefs"
    out_dir.mkdir(exist_ok=True, parents=True)

    pdf_path = out_dir / f"Stratum-Weekly-Brief-{week}.pdf"

    c = canvas.Canvas(str(pdf_path), pagesize=A4)

    c.setTitle(f"StratumEV Weekly Market Intelligence Brief - {week}")
    w, h = A4

    draw_watermark(c)

    # PAGE 1
    draw_header(c, "Market Intelligence, Weekly Executive Brief",
                "Stratum EV, curated signals across OEM, policy, charging, and capital.",
                f"Week: {week} | Updated: {updated.strftime('%d %b %Y')}")

    c.setFont("Helvetica-Bold", 12)
    c.drawString(18 * mm, h - 50 * mm, "Executive Summary")

    p = Paragraph(brief, body_style)
    p.wrapOn(c, 170 * mm, 30 * mm)
    p.drawOn(c, 18 * mm, h - 65 * mm)

    draw_exec_panel(c, h, risk, opp, conf, strength)

    draw_kpis(c, h - 140 * mm, [
        ("Stories (7d)", total_7d),
        ("Top Category", top_cat),
        ("Top Region", top_reg),
        ("Top Source", top_src)
    ])

    draw_top_stories(c, stories, h - 155 * mm)

    draw_footer(c)

    # PAGE 2
    c.showPage()

    draw_watermark(c)

    draw_header(c,
        "Market Intelligence, Watchlist & Coverage",
        "Regulatory signals, charging momentum, and category concentration",
        f"Week: {week}"
    )

    draw_two_column(c, policy_watch, charging_watch)

    # 🔥 UPDATED SECTION ONLY
    # =========================
    # CATEGORY DISTRIBUTION (STRUCTURED)
    # =========================

    x = 18 * mm
    y = 135 * mm

    # Divider line for separation
    c.setStrokeColor(colors.lightgrey)
    c.setLineWidth(0.5)
    c.line(18 * mm, y + 6 * mm, 190 * mm, y + 6 * mm)

    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(colors.black)
    c.drawString(x, y, "Category Distribution")

    y -= 10 * mm

    top_cats = top_n(cat_counter, 5)
    max_val = top_cats[0][1] if top_cats else 1

    for cat, val in top_cats:
        bar_w = 110 * mm * (val / max_val)

        # LEFT label
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.black)
        c.drawString(x, y + 1 * mm, cat)

        # Background bar
        c.setFillColorRGB(0.88, 0.88, 0.88)
        c.rect(x + 40 * mm, y, 110 * mm, 3 * mm, stroke=0, fill=1)

        # Foreground bar
        c.setFillColorRGB(0.1, 0.2, 0.7)
        c.rect(x + 40 * mm, y, bar_w, 3 * mm, stroke=0, fill=1)

        # RIGHT value
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(190 * mm, y + 1 * mm, str(val))

        y -= 7 * mm

    # =========================
    # EXECUTIVE INSIGHT PANEL
    # =========================

    panel_y = y - 6 * mm

    c.setFillColorRGB(0.95, 0.97, 1)
    c.setStrokeColorRGB(0.15, 0.35, 0.7)
    c.setLineWidth(0.5)

    c.rect(18 * mm, panel_y - 22 * mm, 170 * mm, 22 * mm, stroke=1, fill=1)

    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(colors.black)
    c.drawString(20 * mm, panel_y - 6 * mm, "Executive Insight")

    insight_text = (
        f"{top_cat} leads coverage this week, with the highest signal concentration in {top_reg}. "
        f"Media influence is led by {top_src}, indicating narrative centralisation. "
        f"Watch for potential spillover effects into adjacent categories over the next cycle."
    )

    p = Paragraph(insight_text, small_style)
    p.wrapOn(c, 165 * mm, 18 * mm)
    p.drawOn(c, 20 * mm, panel_y - 16 * mm)

    draw_footer(c)

    c.save()

    # POINTER FILE
    latest_json = out_dir / "latest.json"
    latest_pdf = out_dir / "latest.pdf"

    pointer = {
        "file": pdf_path.name,
        "week": week,
        "updated": updated.isoformat(),
        "url": f"./data/briefs/{pdf_path.name}",
        "kpis": {
            "total_7d": total_7d,
            "top_cat": top_cat,
            "top_reg": top_reg
        }
    }

    latest_json.write_text(json.dumps(pointer, indent=2), encoding="utf-8")

    try:
        shutil.copyfile(pdf_path, latest_pdf)
    except Exception:
        pass

    print("PDF built:", pdf_path)


if __name__ == "__main__":
    build()