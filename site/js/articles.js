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

async function loadArticles() {
  const res = await fetch("./data/articles.json");
  const data = await res.json();

  const container = document.getElementById("articles-grid");
  if (!container) return;

  container.innerHTML = "";

  // Sort newest first
  const articles = data.articles.sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  const featured = articles.find(a => a.featured) || articles[0];

  const featuredContainer = document.getElementById("featured-article");

  if (featuredContainer && featured) {
    featuredContainer.innerHTML = `
      <div class="featured-grid">

        <!-- LEFT -->
        <div class="featured-content">
          <div class="kicker">Featured Insight</div>

          <div class="meta">
            <span class="pill">${featured.day}</span>
            <span class="pill">${featured.date}</span>
            <span class="pill">${featured.read}</span>
          </div>

          <h2 class="h2">${featured.title}</h2>

          <p class="p">${featured.excerpt}</p>

          <!-- ADDITIONAL INFO -->
          <div class="featured-extra">
            <div class="mini-pill">${featured.category}</div>
            <div class="mini-pill">UK Market Focus</div>
            <div class="mini-pill">Real-world analysis</div>
          </div>

          <div class="cta-row">
            <a class="btn" href="./articles/${featured.slug}.html">Read Full Analysis</a>
          </div>
        </div>

        <!-- RIGHT IMAGE -->
        <div class="featured-image">
          <img src="${featured.image}" alt="${featured.title}" />
        </div>

      </div>
    `;
  }



  articles.forEach(a => {
    const card = document.createElement("article");
    card.className = "panel feature article-card";

    card.innerHTML = `
      <a href="./articles/${a.slug}.html" class="article-link">

        <div class="article-thumb">
          <img src="${a.image}" alt="${a.title}" />
        </div>

        <div class="kicker">${a.category}</div>

        <div class="meta">
          <span class="pill">${a.day}</span>
          <span class="pill">${a.date}</span>
          <span class="pill">${a.read}</span>
        </div>

        <h2 class="h2">${a.title}</h2>

        <p class="p">${a.excerpt}</p>

      </a>
    `;

    container.appendChild(card);
  });
}

loadArticles();

