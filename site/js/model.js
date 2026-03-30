function qs(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function valOrTBC(v, suffix = "") {
  if (v == null) return "TBC";
  return `${v}${suffix}`;
}

function specBlock(label, value) {
  return `
    <div class="spec">
      <div class="label">${label}</div>
      <div class="val">${value}</div>
    </div>
  `;
}

function resolveImagePath(url) {
  if (!url) return "";

  // External images
  if (/^https?:\/\//i.test(url)) return url;

  // Always resolve relative to /site/
  if (url.startsWith("./")) return url;

  if (url.startsWith("assets/")) return `./${url}`;

  return `./assets/images/${url}`;
}

(async function init() {
  const slug = qs("slug");
  if (!slug) throw new Error("Missing slug");

  const res = await fetch(`./data/models/index.json`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load models index");

  const data = await res.json();
  const m = data.models.find(model => model.slug === slug);

  if (!m) throw new Error(`Model not found for slug: ${slug}`);

  // Tag hero wrapper for per-model CSS crops
  const heroWrap = document.getElementById("heroWrap");
  if (heroWrap) heroWrap.setAttribute("data-slug", m.slug || slug);

  // Modal title
  const modalTitle = document.getElementById("modalTitle");
  if (modalTitle) modalTitle.textContent = `Request sourcing: ${m.brand} ${m.model}`;

  // Official source CTA
  const ctaSource = document.getElementById("ctaSource");
  const src = m.source?.official_url;
  if (ctaSource) {
    if (src) ctaSource.href = src;
    else ctaSource.style.display = "none";
  }

  // --- Modal wiring ---
  const modal = document.getElementById("sourcingModal");
  const form = document.getElementById("sourcingForm");
  const closeBtn = document.getElementById("modalClose");
  const openBtn = document.getElementById("ctaEmail");

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const first = modal.querySelector("input, textarea, button");
    if (first) first.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (form) {
      const submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", (e) => {
      const el = e.target.closest("[data-close='1']");
      if (el) closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;

      const fd = new FormData(form);
      const contact = (fd.get("contact") || "").toString().trim();
      const trim = (fd.get("trim") || "").toString().trim();
      const budget = (fd.get("budget") || "").toString().trim();
      const timeline = (fd.get("timeline") || "").toString().trim();
      const location = (fd.get("location") || "").toString().trim();
      const notes = (fd.get("notes") || "").toString().trim();

      const subject = `Stratum EV sourcing request: ${m.brand} ${m.model}`;
      const body = [
        `Model: ${m.brand} ${m.model} (${m.slug})`,
        `Category: ${m.category || ""}`,
        "",
        "Headline specs:",
        `- Drivetrain: ${m.specs?.drivetrain ?? "TBC"}`,
        `- WLTP range: ${m.specs?.range_wltp_km ?? "TBC"} km`,
        `- 0–100: ${m.specs?.accel_0_100_s ?? "TBC"} s`,
        `- DC 10–80: ${m.specs?.dc_charge_10_80_min ?? "TBC"} min`,
        "",
        "Request details:",
        `- Your email: ${contact || "TBC"}`,
        `- Target trim/spec: ${trim || "TBC"}`,
        `- Budget range: ${budget || "TBC"}`,
        `- Timeline: ${timeline || "TBC"}`,
        `- UK delivery location: ${location || "TBC"}`,
        `- Notes: ${notes || "None"}`,
        "",
        `Official source: ${m.source?.official_url ?? ""}`,
        `Brief: ${window.location.href}`,
      ].join("\n");

      const to = "info@stratumev.com";
      window.location.href =
        `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      setTimeout(closeModal, 0);
    });
  }
  // --- end modal wiring ---

  // Page title + header text
  document.title = `${m.brand} ${m.model} | Stratum EV`;

  const titleEl = document.getElementById("title");
  if (titleEl) titleEl.textContent = `${m.brand} ${m.model}`;

  const taglineEl = document.getElementById("tagline");
  if (taglineEl) taglineEl.textContent = m.tagline || "";

  const lastCheckedEl = document.getElementById("lastChecked");
  if (lastCheckedEl) {
    const last = m.source?.last_checked ? `Last checked: ${m.source.last_checked}` : "";
    lastCheckedEl.textContent = last;
    lastCheckedEl.style.display = last ? "inline-flex" : "none";
  }

  // Hero image
  const heroEl = document.getElementById("hero");
  let hero = (m.images && m.images[0]) || m.image || "";
  hero = hero;

  if (heroEl) {
    heroEl.src = hero || "./assets/images/fallback.jpg";

    heroEl.onerror = () => {
      heroEl.src = "./assets/images/fallback.jpg";
    };

    heroEl.style.display = "block";
  }

  // Specs
  const s = m.specs || {};
  const specsEl = document.getElementById("specs");
  if (specsEl) {
    specsEl.innerHTML = [
      specBlock("Drivetrain", valOrTBC(s.drivetrain)),
      specBlock("WLTP range", valOrTBC(s.range_wltp_km, " km")),
      specBlock("0–100 km/h", valOrTBC(s.accel_0_100_s, " s")),
      specBlock("DC 10–80%", valOrTBC(s.dc_charge_10_80_min, " min")),
      specBlock("Battery", valOrTBC(s.battery_kwh, " kWh")),
    ].join("");
  }

  // Disclaimer
  const disc = m.specs_meta?.specs_disclaimer_html;
  const discEl = document.getElementById("disclaimer");
  if (disc && discEl) {
    discEl.style.display = "block";
    discEl.innerHTML = disc;
  } else if (discEl) {
    discEl.style.display = "none";
  }

  // Highlights
  const highlightsEl = document.getElementById("highlights");
  if (highlightsEl) {
    highlightsEl.innerHTML = (m.highlights || []).map(x => `<li>${x}</li>`).join("");
  }

  // UK readiness
  const ivaEl = document.getElementById("iva");
  if (ivaEl) ivaEl.textContent = `IVA risk: ${m.uk_readiness?.iva_risk || "TBC"}`;

  const uknotesEl = document.getElementById("uknotes");
  if (uknotesEl) {
    uknotesEl.innerHTML = (m.uk_readiness?.notes || []).map(x => `<li>${x}</li>`).join("");
  }

  // Trims
  const trims = m.trims || [];
  const wrap = document.getElementById("trimsWrap");
  if (wrap && trims.length) {
    wrap.innerHTML = `
      <h2 class="h2">Trims</h2>
      ${trims.map(t => `
        <div class="panel" style="margin-top:12px;">
          <div class="kicker">${t.availability || ""}</div>
          <div class="title" style="margin:4px 0 6px;">${t.name || t.id}</div>
          <div class="meta">
            <span class="pill"><strong>Range</strong> ${valOrTBC(t.specs?.range_wltp_km, " km")}</span>
            <span class="pill"><strong>0–100</strong> ${valOrTBC(t.specs?.accel_0_100_s, " s")}</span>
            <span class="pill"><strong>10–80</strong> ${valOrTBC(t.specs?.dc_charge_10_80_min, " min")}</span>
          </div>
          ${(t.notes || []).length ? `<ul class="list">${t.notes.map(n => `<li>${n}</li>`).join("")}</ul>` : ""}
        </div>
      `).join("")}
    `;
  }
})().catch(err => {
  console.error(err);
  document.body.innerHTML = `<div class="container page"><div class="panel">Could not load model.</div></div>`;
});

