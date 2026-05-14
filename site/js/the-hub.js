/* =========================================
   HUB INTERACTIONS
========================================= */

const revealItems = document.querySelectorAll(
  ".hub-copy, .method-card, .roadmap-card, .hub-visual-wrap"
);

const revealObserver = new IntersectionObserver(

(entries)=>{

  entries.forEach((entry)=>{

    if(entry.isIntersecting){
      entry.target.classList.add("revealed");
    }

  });

},

{
  threshold:0.12
}

);

revealItems.forEach((item)=>{
  revealObserver.observe(item);
});

/*========================================
SIGNALS + COLOURS
========================================*/

async function loadHubSignals(){

  try{

    const res = await fetch("./data/hub-signals.json?v=1");

    const data = await res.json();

    renderTicker(data.ticker);

    renderLiveMetrics(data.liveMetrics);

    renderHeatIndicators(data.heatIndicators);

    renderReliabilityMetrics(data.reliabilityMetrics);

  } catch(err){

    console.error("Hub signals failed to load", err);

  }
}

/*  TICKER */

function renderTicker(items){

  const ticker = document.getElementById("ticker-track");

  if(!ticker) return;

  ticker.innerHTML = items.map(item => `
    <span>${item}</span>
  `).join("");

}

/*  METRICS RENDER */

function renderLiveMetrics(metrics){

  const grid = document.getElementById("hub-live-grid");

  if(!grid) return;

  grid.innerHTML = metrics.map(metric => `

    <div class="hub-live-card">

      <div class="metric-dot ${metric.status}"></div>

      <span>
        ${metric.label}
      </span>

      <h3>
        ${metric.value}
      </h3>

      <div class="metric-trend ${metric.status}">
        ▲ ${metric.trend}
      </div>

      <p>
        ${metric.description}
      </p>

    </div>

  `).join("");

}

/* INDICATOR*/

function renderHeatIndicators(items){

  const grid = document.getElementById("hub-heat-grid");

  if(!grid) return;

  grid.innerHTML = items.map(item => `

    <div class="heat-card premium-panel">

      <div class="panel-top">

        <span class="panel-kicker">
          ${item.label}
        </span>

        <strong class="panel-value ${item.signal}">
          ${item.value}%
        </strong>

      </div>

      <h3>
        ${item.region}
      </h3>

      <p class="panel-subtitle ${item.signal}">
        ${item.subtitle}
      </p>

      <div class="heat-bar">

        <div
          class="heat-fill ${item.color}"
          style="width:${item.value}%">
        </div>

      </div>

    </div>

  `).join("");

}

/* RELIABILITY METRICS */

function renderReliabilityMetrics(items){

  const grid = document.getElementById("hub-reliability-grid");

  if(!grid) return;

  grid.innerHTML = items.map(item => `

    <div class="reliability-card premium-panel">

      <div class="panel-top">

        <span class="panel-kicker">
          ${item.label}
        </span>

        <strong class="panel-value ${item.signal}">
          ${item.value}%
        </strong>

      </div>

      <h3>
        ${item.title}
      </h3>

      <p class="panel-subtitle ${item.signal}">
          ${item.subtitle}
      </p>

      <div class="heat-bar">

        <div
          class="heat-fill ${item.color}"
          style="width:${item.value}%">
        </div>

      </div>

    </div>

  `).join("");

}

/* =========================================
   ACTIVE NAV HIGHLIGHT
========================================= */

const sections = document.querySelectorAll("section[id]");
const navLinks = document.querySelectorAll(".hub-anchor-nav a");

window.addEventListener("scroll", ()=>{

  let current = "";

  sections.forEach((section)=>{

    const sectionTop = section.offsetTop - 180;

    if(scrollY >= sectionTop){
      current = section.getAttribute("id");
    }

  });

  navLinks.forEach((link)=>{

    link.classList.remove("active-anchor");

    if(link.getAttribute("href").includes(current)){
      link.classList.add("active-anchor");
    }

  });

});

/* =========================================
   PARALLAX HERO
========================================= */

const heroBg = document.querySelector(".hub-hero-bg");

window.addEventListener("scroll", ()=>{

  const offset = window.scrollY * 0.08;

  heroBg.style.transform =
  `translate3d(0, ${offset}px, 0) scale(1.02)`;

});

/*========================================
PROGESS BAR
===========================================*/

const progressBar =
document.querySelector(".hub-progress-bar");

window.addEventListener("scroll", ()=>{

  const scrollTop =
  document.documentElement.scrollTop;

  const scrollHeight =
  document.documentElement.scrollHeight -
  document.documentElement.clientHeight;

  const progress =
  (scrollTop / scrollHeight) * 100;

  progressBar.style.width =
  `${progress}%`;

});

/* =========================================
   INFRASTRUCTURE INTELLIGENCE
========================================= */

async function loadInfrastructureIntel(){

  try{

    const res =
    await fetch("./data/infrastructure-intelligence.json");

    const data = await res.json();

    /* UK Charger Growth */

    document.getElementById(
      "charger-growth-value"
    ).textContent =
    data.ukChargerGrowth.value;

    document.getElementById(
      "charger-growth-desc"
    ).textContent =
    data.ukChargerGrowth.description;

    /* Rapid Charging */

    document.getElementById(
      "rapid-growth-value"
    ).textContent =
    data.rapidCharging.value;

    document.getElementById(
      "rapid-growth-desc"
    ).textContent =
    data.rapidCharging.description;

    /* Coverage */

    document.getElementById(
      "coverage-value"
    ).textContent =
    data.regionalCoverage.value;

    document.getElementById(
      "coverage-desc"
    ).textContent =
    data.regionalCoverage.description;

  }

  catch(error){

    console.error(
      "Infrastructure intelligence failed to load",
      error
    );

  }

}

loadInfrastructureIntel();


/* =========================================
   LIVE INFRASTRUCTURE METRICS
========================================= */

async function loadLiveMetrics(){

  try{

    const res =
    await fetch("./data/hub-live-metrics.json");

    const data = await res.json();

    const grid =
    document.getElementById(
      "hub-live-grid"
    );

    grid.innerHTML = "";

    data.liveMetrics.forEach((metric)=>{

      const card =
      document.createElement("div");

      card.className =
      "hub-live-card";

      card.innerHTML = `

        <div class="panel-id">
          STRATUM // LIVE
        </div>

        <span>
          ${metric.title}
        </span>

        <strong>
          ${metric.value}
        </strong>

        <div class="metric-trend ${metric.trendType}">

          ${
            metric.trendType === "warning"
            ? "▼"
            : "▲"
          }

          ${metric.trend} YoY

        </div>

        <p>
          ${metric.description}
        </p>

      `;

      grid.appendChild(card);

    });

  }

  catch(error){

    console.error(
      "Live metrics failed",
      error
    );

  }

}

loadLiveMetrics();

/*========================================
TERMINAL TICKER 
=========================================*/

async function loadTerminalTicker(){

  try{

    const res =
    await fetch("./data/hub-live-metrics.json");

    const data =
    await res.json();

    const track =
    document.getElementById("ticker-track");

    track.innerHTML = "";

    const tickerItems = [
      ...data.ticker,
      ...data.ticker
    ];

    tickerItems.forEach((item)=>{

      const el =
      document.createElement("span");

      el.textContent =
      `${item.label} ${item.value}`;

      track.appendChild(el);

    });

  }

  catch(error){

    console.error(
      "Ticker failed",
      error
    );

  }

}

loadTerminalTicker();

/* =========================================
   REGIONAL INFRASTRUCTURE
========================================= */

async function loadRegionalHeat(){

  try{

    const res =
    await fetch("./data/regional-infrastructure.json");

    const data = await res.json();

    const grid =
    document.getElementById("hub-heat-grid");

    grid.innerHTML = "";

    data.regions.forEach((region)=>{

      let heatClass = "heat-low";

      if(region.coverage >= 80){
        heatClass = "heat-high";
      }

      else if(region.coverage >= 65){
        heatClass = "heat-medium";
      }

      const card = document.createElement("div");

      card.className =
      `hub-heat-card ${heatClass}`;

      card.innerHTML = `

        <div class="panel-id">
          REGION // LIVE
        </div>

        <h4>${region.name}</h4>

        <div class="hub-heat-meta">

          <span>${region.status}</span>

          <span>${region.coverage}%</span>

        </div>

        <div class="hub-heat-bar">

          <div
            class="hub-heat-fill"
            style="width:${region.coverage}%">
          </div>

        </div>

      `;

      grid.appendChild(card);

    });

  }

  catch(error){

    console.error(
      "Regional infrastructure failed",
      error
    );

  }

}

loadRegionalHeat();

/* =========================================
   CHARGING RELIABILITY
========================================= */

async function loadChargingReliability(){

  try{

    const res =
    await fetch("./data/charging-reliability.json");

    const data = await res.json();

    const grid =
    document.getElementById(
      "hub-reliability-grid"
    );

    grid.innerHTML = "";

    data.networks.forEach((network)=>{

      let reliabilityClass =
      "reliability-low";

      if(network.reliability >= 85){
        reliabilityClass =
        "reliability-high";
      }

      else if(network.reliability >= 70){
        reliabilityClass =
        "reliability-medium";
      }

      const card =
      document.createElement("div");

      card.className =
      `hub-reliability-card ${reliabilityClass}`;

      card.innerHTML = `

        <div class="hub-reliability-top">

          <h4>
            ${network.network}
          </h4>

          <div class="hub-reliability-score">
            ${network.reliability}%
          </div>

        </div>

        <div class="panel-id">
          NETWORK // LIVE
        </div>

        <div class="hub-reliability-status">
          ${network.status}
        </div>

        <div class="hub-reliability-bar">

          <div
            class="hub-reliability-fill"
            style="width:${network.reliability}%">
          </div>

        </div>

      `;

      grid.appendChild(card);

    });

  }

  catch(error){

    console.error(
      "Charging reliability failed",
      error
    );

  }

}

loadChargingReliability();

/* =========================================
   UK HOTSPOTS
========================================= */

async function loadUKHotspots(){

  try{

    const res =
    await fetch("./data/uk-hotspots.json");

    const data = await res.json();

    const container =
    document.getElementById("uk-hotspot-layer");

    container.innerHTML = "";

    data.hotspots.forEach((spot)=>{

      const hotspot =
      document.createElement("div");

      hotspot.className =
      `uk-hotspot ${spot.direction}`;

      hotspot.style.left = `${spot.x}%`;
      hotspot.style.top = `${spot.y}%`;

      hotspot.innerHTML = `
        <div class="uk-hotspot-dot"></div>

        <div class="uk-hotspot-tooltip">
          <strong>${spot.name}</strong>

          <span>
            Density: ${spot.density}
          </span>

          <span>
            Uptime: ${spot.uptime}
          </span>

          <span>
            Growth: ${spot.growth}
          </span>
        </div>

        <div class="uk-hotspot-label">
          ${spot.name}
        </div>
      `;

      container.appendChild(hotspot);

    });

  }

  catch(error){

    console.error(
      "UK hotspot layer failed",
      error
    );

  }

}

loadUKHotspots();

loadHubSignals();