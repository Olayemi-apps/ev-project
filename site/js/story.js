function stripImages(html) {
  if (!html) return "";
  return html
    .replace(/<img[^>]*>/gi, "")
    .replace(/<div class="feat-image">[\s\S]*?<\/div>/gi, "");
}

function estimateReadingTime(text){
  if(!text) return 1;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  return minutes < 1 ? 1 : minutes;
}

function toneLabel(bias){
  if(bias === "risk") return { label: "Risk", className: "tone-risk" };
  if(bias === "opportunity") return { label: "Positive", className: "tone-positive" };
  return { label: "Neutral", className: "tone-neutral" };
}

async function loadArticle() {

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if(!id) return;

  document.body.classList.add("mi-loading");

  const res = await fetch("./data/market-intel.json", { cache:"no-store" });
  const data = await res.json();

  document.body.classList.remove("mi-loading");

  const rows = data.articles || data.stories || data.items || [];
  const story = rows.find(s => String(s.id) === String(id));
  if(!story) return;

  story.analysis = story.analysis || {};

  document.getElementById("articleTitle").textContent = story.title;

  const tone = toneLabel(story.signal_sentiment?.label);
  const confidence = story.signal_sentiment?.confidence || 50;

  const toneEl = document.getElementById("articleTone");
  if (toneEl) {
    toneEl.textContent = tone.label;
    toneEl.className = `mi-tone-badge ${tone.className}`;
  }

  const readingTime = estimateReadingTime(
    (story.summary || "") +
    " " +
    (story.analysis?.executive_summary || "") +
    " " +
    (story.analysis?.market_implication || "") +
    " " +
    (story.analysis?.capital_signal || "") +
    " " +
    (story.analysis?.strategic_impact || "")
  );

  document.getElementById("articleMeta").innerHTML = `
    <span>${story.category || ""}</span>
    <span>${story.region || ""}</span>
    <span>${story.source || ""}</span>
    <span>${story.published ? new Date(story.published).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }) : ""}</span>
    <span>${readingTime} min read</span>
    <span class="mi-tone-badge ${tone.className}">
      ${tone.label} · ${confidence}% confidence
    </span>
  `;

  const hasImage = story.image && story.image.trim() !== "";

  const hasAnalysis = story.analysis &&
    (
      story.analysis.executive_summary ||
      story.analysis.market_implication ||
      story.analysis.capital_signal ||
      story.analysis.strategic_impact
    );

  document.getElementById("articleBody").innerHTML = `

    ${hasImage ? `
      <div class="feat-image">
        <img src="${story.image}" alt="">
      </div>
    ` : ""}

    <p class="mi-article-summary">
      ${story.summary || ""}
    </p>

    ${hasAnalysis ? `

      ${story.analysis.executive_summary ? `
        <div class="mi-article-section">
          <h3>Executive Summary</h3>
          <p>${stripImages(story.analysis.executive_summary)}</p>
        </div>
      ` : ""}

      ${story.analysis.market_implication ? `
        <div class="mi-article-section">
          <h3>Market Implication</h3>
          <p>${story.analysis.market_implication}</p>
        </div>
      ` : ""}

      ${story.analysis.capital_signal ? `
        <div class="mi-article-section">
          <h3>Capital Signal</h3>
          <p>${story.analysis.capital_signal}</p>
        </div>
      ` : ""}

      ${story.analysis.strategic_impact ? `
        <div class="mi-article-section">
          <h3>Strategic Impact</h3>
          <p>${story.analysis.strategic_impact}</p>
        </div>
      ` : ""}

    ` : ""}

  `;

  document.getElementById("articleSource").innerHTML = `
    ${
      story.link
        ? `<a class="mi-btn mi-source-btn"
            href="${story.link}"
            target="_blank"
            rel="noopener noreferrer">
            View Original Source ↗
          </a>`
        : ""
    }
  `;

  // =========================
  // PDF Export (Now In Scope)
  // =========================

  const exportBtn = document.getElementById("exportBriefBtn");

  if (exportBtn) {

    exportBtn.onclick = () => {

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 18;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 24, "F");

      const img = new Image();
      img.src = "./assets/img/brand/stratum-ev-logo-clean-h48.png";

      // 🔥 THIS IS WHERE YOUR NEW BLOCK GOES
      img.onload = function () {

        doc.addImage(img, "PNG", margin, 6, 42, 12);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");

        doc.text(
          "MARKET INTELLIGENCE BRIEF",
          pageWidth - margin,
          14,
          { align: "right" }
        );

        // Reset text color
        doc.setTextColor(0, 0, 0);

        let y = 34;

        doc.setFontSize(16);
        doc.setFont(undefined, "bold");

        const titleLines = doc.splitTextToSize(story.title, pageWidth - margin * 2);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 8;

        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.text(
          `Tone: ${(story.signal_sentiment?.label || "neutral").toUpperCase()}`,
          margin,
          y
        );
        y += 10;

        doc.setDrawColor(200);
        doc.line(margin, y, pageWidth - margin, y);
        y += 12;

        const addSection = (heading, content) => {
          if (!content) return;

          if (y > pageHeight - 30) {
            doc.addPage();
            y = 20;
          }

          doc.setFontSize(12);
          doc.setFont(undefined, "bold");
          doc.text(heading.toUpperCase(), margin, y);
          y += 8;

          doc.setFontSize(10);
          doc.setFont(undefined, "normal");

          const lines = doc.splitTextToSize(content, pageWidth - margin * 2);
          doc.text(lines, margin, y);
          y += lines.length * 6 + 10;
        };

        addSection("Executive Summary", story.analysis?.executive_summary);
        addSection("Market Implication", story.analysis?.market_implication);
        addSection("Capital Signal", story.analysis?.capital_signal);
        addSection("Strategic Impact", story.analysis?.strategic_impact);

        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          `Generated by Stratum EV Intelligence Platform · ${new Date().toLocaleString()}`,
          margin,
          pageHeight - 10
        );

        doc.save(`${story.id}-executive-brief.pdf`);
      };

    };
  }

  // =========================
  // Related Signals
  // =========================

  const relatedHost = document.getElementById("relatedSignals");

  if (relatedHost && rows.length > 1) {

    const related = rows
      .filter(r => r.id !== story.id)
      .map(r => {
        let score = 0;
        if (r.category === story.category) score += 2;
        if (r.region === story.region) score += 1;
        score += (r.stratum_impact_index || 0) / 10;
        return { ...r, _relScore: score };
      })
      .sort((a, b) => b._relScore - a._relScore)
      .slice(0, 4);

    relatedHost.innerHTML = related.map(r => {

      const tone = toneLabel(r.signal_sentiment?.label);

      return `
        <a class="mi-related-card"
          href="story.html?id=${encodeURIComponent(r.id)}"
          data-related-id="${r.id}">
          <div class="mi-related-content">
            <div class="mi-related-meta">
              <span>${r.category}</span>
              <span>${r.region}</span>
              <span class="mi-tone-mini ${tone.className}">
                ${tone.label}
              </span>
            </div>
            <div class="mi-related-title-text">
              ${r.title}
            </div>
          </div>
        </a>
      `;
    }).join("");
  }

}

loadArticle();