// /site/js/compliance.js
(function () {
  // Smooth scroll for in-page links (subnav + hero CTA)
  document
    .querySelectorAll('.subnav a[href^="#"], a[href="#readiness"]')
    .forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (!id || id === "#") return;

        const target = document.querySelector(id);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        history.pushState(null, "", id);
      });
    });

  // Readiness widget
  const widget = document.getElementById("readinessWidget");
  if (widget) {
    const scoreEl = document.getElementById("readinessScore");
    const labelEl = document.getElementById("readinessLabel");
    const copyBtn = document.getElementById("readinessCopy");
    const hintEl = document.getElementById("readinessHint");
    const resetBtn = document.getElementById("readinessReset");
    const barEl = document.getElementById("readinessBar");

    const checks = Array.from(
      widget.querySelectorAll("input[type='checkbox'][data-weight]")
    );

    function calcScore() {
      let total = 0;
      checks.forEach((c) => {
        const w = Number(c.getAttribute("data-weight") || "0");
        if (c.checked) total += w;
      });
      return Math.max(0, Math.min(100, total));
    }

    function scoreLabel(score) {
      if (score === 0) return "Not rated";
      if (score >= 90) return "Excellent";
      if (score >= 75) return "Strong";
      if (score >= 55) return "Mixed";
      if (score >= 35) return "Risky";
      return "High risk";
    }

    function resetWidget() {
      checks.forEach((c) => (c.checked = false));
      if (copyBtn) copyBtn.textContent = "Copy summary";
      render();
    }

    function render() {
      const s = calcScore();
      if (scoreEl) scoreEl.textContent = String(s);
      if (labelEl) labelEl.textContent = scoreLabel(s);
      if (hintEl) hintEl.style.display = s === 0 ? "block" : "none";
      if (barEl) barEl.style.width = `${s}%`;
    }

    // Force clean state on load
    resetWidget();

    // Prevent BFCache restoring old checkbox states when navigating back
    window.addEventListener("pageshow", () => {
      resetWidget();
    });

    checks.forEach((c) => c.addEventListener("change", render));

    if (resetBtn) {
      resetBtn.addEventListener("click", (e) => {
        e.preventDefault();
        resetWidget();
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const s = calcScore();
        const selected = checks
          .filter((c) => c.checked)
          .map((c) => "• " + (c.parentElement?.innerText || "").trim())
          .filter(Boolean);

        const text =
          `Stratum EV, UK Readiness Score: ${s}/100\n\nSelected checks:\n` +
          (selected.length ? selected.join("\n") : "• None") +
          `\n\nPage: ${window.location.href}`;

        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = "Copied";
          setTimeout(() => (copyBtn.textContent = "Copy summary"), 1200);
        } catch {
          window.prompt("Copy this summary:", text);
        }
      });
    }
  }

  // Deep-link FAQ
  const hash = window.location.hash || "";
  if (hash.startsWith("#faq-")) {
    const el = document.querySelector(hash);
    if (el && el.tagName.toLowerCase() === "details") {
      el.open = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Reveal on scroll
  const els = Array.from(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && els.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    els.forEach((el) => io.observe(el));
  } else {
    els.forEach((el) => el.classList.add("is-visible"));
  }
})();

