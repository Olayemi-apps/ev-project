

async function loadChinaModels(){
  const res = await fetch("../data/china.json");
  if (!res.ok) throw new Error("Failed to load china models");
  const data = await res.json();
  return data.models || [];
}

async function loadIndex() {

  const res = await fetch("./data/models/index.json");

  if (!res.ok) throw new Error("Failed to load models index");

  const json = await res.json();

  // 🔥 FIX: support BOTH formats
  const data = Array.isArray(json) ? json : json.models;

  if (!Array.isArray(data)) {
    throw new Error("Invalid index.json format");
  }

  return data;
}

/*===========================
          HELPERS
============================*/

function fmtRange(v) {
  if (v == null) return "Range: TBC";
  return `Range: ${v} km`;
}
function fmtAccel(v) {
  if (v == null) return "0–100: TBC";
  return `0–100: ${v}s`;
}
function fmtCharge(v) {
  if (v == null) return "10–80: TBC";
  return `10–80: ${v} min`;
}

const compareBar = document.getElementById("compareBar");
const compareCount = document.getElementById("compareCount");
const compareGo = document.getElementById("compareGo");

function renderCompareBar() {

  if (!compareBar || !compareCount || !compareGo) return;

  const compareSet = getCompareSet();
  const slugs = Array.from(compareSet);

  document.body.classList.toggle("has-comparebar", slugs.length > 0);

  if (!slugs.length) {
    compareBar.style.display = "none";
    return;
  }

  compareBar.style.display = "block";
  compareCount.textContent = `${slugs.length} selected`;

  compareGo.href = `./compare.html?slugs=${encodeURIComponent(
    slugs.join(",")
  )}`;
}

const COMPARE_KEY = "ev_compare_slugs";



/*========================================================*/

function getCategoryOptions(models) {
  const set = new Set(models.map(m => m.category).filter(Boolean));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function matchesQuery(m, q) {
  if (!q) return true;
  const hay = `${m.brand} ${m.model} ${m.category} ${m.tagline}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function applySort(models, sortKey) {
  const copy = [...models];
  if (sortKey === "range_desc") {
    copy.sort((a, b) => (b.specs?.range_wltp_km ?? -1) - (a.specs?.range_wltp_km ?? -1));
    return copy;
  }
  if (sortKey === "accel_asc") {
    copy.sort((a, b) => (a.specs?.accel_0_100_s ?? 999) - (b.specs?.accel_0_100_s ?? 999));
    return copy;
  }
  copy.sort(
    (a, b) =>
      (a.brand || "").localeCompare(b.brand || "") ||
      (a.model || "").localeCompare(b.model || "")
  );
  return copy;
}

const nav = document.querySelector(".nav");

if(nav){
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  });
}

function computeLeaders(models){

  const longestRange = [...models].sort(
    (a,b)=>(b.specs?.range_wltp_km ?? 0)-(a.specs?.range_wltp_km ?? 0)
  )[0]?.slug;

  const fastestAccel = [...models].sort(
    (a,b)=>(a.specs?.accel_0_100_s ?? 999)-(b.specs?.accel_0_100_s ?? 999)
  )[0]?.slug;

  const fastestCharge = [...models].sort(
    (a,b)=>(a.specs?.dc_charge_10_80_min ?? 999)-(b.specs?.dc_charge_10_80_min ?? 999)
  )[0]?.slug;

  return {
    longestRange,
    fastestAccel,
    fastestCharge
  };

}

/*=== FAQ UPDATE =====*/

document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.parentElement;

    // Close others
    document.querySelectorAll(".faq-item").forEach((el) => {
      if (el !== item) el.classList.remove("active");
    });

    // Toggle current
    item.classList.toggle("active");
  });
});

/*+++++++++++++++++++++====*/


function getCompareSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function saveCompareSet(set) {
  localStorage.setItem(COMPARE_KEY, JSON.stringify(Array.from(set)));
}

function getSignalIcon(signal){

  if(signal === "growth") return "↗";
  if(signal === "strong") return "●";
  if(signal === "stable") return "—";
  if(signal === "emerging") return "△";

  return "";
}

function cardHTML(m, compareSet, leaders) {

    const displayCategory =
    m.slug === "porsche-taycan-turbo-gt"
      ? "Performance EV"
      : (m.category || "EV Model");

  const imgSrc = m.image || (m.images && m.images[0]) || "";
  const img = imgSrc ? `<img src="${imgSrc}" alt="${m.brand} ${m.model}" loading="lazy"/>` : "";
  const range = fmtRange(m.specs?.range_wltp_km || m.range_km);
  const accel = fmtAccel(m.specs?.accel_0_100_s || m.accel);
  const charge = fmtCharge(m.specs?.dc_charge_10_80_min || m.charge_time);
  const checked = compareSet.has(m.slug) ? "checked" : "";

  // BADGES

  const badges = [];

  if(leaders.longestRange === m.slug){
    badges.push(`<span class="metric-badge">Longest Range</span>`);
  }

  if(leaders.fastestAccel === m.slug){
    badges.push(`<span class="metric-badge">Fastest EV</span>`);
  }

  if(leaders.fastestCharge === m.slug){
    badges.push(`<span class="metric-badge">Fastest Charging</span>`);
  }

  if(m.import_viability){
    badges.push(`<span class="metric-badge">${m.import_viability}</span>`);
  }

  return `
    <div class="card">
      <a href="./model.html?slug=${encodeURIComponent(m.slug)}" aria-label="Open ${m.brand} ${m.model}">
        <div class="card-media">${img}</div>
      </a>
      <div class="card-body">

        <div class="card-toprow">
          <div class="kicker">${displayCategory}</div>

          
          ${m.signal ? `
            <span class="signal-badge signal-${m.signal}">
              ${m.signal.toUpperCase()}
            </span>
          ` : ""}

          ${m.signal_score !== undefined ? `
              <div class="signal-score signal-${m.signal}">
                <span class="score">${m.signal_score}</span>
                <span class="signal-text">${m.signal?.toUpperCase() || ""}</span>
                <span class="label">Market Signal</span>
              </div>

              
          ` : ""}


          <label class="compare-toggle" onclick="event.stopPropagation()">
            <input 
                  class="compare-checkbox" 
                  type="checkbox" 
                  data-slug="${m.slug}" 
                  ${checked}
                  onclick="event.stopPropagation()"
                />
            Compare
          </label>
        </div>

        <a href="./model.html?slug=${encodeURIComponent(m.slug)}">
          <h3 class="title">${m.brand} ${m.model}</h3>

          ${badges.length ? `<div class="metric-badges">${badges.join("")}</div>` : ""}

          <p class="tagline">${m.tagline || ""}</p>
        </a>

        <div class="meta">
          <span class="pill">${range}</span>
          <span class="pill">${accel}</span>
          <span class="pill">${charge}</span>
        </div>
      </div>
    </div>
  `;
}

const CATEGORY_MAP = {
  "Executive Sedan": "Luxury Sedan",
  "Luxury Sedan": "Luxury Sedan",

  "Premium SUV": "Luxury SUV",
  "Luxury SUV": "Luxury SUV",

  "Performance EV": "Performance EV",
  "Performance Sedan": "Performance EV",
  "Performance Sports Sedan": "Performance EV",
  "High-performance Executive Sedan": "Performance EV",
  "Premium SUV": "Luxury SUV",

  "Luxury Shooting Brake": "Specialist / Utility",
  "Specialist / Utility": "Specialist / Utility"
};

function render(models, compareSet, leaders){

  const grid = document.getElementById("grid");

  const grouped = {};

  models.forEach(m => {

    const rawCategory = m.category || "Other";
    const mapped = CATEGORY_MAP[rawCategory] || rawCategory;

    const key = mapped.toLowerCase();

    if(!grouped[key]){
      grouped[key] = {
        label: mapped,
        items: []
      };
    }

    grouped[key].items.push(m);

  });

  const categoryOrder = [
    "luxury sedan",
    "luxury suv",
    "performance ev",
    "specialist / utility"
  ];

  let html = "";

  // Render known categories in order
  categoryOrder.forEach(key => {

    if(!grouped[key]) return;

    const section = grouped[key];

    html += `
      <section class="ev-section">
        <div class="ev-category">
          <h2 class="ev-section-title">${section.label}</h2>
        </div>

        <div class="ev-grid">
          ${section.items.map(m => cardHTML(m, compareSet, leaders)).join("")}
        </div>
      </section>
    `;
  });

  // Render remaining categories (clean fallback)
  Object.keys(grouped).forEach(key => {

    if(categoryOrder.includes(key)) return;

    const section = grouped[key];

    html += `
      <section class="ev-section">
        <div class="ev-category">
          <h2 class="ev-section-title">${section.label}</h2>
        </div>

        <div class="ev-grid">
          ${section.items.map(m => cardHTML(m, compareSet, leaders)).join("")}
        </div>
      </section>
    `;
  });

  grid.innerHTML = html;
}

document.addEventListener("change", function (e) {

  if (!e.target.classList.contains("compare-checkbox")) return;

  const slug = e.target.getAttribute("data-slug");
  if (!slug) return;

  let compareSet = getCompareSet();

  if (e.target.checked) {
    compareSet.add(slug);

    if (compareSet.size > 3) {
      compareSet.delete(slug);
      e.target.checked = false;
      return;
    }

  } else {
    compareSet.delete(slug);
  }

  saveCompareSet(compareSet);
  renderCompareBar();

});
  
  

async function initHome() {

  const grid = document.getElementById("grid");
  grid.innerHTML = `<div class="panel">Loading models...</div>`;

  let models = [];

  try {
    models = await loadIndex();
  } catch (err) {
    console.error("Index failed, falling back", err);
  }

  let chinaModels = [];

  try {
    chinaModels = await loadChinaModels();
  } catch (err) {
    console.error("China models failed", err);
  }

  if (!models.length) {
    models = chinaModels;
  }

  let leaders = computeLeaders(models);

  const featured = [...models]
  .filter(m => {
    const r = (m.uk_readiness || "").toLowerCase();
    return r === "ready" || r === "viable" || r === "import viable";
  })
  .sort((a, b) => (b.signal_score ?? 0) - (a.signal_score ?? 0))[0]
  || [...models].sort((a, b) => (b.signal_score ?? 0) - (a.signal_score ?? 0))[0];

  if (!models.length) {
    console.warn("Index empty, falling back to China models");
    models = chinaModels;
  }

  if(featured){
    const img = document.getElementById("featured-image");
    const title = document.getElementById("featured-title");
    const tag = document.getElementById("featured-tagline");
    const meta = document.getElementById("featured-meta");
    const link = document.getElementById("featured-link");

    if(img) img.src = featured.image;
    if(title) title.textContent = `${featured.brand} ${featured.model}`;
    if(tag) tag.textContent = featured.tagline;

    if(meta){
      meta.innerHTML = `
        <span class="pill">Range ${featured.specs?.range_wltp_km ?? "TBC"} km</span>
        <span class="pill">0-100 ${featured.specs?.accel_0_100_s ?? "TBC"} s</span>
      `;
    }

    if(link){
      link.href = `./model.html?slug=${featured.slug}`;
    }
  }

  const q = document.getElementById("q");
  const category = document.getElementById("category");
  const sort = document.getElementById("sort");
  const ukReadiness = document.getElementById("uk-readiness");

  for (const c of getCategoryOptions(models)) {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    category.appendChild(opt);
  }

  let compareSet = getCompareSet();

  const tabs = document.querySelectorAll(".data-tab");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      currentView = tab.dataset.view;
      update();
    });
  });

  function update() {

    const activeModels = currentView === "china" ? chinaModels : models;

    leaders = computeLeaders(activeModels);

    const filtered = activeModels
      .filter(m => matchesQuery(m, q?.value || ""))
      .filter(m => {
        if(!ukReadiness?.value) return true;
        return (m.uk_readiness || "").toLowerCase() === ukReadiness.value;
      })
      .filter(m => {
        const effectiveCategory =
          m.slug === "porsche-taycan-turbo-gt"
            ? "Performance EV"
            : m.category;

        return !category?.value || effectiveCategory === category.value;
      });

    const sorted = applySort(filtered, sort?.value || "brand");

    const gridModels = sorted.filter(m => m.slug !== "lucid-air-sapphire");

    compareSet = getCompareSet();

    render(gridModels, compareSet, leaders);
    renderCompareBar(); // 🔥 REQUIRED
  }

  q?.addEventListener("input", update);
  category?.addEventListener("change", update);
  sort?.addEventListener("change", update);
  ukReadiness?.addEventListener("change", update);

  setTimeout(update, 0);
}

/* ========================= */
/* REPLACE ENDS HERE */
/* ========================= */

window.initHome = initHome;

initHome().catch(err => {
  console.error(err);
  const grid = document.getElementById("grid");
  if (grid) {
    grid.innerHTML = `<div class="panel">No models available.</div>`;
  }
});


