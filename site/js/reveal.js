// /site/js/reveal.js
(function () {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) e.target.classList.add("is-visible");
    }
  }, { threshold: 0.12 });

  els.forEach(el => io.observe(el));
})();
