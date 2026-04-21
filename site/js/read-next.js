async function loadReadNext() {
  const container = document.getElementById("read-next");
  if (!container) return;

  const currentSlug = document.body.dataset.article;
  const currentCategory = document.body.dataset.category;

  const res = await fetch("../data/articles.json");
  const data = await res.json();

  // 🔥 CRITICAL FIX
  const articles = Array.isArray(data) ? data[0].articles : data.articles;

  if (!articles) {
    console.error("Articles not found");
    return;
  }

  const filtered = articles.filter(a => a.slug !== currentSlug);

  const sameCategory = filtered.filter(a => a.category === currentCategory);
  const others = filtered.filter(a => a.category !== currentCategory);

  const sorted = [...sameCategory, ...others].slice(0, 3);

  container.innerHTML = sorted.map(a => `
    <article class="panel feature article-card">
      <a href="./${a.slug}.html">

        <div class="article-thumb">
          <img src="${a.image.startsWith('..') ? a.image : '../' + a.image}" alt="${a.title}">
        </div>

        <div class="kicker">${a.category}</div>

        <div class="meta">
          <span class="pill">${a.day}</span>
          <span class="pill">${a.date}</span>
          <span class="pill">${a.read}</span>
        </div>

        <h3>${a.title}</h3>

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

function renderArticleNav(articles, currentSlug) {
  const nav = document.getElementById("article-nav");
  if (!nav) return;

  const index = articles.findIndex(a => a.slug === currentSlug);

  if (index === -1) {
    console.error("Article not found:", currentSlug);
    return;
  }

  const prev = articles[index - 1];
  const next = articles[index + 1];

  nav.innerHTML = `
    <div class="article-nav-grid">

      ${prev ? `
        <a href="./${prev.slug}.html" class="nav-card">
          <div class="nav-label">← Previous</div>
          <div class="nav-title">${prev.title}</div>
        </a>
      ` : ""}

      ${next ? `
        <a href="./${next.slug}.html" class="nav-card right">
          <div class="nav-label">Next →</div>
          <div class="nav-title">${next.title}</div>
        </a>
      ` : ""}

    </div>
  `;
}

document.addEventListener("DOMContentLoaded", async () => {

  await loadReadNext();

  const res = await fetch("../data/articles.json");
  const data = await res.json();
  const articles = Array.isArray(data) ? data[0].articles : data.articles;

  const currentSlug = document.body.dataset.article;

  renderArticleNav(articles, currentSlug);

});