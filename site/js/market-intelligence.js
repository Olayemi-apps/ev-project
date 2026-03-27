function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "";
  }
}

document.querySelectorAll(".mi-density-toggle").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".mi-density-toggle")
      .forEach(b=>b.classList.remove("active"));

    btn.classList.add("active");

    const mode = btn.dataset.density;
    document.getElementById("mi-stream")
      .classList.toggle("expanded", mode==="expanded");
  });
});

document.getElementById("streamTopBtn")
?.addEventListener("click",()=>{
  document.getElementById("mi-stream").scrollTo({
    top:0,
    behavior:"smooth"
  });
});

async function wireLatestBrief() {
  const a = document.getElementById("mi-brief-download");
  const meta = document.getElementById("mi-brief-meta");

  try {
    const res = await fetch("./data/briefs/latest.json", { cache: "no-store" });
    if (!res.ok) return null; // fallback is latest.pdf

    const p = await res.json();

    if (a && p && p.url) a.href = p.url;
    if (meta && p.week) meta.textContent = `Week: ${p.week}`;

    return p;
  } catch {
    return null;
  }
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

function scoreTopStory(a) {

  if (!a) return 0;

  const categoryWeight = {
    Policy: 5,
    Investment: 5,
    Capital: 5,
    Charging: 4,
    Battery: 4,
    OEM: 3,
    Industry: 2
  };

  const base = categoryWeight[a.category] || 1;

  // Recency boost
  const now = new Date();
  const published = new Date(a.published);
  const ageHours = (now - published) / (1000 * 60 * 60);
  const recencyBoost = ageHours < 24 ? 3 : ageHours < 72 ? 1.5 : 0;

  // Impact keywords
  const text = ((a.title || "") + " " + (a.summary || "")).toLowerCase();
  const impactWords = [
    "ban","ipo","merger","acquisition","funding",
    "recall","tariff","subsidy","gigafactory",
    "lawsuit","crackdown","approval"
  ];

  const impactScore = impactWords.filter(k => text.includes(k)).length * 2;

  return base + recencyBoost + impactScore;
}

function renderKpis(kpis) {
  const container = document.getElementById("mi-kpis");
  if (!container) return;

  const total = kpis.total_7d ?? 0;
  const delta = kpis.total_7d_delta ?? 0;

  const topCat = Object.entries(kpis.by_category_7d || {}).sort((a,b) => b[1]-a[1])[0];
  const topReg = Object.entries(kpis.by_region_7d || {}).sort((a,b) => b[1]-a[1])[0];
  const topSrc = Object.entries(kpis.top_sources_7d || {}).sort((a,b) => b[1]-a[1])[0];

  const maxStories = Math.max(
    total,
    topCat?.[1] || 0,
    topReg?.[1] || 0,
    topSrc?.[1] || 0,
    1
  );

  const cards = [
    { label: "Stories, last 7 days", value: total, sub: `${delta >= 0 ? "+" : ""}${delta} vs prior 7 days`, count: total },
    { label: "Top Category", value: topCat ? topCat[0] : "TBC", sub: topCat ? `${topCat[1]} stories` : "", count: topCat?.[1] || 0 },
    { label: "Top Region", value: topReg ? topReg[0] : "TBC", sub: topReg ? `${topReg[1]} stories` : "", count: topReg?.[1] || 0 },
    { label: "Top Source", value: topSrc ? topSrc[0] : "TBC", sub: topSrc ? `${topSrc[1]} stories` : "", count: topSrc?.[1] || 0 }
  ];

  container.innerHTML = "";

  cards.forEach(c => {
    const width = (c.count / maxStories) * 100;

    container.appendChild(el(`
      <div class="mi-kpi">
        <div class="label">${c.label}</div>
        <div class="value ${c.count === total && delta > 0 ? "up" : delta < 0 ? "down" : ""}">
          ${c.value}
        </div>
        <div class="delta">${c.sub}</div>
        <div class="mi-kpi__bar">
          <span style="width:${width}%"></span>
        </div>
      </div>
    `));
  });
}

function renderBrief(data) {

  const updated = data?.updated;
  const brief = data?.brief;

  const u = document.getElementById("mi-updated");
  if (u && updated) {
    u.textContent =
      `Updated ${fmtDate(updated)}: live executive briefing and signals across OEM, policy, charging, and capital.`;
  }

  const briefText = document.getElementById("mi-brief-text");
  const briefDate = document.getElementById("mi-brief-date");

  if (briefText) {
    briefText.textContent =
      brief || "No brief available yet, refresh ingest output.";
  }

  if (briefDate && updated) {
    briefDate.textContent = fmtDate(updated);
  }

  // Executive Insight injection
  if (data.executive_insight) {
    const riskEl = document.getElementById("miRiskText");
    const oppEl = document.getElementById("miOpportunityText");

    if (riskEl) {
      riskEl.textContent =
        data.executive_insight?.risk_factor || "No systemic risk signals detected this cycle.";
    }

    if (oppEl) {
      oppEl.textContent =
        data.executive_insight?.opportunity_signal || "Infrastructure expansion and battery innovation continue to support EV adoption momentum.";
    }
  }
}

function applyFilters(rows) {
  const region = (document.getElementById("f-region")?.value || "").trim();
  const category = (document.getElementById("f-category")?.value || "").trim();
  const q = (document.getElementById("f-q")?.value || "").trim().toLowerCase();
  const sort = (document.getElementById("f-sort")?.value || "newest").trim();

  let out = rows.slice();

  if (region) out = out.filter(r => r.region === region);
  if (category) out = out.filter(r => r.category === category);
  if (q) out = out.filter(r => (r.title + " " + r.source).toLowerCase().includes(q));

  if (sort === "newest") out.sort((a,b) => (b.published || "").localeCompare(a.published || ""));
  if (sort === "oldest") out.sort((a,b) => (a.published || "").localeCompare(b.published || ""));
  if (sort === "source") out.sort((a,b) => (a.source || "").localeCompare(b.source || ""));

  return out;
}

function setActiveChip(view) {
  document.querySelectorAll(".mi-chip").forEach(b => {
    b.classList.toggle("is-active", b.dataset.miView === view);
  });
}

function renderTrendChart(stories, windowSize = 7) {
  const container = document.getElementById("mi-chart-trend");
  const xAxis = document.getElementById("mi-trend-x");
  const yAxis = document.querySelector(".mi-trend-y");
  const summary = document.getElementById("mi-trend-summary");

  if (!container || !stories?.length) return;

  function safeDate(d){
    if(!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed) ? null : parsed;
  }

  const sorted = stories
    .map(s => safeDate(s.published))
    .filter(Boolean)
    .sort((a,b) => b - a);

  if (!sorted.length) return;

  const anchor = sorted[0];
  const days = [];

  for (let i = windowSize - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    days.push(d);
  }

  const counts = days.map(d =>
    stories.filter(s => {
      if (!s.published) return false;
      return new Date(s.published).toISOString().slice(0,10) === d.toISOString().slice(0,10);
    }).length
  );

  /* ===============================
   Capital Overlay Calculation
  ================================ */

  const capitalCounts = days.map(d =>
    stories.filter(s => {
      if (!s.published) return false;

      const sameDay =
        new Date(s.published).toISOString().slice(0,10) ===
        d.toISOString().slice(0,10);

      const text = ((s.title || "") + " " + (s.summary || "")).toLowerCase();
      const category = (s.category || "").toLowerCase();

      // 1. Structured taxonomy detection
      const categoryMatch =
        category === "investment" ||
        category === "capital";

      // 2. Keyword fallback detection
      const keywordMatch = [
        "funding",
        "raise",
        "raised",
        "ipo",
        "public offering",
        "acquisition",
        "merger",
        "m&a",
        "equity",
        "venture",
        "private equity",
        "grant",
        "subsidy",
        "financing",
        "bond"
      ].some(k => text.includes(k));

      return sameDay && (categoryMatch || keywordMatch);
    }).length
  );

  const max = Math.max(...counts, 1);

  // ----- compute stats BEFORE using them -----
  const currentTotal = counts.reduce((a,b)=>a+b,0);
  const mean = currentTotal / counts.length;

  const variance = counts.reduce((sum,v)=>sum + Math.pow(v-mean,2),0) / counts.length;
  const stdDev = Math.sqrt(variance);

  const volatility = (stdDev / (mean || 1)) * 100;

  // ----- render bars -----
  container.innerHTML = counts.map(c => {
    const pct = (c / max) * 100;
    const isAnomaly = c > mean + (1.5 * stdDev);

    return `
      <div class="mi-bar ${isAnomaly ? 'mi-bar-anomaly' : ''}">
        <div class="mi-bar-fill" style="height:${pct}%"></div>
        <div class="mi-bar-label">${c}</div>
      </div>
    `;
  }).join("");

  // ----- X axis -----
  if (xAxis){
    xAxis.innerHTML = days.map(d =>
      `<div>${d.toLocaleDateString(undefined, { weekday: "short" })}</div>`
    ).join("");
  }

  // ----- Y axis -----
  if (yAxis){
    yAxis.innerHTML = `
      <div>${max}</div>
      <div>${Math.round(max/2)}</div>
      <div>0</div>
    `;
  }

  // ----- smoothing line -----
  const smoothed = counts.map((_, i, arr) => {
    const slice = arr.slice(Math.max(0, i-2), i+1);
    return slice.reduce((a,b)=>a+b,0) / slice.length;
  });

  const svgHeight = 140;
  const svgWidth = container.offsetWidth || 600;
  const step = svgWidth / (counts.length - 1 || 1);

  const points = smoothed.map((v,i)=>{
    const x = i * step;
    const y = svgHeight - (v / max) * svgHeight;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `
    0,${svgHeight}
    ${points}
    ${svgWidth},${svgHeight}
  `;

  /* ===============================
   Capital Overlay Line
  ================================ */

  const maxCapital = Math.max(...capitalCounts, 1);

  const capitalPoints = capitalCounts.map((v,i)=>{
    const x = i * step;
    const y = svgHeight - (v / maxCapital) * svgHeight;
    return `${x},${y}`;
  }).join(" ");

  const svg = `
    <svg class="mi-trend-line" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="none">
      <polygon class="mi-trend-area" points="${areaPoints}" />
      <polyline points="${points}" />

      <!-- Capital Overlay -->
      <polyline
        points="${capitalPoints}"
        fill="none"
        stroke="rgba(255,215,0,0.85)"
        stroke-width="2"
        stroke-dasharray="4 4"
      />
    </svg>
  `;

  container.insertAdjacentHTML("beforeend", svg);

  /* ===============================
   Anomaly Attribution Engine
   =============================== */

const anomalyThreshold = mean + (1.5 * stdDev);

let anomalyDayIndex = -1;

counts.forEach((val, i) => {
  if (val > anomalyThreshold) {
    anomalyDayIndex = i;
  }
});

const insightHost = document.getElementById("mi-anomaly-insight");

if (insightHost){
  insightHost.classList.remove("active");
  insightHost.innerHTML = "";
}

if (anomalyDayIndex !== -1){

  const anomalyDate = days[anomalyDayIndex];
  const anomalyISO = anomalyDate.toISOString().slice(0,10);

  const anomalyStories = stories.filter(s =>
    s.published && s.published.slice(0,10) === anomalyISO
  );

  if (anomalyStories.length){

    const categoryCount = {};
    anomalyStories.forEach(s=>{
      const cat = s.category || "Other";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const dominant = Object.entries(categoryCount)
      .sort((a,b)=>b[1]-a[1])[0];

    const topStory = anomalyStories
      .slice()
      .sort((a,b)=>
        ((b.summary || "").length - (a.summary || "").length)
      )[0];

    if (insightHost){
      insightHost.classList.add("active");
      insightHost.innerHTML = `
        <div class="mi-anomaly-title">Anomaly detected</div>
        <div class="mi-anomaly-text">
          Spike on ${anomalyDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} driven by 
          <strong>${dominant ? dominant[0] : "mixed coverage"}</strong> 
          (${dominant ? dominant[1] : anomalyStories.length} stories), 
          led by "${topStory?.title || "Multiple high-impact developments"}".
        </div>
      `;
    }
  }
}

  // ----- delta vs prior window -----
  const priorWindowStart = new Date(anchor);
  priorWindowStart.setDate(anchor.getDate() - (windowSize * 2 - 1));

  const priorWindowEnd = new Date(anchor);
  priorWindowEnd.setDate(anchor.getDate() - windowSize);

  const priorCounts = stories.filter(s=>{
    const d = new Date(s.published);
    return d >= priorWindowStart && d < priorWindowEnd;
  }).length;

  const delta = priorCounts
    ? ((currentTotal - priorCounts)/priorCounts)*100
    : 0;

  renderMarketRegime({ delta, volatility });

  if (summary){
    summary.textContent =
      `Total ${currentTotal} stories, ${delta >= 0 ? "up" : "down"} ${Math.abs(delta).toFixed(0)}% vs prior ${windowSize} days. Volatility ${volatility.toFixed(0)}%.`;
  }
}

function renderMarketRegime(stats){
  const host = document.getElementById("mi-regime");
  if (!host) return;

  const delta = stats.delta;
  const volatility = stats.volatility;

  let regime = "amber";
  let label = "Stable narrative environment";

  if (delta > 15 && volatility < 60){
    regime = "green";
    label = "Accelerating market narrative";
  }
  else if (delta < -15){
    regime = "red";
    label = "Contracting media momentum";
  }

  host.innerHTML = `
    <div class="mi-regime-left">
      <div class="mi-regime-dot ${regime}"></div>
      <div>
        <div class="mi-regime-title">${label}</div>
        <div class="mi-regime-meta">
          ${delta >= 0 ? "+" : ""}${delta.toFixed(0)}% vs prior window,
          Volatility ${volatility.toFixed(0)}%
        </div>
      </div>
    </div>
  `;
}

function renderIntensityChart(stories){
  const container = document.getElementById("mi-chart-intensity");
  if (!container || !stories?.length) return;

  const categories = {};
  stories.forEach(s=>{
    const cat = s.category || "Other";
    categories[cat] = (categories[cat] || 0) + 1;
  });

  const total = Object.values(categories).reduce((a,b)=>a+b,0);
  const max = Math.max(...Object.values(categories),1);

  container.innerHTML = Object.entries(categories)
    .sort((a,b)=>b[1]-a[1])
    .map(([cat,val])=>{
      const w = (val/max)*100;
      const pct = ((val/total)*100).toFixed(0);
      return `
        <div class="mi-intensity-row">
          <div class="mi-intensity-left">
            <div class="mi-intensity-name">${cat}</div>
            <div class="mi-intensity-bar">
              <div class="mi-intensity-fill" style="width:${w}%"></div>
            </div>
          </div>
          <div class="mi-intensity-right">
            <div>${val}</div>
            <div>${pct}%</div>
          </div>
        </div>
      `;
    }).join("");
}

function impactScore(a){
  const text = ((a.title || "") + " " + (a.summary || "")).toLowerCase();

  const high = ["ban","ipo","merger","acquisition","recall","lawsuit","tariff","subsidy","gigafactory","funding"];

  return high.filter(k=>text.includes(k)).length;
}

function scoreSignal(story){

  const text = ((story.title || "") + " " + (story.summary || "")).toLowerCase();

  let score = 0;

  if(text.includes("tesla")) score += 3;
  if(text.includes("byd")) score += 3;
  if(text.includes("ipo")) score += 3;
  if(text.includes("funding")) score += 2;
  if(text.includes("policy")) score += 2;
  if(text.includes("ban")) score += 2;
  if(text.includes("factory")) score += 2;
  if(text.includes("battery")) score += 2;
  if(text.includes("charging")) score += 1;
  if(text.includes("infrastructure")) score += 1;

  return score;

}

function normalizeStory(a){
  if (!a) return null;

  return {
    id: a.id || a.slug || Math.random().toString(36),
    title: a.title || "",
    summary: a.summary || "",
    category: normSignalCategory(a.category), // ✅ FIXED
    region: a.region || "",
    source: a.source || "",
    published: a.published || "",
    stratum_impact_index: a.stratum_impact_index || 0,
    signal_sentiment: a.signal_sentiment || null
  };
}

function normSignalCategory(cat){

  const key = String(cat || "").toLowerCase().trim();

  if (["investment","capital","funding","ipo","m&a","financing","equity"].includes(key))
    return "Capital";

  if (["policy","regulation","compliance","law","tariff","subsidy"].includes(key))
    return "Policy";

  if (["battery","technology","innovation","software","ai"].includes(key))
    return "Innovation";

  if (["charging","infrastructure","grid"].includes(key))
    return "Charging";

  if (["oem","vehicle","manufacturer"].includes(key))
    return "OEM";

  return "Industry";
}

function classifySignal(a){

  const cat = (a.category || "").toLowerCase();

  if(cat.includes("policy")) return "policy";

  if(cat.includes("charging")) return "charging";

  if(
      cat.includes("investment") ||
      cat.includes("capital") ||
      cat.includes("funding")
  ) return "capital";

  return "top";
}

function renderList(containerId, rows, limit, variant = "default") {

  const containers = {
    top: document.getElementById("mi-top"),
    policy: document.getElementById("mi-policy"),
    charging: document.getElementById("mi-charging"),
    capital: document.getElementById("mi-capital")
  };

  if (!containers.top) return;

  if(!containers.top.dataset.initialized){

    Object.values(containers).forEach(c => {
      if (c) c.innerHTML = "";
    });

    containers.top.dataset.initialized = "1";

  }

  const buckets = {
    hero: [],
    market: [],
    policy: [],
    charging: [],
    capital: []
  };

  const sorted = rows
  .slice()
  .sort((a,b) =>
    (scoreTopStory(normalizeStory(b)) - scoreTopStory(normalizeStory(a))) ||
    ((b.published || "").localeCompare(a.published || ""))
  )
  .slice(0, limit);

sorted.forEach((raw, i) => {

    const a = normalizeStory(raw);

    if (document.querySelector(`[data-story-rendered="${a.id}"]`)) return;

    const signal = scoreTopStory(a);

    const strength =
      signal >= 10 ? "high" :
      signal >= 6 ? "medium" :
      "low";

    const card = el(`

    <article class="mi-card mi-signal-${strength}" data-category="${a.category}" data-story-rendered="${a.id}">

        <div class="mi-card-header">

          <span class="mi-card-category">
            ${a.category || "Industry"}
          </span>

          <span class="mi-card-region">
            ${a.region || "Global"}
          </span>

        </div>

        <h3 class="mi-card-title mi-story-open" role="button" data-story-id="${a.id}">
          ${a.title}
        </h3>

        ${a.summary ? `<p class="mi-card-summary">${a.summary}</p>` : ""}

        <div class="mi-card-footer">

          <span class="mi-card-source">
            ${a.source || ""}
          </span>

          <span class="mi-card-date">
            ${a.published ? fmtDate(a.published) : ""}
          </span>

        </div>

    </article>

    `);

    // Fill hero Top Signals first
    if (buckets.hero.length < 4) {
      buckets.hero.push(card.cloneNode(true));
    }

    const bucket = classifySignal(a);

    if(bucket === "top"){
      if(buckets.market.length < 4) buckets.market.push(card);
    }
    else if(bucket === "policy"){
      if(buckets.policy.length < 4){

        buckets.policy.push({
          score: signal,
          card: card
        });

      }
    }
    else if(bucket === "charging"){
      if(buckets.charging.length < 4) buckets.charging.push(card);
    }
    else if(bucket === "capital"){
      if(buckets.capital.length < 4) buckets.capital.push(card);
    }
  });

  buckets.market.forEach(card => containers.top.appendChild(card));
  buckets.policy
  .sort((a,b) => b.score - a.score)
  .forEach(item => containers.policy.appendChild(item.card));
  buckets.charging.forEach(card => containers.charging.appendChild(card));
  buckets.capital.forEach(card => containers.capital.appendChild(card));

  /* show empty state if charging column has no items */
    if (containers.charging && containers.charging.children.length === 0){
      containers.charging.innerHTML = `
        <div class="mi-empty">
          Awaiting infrastructure signals
        </div>
      `;
    }

}

function renderPaginatedStream(rows){

  const perPage = 5;
  let currentPage = 1;
  const container = document.getElementById("mi-stream");

  /* =========================
     SIGNAL RANKING ENGINE
  ========================= */

  const seen = new Set();

  const ranked = rows
    .filter(a => {

      const title = (a.title || "").toLowerCase().trim();

      if(seen.has(title)) return false;

      seen.add(title);

      return true;

    })
  .sort((a,b) =>
    (scoreTopStory(normalizeStory(b)) - scoreTopStory(normalizeStory(a))) ||
    ((b.published || "").localeCompare(a.published || ""))
  );

  const topSignalId = ranked.length ? normalizeStory(ranked[0]).id : null;

  function renderPage(){
    container.innerHTML = "";
    const start = (currentPage - 1) * perPage;
    const slice = ranked.slice(start, start + perPage);

    slice.forEach(a => {
      container.appendChild(el(`
        <article class="mi-stream-item
            ${impactScore(a) > 3 ? "impact-high" : ""}
            ${a.id === topSignalId ? "mi-stream-top" : ""}">

            <div class="mi-stream-left">

              <span class="mi-stream-tag">
                ${a.category || "Industry"}
              </span>

              <span class="mi-stream-headline mi-story-open"
                  role="button"
                  data-story-id="${a.id}">
                ${a.title}

                <span class="mi-stream-score">
                  ${scoreTopStory(a)}
                </span>
              </span>

            </div>

          <div class="mi-stream-meta">
            ${a.region || "Global"} · ${a.source} · ${a.published ? fmtDate(a.published) : ""}
          </div>

        </article>
      `));
    });

    renderControls();
  }

  function renderControls(){
    const totalPages = Math.ceil(rows.length / perPage);
    if (totalPages <= 1) return;

    const controls = el(`
      <div class="mi-pagination">
        <button ${currentPage === 1 ? "disabled" : ""}>Prev</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button ${currentPage === totalPages ? "disabled" : ""}>Next</button>
      </div>
    `);

    const [prevBtn, , nextBtn] = controls.querySelectorAll("button, span, button");

    prevBtn?.addEventListener("click", () => {
      currentPage--;
      renderPage();
    });

    nextBtn?.addEventListener("click", () => {
      currentPage++;
      renderPage();
    });

    container.appendChild(controls);
  }

  renderPage();
}

function renderStreamCategoryChart(rows){
  const ctx = document.getElementById("streamCategoryChart");
  if(!ctx) return;

  const counts = {};
  rows.forEach(r=>{
    counts[r.category] = (counts[r.category]||0)+1;
  });

  new Chart(ctx,{
    type:"doughnut",
    data:{
      labels:Object.keys(counts),
      datasets:[{
        data:Object.values(counts),
        backgroundColor:["#4DA3FF","#5BE7C4","#A26BFF","#FFD166","#FF6B6B"]
      }]
    },
    options:{
      plugins:{ legend:{ display:false }},
      cutout:"70%"
    }
  });
}



function renderLatestBriefCard(pointer, kpis) {
  const host = document.getElementById("mi-latest-brief");
  if (!host) return;

  const week = pointer?.week || "TBC";
  const url = pointer?.url || "./data/briefs/latest.pdf";
  const total = kpis?.total_7d ?? 0;

  const topCat = Object.entries(kpis?.by_category_7d || {}).sort((a,b) => b[1]-a[1])[0];
  const topCategory = topCat ? topCat[0] : "TBC";

  host.innerHTML = `
    <div class="mi-latest__left">
      <div><span class="mi-latest__label">Latest Brief</span> <span class="mi-latest__value">${week}</span></div>
      <div><span class="mi-latest__label">Top Category</span> <span class="mi-latest__value">${topCategory}</span></div>
      <div><span class="mi-latest__label">Stories, 7d</span> <span class="mi-latest__value">${total}</span></div>
    </div>

    <div class="mi-latest__cta">
      <a class="mi-btn" href="${url}" target="_blank" rel="noreferrer">Download PDF</a>
    </div>
  `;
}

function esc(s) {
  return String(s || "").replace(/[&<>\"\x27]/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "\x27": "&#39;"
  }[m]));
}

/* ===============================
   Market Signal Structure helpers
   =============================== */

function clamp(n, min, max){ return Math.max(min, Math.min(max, n)); }


function scoreTone(text){
  const t = String(text || "").toLowerCase();
  if (!t) return 0;

  const neg = [
    "ban","restrict","crackdown","tariff","penalty","lawsuit","recall","delay","shortage","risk",
    "warning","probe","investigation","fraud","collapse","bankrupt","fine","cut","slump","fall",
    "decline","negative","strike","halt","pause","cancel","deficit","inflation"
  ];

  const pos = [
    "approve","approved","incentive","grant","funding","record","breakthrough","launch","deal","partner",
    "expansion","upgrade","growth","surge","boost","investment","award","contract","milestone","improve",
    "fast","ultra-rapid","rebound","profit","wins"
  ];

  let s = 0;
  for (const w of neg){ if (t.includes(w)) s -= 1; }
  for (const w of pos){ if (t.includes(w)) s += 1; }

  // compress to -1..1
  return clamp(s / 6, -1, 1);
}

function parseDateSafe(iso){
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}

function splitStoriesByWindow(rows, anchorDate){
  const anchor = anchorDate || new Date();
  const t0 = anchor.getTime();
  const day = 24 * 60 * 60 * 1000;
  const curStart = t0 - 7 * day;
  const prevStart = t0 - 14 * day;
  const prevEnd = curStart;

  const cur = [];
  const prev = [];

  (rows || []).forEach(a => {
    const d = parseDateSafe(a.published);
    if (!d) return;
    const ts = d.getTime();
    if (ts >= curStart && ts <= t0) cur.push(a);
    else if (ts >= prevStart && ts < prevEnd) prev.push(a);
  });

  return { cur, prev };
}

function aggregateSignal(rows){
  const m = new Map();
  for (const a of rows || []){
    const cat = normSignalCategory(a.category);
    const prev = m.get(cat) || { count: 0, toneSum: 0, toneN: 0 };
    prev.count += 1;
    const tone = scoreTone((a.title || "") + " " + (a.summary || ""));
    prev.toneSum += tone;
    prev.toneN += 1;
    m.set(cat, prev);
  }
  return m;
}

function buildSignalStructure(rows, anchorDate){
  const { cur, prev } = splitStoriesByWindow(rows, anchorDate);
  const curAgg = aggregateSignal(cur);
  const prevAgg = aggregateSignal(prev);

  const cats = Array.from(new Set([...curAgg.keys(), ...prevAgg.keys()]));

  const totalCur = Array.from(curAgg.values()).reduce((a,v) => a + v.count, 0) || 1;
  const totalPrev = Array.from(prevAgg.values()).reduce((a,v) => a + v.count, 0) || 1;

  let list = cats.map(cat => {
    const c = curAgg.get(cat) || { count: 0, toneSum: 0, toneN: 0 };
    const p = prevAgg.get(cat) || { count: 0, toneSum: 0, toneN: 0 };

    const share = c.count / totalCur;
    const prevShare = p.count / totalPrev;
    const delta = share - prevShare;

    const avgTone = c.toneN ? (c.toneSum / c.toneN) : 0;
    const toneFill = clamp(((avgTone + 1) / 2) * 100, 0, 100);

    return { category: cat, count: c.count, share, delta, avgTone, toneFill };
  });

  list.sort((a,b) => b.count - a.count);

  // keep top 5, roll-up the rest
  const top = list.slice(0, 5);
  const rest = list.slice(5);
  if (rest.length){
    const restCount = rest.reduce((a,v) => a + v.count, 0);
    const restShare = restCount / totalCur;

    const restPrevCount = rest.reduce((a,v) => a + (prevAgg.get(v.category)?.count || 0), 0);
    const restPrevShare = restPrevCount / totalPrev;
    const restDelta = restShare - restPrevShare;

    const restTone = rest.reduce((a,v) => a + (curAgg.get(v.category)?.toneSum || 0), 0);
    const restToneN = rest.reduce((a,v) => a + (curAgg.get(v.category)?.toneN || 0), 0) || 1;
    const restAvgTone = restTone / restToneN;

    top.push({
      category: "Other",
      count: restCount,
      share: restShare,
      delta: restDelta,
      avgTone: restAvgTone,
      toneFill: clamp(((restAvgTone + 1) / 2) * 100, 0, 100)
    });
  }

  const top2 = (top[0]?.share || 0) + (top[1]?.share || 0);

  // prev top2 by prev shares of the same top2 categories
  const top2Cats = [top[0]?.category, top[1]?.category].filter(Boolean);
  const prevTop2 = top2Cats.reduce((a,cat) => {
    if (cat === "Other"){
      const curTopCats = new Set(top.slice(0,5).map(x => x.category));
      let restPrevCount = 0;
      for (const [k,v] of prevAgg.entries()){
        if (!curTopCats.has(k)) restPrevCount += v.count;
      }
      return a + (restPrevCount / totalPrev);
    }
    return a + ((prevAgg.get(cat)?.count || 0) / totalPrev);
  }, 0);

  return { rows: top, top2, top2Delta: top2 - prevTop2 };
}

function fmtPct(n, digits=0){ return `${(n * 100).toFixed(digits)}%`; }
function fmtDelta(n){ const sign = n >= 0 ? "+" : ""; return `${sign}${(n * 100).toFixed(0)}%`; }

function renderSignalStructure(containerId, signal){
  const host = document.getElementById(containerId);
  if (!host) return;

  const rows = signal?.rows || [];
  const maxCount = Math.max(1, ...rows.map(r => r.count));

  const rowsHtml = rows.map(r => {
    const barW = clamp((r.count / maxCount) * 100, 6, 100);
    const deltaClass = r.delta >= 0 ? "up" : "down";
    const arrow = r.delta >= 0 ? "▲" : "▼";

    return `
      <div class="mi-signalRow">
        <div class="mi-signalCat">${esc(r.category)}</div>

        <div class="mi-signalMetrics">
          <div class="mi-signalBarWrap" title="${r.count} stories">
            <div class="mi-signalBar" style="width:${barW}%"></div>
          </div>

          <div class="mi-signalTone" title="Tone: ${r.avgTone.toFixed(2)}">
            <div class="mi-signalToneFill" style="width:${r.toneFill}%"></div>
          </div>
        </div>

        <div class="mi-signalRight">
          <div class="mi-signalShare">${fmtPct(r.share, 0)}</div>
          <div class="mi-signalDelta ${deltaClass}">${arrow} ${fmtDelta(r.delta)}</div>
        </div>
      </div>`;
  }).join("");

  const insightArrow = signal.top2Delta >= 0 ? "▲" : "▼";
  const insightDelta = fmtDelta(signal.top2Delta);

  host.innerHTML = `
    <div class="mi-signal__head">
      <div>
        <div style="font-weight:800;opacity:0.92;font-size:13px;">Signal density</div>
        <div class="mi-signal__sub">Momentum and tone by category, change vs prior 7 days</div>
      </div>
    </div>

    <div class="mi-signalRows">
      ${rowsHtml}
    </div>

    <div class="mi-signalInsight">
      <div class="mi-signalInsightLabel">Insight</div>
      <div class="mi-signalInsightText">Narrative concentration: top 2 categories account for ${fmtPct(signal.top2,0)} of coverage, ${insightArrow} ${insightDelta} vs prior 7 days.</div>
    </div>
  `;
}

function renderMomentumChart(signal){

  const container = document.getElementById("mi-chart-momentum");
  if (!container || !signal?.rows) return;

  const rows = signal.rows;

  const maxDelta = Math.max(
    ...rows.map(r => Math.abs(r.delta)),
    0.01
  );

  container.innerHTML = rows.map(r=>{

    const width = (Math.abs(r.delta) / maxDelta) * 100;

    const direction =
      r.delta > 0.02 ? "up" :
      r.delta < -0.02 ? "down" :
      "flat";

    const arrow =
      direction === "up" ? "▲" :
      direction === "down" ? "▼" :
      "–";

    return `
      <div class="mi-momentum-row ${direction}">

        <div class="mi-momentum-label">
          ${r.category}
        </div>

        <div class="mi-momentum-bar">

          <div
            class="mi-momentum-fill"
            style="width:${width}%"
          ></div>

        </div>

        <div class="mi-momentum-value">
          ${arrow} ${(r.delta*100).toFixed(0)}%
        </div>

      </div>
    `;

  }).join("");

}

function renderCoverageInsight(signal, regionData){

  const host = document.getElementById("mi-coverage-insight");
  if (!host || !signal) return;

  // --- CATEGORY (from signal) ---
  const top = signal.rows?.[0];
  const second = signal.rows?.[1];

  const topName = top?.category || "Unknown";
  const secondName = second?.category || "secondary signals";

  const topShare = top ? Math.round(top.share * 100) : 0;
  const topDelta = top ? (top.delta * 100).toFixed(0) : 0;

  // --- MOMENTUM STATE ---
  let momentumState = "stable";
  if (top?.delta > 0.05) momentumState = "accelerating";
  else if (top?.delta < -0.05) momentumState = "softening";

  // --- CONCENTRATION ---
  const concentration = signal.top2 || 0;

  let structure =
    concentration > 0.6 ? "highly concentrated" :
    concentration > 0.4 ? "moderately concentrated" :
    "diversified";

  // --- REGION ---
  const regionEntries = Object.entries(regionData || {})
    .sort((a,b)=>b[1]-a[1]);

  const topRegion = regionEntries?.[0]?.[0] || "Global";
  const topRegionVal = regionEntries?.[0]?.[1] || 0;

  // --- BUILD OUTPUT ---
  host.innerHTML = `
    <div class="mi-coverage-card">

      <div class="mi-coverage-title">Coverage Insight</div>

      <div class="mi-coverage-text">

        <strong>${topName}</strong> is the dominant narrative driver,
        accounting for <strong>${topShare}%</strong> of total coverage,
        with momentum <strong>${momentumState}</strong>
        (${topDelta >= 0 ? "+" : ""}${topDelta}% vs prior window).

        <br/><br/>

        Narrative structure is <strong>${structure}</strong>,
        led by ${topName} and ${secondName}.

        <br/><br/>

        Regional coverage is led by <strong>${topRegion}</strong>
        (${topRegionVal} stories), indicating primary market focus.

      </div>

    </div>
  `;
}



function svgPie(containerId, dataObj, opts = {}) {
  const elNode = document.getElementById(containerId);
  if (!elNode) return;

  const entries = Object.entries(dataObj || {}).slice(0, opts.maxSlices || 6);
  const total = entries.reduce((a, [, v]) => a + (Number(v) || 0), 0) || 1;

  const size = opts.size || 160;
  const r = size / 2 - 10;
  const cx = size / 2, cy = size / 2;

  let start = -Math.PI / 2;

  const colors = [
    "#2F80ED", // blue
    "#27AE60", // green
    "#F2C94C", // amber
    "#9B51E0", // purple
    "#EB5757", // red
    "#56CCF2"  // cyan
  ];

  const paths = entries.map(([label, value], i) => {
    const v = Number(value) || 0;
    const angle = (v / total) * Math.PI * 2;
    const end = start + angle;

    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);

    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;

    const pct = Math.round((v / total) * 100);
    const fill = colors[i % colors.length];

    start = end;

    return `<path d="${d}" fill="${fill}" fill-opacity="0.9" title="${esc(label)}: ${pct}%"></path>`;
  }).join("");

  const legend = entries.map(([label, value], i) => {
    const pct = Math.round(((Number(value) || 0) / total) * 100);
    return `
      <div class="mi-legendRow">
        <div class="mi-legendLeft">
          <span class="mi-swatch" style="background:${colors[i % colors.length]}"></span>
          <span class="mi-legendLabel">${esc(label)}</span>
        </div>
        <div class="mi-legendPct">${pct}%</div>
      </div>
    `;
  }).join("");

  elNode.innerHTML = `
    <div class="mi-pieWrap">
      <svg class="mi-pie" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Pie chart">
        ${paths}
      </svg>
      <div class="mi-legend">
        ${legend}
      </div>
    </div>
  `;
}



function svgBars(containerId, dataObj, opts = {}) {
  const elNode = document.getElementById(containerId);
  if (!elNode) return;

  const entries = Object.entries(dataObj || {}).slice(0, opts.max || 6);
  const maxVal = Math.max(1, ...entries.map(([, v]) => Number(v) || 0));

  elNode.innerHTML = entries.map(([label, value]) => {
    const v = Number(value) || 0;
    const w = Math.round((v / maxVal) * 100);

    return `
      <div class="mi-bar">
        <div class="mi-bar__top">
          <span class="mi-bar__name">${esc(label)}</span>
          <span class="mi-bar__val">${v}</span>
        </div>

        <div class="mi-barTrack">
          <div class="mi-barFill" style="width:${w}%"></div>
        </div>
      </div>
    `;
  }).join("");
}


function stripHtml(input) {
  const s = String(input || "");
  if (!s.includes("<")) return s.replace(/\s+/g, " ").trim();
  const div = document.createElement("div");
  div.innerHTML = s;
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function oneLineTakeaway(a) {
  const clean = stripHtml(a.summary || "");
  if (!clean) return "";
  return clean.length > 130 ? clean.slice(0, 127).trim() + "..." : clean;
}

function signalBadge(a) {
  const text = ((a.title || "") + " " + (a.summary || "")).toLowerCase();

  if (text.includes("ban") || text.includes("restrict") || text.includes("crackdown")) return ["Risk", "mi-badge--risk"];
  if (text.includes("deadline") || text.includes("compliance") || text.includes("rule") || text.includes("regulation")) return ["Regulation", "mi-badge--policy"];
  if (text.includes("tax credit") || text.includes("subsidy") || text.includes("incentive")) return ["Incentives", "mi-badge--policy"];

  if (text.includes("charging") || text.includes("charger") || text.includes("grid") || text.includes("infrastructure")) return ["Infrastructure", "mi-badge--infra"];

  if (text.includes("solid-state") || text.includes("sodium") || text.includes("lithium") || text.includes("battery")) return ["Battery Tech", "mi-badge--tech"];

  if (text.includes("funding") || text.includes("ipo") || text.includes("raise") || text.includes("acquisition") || text.includes("m&a")) return ["Capital", "mi-badge--capital"];

  return ["Signal", "mi-badge--muted"];
}

function renderWatchlist(containerId, rows, limit) {
  const host = document.getElementById(containerId);
  if (!host) return;

  host.innerHTML = "";

  const slice = rows.slice(0, limit);
  if (!slice.length) {
    host.appendChild(el(`<div style="opacity:0.7;font-size:13px;">No items found for this watchlist.</div>`));
    return;
  }

  slice.forEach(a => {
    const safeTitle = stripHtml(a.title || "");
    const takeaway = oneLineTakeaway(a);
    const [badgeText, badgeClass] = signalBadge(a);

    host.appendChild(el(`
      <a class="mi-watchcard" href="${a.link || a.url || '#'}" target="_blank" rel="noreferrer">
        <div class="mi-watchcard__top">
            <div class="mi-watchcard__title">
                ${esc(safeTitle)}
            </div>
          <div class="mi-watchcard__badges">
            <span class="mi-badge ${badgeClass}">${esc(badgeText)}</span>
            <span class="mi-badge mi-badge--muted">${esc(a.region || "Global")}</span>
          </div>
        </div>

        ${takeaway ? `<div class="mi-watchcard__takeaway">${esc(takeaway)}</div>` : ""}

        <div class="mi-watchcard__meta">
          <span>${esc(a.source || "")}</span>
          <span class="mi-dot">•</span>
          <span>${a.published ? esc(fmtDate(a.published)) : ""}</span>
        </div>
      </a>
    `));
  });
}

function wireCarousels() {
  document.querySelectorAll("[data-mi-carousel]").forEach(root => {
    if (root.dataset.miBound === "1") return;
    root.dataset.miBound = "1";

    const track = root.querySelector(".mi-carousel__track");
    const prev = root.querySelector("[data-mi-prev]");
    const next = root.querySelector("[data-mi-next]");
    if (!track || !prev || !next) return;

    // ---- paging controls ----
    const card = track.querySelector(":scope > *");

    const page = () => {
      const first = track.querySelector(":scope > *");
      if (!first) return track.clientWidth;

      const style = window.getComputedStyle(track);
      const gap = parseInt(style.gap || style.columnGap || 16, 10);

      return first.offsetWidth + gap;
    };

    const scrollByPage = (dir) => {
      track.scrollBy({ left: dir * page(), behavior: "smooth" });
    };

    const updateButtons = () => {
      const atStart = track.scrollLeft <= 5;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 5;

      if (atStart) {
        prev.classList.add("is-disabled");
      } else {
        prev.classList.remove("is-disabled");
      }

      if (atEnd) {
        next.classList.add("is-disabled");
      } else {
        next.classList.remove("is-disabled");
      }
    };

    prev.addEventListener("click", () => {
      scrollByPage(-1);
      setTimeout(updateButtons, 300);
    });

    next.addEventListener("click", () => {
      scrollByPage(1);
      setTimeout(updateButtons, 300);
    });

    track.addEventListener("scroll", updateButtons);

    // ---- UPDATED AUTOPLAY (your requested block) ----
    let timer = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 5;

        if (atEnd){
          track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          track.scrollBy({ left: track.clientWidth, behavior: "smooth" });
        }
      }, 5000);
    };

    const stop = () => {
      clearInterval(timer);
      timer = null;
    };

    // pause on hover/focus
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    track.addEventListener("focusin", stop);
    track.addEventListener("focusout", start);

    // ---- Swipe support (mobile) + momentum feel ----
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    track.addEventListener("pointerdown", (e) => {
      isDown = true;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
      stop();
    });

    track.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      track.scrollLeft = startScroll - dx;
    });

    const endDrag = () => {
      isDown = false;
      start();
    };

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);

    updateButtons();
    start();

  });
}

function isInnovation(a) {
  const text = ((a.title || "") + " " + (a.summary || "")).toLowerCase();
  const kw = ["breakthrough","prototype","patent","solid-state","silicon","lithium","sodium-ion","fast charging","ultra-rapid","v2g","bidirectional","autonomy","lidar","software update","platform","architecture","gigafactory","cell","battery tech"];
  const hit = kw.some(k => text.includes(k));
  const cat = (a.category || "").toLowerCase();
  return hit || cat === "battery" || cat === "oem" || cat === "charging";
}

function setTab(name){

  // ADD THIS LINE
  document.body.setAttribute("data-mi-tab", name);

  document.querySelectorAll(".mi-tab").forEach(b => {
    b.classList.toggle("is-active", b.dataset.miTab === name);
  });

  document.querySelectorAll(".mi-tabpanel").forEach(p => {
    p.classList.toggle("is-active", p.id === `tab-${name}`);
  });
}

function wireViewAllLinks(){
  document.querySelectorAll("[data-mi-goto]").forEach(a => {
    if (a.dataset.miBound === "1") return;
    a.dataset.miBound = "1";
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const tab = a.dataset.miGoto;
      setTab(tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function renderStoriesMiniCharts(rows){

  if (!rows || !rows.length) return;

  const counts = {};
  rows.forEach(r => {

    let cat = r.category;

    if (!cat){

      const text = ((r.title || "") + " " + (r.summary || "")).toLowerCase();

      if (text.includes("policy") || text.includes("regulation") || text.includes("ban"))
        cat = "Policy";

      else if (text.includes("charging") || text.includes("charger") || text.includes("infrastructure"))
        cat = "Charging";

      else if (text.includes("funding") || text.includes("ipo") || text.includes("acquisition"))
        cat = "Capital";

      else if (text.includes("battery") || text.includes("lithium") || text.includes("solid-state"))
        cat = "Battery";

      else if (text.includes("tesla") || text.includes("vehicle") || text.includes("ev"))
        cat = "OEM";

      else
        cat = "Industry";
    }

    counts[cat] = (counts[cat] || 0) + 1;

  });

  console.log("Story category counts:", counts);

  const labels = Object.keys(counts);
  const values = Object.values(counts);

  if (!labels.length || !values.length) {
    console.warn("Stories chart: no category data");
    return;
  }

  // Executive insight summary
  const deltaSignal = buildSignalStructure(rows, new Date());

  const insightTextEl = document.querySelector("#tab-stories .mi-insight-text");

  if (insightTextEl && deltaSignal.rows.length) {

    const dominantRow = deltaSignal.rows[0];
    const dominant = dominantRow.category;
    const delta = dominantRow.delta;
    const sharePct = Math.round(dominantRow.share * 100);

    let direction = "stable";
    if (delta > 0.05) direction = "accelerating";
    else if (delta < -0.05) direction = "decelerating";

    insightTextEl.textContent =
      `${dominant} narrative is ${direction}, accounting for ${sharePct}% of filtered coverage. Momentum vs prior window is ${(delta*100).toFixed(0)}%.`;
  }

  /* ===== TOP STORIES DOUGHNUT ===== */

  const topCanvas = document.getElementById("topStoriesChart");
  if (topCanvas){

    if (topCanvas._chart){
      topCanvas._chart.destroy();
    }

    topCanvas._chart = new Chart(topCanvas, {

      type: "doughnut",

      data: {
        labels,
        datasets: [{
          data: values,

          backgroundColor: [
            "#4DA3FF",
            "#FFD166",
            "#5BE7C4",
            "#A26BFF",
            "#FF6B6B",
            "#56CCF2"
          ],

          borderColor: "rgba(15,23,42,0.9)",
          borderWidth: 2,

          hoverOffset: 12
        }]
      },

      options: {

        responsive: true,
        maintainAspectRatio: false,

        cutout: "70%",

        plugins: {

          legend: {
            position: "bottom",
            labels: {
              color: "#cfd8e3",
              padding: 18,
              boxWidth: 12,
              font: { size: 11 }
            }
          },

          tooltip: {

            backgroundColor: "#0b1220",
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,

            callbacks: {

              label: function(ctx){

                const total = ctx.dataset.data.reduce((a,b)=>a+b,0);
                const value = ctx.raw;
                const pct = ((value/total)*100).toFixed(1);

                return `${ctx.label}: ${value} stories (${pct}%)`;
              }

            }
          }

        },

        animation: {
          animateRotate: true,
          duration: 900
        }

      }

    });

    // =====================================
  // COLUMN RENDERING (FIX)
  // =====================================

  const topEl = document.getElementById("mi-top");
  const policyEl = document.getElementById("mi-policy");
  const chargingEl = document.getElementById("mi-charging");
  const capitalEl = document.getElementById("mi-capital");

  if (topEl && policyEl && chargingEl && capitalEl){

    // reset
    topEl.innerHTML = "";
    policyEl.innerHTML = "";
    chargingEl.innerHTML = "";
    capitalEl.innerHTML = "";

    rows.forEach(r => {

      const story = normalizeStory(r);
      if (!story) return;

      const card = `
        <div class="mi-story-card">
          <div class="mi-story-title">${story.title}</div>
          <div class="mi-story-summary">${story.summary || ""}</div>
        </div>
      `;

      // 🔥 MARKET SIGNALS (HIGH IMPACT)
      if (story.stratum_impact_index >= 40){
        topEl.innerHTML += card;
      }

      // POLICY
      if (story.category === "Policy"){
        policyEl.innerHTML += card;
      }

      // CHARGING
      if (story.category === "Charging"){
        chargingEl.innerHTML += card;
      }

      // CAPITAL
      if (story.category === "Capital"){
        capitalEl.innerHTML += card;
      }

    });

  }
  }

/* ===== STREAM MINI BAR ===== */

const streamCanvas = document.getElementById("streamMiniChart");
  if (streamCanvas){

    if (streamCanvas._chart){
      streamCanvas._chart.destroy();
    }

    streamCanvas._chart = new Chart(streamCanvas, {

      type: "bar",

      data: {

        labels,

        datasets: [{
          label: "Story Count",
          data: values,

          backgroundColor: "rgba(110,231,255,0.7)",
          borderColor: "rgba(110,231,255,1)",
          borderWidth: 1.5,

          borderRadius: 6,
          hoverBackgroundColor: "rgba(110,231,255,0.9)"
        }]
      },

      options: {

        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          mode: "index",
          intersect: false
        },

        plugins: {

          legend: { display: false },

          tooltip: {

            backgroundColor: "#0b1220",
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,

            callbacks: {
              label: function(ctx){
                return `${ctx.label}: ${ctx.raw} stories`;
              }
            }

          }

        },

        scales: {

          x: {
            grid: { display: false },
            ticks: {
              color: "rgba(255,255,255,0.65)",
              font: { size: 11 }
            }
          },

          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(255,255,255,0.06)"
            },
            ticks: {
              color: "rgba(255,255,255,0.65)",
              stepSize: 1
            }
          }

        },

        animation: {
          duration: 900,
          easing: "easeOutQuart"
        }

      }

    });
  }
}

const applyPresetLocal = (view) => {

    const anchor = new Date();  // <-- add this

    const catEl = document.getElementById("f-category");

    if (catEl) {
      if (view === "top") catEl.value = "";
      if (view === "policy") catEl.value = "Policy";
      if (view === "charging") catEl.value = "Charging";
      if (view === "investment") catEl.value = "Capital";
    }

    const stories = Array.isArray(__miStoryCache)
      ? __miStoryCache
      : [];

    const filtered = applyFilters(stories);

    const top = filtered
      .slice()
      .sort((a,b) =>
        (scoreTopStory(b) - scoreTopStory(a)) ||
        ((b.published || "").localeCompare(a.published || ""))
    )
    .slice(0, 30);

    /* =========================
      Top Signal Renderer
    ========================= */

    const hero = top[0];
    const heroScore = scoreTopStory(hero);

    const impact =
      heroScore >= 10 ? "HIGH IMPACT" :
      heroScore >= 6 ? "SIGNIFICANT" :
      "SIGNAL";

    const heroHost = document.getElementById("mi-featured-signal");

    if(heroHost && hero){

      heroHost.innerHTML = `

      <div class="mi-featured-meta">
        ${hero.category} · ${hero.region || "Global"} · ${hero.source || ""}
      </div>

      <div class="mi-featured-impact">
        ${impact}
      </div>

      <div class="mi-featured-title mi-story-open"
          data-story-id="${hero.id}">
        ${hero.title}
      </div>

      ${hero.summary ? `
        <div class="mi-featured-summary">
          ${hero.summary}
        </div>
      ` : ""}

    `;
    }

    renderList("mi-top", top, 6, "top");
    renderPaginatedStream(filtered);
    renderStoriesMiniCharts(filtered);

    if(view === "top"){
      renderTrendChart(filtered, 7);
      renderIntensityChart(filtered);

      const signal = buildSignalStructure(filtered, anchor);
      renderSignalStructure("mi-chart-category", signal);
      renderMomentumChart(signal);

      renderCapitalIntelligence(filtered, anchor);
    }
  };

function renderRegulatoryHeatmap(containerId, policySignals){

  const host = document.getElementById(containerId);
  if (!host || !policySignals?.length) return;

  const regionStats = {};

  policySignals.forEach(a=>{
    const region = a.region || "Global";

    if (!regionStats[region]){
      regionStats[region] = {
        total: 0,
        tightening: 0,
        easing: 0
      };
    }

    regionStats[region].total += 1;

    if (a.signal_sentiment?.label === "risk"){
      regionStats[region].tightening += 1;
    }

    if (a.signal_sentiment?.label === "opportunity"){
      regionStats[region].easing += 1;
    }
  });

  const maxTotal = Math.max(...Object.values(regionStats).map(r=>r.total),1);

  host.innerHTML = Object.entries(regionStats)
    .sort((a,b)=>b[1].total - a[1].total)
    .map(([region,stats])=>{

      const intensity = (stats.total / maxTotal) * 100;

      const biasScore = stats.tightening - stats.easing;

      let biasClass = "neutral";
      if (biasScore > 1) biasClass = "tightening";
      if (biasScore < -1) biasClass = "easing";

      return `
        <div class="mi-reg-heat-row ${biasClass}">
          <div class="mi-reg-heat-region">${region}</div>

          <div class="mi-reg-heat-bar">
            <div class="mi-reg-heat-fill" style="width:${intensity}%"></div>
          </div>

          <div class="mi-reg-heat-meta">
            <span>${stats.total}</span>
            <span>${biasScore > 0 ? "▲" : biasScore < 0 ? "▼" : "–"}</span>
          </div>
        </div>
      `;
    }).join("");
}  

function renderRegulatoryMatrix(policySignals){

  const ctx = document.getElementById("mi-reg-matrix-chart");
  if (!ctx || !policySignals?.length) return;

  const regionStats = {};

  policySignals.forEach(a=>{
    const region = a.region || "Global";

    if (!regionStats[region]){
      regionStats[region] = {
        total: 0,
        tightening: 0,
        easing: 0,
        riskScore: 0
      };
    }

    regionStats[region].total += 1;

    if (a.signal_sentiment?.label === "risk"){
      regionStats[region].tightening += 1;
      regionStats[region].riskScore += (a.signal_score || 10);
    }

    if (a.signal_sentiment?.label === "opportunity"){
      regionStats[region].easing += 1;
    }
  });

  const regions = Object.entries(regionStats);

  const dataPoints = regions.map(([region,stats])=>{
    const bias = stats.total
      ? (stats.tightening - stats.easing) / stats.total
      : 0;

    return {
      label: region,
      x: stats.total,
      y: bias * 100,
      r: Math.max(8, stats.riskScore / 12),
      bias
    };
  });

  const meanX = dataPoints.reduce((a,d)=>a+d.x,0) / dataPoints.length;
  const meanY = dataPoints.reduce((a,d)=>a+d.y,0) / dataPoints.length;

  if (ctx._chart){
    ctx._chart.data.datasets[0].data = dataPoints;
    ctx._chart.update();
    return;
  }

  ctx.$meanX = meanX;
  ctx.$meanY = meanY;
  ctx.$meanProgress = 0;

  const quadrantPlugin = {
    id: "quadrantAndMeans",

    beforeDraw(chart, args, options){
      const {ctx, chartArea, scales} = chart;
      if (!chartArea) return;

      const {left, right, top, bottom, width, height} = chartArea;

      ctx.save();

      // --- Quadrant shading ---
      ctx.globalAlpha = 0.04;

      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(left + width/2, top, width/2, height/2);

      ctx.fillStyle = "#27ae60";
      ctx.fillRect(left + width/2, top + height/2, width/2, height/2);

      ctx.restore();
    },

    afterDatasetsDraw(chart){
      const {ctx, chartArea, scales} = chart;
      if (!chartArea) return;

      const {left, right, top, bottom} = chartArea;

      const xScale = scales.x;
      const yScale = scales.y;

      const meanXPixel = xScale.getPixelForValue(chart.$meanX || 0);
      const meanYPixel = yScale.getPixelForValue(chart.$meanY || 0);

      const progress = chart.$meanProgress || 0;

      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6,6]);

      // --- Vertical mean line ---
      ctx.beginPath();
      ctx.moveTo(meanXPixel, bottom);
      ctx.lineTo(meanXPixel, bottom - (bottom - top) * progress);
      ctx.stroke();

      // --- Horizontal mean line ---
      ctx.beginPath();
      ctx.moveTo(left, meanYPixel);
      ctx.lineTo(left + (right - left) * progress, meanYPixel);
      ctx.stroke();

      ctx.restore();
    }
  };

  ctx._chart = new Chart(ctx, {
    type: "bubble",
    plugins: [quadrantPlugin],
    data: {
      datasets: [{
        data: dataPoints,
        backgroundColor: dataPoints.map(d=>{
          if (d.bias > 0.2) return "rgba(255,107,107,0.7)";
          if (d.bias < -0.2) return "rgba(39,174,96,0.7)";
          return "rgba(110,231,255,0.7)";
        }),
        borderColor: "rgba(255,255,255,0.3)",
        borderWidth: 1,
        hoverRadius: (ctx) => ctx.raw.r + 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: "easeOutQuart",
        delay: (context) => {
          if (context.type !== "data") return 0;
          return context.dataIndex * 120;
        },
        onProgress: function(animation){
          const chart = animation.chart;
          chart.$meanProgress =
            animation.currentStep / animation.numSteps;
        }
      },

      transitions: {
        active: {
          animation: {
            duration: 300
          }
        }
      },

      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context){
              const d = context.raw;
              return `${d.label}: ${d.x} signals, Bias ${d.y.toFixed(0)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Policy Signal Volume (14d)",
            color: "#9fb3c8"
          },
          ticks: { color: "#9fb3c8" },
          grid: { color: "rgba(255,255,255,0.05)" }
        },
        y: {
          title: {
            display: true,
            text: "Tightening Bias (%)",
            color: "#9fb3c8"
          },
          ticks: { color: "#9fb3c8" },
          grid: { color: "rgba(255,255,255,0.05)" }
        }
      }
    }
  });

  // Executive Insight Overlay
  const dominant = dataPoints.sort((a,b)=>b.x - a.x)[0];

  const insight = document.createElement("div");
  insight.className = "mi-reg-matrix-insight";
  insight.innerHTML = `
    <div class="mi-reg-matrix-insight-inner">
      <div class="mi-reg-matrix-insight-title">
        Regulatory Pressure Leader
      </div>
      <div class="mi-reg-matrix-insight-text">
        <strong>${dominant.label}</strong> leads with 
        <strong>${dominant.x}</strong> signals and 
        <strong>${dominant.y.toFixed(0)}%</strong> tightening bias.
      </div>
    </div>
  `;

  ctx.parentElement.appendChild(insight);
}

function renderFrontierGrid(rows){

  const host = document.getElementById("mi-innovation-heat");
  if (!host) return;

  const themes = {
    "Battery Chemistry": ["solid-state","lithium","sodium","cell","anode"],
    "Charging Architecture": ["800v","ultra-rapid","charging","infrastructure"],
    "Vehicle Software": ["software","autonomy","ai","lidar","update"],
    "Manufacturing Platform": ["gigafactory","platform","architecture","production"],
  };

  const counts = {};

  Object.entries(themes).forEach(([theme,keys])=>{
    counts[theme] = rows.filter(a=>{
      const text = ((a.title||"") + " " + (a.summary||"")).toLowerCase();
      return keys.some(k=>text.includes(k));
    }).length;
  });

  host.innerHTML = Object.entries(counts)
  .map(([theme,count])=>`
    <div class="mi-rd-theme ${count > 5 ? "is-active" : ""}">
      <div class="mi-rd-theme-left">
        <div class="mi-rd-theme-dot"></div>
        <div class="mi-rd-theme-name">${theme}</div>
      </div>
      <div class="mi-rd-theme-count">${count}</div>
    </div>
  `).join("");
}

 const categoryColor = {
    OEM: "#4DA3FF",
    Battery: "#A26BFF",
    Charging: "#FFD166",
    Software: "#5BE7C4",
    Industry: "#9fb3c8",
    Investment: "#FF6B6B"
  };

function renderInnovationWarning(rows){

  const host = document.getElementById("mi-innovation-momentum");
  if (!host) return;

  const anchor = new Date();
  const day = 24 * 60 * 60 * 1000;

  const curStart = new Date(anchor.getTime() - 7 * day);
  const prevStart = new Date(anchor.getTime() - 14 * day);

  const cur = rows.filter(a=>{
    const d = new Date(a.published);
    return d >= curStart && d <= anchor;
  });

  const prev = rows.filter(a=>{
    const d = new Date(a.published);
    return d >= prevStart && d < curStart;
  });

  const curCount = cur.length;
  const prevCount = prev.length;

  const acceleration = prevCount
    ? (curCount - prevCount) / prevCount
    : 0;

  // Theme concentration
  const batteryShare = cur.filter(a=>{
    const t = ((a.title||"") + " " + (a.summary||"")).toLowerCase();
    return t.includes("battery") || t.includes("solid-state");
  }).length / (curCount || 1);

  // Capital overlap
  const capitalOverlap = cur.filter(a=>{
    const t = ((a.title||"") + " " + (a.summary||"")).toLowerCase();
    return t.includes("funding") || t.includes("investment") || t.includes("ipo");
  }).length / (curCount || 1);

  // Composite score
  let score = 50;

  score += acceleration * 40;
  score += batteryShare * 30;
  score += capitalOverlap * 20;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let regime = "stable";
  let label = "Stable innovation flow";

  if (score >= 75){
    regime = "breakthrough";
    label = "Breakthrough Regime";
  }
  else if (score >= 60){
    regime = "elevated";
    label = "Elevated acceleration";
  }
  else if (score >= 45){
    regime = "monitoring";
    label = "Acceleration building";
  }

  host.innerHTML = `
    <div class="mi-innovation-index-wrap ${regime}">
      <div class="mi-innovation-pulse"></div>

      <div class="mi-innovation-index-score">
        ${score}
      </div>

      <div class="mi-innovation-index-meta">
        <div class="mi-innovation-index-title">
          Breakthrough Early Warning Index
        </div>
        <div class="mi-innovation-index-label">
          ${label}
        </div>
        <div class="mi-innovation-index-sub">
          <span>Acceleration ${(acceleration*100).toFixed(0)}%</span>
          <span>Battery ${(batteryShare*100).toFixed(0)}%</span>
          <span>Capital ${(capitalOverlap*100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  `;
}

function renderInnovationIntelligence(rows, anchorDate){

  const innovationRows = rows.filter(isInnovation);

  const signal = buildSignalStructure(
    innovationRows,
    anchorDate
  );

  // 1. Breakthrough density radar → first card
  renderSignalStructure("mi-innovation-index", signal);

  // 2. Frontier theme grid → second card
  renderFrontierGrid(innovationRows);

  // 3. Early warning system → third card
  renderInnovationWarning(innovationRows);
}

let __miStoryCache = null;

async function loadMarketIntel() {
  const res = await fetch("./data/market-intel.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load market-intel.json");
  const data = await res.json();

  window.marketIntelData = data;

  renderBrief(data);
  renderKpis(data.kpis || {});

  if (document.body.getAttribute("data-mi-tab") === "stories") {
    applyPresetLocal("top");
  }

  // Update pills first
  const pointer = await wireLatestBrief();
  renderLatestBriefCard(pointer, data.kpis || {});

  const weekPill = document.getElementById("mi-pill-week");
  const updPill = document.getElementById("mi-pill-updated");
  if (weekPill) weekPill.textContent = `Week: ${pointer?.week || "–"}`;
  if (updPill) updPill.textContent = `Updated: ${data.updated ? fmtDate(data.updated) : "–"}`;

  // Charts should run even if watchlists fail
  try{
    const anchor = data.updated ? new Date(data.updated) : new Date();
    const signal = buildSignalStructure(data.articles || [], anchor);
    renderSignalStructure("mi-chart-category", signal);
    renderMomentumChart(signal);
    renderCoverageInsight(signal, data.kpis?.by_region_7d || {});

    const rawStories = data.articles || data.stories || data.items || [];

    const storyList = rawStories
      .map(normalizeStory)
      .filter(s => s && s.published);

    window.marketStories = storyList;
    __miStoryCache = storyList;

    renderTrendChart(storyList, 7);
    renderIntensityChart(storyList);
    renderCapitalIntelligence(storyList, anchor);

    svgBars("mi-chart-region", data.kpis?.by_region_7d || {}, { max: 6 });
  }catch(e){
    console.warn("Chart render failed:", e);
  }

  const rows = Array.isArray(data.articles)
    ? data.articles
    : Array.isArray(data.stories)
    ? data.stories
    : Array.isArray(data.items)
    ? data.items
    : [];

  // ==============================
  // REGULATIONS TAB
  // ==============================

  const policySignals = rows.filter(a => normSignalCategory(a.category) === "Policy");

  const elevated = policySignals.filter(a =>
    a.signal_sentiment?.label === "risk"
  ).length;

  // 14d volatility calculation
  const policyDates = policySignals
    .map(a => new Date(a.published))
    .filter(d => !isNaN(d));

  let volatilityPct = 0;

  if (policyDates.length > 1){
    const countsByDay = {};

    policyDates.forEach(d=>{
      const key = d.toISOString().slice(0,10);
      countsByDay[key] = (countsByDay[key] || 0) + 1;
    });

    const values = Object.values(countsByDay);
    const mean = values.reduce((a,b)=>a+b,0) / values.length;

    const variance = values.reduce((sum,v)=>sum + Math.pow(v-mean,2),0) / values.length;
    const stdDev = Math.sqrt(variance);

    volatilityPct = mean ? (stdDev / mean) * 100 : 0;
  }

  const riskEl = document.getElementById("mi-reg-risk");
  const regionEl = document.getElementById("mi-reg-region");
  const momentumEl = document.getElementById("mi-reg-momentum");
  const feedEl = document.getElementById("mi-reg-feed");
  const strategyEl = document.getElementById("mi-reg-strategy");
  const indexEl = document.getElementById("mi-reg-index");

  if (riskEl){
    riskEl.innerHTML = `
      <div><strong>${policySignals.length}</strong> total policy signals (14d)</div>
      <div><strong>${elevated}</strong> elevated risk developments</div>
    `;
  }

  // Regional breakdown
  if (regionEl){
    const regionCount = {};
    policySignals.forEach(a=>{
      regionCount[a.region] = (regionCount[a.region]||0)+1;
    });

    const maxRegion = Math.max(...Object.values(regionCount),1);

    regionEl.innerHTML = Object.entries(regionCount)
      .sort((a,b)=>b[1]-a[1])
      .map(([r,c])=>`
        <div class="mi-reg-region-row">
          <div class="mi-reg-region-left">
            <span>${r}</span>
            <div class="mi-reg-mini-bar">
              <div style="width:${(c/maxRegion)*100}%"></div>
            </div>
          </div>
          <span>${c}</span>
        </div>
      `).join("");
  }

  renderRegulatoryHeatmap("mi-reg-heatmap", policySignals);
  renderRegulatoryMatrix(policySignals);

  // ----------------------------
  // Innovation Intelligence
  // ----------------------------
  const anchor = data.updated ? new Date(data.updated) : new Date();
  renderInnovationIntelligence(rows, anchor);

  function renderInnovationFeed(rows){

    const host = document.getElementById("mi-innov-full");
    if (!host) return;

    const groups = {
      "OEM": [],
      "Battery": [],
      "Charging": [],
      "Software": [],
      "Industry": [],
      "Investment": []
    };

    const anchor = new Date();
    const day = 24 * 60 * 60 * 1000;

    const curStart = new Date(anchor.getTime() - 7 * day);
    const prevStart = new Date(anchor.getTime() - 14 * day);

    const groupMomentum = {};

    Object.keys(groups).forEach(group => {

      const curCount = rows.filter(a=>{
        const d = new Date(a.published);
        return d >= curStart && d <= anchor && (a.category === group);
      }).length;

      const prevCount = rows.filter(a=>{
        const d = new Date(a.published);
        return d >= prevStart && d < curStart && (a.category === group);
      }).length;

      const delta = prevCount
        ? ((curCount - prevCount) / prevCount)
        : 0;

      groupMomentum[group] = {
        cur: curCount,
        delta
      };

    });

    rows.forEach(a=>{
      const cat = (a.category || "").trim();
      const text = ((a.title || "") + " " + (a.summary || "")).toLowerCase();

      if (groups[cat]){
        groups[cat].push(a);
        return;
      }

      // Software detection fallback
      if (
        text.includes("software") ||
        text.includes("ai") ||
        text.includes("autonomy") ||
        text.includes("autonomous") ||
        text.includes("lidar") ||
        text.includes("platform") ||
        text.includes("architecture") ||
        text.includes("operating system") ||
        text.includes("ota") ||
        text.includes("update")
      ){
        groups["Software"].push(a);
      }
    });


    const orderedGroups = ["OEM","Battery","Charging","Software","Industry","Investment"];

    host.innerHTML = `
      <div class="mi-intel-grid">
        ${
          orderedGroups.map(group => {

            const items = groups[group] || [];
            const momentum = groupMomentum[group] || { delta: 0 };
            const delta = momentum.delta;

            const intensity = Math.min(Math.abs(delta) * 4, 1);

            let bgStyle = "";

            if (delta > 0.05) {
              bgStyle = `
                background: linear-gradient(
                  135deg,
                  rgba(39,174,96,${0.08 + intensity * 0.15}) 0%,
                  rgba(39,174,96,0.02) 60%
                );
              `;
            } 
            else if (delta < -0.05) {
              bgStyle = `
                background: linear-gradient(
                  135deg,
                  rgba(255,107,107,${0.08 + intensity * 0.15}) 0%,
                  rgba(255,107,107,0.02) 60%
                );
              `;
            }

            const deltaPct = (delta * 100).toFixed(0);

            const deltaClass =
              delta > 0.05 ? "mi-delta-up" :
              delta < -0.05 ? "mi-delta-down" :
              "mi-delta-flat";

            const arrow =
              delta > 0.05 ? "▲" :
              delta < -0.05 ? "▼" :
              "–";

            return `
              <div class="mi-intel-block" 
              style="
                ${bgStyle}
                border-top:3px solid ${categoryColor[group] || "#6ee7ff"};
                box-shadow:0 0 0 1px rgba(255,255,255,0.04);
              ">

              <div class="mi-intel-block-header">
                <div class="mi-intel-block-title">${group}</div>

                <div class="mi-intel-block-stats">
                  <span class="mi-intel-block-count">${items.length}</span>
                  <span class="mi-intel-block-delta ${deltaClass}">
                    ${arrow} ${Math.abs(deltaPct)}%
                  </span>
                </div>
              </div>

              <div class="mi-intel-block-body">
                ${
                  items.length
                    ? items.slice(0,6).map(a=>{

                        const [badgeText, badgeClass] = signalBadge(a);

                        return `
                          <a 
                            class="mi-intel-item"
                            href="${a.link || a.url || '#'}"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <div class="mi-intel-item-title">
                              ${a.title}
                            </div>

                            <div class="mi-intel-item-meta">
                              <span class="mi-intel-badge ${badgeClass}">
                                ${badgeText}
                              </span>
                              <span>${a.region || "Global"}</span>
                              <span>${a.published ? fmtDate(a.published) : ""}</span>
                            </div>
                          </a>
                        `;
                      }).join("")
                    : `<div class="mi-intel-empty">No current signals</div>`
                }
              </div>

              </div>
            `;
          }).join("")
        }
      </div>
    `;
  }

  // Innovation feed (separate from stories)
  const innovationOnly = rows
    .slice()
    .sort((a,b)=>(b.published || "").localeCompare(a.published || ""));

  renderInnovationFeed(innovationOnly);

  // Momentum
  if (momentumEl){
    momentumEl.innerHTML =
      policySignals.length
        ? `
          Policy flow reflects ${elevated > policySignals.length/2 ? "tightening bias" : "mixed regulatory posture"} across core regions.
          <div style="opacity:.6;margin-top:6px;font-size:12px;">
            Policy volatility: ${volatilityPct.toFixed(0)}% vs prior 14d
          </div>
        `
        : "No policy activity detected.";
  }

  // Live feed
  if (feedEl){
    feedEl.innerHTML = policySignals
      .slice(0,6)
      .map(a=>`
        <div class="mi-reg-item ${a.signal_sentiment?.label === "risk" ? "risk-item" : ""}">
          <div>${a.title}</div>
          <div style="opacity:.5;font-size:12px;">
            ${a.region || "Global"} · ${fmtDate(a.published)}
          </div>
        </div>
      `).join("");
  }

  // Regulatory Tightening Index
  let tighteningScore = 0;
  let easingScore = 0;

  policySignals.forEach(a=>{
    const weight = (a.signal_score || 10) / 20;

    if (a.signal_sentiment?.label === "risk") tighteningScore += weight;
    if (a.signal_sentiment?.label === "opportunity") easingScore += weight;
  });

  let rawIndex = 50;

  if (tighteningScore + easingScore > 0){
    rawIndex = 50 + ((tighteningScore - easingScore) * 10);
  }

  const regIndex = Math.max(0, Math.min(100, Math.round(rawIndex)));

  let indexClass = "neutral";
  let indexLabel = "Balanced posture";

  if (regIndex >= 65){
    indexClass = "tightening";
    indexLabel = "Tightening regime";
  }
  else if (regIndex <= 35){
    indexClass = "easing";
    indexLabel = "Easing regime";
  }

  if (indexEl){
    indexEl.innerHTML = `
      <div class="mi-reg-index-wrap">
        <div class="mi-reg-index-value ${indexClass}">
          ${regIndex}
        </div>

        <div class="mi-reg-meter">
          <div class="mi-reg-meter-fill ${indexClass}" style="width:${regIndex}%"></div>
        </div>

        <div class="mi-reg-index-label">
          Regulatory Tightening Index · ${indexLabel}
        </div>
      </div>
    `;
  }

  if (strategyEl){
    strategyEl.innerHTML = `
      Regulatory posture suggests ${regIndex > 60 ? "tightening pressure" : "stable policy backdrop"}
      with capital allocation implications for OEMs and supply chain operators.
    `;
  }

  const regs = rows
  .filter(a => normSignalCategory(a.category) === "Policy")
  .sort((a,b) => (b.stratum_impact_index || 0) - (a.stratum_impact_index || 0)).slice().sort((a,b) => (b.published || "").localeCompare(a.published || ""));
  const innov = rows
  .filter(isInnovation)
  .sort((a,b) => (b.stratum_impact_index || 0) - (a.stratum_impact_index || 0)).slice().sort((a,b) => (b.published || "").localeCompare(a.published || ""));

  try{
  // Overview carousels (these IDs exist in your Overview tab)
  renderWatchlist("mi-regs-track", regs, 12);
  renderWatchlist("mi-innov-track", innov, 12);

  // Full tab lists (these IDs exist in your Regulations/Innovation tabs)
  renderList("mi-regs-full", regs, 30, "stream");

  // Activate carousel controls and autoplay
  wireCarousels();
  }catch(e){
    console.warn("Watchlist render failed:", e);
  }

  document.querySelectorAll(".mi-chip").forEach(btn => {
    if (btn.dataset.miBound === "1") return;
    btn.dataset.miBound = "1";
    btn.addEventListener("click", () => {
      const view = btn.dataset.miView;
      setActiveChip(view);
      applyPresetLocal(view);
    });
  });

  document.querySelectorAll(".mi-tab").forEach(btn => {
    if (btn.dataset.miBound === "1") return;
    btn.dataset.miBound = "1";

    btn.addEventListener("click", () => {
      const tab = btn.dataset.miTab;

      setTab(tab);

      if (tab === "stories") {
        applyPresetLocal("top");
      }
    });
  });

  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get("tab") || "overview";

  setTab(initialTab);

  const viewParam = params.get("view");

  if (viewParam) {
    setActiveChip(viewParam);
    applyPresetLocal(viewParam);
  }

  // Only run story preset when landing directly on stories
  if (initialTab === "stories" && !viewParam) {
    applyPresetLocal("top");
  }

  wireViewAllLinks();

  ["f-region","f-category","f-q","f-sort"].forEach(id => {
    const node = document.getElementById(id);
    if (!node) return;
    if (node.dataset.miBound === "1") return;
    node.dataset.miBound = "1";
    node.addEventListener("input", () => applyPresetLocal("top"));
  });

}

document.getElementById("mi-drawer-close")
  ?.addEventListener("click", ()=>{
    document.getElementById("mi-story-drawer").classList.remove("active");
});


window.loadMarketIntelIntoDrawer = async function () {
  if (window.__mi_loading) return;
  window.__mi_loading = true;
  try {
    await loadMarketIntel();
  } finally {
    window.__mi_loading = false;
  }
};

window.initMarketIntel = function(){
  loadMarketIntel().catch(()=>{});
};

if (document.body && document.body.dataset && document.body.dataset.page === "market-intelligence") {
  loadMarketIntel().catch(() => {});
}

document.addEventListener("click", e=>{
  if(!e.target.dataset.trend) return;

  document.querySelectorAll("[data-trend]").forEach(b=>b.classList.remove("is-active"));
  e.target.classList.add("is-active");

  const size = parseInt(e.target.dataset.trend,10);
  renderTrendChart(window.marketStories, size);
});

/* =========================
   Story Drawer Logic
========================= */

document.addEventListener("click", e => {
  const trigger = e.target.closest(".mi-story-open");
  if (!trigger) return;

  const id = trigger.dataset.storyId;
  const story = (window.marketStories || []).find(s => String(s.id) === String(id));
  if (!story) return;

  const drawer = document.getElementById("mi-story-drawer");
  const body = document.getElementById("mi-drawer-body");

  const signal = scoreTopStory(story);

  const signalClass =
    signal >= 10 ? "signal-high" :
    signal >= 6 ? "signal-medium" :
    "signal-low";

  body.innerHTML = `

  <div class="mi-drawer-header ${signalClass}">

    <div class="mi-drawer-meta">

      <span class="mi-drawer-badge">
        ${story.category || "Signal"}
      </span>

      <span class="mi-drawer-region">
        ${story.region || "Global"}
      </span>

      <span class="mi-drawer-source">
        ${story.source || ""}
      </span>

      <span class="mi-drawer-date">
        ${story.published ? fmtDate(story.published) : ""}
      </span>

    </div>

    <h2 class="mi-drawer-title">
      ${story.title}
    </h2>

  </div>

  <div class="mi-drawer-body">

    <p class="mi-drawer-summary">
      ${story.summary || "No summary available."}
    </p>

    ${
      story.link || story.url
        ? `<div class="mi-drawer-cta">
            <a class="mi-btn" href="story.html?id=${story.id}">
              Read Full Article
            </a>
          </div>`
        : ""
    }

  </div>
`;

  drawer.classList.add("active");
  document.body.style.overflow = "hidden";
});

document.getElementById("mi-drawer-close")
?.addEventListener("click", () => {
  document.getElementById("mi-story-drawer").classList.remove("active");
  document.body.style.overflow = "";
});

document.getElementById("mi-story-drawer")
?.addEventListener("click", e => {
  if (e.target.id === "mi-story-drawer") {
    document.getElementById("mi-story-drawer").classList.remove("active");
    document.body.style.overflow = "";
  }
});

function renderCapitalIntelligence(stories, anchorDate){

  const host = document.getElementById("mi-capital-content");
  if (!host || !stories?.length) return;

  const anchor = anchorDate || new Date();
  const day = 24 * 60 * 60 * 1000;

  const curStart = new Date(anchor.getTime() - 7 * day);
  const prevStart = new Date(anchor.getTime() - 14 * day);

  const isCapital = (a) => {

    const category = normSignalCategory(a.category);

    // PRIORITY: structured detection
    if (category === "Capital") return true;

    const text = ((a.title || "") + " " + (a.summary || "")).toLowerCase();

    const keywords = [
      "funding",
      "raise",
      "raised",
      "capital injection",
      "ipo",
      "public offering",
      "acquisition",
      "merger",
      "m&a",
      "strategic stake",
      "equity",
      "venture",
      "private equity",
      "infrastructure investment",
      "battery plant investment",
      "grant",
      "subsidy",
      "financing",
      "bond issuance",
      "debt facility"
    ];

    return keywords.some(k => text.includes(k));
  };

  const cur = stories.filter(a=>{
    const d = new Date(a.published);
    return d >= curStart && d <= anchor && isCapital(a);
  });

  const prev = stories.filter(a=>{
    const d = new Date(a.published);
    return d >= prevStart && d < curStart && isCapital(a);
  });

  const countCur = cur.length;
  const countPrev = prev.length;

  const delta = countPrev ? ((countCur - countPrev)/countPrev)*100 : 0;

  const ipoCount = cur.filter(a=>a.title?.toLowerCase().includes("ipo")).length;
  const maCount = cur.filter(a=>{
    const t = a.title?.toLowerCase() || "";
    return t.includes("acquisition") || t.includes("merger") || t.includes("m&a");
  }).length;

  const baseScore = countCur * 12;
  const accelerationBonus = delta > 20 ? 15 : 0;
  const stabilityBonus = delta > 0 && delta <= 20 ? 8 : 0;

  const batteryInvestment = cur.filter(a => {
    const t = ((a.title || "") + " " + (a.summary || "")).toLowerCase();
    return t.includes("battery") || t.includes("cell") || t.includes("gigafactory");
  }).length;

  const infraInvestment = cur.filter(a => {
    const t = ((a.title || "") + " " + (a.summary || "")).toLowerCase();
    return t.includes("charging") || t.includes("infrastructure") || t.includes("grid");
  }).length;

  const heatScore = Math.min(100, baseScore + accelerationBonus + stabilityBonus);

 // ---- Tone Logic (MUST be outside template string) ----
let tone;
let toneClass;

if (countCur === 0) {
  tone = "inactive";
  toneClass = "tone-inactive";
} else if (delta > 20) {
  tone = "accelerating materially";
  toneClass = "tone-accelerating";
} else if (delta > 5) {
  tone = "expanding moderately";
  toneClass = "tone-expanding";
} else if (delta < -15 && countCur >= 3) {
  tone = "moderating";
  toneClass = "tone-moderating";
} else if (delta < -15) {
  tone = "contracting";
  toneClass = "tone-contracting";
} else {
  tone = "stable";
  toneClass = "tone-stable";
}

host.innerHTML = `
  <div class="mi-capital-grid">
    <div class="mi-capital-card heat-${Math.floor(heatScore/25)}">
      <div class="mi-capital-label">Capital Events (7d)</div>
      <div class="mi-capital-value">${countCur}</div>
      <div class="mi-capital-delta">
        <span class="delta-value ${delta >= 0 ? "delta-up" : "delta-down"}">
          ${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%
        </span> vs prior
      </div>
    </div>

    <div class="mi-capital-card heat-${Math.floor(heatScore/25)}">
      <div class="mi-capital-label">IPO Activity</div>
      <div class="mi-capital-value">${ipoCount}</div>
      <div class="mi-capital-delta">Last 7 days</div>
    </div>

    <div class="mi-capital-card heat-${Math.floor(heatScore/25)}">
      <div class="mi-capital-label">M&A Activity</div>
      <div class="mi-capital-value">${maCount}</div>
      <div class="mi-capital-delta">Last 7 days</div>
    </div>

    <div class="mi-capital-card heat-${Math.floor(heatScore/25)}">
      <div class="mi-capital-label">Capital Heat Index</div>
      <div class="mi-capital-value">${heatScore}</div>
      <div class="mi-capital-delta">Intensity score</div>
    </div>
  </div>

  <!-- NEW BREAKDOWN BLOCK -->
  <div class="mi-capital-breakdown">
    <div>
      <span class="break-label">Battery Investment</span>
      <span class="break-value">${batteryInvestment}</span>
    </div>
    <div>
      <span class="break-label">Infrastructure Investment</span>
      <span class="break-value">${infraInvestment}</span>
    </div>
  </div>

  <div class="mi-capital-summary ${toneClass}">
    Capital activity is ${tone} across EV markets, with ${countCur} capital-relevant events detected in the latest 7-day window.
  </div>
`;
}

/* =========================
   TAB SWITCHING
========================= */

document.querySelectorAll(".mi-tab").forEach(tab => {

  tab.addEventListener("click", () => {

    const target = tab.dataset.miTab;

    // deactivate tabs
    document.querySelectorAll(".mi-tab").forEach(t =>
      t.classList.remove("is-active")
    );

    // deactivate panels
    document.querySelectorAll(".mi-tabpanel").forEach(p =>
      p.classList.remove("is-active")
    );

    // activate clicked tab
    tab.classList.add("is-active");

    // activate corresponding panel
    const panel = document.getElementById("tab-" + target);
    if (panel) panel.classList.add("is-active");

  });

});
