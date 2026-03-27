// /site/js/nav.js
(function () {
  // Active tab highlighting
  const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".tabs .tab").forEach(a => {
    const href = (a.getAttribute("href") || "").split("/").pop().toLowerCase();
    if (href === path) a.classList.add("is-active");
  });

  // Mobile hamburger toggle
  const toggle = document.querySelector(".nav-toggle");
  const tabs = document.querySelector(".tabs");
  const overlay = document.querySelector(".nav-open-overlay");
  if (!toggle || !tabs) return;

  toggle.addEventListener("click", () => {
    const open = toggle.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    tabs.classList.toggle("is-open");

    if (overlay) overlay.classList.toggle("active", open);
  });

  // Close menu on link click (mobile)
  document.querySelectorAll(".tabs .tab").forEach(link => {
    link.addEventListener("click", () => {
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      tabs.classList.remove("is-open");
      if (overlay) overlay.classList.remove("active");
    });
  });
  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      tabs.classList.remove("is-open");
      if (overlay) overlay.classList.remove("active");
    }
  });
  // Close when tapping outside the menu (mobile)
  document.addEventListener("click", (e) => {
    if (!tabs.classList.contains("is-open")) return;
    const insideNav = e.target.closest(".nav-inner");
    if (!insideNav) {
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      tabs.classList.remove("is-open");
      if (overlay) overlay.classList.remove("active");
    }
  });
  
})();

(function () {
  const link = document.getElementById("nav-market-intel");
  const drawer = document.getElementById("mi-drawer");
  if (!link || !drawer) return;

  const open = async () => {
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    // Load dashboard once per open
    if (window.loadMarketIntelIntoDrawer) {
      await window.loadMarketIntelIntoDrawer();
    }
  };

  const close = () => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  link.addEventListener("click", (e) => {
    // If we are already on the MI page, let normal navigation happen
    if (document.body?.dataset?.page === "market-intelligence") return;

    // Close mobile nav if open
    const toggle = document.querySelector(".nav-toggle");
    const tabs = document.querySelector(".tabs");
    if (toggle && tabs) {
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      tabs.classList.remove("is-open");
    }

    e.preventDefault();
    open();
  });


  drawer.querySelectorAll("[data-mi-close]").forEach(el => {
    el.addEventListener("click", close);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer.classList.contains("is-open")) close();
  });
})();

