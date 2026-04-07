/* =========================
   HELPERS
========================= */

function qs(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function val(v, suffix = "") {
  if (v == null) return "TBC";
  return `${v}${suffix}`;
}

const COMPARE_KEY = "ev_compare_slugs";

/* =========================
   LOAD MODEL (GLOBAL + CHINA)
========================= */

async function loadModel(slug) {

  // ✅ 1. Try main dataset (CORRECT PATH)
  try {
    const res = await fetch(`/site/data/models/${encodeURIComponent(slug)}.json`);
    if (res.ok) return await res.json();
  } catch (e) {}

  // ✅ 2. Fallback to China dataset
  try {
    const res = await fetch("/data/china.json");
    if (!res.ok) throw new Error("China dataset failed");

    const data = await res.json();
    const match = (data.models || []).find(m => m.slug === slug);

    if (match) return match;

  } catch (e) {}

  // ❌ HARD FAIL
  throw new Error(`Model not found: ${slug}`);
}

/* =========================
   READ SLUGS (URL + STORAGE SAFE)
========================= */

function readCompareSlugs() {
  const url = new URL(window.location.href);
  const slugsParam = url.searchParams.get("slugs");

  if (slugsParam) {
    return slugsParam.split(",").map(s => s.trim()).filter(Boolean);
  }

  try {
    const raw = localStorage.getItem("ev_compare_slugs");
    if (!raw) return [];

    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];

  } catch {
    return [];
  }
}

/* =========================
   BUILD COMPARE UI
========================= */

function buildCompare(models) {

  const cards = `
    <div class="comparegrid">
      ${models.map(m => {

        // 🔥 FIX: support BOTH formats
        const img = m.images?.[0] || m.image || "";

        return `
        <div class="comparecard">
          <div class="compareimg" style="background-image:url('${img}')"></div>

          <div class="comparebody">
            <div class="kicker">${m.category || "EV Model"}</div>

            <div class="title" style="margin:6px 0 6px;">
              ${m.brand} ${m.model}
            </div>

            <div class="tagline">${m.tagline || ""}</div>

            <div class="meta" style="margin-top:10px;">
              <span class="pill">
                Last checked: ${m.source?.last_checked || "TBC"}
              </span>
            </div>
          </div>
        </div>
        `;
      }).join("")}
    </div>
  `;

  const rows = [
    ["Drivetrain", m => val(m.specs?.drivetrain)],
    ["WLTP range", m => val(m.specs?.range_wltp_km, " km")],
    ["0–100 km/h", m => val(m.specs?.accel_0_100_s, " s")],
    ["DC 10–80%", m => val(m.specs?.dc_charge_10_80_min, " min")],
    ["Battery", m => val(m.specs?.battery_kwh, " kWh")]
  ];

  const table = `
    <div class="compare-table-wrap" style="margin-top:14px;">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Spec</th>
            ${models.map(m => `<th>${m.brand} ${m.model}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(([label, getter]) => `
            <tr>
              <td class="spec-col">${label}</td>
              ${models.map(m => `<td>${getter(m)}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  return `
    <div class="compare-stack">
      ${cards}
      ${table}
    </div>
  `;
}

/* =========================
   INIT
========================= */

(async function init() {

  const wrap = document.getElementById("compareGrid");

  if (!wrap) {
    console.error("compareGrid element missing");
    return;
  }

  const slugs = readCompareSlugs().slice(0, 3);

  console.log("COMPARE SLUGS:", slugs); // 🔥 DEBUG

  if (!slugs.length) {
    wrap.innerHTML = `
      <div class="panel">
        No models selected. Go back and choose up to 3 models to compare.
      </div>
    `;
    return;
  }

  try {
    const models = await Promise.all(slugs.map(loadModel));

    console.log("LOADED MODELS:", models); // 🔥 DEBUG

    wrap.innerHTML = buildCompare(models);

  } catch (e) {
    console.error("COMPARE ERROR:", e);

    wrap.innerHTML = `
      <div class="panel">
        Could not load comparison.
      </div>
    `;
  }

})();