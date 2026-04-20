async function loadReadNext() {
  const container = document.getElementById("read-next");
  if (!container) return;

  const currentSlug = document.body.dataset.article;
  const currentCategory = document.body.dataset.category;

  const res = await fetch("../data/articles.json");
  const articles = await res.json();

  // Remove current article
  let filtered = articles.filter(a => a.slug !== currentSlug);

  // Prioritise same category
  const sameCategory = filtered.filter(a => a.category === currentCategory);
  const others = filtered.filter(a => a.category !== currentCategory);

  const sorted = [...sameCategory, ...others].slice(0, 3);

  container.innerHTML = sorted.map(a => `
    <article class="panel feature article-card">
      <a href="./${a.slug}.html" class="article-link">

        <div class="article-thumb">
          <img src="${a.image}" alt="${a.title}" />
        </div>

        <div class="kicker">${a.category}</div>

        <div class="meta">
          <span class="pill">${formatDay(a.date)}</span>
          <span class="pill">${formatDate(a.date)}</span>
          <span class="pill">${a.readTime}</span>
        </div>

        <h3 class="h3">${a.title}</h3>

      </a>
    </article>
  `).join("");
}

function formatDate(dateStr){
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDay(dateStr){
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

document.addEventListener("DOMContentLoaded", loadReadNext);