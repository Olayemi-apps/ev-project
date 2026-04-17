/* --------------------------
3D Model Loader + DATA
--------------------------- */
let engineInterval;

async function loadFeatured(){

try{

const res = await fetch("./data/featured.json");

const raw = await res.json();
const params = new URLSearchParams(window.location.search);
const urlCar = params.get("car");

let currentKey = raw.current;

if(urlCar){
  const match = Object.keys(raw.vehicles).find(k => {
    const v = raw.vehicles[k];
    return v.slug === urlCar;
  });

  if(match){
    currentKey = match;
  }
}


const data = raw.vehicles[currentKey];

/* GLOBAL DATA */
window.expansionSignals = data.expansionSignals || [];
window.weeklyIntel = data.weeklyIntel || {};

const signalsSection = document.querySelector(".featured-signals");

if(signalsSection){
  if(!data.expansionSignals.length){
    signalsSection.style.display = "none";
  } else {
    signalsSection.style.display = "block";
  }
}

updateReadiness(data);
buildReadiness(data);
updateTech(data);
updateComparison(data);
updateSignals(data);
updateMarket(data);
updateInsight(data);
updateExpansion(data);
updateMomentum(data);

/* 3D MODEL */
const viewer = document.getElementById("featured-3d");
if(viewer && data.model3d){
viewer.src = data.model3d;
}

/* INTEL SUMMARY */
const intelSummary = document.getElementById("intel-summary");
if(intelSummary && window.weeklyIntel.summary){
intelSummary.textContent = window.weeklyIntel.summary;
}

/* GLOBAL EXPANSION UPDATE*/
document.getElementById("expansion-title").textContent = data.vehicle + " Global Expansion";

/* BASIC INFO */
document.getElementById("featured-name").textContent = data.vehicle;
document.getElementById("featured-tagline").textContent = data.tagline;
document.getElementById("featured-description").textContent = data.description;

/* INDICATORS */
document.getElementById("featured-range").textContent = data.range;
document.getElementById("featured-battery").textContent = data.battery;
document.getElementById("featured-power").textContent = data.power;
document.getElementById("featured-accel").textContent = data.accel;

/* SPECS */
const list = document.getElementById("featured-specs");
list.innerHTML = "";
data.specs.forEach(spec => {
const li = document.createElement("li");
li.textContent = spec;
list.appendChild(li);
});

/* READINESS COLORS */
document.querySelectorAll(".readiness-card").forEach(card => {
const score = parseInt(card.querySelector(".readiness-score").textContent);

card.classList.remove("score-high","score-mid","score-low");

if(score >= 85) card.classList.add("score-high");
else if(score >= 70) card.classList.add("score-mid");
else card.classList.add("score-low");
});

buildArchive(raw.vehicles, currentKey);

/* 🚀 START ENGINE ONLY AFTER DATA LOADS */
runEngine();
clearInterval(engineInterval);
engineInterval = setInterval(runEngine, 5000);

}catch(err){
console.error("Featured EV failed to load", err);
}

}

loadFeatured();


/*===========================
BUILD FEATURE 
============================*/

function buildArchive(vehicles, currentKey){

  const container = document.getElementById("archive-grid");
  if(!container) return;

  container.innerHTML = "";

  Object.entries(vehicles).forEach(([key, v]) => {

  if(key === currentKey) return;

  const card = document.createElement("div");
  card.className = "archive-card";

  card.innerHTML = `
    <div class="archive-card-inner">

      <div class="archive-header">
        <h3>${v.vehicle}</h3>
          <span class="archive-tag">${v.market?.segment || "ARCHIVED"}</span>
      </div>

      <p class="archive-desc">${v.tagline}</p>

      <button class="archive-btn" data-key="${key}">
        View Model →
      </button>

    </div>
  `;

  container.appendChild(card);

  });

  /* CLICK HANDLER */
  document.querySelectorAll(".archive-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        switchVehicle(btn.dataset.key);
    });
  });

}

/*=================================
BUILD READINESS
===================================*/

function buildReadiness(data){

  const container = document.getElementById("readiness-grid");
  if(!container) return;

  container.innerHTML = "";

  if(!data.readiness) return;

  data.readiness.forEach(item => {

    const regionKey =
      item.region.toLowerCase().includes("kingdom") ? "uk" :
      item.region.toLowerCase().includes("middle") ? "me" :
      item.region.toLowerCase().includes("latin") ? "latam" :
      item.region.toLowerCase();

    const card = document.createElement("div");
    card.className = "readiness-card";
    card.setAttribute("data-region", regionKey);

    // score color logic
    if(item.score >= 85) card.classList.add("score-high");
    else if(item.score >= 70) card.classList.add("score-mid");
    else card.classList.add("score-low");

    card.innerHTML = `
      <div class="readiness-title">${item.region}</div>
      <div class="readiness-score">${item.score}</div>
      <div class="readiness-meta">${item.meta}</div>
    `;

    container.appendChild(card);

  });

}

/*===================================*
UPDATR MOMENTUM
====================================*/

function updateMomentum(data){

  const container = document.getElementById("momentum-grid");
  if(!container || !data.momentum) return;

  container.innerHTML = "";

  const mapping = [
    { label: "Global EV Demand", key: "globalDemand" },
    { label: "Technology Leadership", key: "technologyLeadership" },
    { label: "Market Expansion", key: "marketExpansion" },
    { label: "Pricing Strategy", key: "pricingStrategy" }
  ];

  mapping.forEach(item => {

    const value = data.momentum[item.key] ?? 0;

    const el = document.createElement("div");
    el.className = "momentum-item";

    el.innerHTML = `
      <span class="momentum-label">${item.label}</span>
      <div class="momentum-bar">
        <div class="momentum-fill" data-value="${value}" style="width:0%"></div>
      </div>
      <span class="momentum-score" data-value="${value}">0</span>
    `;

    container.appendChild(el);

  });

  // 🚀 Animate bars after render
  setTimeout(() => {
    document.querySelectorAll(".momentum-fill").forEach((bar, i) => {
      const value = bar.dataset.value;

      setTimeout(() => {
        bar.style.width = value + "%";
      }, i * 150); // stagger
    });
  }, 100);

   // 🔢 NUMBER animation (THIS IS YOUR BLOCK)
  setTimeout(() => {
    document.querySelectorAll(".momentum-score").forEach((el, i) => {

      const target = parseInt(el.dataset.value);
      let current = 0;

      const increment = Math.ceil(target / 30);
      const duration = 800;
      const stepTime = Math.max(Math.floor(duration / target), 15);

      setTimeout(() => {

        const timer = setInterval(() => {
          current += increment;

          if(current >= target){
            el.textContent = target;
            clearInterval(timer);
          } else {
            el.textContent = current;
          }

        }, stepTime);

      }, i * 150); // keeps in sync with bars

    });
  }, 150);

}

/*===================================
UPDATE READINESS
=====================================*/

function updateReadiness(data){

  const container = document.getElementById("readiness-grid");
  if(!container || !data.readiness) return;

  container.innerHTML = "";

  data.readiness.forEach(item => {

  let cls = "score-low";
  if(item.score >= 85) cls = "score-high";
  else if(item.score >= 70) cls = "score-mid";

  const card = document.createElement("div");
  card.className = `readiness-card ${cls}`;

  card.innerHTML = `
    <div class="readiness-title">${item.region}</div>
    <div class="readiness-score">${item.score}</div>
    <div class="readiness-meta">${item.meta}</div>
  `;

  container.appendChild(card);

  });

}

/*====================================
TECH CARDS
====================================*/

function updateTech(data){

  const container = document.getElementById("tech-grid");
  if(!container || !data.technology) return;

  container.innerHTML = "";

  data.technology.forEach(item => {

    const card = document.createElement("div");
    card.className = "tech-card";

    card.innerHTML = `
      <h3>${item.title}</h3>
      <p>${item.desc}</p>
    `;

    container.appendChild(card);

  });

}

/*===============================
UPDATE INSIGHT
=================================*/

function updateInsight(data){

  const el = document.getElementById("insight-text");
  if(!el || !data.insight) return;

  el.textContent = data.insight;

}

/*================================
UPDATE MARKET
=================================*/

function updateMarket(data){

  if(!data.market) return;

  document.getElementById("market-segment").textContent = data.market.segment;
  document.getElementById("market-strategy").textContent = data.market.strategy;

  const competitorsHTML = data.market.competitors
    .map(c => `<span class="chip">${c}</span>`)
    .join("");

  document.getElementById("market-competitors").innerHTML = competitorsHTML;

}

/*===============================
UPDATE OMPARISON
================================*/

function updateComparison(data){

const container = document.getElementById("compare-grid");
if(!container || !data.comparison) return;

container.innerHTML = "";

data.comparison.forEach(item => {

  const card = document.createElement("div");
  card.className = "compare-card";

  if(item.featured){
    card.classList.add("featured");
  }

  card.innerHTML = `
    <h3>${item.name}</h3>
    <ul>
      <li><span>Range</span> ${item.range}</li>
      <li><span>Battery</span> ${item.battery}</li>
      <li><span>Power</span> ${item.power}</li>
      <li><span>0–100</span> ${item.accel}</li>
    </ul>
  `;

  container.appendChild(card);

});

}

/*====================================
UPDATE SIGNALS
====================================*/

function updateSignals(data){

const container = document.getElementById("signals-grid");
if(!container || !data.signals) return;

container.innerHTML = "";

data.signals.forEach(s => {

  const el = document.createElement("div");
  el.className = `signal ${s.type}`;

  el.innerHTML = `
    <span class="signal-icon">${s.type === "positive" ? "▲" : "●"}</span>
    ${s.text}
  `;

  container.appendChild(el);

});

}

/*=============================
UPDATE EXPANSION
==============================*/

function updateExpansion(data){

  const title = document.getElementById("expansion-title");
  const summary = document.getElementById("expansion-summary");

  if(title) title.textContent = data.vehicle + " Global Expansion";
  if(summary && data.expansionSummary){
    summary.textContent = data.expansionSummary;
  }

}


/* --------------------------
SWITCH VEHICLE
--------------------------- */

async function switchVehicle(key){

const res = await fetch("./data/featured.json");
const raw = await res.json();

const data = raw.vehicles[key];

// 🔗 Update URL using slug
if(data.slug){
  history.pushState(null, "", `?car=${data.slug}`);
}


/* CRITICAL: UPDATE GLOBAL DATA */
window.expansionSignals = data.expansionSignals || [];
window.weeklyIntel = data.weeklyIntel || {};

updateReadiness(data);
buildReadiness(data);
updateTech(data);
updateComparison(data);
updateSignals(data);
updateMarket(data);
updateInsight(data);
updateExpansion(data);
updateMomentum(data);


const signalsSection = document.querySelector(".featured-signals");

if(!data.expansionSignals.length){
  signalsSection.style.display = "none";
} else {
  signalsSection.style.display = "block";
}

const intelSummary = document.getElementById("intel-summary");
if(intelSummary && window.weeklyIntel.summary){
  intelSummary.textContent = window.weeklyIntel.summary;
}

const list = document.getElementById("featured-specs");
list.innerHTML = "";

data.specs.forEach(spec => {
  const li = document.createElement("li");
  li.textContent = spec;
  list.appendChild(li);
});

/* UPDATE GLOBAL TITLE */
document.getElementById("expansion-title").textContent = data.vehicle + " Global Expansion";

/* UPDATE UI */
document.getElementById("featured-name").textContent = data.vehicle;
document.getElementById("featured-tagline").textContent = data.tagline;
document.getElementById("featured-description").textContent = data.description;

document.getElementById("featured-range").textContent = data.range;
document.getElementById("featured-battery").textContent = data.battery;
document.getElementById("featured-power").textContent = data.power;
document.getElementById("featured-accel").textContent = data.accel;

document.getElementById("featured-oem").textContent = data.oem_line;

const viewer = document.getElementById("featured-3d");
viewer.src = "";
setTimeout(() => {
  viewer.src = data.model3d;
}, 50);

/* OPTIONAL: restart engine cleanly */
engineStep = 0;

buildArchive(raw.vehicles, key);

}



/* --------------------------
GLOBE SETUP
--------------------------- */

const globeContainer = document.getElementById("expansion-globe");

if(globeContainer){

const shippingRoutes = [
{ id:"europe", startLat:35, startLng:103, endLat:50, endLng:10 },
{ id:"uk", startLat:35, startLng:103, endLat:52, endLng:-1 },
{ id:"latam", startLat:35, startLng:103, endLat:-15, endLng:-60 },
{ id:"me", startLat:35, startLng:103, endLat:25, endLng:45 }
];

const baseIntensity = {
china: 1.0, europe: 0.4, uk: 0.3, latam: 0.2, me: 0.25
};

const maxIntensity = {
china: 1.0, europe: 0.85, uk: 0.8, latam: 0.7, me: 0.75
};

const regionData = {
china: { lat:35, lng:103 },
europe: { lat:50, lng:10 },
uk: { lat:52, lng:-1 },
latam: { lat:-15, lng:-60 },
me: { lat:25, lng:45 }
};

const signals = document.querySelectorAll(".signal");

let userInteracting = false;
let signalInteracting = false;
let engineStep = 0;

/* INTERACTION CONTROL */

document.querySelectorAll(".expansion-list li, .timeline-item, .readiness-card")
.forEach(el => {

el.addEventListener("mouseenter", () => {
userInteracting = true;
});

el.addEventListener("mouseleave", () => {
setTimeout(() => userInteracting = false, 5000);
});

});

signals.forEach(s => {
s.addEventListener("mouseenter", () => signalInteracting = true);
s.addEventListener("mouseleave", () => setTimeout(() => signalInteracting = false, 4000));
});

/* TIMESTAMP */

function updateTimestamp(){

const weekEl = document.getElementById("live-week");
if(weekEl && window.weeklyIntel?.week){
weekEl.textContent = window.weeklyIntel.week + " · " + window.weeklyIntel.tone;
}

const el = document.getElementById("live-timestamp");
if(!el) return;

const now = new Date();
el.textContent = `Updated ${now.getHours()}:${now.getMinutes().toString().padStart(2,"0")}`;
}

updateTimestamp();
setInterval(updateTimestamp, 60000);

/* POINT DATA */

const pointsData = Object.entries(regionData).map(([key, val]) => ({
id: key,
lat: val.lat,
lng: val.lng,
active: false,
intensity: baseIntensity[key] || 0.3
}));

/* GLOBE INIT */

const globe = Globe()(globeContainer)
.width(320)
.height(320)
.backgroundColor("rgba(0,0,0,0)")
.globeImageUrl("//unpkg.com/three-globe/example/img/earth-dark.jpg")
.pointsData(pointsData)
.pointLabel(d => d.id)
.pointColor(d => d.active ? "#00d4ff" : `rgba(24,227,255,${0.2 + d.intensity * 0.6})`)
.pointAltitude(d => d.active ? 0.1 : 0.02 + d.intensity * 0.03)
.pointRadius(d => d.active ? 1.4 : 0.5 + d.intensity * 0.8)
.ringsData(pointsData.filter(p => p.active || p.intensity > 0.9))
.arcsData(shippingRoutes)
.arcColor(d => d.active ? ["#00d4ff","#18e3ff"] : "rgba(24,227,255,0.05)");

globe.controls().autoRotate = true;
globe.controls().autoRotateSpeed = 0.6;



/* --------------------------
UNIFIED ENGINE (FINAL)
--------------------------- */

function getEngineSequence(){
return window.expansionSignals || [];
}


function runEngine(){

const engineSequence = window.expansionSignals || [];

/* 🔥 HARD STOP */
if(engineSequence.length === 0){
  return;
}

/* 🔥 SAFETY CHECK */
if(!engineSequence[engineStep]){
  engineStep = 0;
}

if(userInteracting || signalInteracting) return;

const stepData = engineSequence[engineStep];
const key = stepData.region;

// 🔥 SYNC READINESS WITH GLOBE

document.querySelectorAll(".readiness-card").forEach(card => {
  card.classList.remove("active");
});

const activeCard = document.querySelector(`.readiness-card[data-region="${key}"]`);

if(activeCard){
  activeCard.classList.add("active");
}





/* LABEL */

const liveLabel = document.getElementById("live-label");
if(liveLabel){
liveLabel.textContent = `LIVE: ${stepData.label}`;
}

/* SIGNALS */

signals.forEach(s => s.classList.remove("live"));

const activeSignal = document.querySelector(`.signal[data-region="${key}"]`);
if(activeSignal) activeSignal.classList.add("live");

/* GLOBE */

if(regionData[key]){
globe.pointOfView(
{ lat: regionData[key].lat, lng: regionData[key].lng, altitude: 1.8 },
1200
);
}

shippingRoutes.forEach(route => {
route.active = route.id === key;
});

globe.arcsData(shippingRoutes);

/* INTENSITY */

const activeRegions = stepData.intensity || ["china"];

pointsData.forEach(p => {
p.intensity = activeRegions.includes(p.id)
? maxIntensity[p.id]
: baseIntensity[p.id];

p.active = p.id === key;
});

globe.pointsData(pointsData);
globe.ringsData(pointsData.filter(p => p.active || p.intensity > 0.9));

/* NEXT */

engineStep++;
if(engineStep >= engineSequence.length){
engineStep = 0;
}

}



/* --------------------------
HOVER (INTELLIGENCE TOOLTIP)
--------------------------- */

const tooltip = document.getElementById("expansion-tooltip");

document.querySelectorAll(".expansion-list li").forEach(item => {

  item.addEventListener("mouseenter", () => {

  const key = item.dataset.region;

  if(regionData[key]){
    globe.pointOfView(
      { lat: regionData[key].lat, lng: regionData[key].lng, altitude: 1.8 },
      1200
  );
}

shippingRoutes.forEach(route => {
route.active = route.id === key;
});

globe.arcsData(shippingRoutes);

/* INTEL TOOLTIP */
const intelSignal = window.weeklyIntel?.signals?.find(s => s.region === key);

if(intelSignal && tooltip){
tooltip.textContent = intelSignal.headline;
tooltip.classList.add("active");
}

/* POINTS */

pointsData.forEach(p => p.active = p.id === key);

globe.pointsData(pointsData);
globe.ringsData(pointsData.filter(p => p.active || p.intensity > 0.9));

});

item.addEventListener("mouseleave", () => {

if(tooltip){
tooltip.textContent = "Hover a region to view expansion flow";
tooltip.classList.remove("active");
}

});

});

} // END globeContainer

// ARROW FUNCTIONALITY

const archiveGrid = document.getElementById("archive-grid");

const leftBtn = document.getElementById("archive-left");
const rightBtn = document.getElementById("archive-right");

if(archiveGrid && leftBtn && rightBtn){

  const scrollAmount = 300;

  leftBtn.addEventListener("click", () => {
    archiveGrid.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  });

  rightBtn.addEventListener("click", () => {
    archiveGrid.scrollBy({ left: scrollAmount, behavior: "smooth" });
  });

}

//  DRAG TO SCROLL

let isDown = false;
let startX;
let scrollLeft;

if(archiveGrid){

  archiveGrid.addEventListener("mousedown", (e) => {
    isDown = true;
    archiveGrid.classList.add("dragging");
    startX = e.pageX - archiveGrid.offsetLeft;
    scrollLeft = archiveGrid.scrollLeft;
  });

  archiveGrid.addEventListener("mouseleave", () => {
    isDown = false;
    archiveGrid.classList.remove("dragging");
  });

  archiveGrid.addEventListener("mouseup", () => {
    isDown = false;
    archiveGrid.classList.remove("dragging");
  });

  archiveGrid.addEventListener("mousemove", (e) => {
    if(!isDown) return;

    e.preventDefault();

    const x = e.pageX - archiveGrid.offsetLeft;
    const walk = (x - startX) * 1.5;

    archiveGrid.scrollLeft = scrollLeft - walk;
  });

}

// DISABLED AT EDGE

function updateArrows(){
  leftBtn.style.opacity = archiveGrid.scrollLeft <= 0 ? 0.3 : 1;

  const maxScroll = archiveGrid.scrollWidth - archiveGrid.clientWidth;
  rightBtn.style.opacity = archiveGrid.scrollLeft >= maxScroll ? 0.3 : 1;
}

archiveGrid.addEventListener("scroll", updateArrows);
updateArrows();

// ARROW PULSE

let archiveInteracted = false;

const arrows = document.querySelectorAll(".archive-arrow");

arrows.forEach(btn => {
  btn.addEventListener("click", () => {
    archiveInteracted = true;
    arrows.forEach(a => a.classList.remove("pulse"));
  });
});



