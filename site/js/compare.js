function qs(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function val(v, suffix = "") {
  if (v == null) return "TBC";
  return `${v}${suffix}`;
}

const COMPARE_KEY = "ev_compare_slugs";

function readCompareSlugs() {
  // Prefer URL slugs if present
  const slugsParam = qs("slugs");
  if (slugsParam) {
    return slugsParam.split(",").map(s => s.trim()).filter(Boolean);
  }

  // Fallback to localStorage (matches app.js)
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    const arr = JSON.parse(raw || "[]");
    if (Array.isArray(arr)) return arr.map(String).map(s => s.trim()).filter(Boolean);
  } catch {}

  return [];
}


async function loadModel(slug) {
  const res = await fetch(`./data/models/${encodeURIComponent(slug)}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${slug}`);
  return await res.json();
}

function specRow(label, values) {
  return `
    <div class="tr">
      <div class="td k">${label}</div>
      <div class="td">${values.join("</div><div class=\"td\">")}</div>
    </div>
  `;
}

function buildCompare(models) {
  const cols = models.length;

  const cards = `
    <div class="comparegrid">
      ${models.map(m => `
        <div class="comparecard">
          <div class="compareimg" style="background-image:url('${(m.images || [])[0] || ""}')"></div>
          <div class="comparebody">
            <div class="kicker">${m.category || "EV Model"}</div>
            <div class="title" style="margin:6px 0 6px;">${m.brand} ${m.model}</div>
            <div class="tagline">${m.tagline || ""}</div>
            <div class="meta" style="margin-top:10px;">
              <span class="pill">Last checked: ${m.source?.last_checked || "TBC"}</span>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;

  const rows = [
    ["Drivetrain", m => val(m.specs?.drivetrain)],
    ["WLTP range", m => val(m.specs?.range_wltp_km, " km")],
    ["0–100 km/h", m => val(m.specs?.accel_0_100_s, " s")],
    ["DC 10–80%", m => val(m.specs?.dc_charge_10_80_min, " min")],
    ["Battery", m => val(m.specs?.battery_kwh, " kWh")],
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

  const disclaimers = models
    .map(m => m.specs_meta?.specs_disclaimer_html)
    .filter(Boolean);

  const discHtml = disclaimers.length
    ? `<div class="note compare-disclaimer">${disclaimers.map(d => `<div>• ${d}</div>`).join("")}</div>`
    : "";

  return `
  <div class="compare-stack">
    ${cards}
    ${table}
    ${discHtml}
  </div>
`;

}


function readCompareSlugs() {
  // 1) URL param takes priority
  const slugsParam = qs("slugs");
  if (slugsParam) {
    return slugsParam.split(",").map(s => s.trim()).filter(Boolean);
  }

  // 2) localStorage fallback (try a few common keys)
  const keysToTry = ["compareSlugs", "compare", "compare_models", "compareModels"];
  for (const k of keysToTry) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;

      // can be JSON array or comma-separated
      if (raw.trim().startsWith("[")) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.map(String).map(s => s.trim()).filter(Boolean);
      } else {
        return raw.split(",").map(s => s.trim()).filter(Boolean);
      }
    } catch {
      // ignore and keep trying
    }
  }

  return [];
}

(async function init() {
  const wrap = document.getElementById("compareGrid");
  const slugs = readCompareSlugs().slice(0, 3);

  if (!slugs.length) {
    wrap.innerHTML = `<div class="panel">No models selected. Go back and choose up to 3 models to compare.</div>`;
    return;
  }

  try {
    const models = await Promise.all(slugs.map(loadModel));
    wrap.innerHTML = buildCompare(models);
  } catch (e) {
    console.error(e);
    wrap.innerHTML = `<div class="panel">Could not load comparison.</div>`;
  }
})();




