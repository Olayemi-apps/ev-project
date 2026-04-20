async function loadRelatedArticles() {
  const res = await fetch("../data/articles.json");
  const data = await res.json();

  const container = document.getElementById("related-articles");
  if (!container) return;

  // Get current page slug from URL
  const path = window.location.pathname;
  const slug = path.split("/").pop().replace(".html", "");

  // Filter out current article
  const current = data.articles.find(a => a.slug === slug);

  const related = data.articles
    .filter(a => a.slug !== slug && a.category === current.category)
    .slice(0, 3);

  container.innerHTML = related.map(a => `
    <article class="panel feature article-card">
      <a href="./${a.slug}.html" class="article-link">

        <div class="article-thumb">
          <img src="..${a.image}" alt="${a.title}" />
        </div>

        <div class="kicker">${a.category}</div>

        <div class="meta">
          <span class="pill">${a.date}</span>
          <span class="pill">${a.read}</span>
        </div>

        <h3 class="h3">${a.title}</h3>

      </a>
    </article>
  `).join("");
}

loadRelatedArticles();