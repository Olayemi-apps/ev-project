/* --------------------------
3D Model Loader + DATA
--------------------------- */

async function loadFeatured(){

try{

const res = await fetch("./data/featured.json");
const data = await res.json();

/* GLOBAL DATA */
window.expansionSignals = data.expansionSignals || [];
window.weeklyIntel = data.weeklyIntel || {};

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

/* 🚀 START ENGINE ONLY AFTER DATA LOADS */
runEngine();
setInterval(runEngine, 5000);

}catch(err){
console.error("Featured EV failed to load", err);
}

}

loadFeatured();



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

/* ✅ FAIL-SAFE (ADD HERE) */
if(!window.expansionSignals || !window.expansionSignals.length){
  console.warn("No expansion signals loaded");
  return;
}

const engineSequence = getEngineSequence();

if(userInteracting || signalInteracting) return;



const stepData = engineSequence[engineStep];
const key = stepData.region;

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