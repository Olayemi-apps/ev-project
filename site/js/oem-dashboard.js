// ============================
// VEHICLE CLASSIFIER (GLOBAL)
// ============================

let oemVehicles = [];

function classifyVehicle(v){
  return {
    charging: v.intelligence?.systemBehaviour?.chargingProfile || "N/A",
    expansionPhase: v.weeklyIntel?.signalLayer?.phase || "N/A",
    positioning: v.market?.segment || "N/A"
  };
}

async function loadOEMDashboard(){

  try {
    const res = await fetch("./data/featured.json?v=2");
    const raw = await res.json();

    oemVehicles = Object.values(raw.vehicles);

    buildOEMDashboard(oemVehicles);
    buildOEMCharts(oemVehicles);
    buildOEMHeatmap(oemVehicles);
    initOEMControls();

  } catch(err){
    console.error("OEM dashboard failed:", err);
  }

}

loadOEMDashboard();


function buildOEMDashboard(vehicles){

  const container = document.getElementById("oem-dashboard");
  if(!container) return;

  const all = vehicles; // already an array

  container.innerHTML = `
    <div class="oem-grid">
      ${all.map(v => {

        const profile = classifyVehicle(v);

        return `
          <a href="./featured.html?car=${v.slug}" class="oem-card-link">
            <div class="oem-card">

              <h3>${v.vehicle}</h3>

              <div class="oem-signals">
                ${getSignals(v).map(s => `
                  <span class="signal-pill">${s}</span>
                `).join("")}
              </div>

              <div class="oem-row">
                <span>Segment</span>
                <span>${profile.positioning}</span>
              </div>

              <div class="oem-row">
                <span>Charging Type</span>
                <span>${profile.charging}</span>
              </div>

              <div class="oem-row">
                <span>Expansion Phase</span>
                <span>${profile.expansionPhase}</span>
              </div>

              <div class="oem-row signal-row">
                <span>Expansion</span>
                <span class="signal-value high">${v.momentum?.marketExpansion || 0}</span>
              </div>

              <div class="oem-row signal-row">
                <span>Technology</span>
                <span class="signal-value mid">${v.momentum?.technologyLeadership || 0}</span>
              </div>

              <div class="oem-strategy">
                <div class="oem-strategy-headline">
                  ${buildHeadline(v)}
                </div>

                <div class="oem-strategy-text">
                  ${buildNarrative(v)}
                </div>
              </div>

            </div>
          </a>
        `;
      }).join("")}
    </div>
  `;
}

function generateInsights(vehicles){

  if(!vehicles || !vehicles.length){
    return {
      positioning: "No data available for current selection.",
      charging: "No charging behaviour identified.",
      phase: "No market phase distribution available."
    };
  }

  // =========================
  // POSITIONING INSIGHT
  // =========================
  const avgExpansion = vehicles.reduce((sum, v) =>
    sum + (v.momentum?.marketExpansion ?? 0), 0
  ) / vehicles.length;

  const avgTech = vehicles.reduce((sum, v) =>
    sum + (v.momentum?.technologyLeadership ?? 0), 0
  ) / vehicles.length;

  const positioning =
    avgExpansion > 85 && avgTech > 80
      ? "Vehicles are concentrated in the high-expansion, high-technology quadrant, indicating strong platform scalability and innovation alignment."
      : "Positioning is distributed across expansion and technology ranges, reflecting varied strategic approaches across manufacturers.";

  // =========================
  // CHARGING INSIGHT
  // =========================
  const frontLoadedCount = vehicles.filter(v =>
    v.intelligence?.systemBehaviour?.chargingProfile?.includes("front-loaded")
  ).length;

  const charging =
    frontLoadedCount / vehicles.length > 0.6
      ? "Front-loaded charging strategies dominate, reflecting a focus on reducing dwell time and maximising high-power infrastructure efficiency."
      : "Charging strategies are mixed, indicating varied optimisation approaches across vehicle platforms.";

  // =========================
  // PHASE INSIGHT
  // =========================
  const phaseCounts = {};

  vehicles.forEach(v => {
    const phase = v.weeklyIntel?.signalLayer?.phase || "Unknown";
    phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
  });

  const dominantPhase = Object.keys(phaseCounts).reduce((a, b) =>
    phaseCounts[a] > phaseCounts[b] ? a : b
  );

  const phase =
    dominantPhase === "Scaling"
      ? "The dataset is dominated by scaling-phase vehicles, indicating a transition toward volume expansion and market consolidation."
      : `Vehicles are primarily in the ${dominantPhase} phase, reflecting early-stage or targeted expansion strategies.`;

  return { positioning, charging, phase };
}

function highlightCard(slug){

  document.querySelectorAll(".oem-card").forEach(card => {
    card.classList.remove("is-highlighted");
  });

  const target = document.querySelector(`.oem-card[data-slug="${slug}"]`);

  if(target){
    target.classList.add("is-highlighted");
  }

}

function buildOEMCharts(vehicles){

  // =========================
  // DESTROY PREVIOUS CHARTS
  // =========================
  if(window.oemCharts){
    Object.values(window.oemCharts).forEach(chart => {
      if(chart && typeof chart.destroy === "function"){
        chart.destroy();
      }
    });
  }

  // RESET STORE
  window.oemCharts = {};

  // =========================
  // DATA PREP
  // =========================
  const labels = vehicles.map(v => v.vehicle);

  const expansion = vehicles.map(v => v.momentum?.marketExpansion ?? 0);
  const technology = vehicles.map(v => v.momentum?.technologyLeadership ?? 0);

  // =========================
  // 1. POSITIONING SCATTER
  // =========================
  const positioningCtx = document.getElementById("positioningChart");

  if(positioningCtx){
    window.oemCharts.positioning = new Chart(positioningCtx, {
      type: "scatter",
      data: {
        datasets: [{
          label: "OEM Positioning",
          data: vehicles.map(v => ({
            x: v.momentum?.marketExpansion ?? 0,
            y: v.momentum?.technologyLeadership ?? 0,

            label: v.vehicle,
            slug: v.slug, 
            hoverCursor: "pointer",

            strategy: v.market?.strategy || "N/A",
            phase: v.weeklyIntel?.signalLayer?.phase || "Unknown",
            charging: v.intelligence?.systemBehaviour?.chargingProfile || "Unknown",
            r: Math.max(4, (v.momentum?.marketExpansion ?? 0) / 20)
          })),
          backgroundColor: "rgba(0, 212, 255, 0.85)",
          // Use dynamic radius from data
          pointRadius: ctx => ctx.raw.r,
          pointHoverRadius: ctx => ctx.raw.r + 2,

          pointBorderWidth: 1,
          pointBorderColor: "#0b1f2a"
        }]
      },
      options: {
        onClick: (evt, elements) => {
          if(!elements.length) return;

          const chart = elements[0].element.$context.raw;

          if(chart?.slug){
            window.location.href = `./featured.html?car=${chart.slug}`;
          }
        },
          onHover: (evt, elements) => {

          if(!elements.length){
            // remove highlight if nothing hovered
            document.querySelectorAll(".oem-card").forEach(c =>
              c.classList.remove("is-highlighted")
            );
            return;
          }

          const point = elements[0].element.$context.raw;

          if(point?.slug){
            highlightCard(point.slug);
          }
        },
        plugins: {
          annotation: {
            annotations: {
              xLine: {
                type: "line",
                xMin: 80,
                xMax: 80,
                borderColor: "rgba(0,212,255,0.2)",
                borderWidth: 1
              },
              yLine: {
                type: "line",
                yMin: 80,
                yMax: 80,
                borderColor: "rgba(0,212,255,0.2)",
                borderWidth: 1
                 },

                  // 🔹 QUADRANT LABELS
                  q1: {
                    type: "label",
                    xValue: 90,
                    yValue: 90,
                    content: ["Leaders"],
                    color: "#00d4ff",
                    font: { size: 12 }
                  },
                  q2: {
                    type: "label",
                    xValue: 60,
                    yValue: 90,
                    content: ["Tech Leaders"],
                    color: "#7dd3fc",
                    font: { size: 12 }
                  },
                  q3: {
                    type: "label",
                    xValue: 90,
                    yValue: 60,
                    content: ["Expansion"],
                    color: "#38bdf8",
                    font: { size: 12 }
                  },
                  q4: {
                    type: "label",
                    xValue: 60,
                    yValue: 60,
                    content: ["Emerging"],
                    color: "#64748b",
                    font: { size: 12 }
                  },

                  // 🔹 OPTIONAL LEADER ZONE HIGHLIGHT
                  box1: {
                    type: "box",
                    xMin: 80,
                    xMax: 100,
                    yMin: 80,
                    yMax: 100,
                    backgroundColor: "rgba(0,212,255,0.05)"
                  }

            }
          },
          tooltip: {
            backgroundColor: "rgba(8, 25, 35, 0.95)",
            borderColor: "#00d4ff",
            borderWidth: 1,

              padding: 12,

              titleColor: "#ffffff",
              titleFont: {
                size: 13,
                weight: "600"
              },

              bodyColor: "#9fdcff",
              bodyFont: {
                size: 12
              },

              displayColors: false,


              callbacks: {

                title: (ctx) => {
                  return ctx[0].raw.label;
                },

              label: (ctx) => {
                  const d = ctx.raw;

                  const signal =
                    d.strategy.toLowerCase().includes("performance") ? "Performance-led" :
                    d.strategy.toLowerCase().includes("value") ? "Value-driven" :
                    "Balanced";

                  return [
                    `${signal} strategy`,
                    `Phase: ${d.phase}`,
                    `Charging: ${d.charging}`,
                    `Expansion: ${d.x} | Technology: ${d.y}`
                  ];
                }
              }
            }
          },
          scales: {
            x: {
              min: 50,
              max: 100,
              title: { display: true, text: "Expansion" }
            },
            y: {
              min: 50,
              max: 100,
              title: { display: true, text: "Technology" }
            }
          }
        }
    });
  }

  // =========================
  // 2. CHARGING DISTRIBUTION
  // =========================
  const chargingColorMap = {
    "Front-loaded": "#00d4ff",   // speed / responsiveness
    "High-power": "#ff5c7a",     // infrastructure / capability
    "Other": "#7a8aa0"           // neutral
  };

  const chargingCounts = {};

  vehicles.forEach(v => {

    const typeRaw = v.intelligence?.systemBehaviour?.chargingProfile || "Unknown";

    const type =
      typeRaw.includes("front-loaded") ? "Front-loaded" :
      typeRaw.includes("high-power") ? "High-power" :
      "Other";

    chargingCounts[type] = (chargingCounts[type] || 0) + 1;

  });

  const chargingCtx = document.getElementById("chargingChart");

  if(chargingCtx){

    //  destroy previous chart (important for filters)
    if(window.oemCharts?.charging){
      window.oemCharts.charging.destroy();
    }

    // fallback if empty
    const labels = Object.keys(chargingCounts).length
      ? Object.keys(chargingCounts)
      : ["No Data"];

    const values = Object.values(chargingCounts).length
      ? Object.values(chargingCounts)
      : [1];

    window.oemCharts.charging = new Chart(chargingCtx, {
      type: "doughnut",
      data: {
        labels: Object.keys(chargingCounts),
        datasets: [{
          data: Object.values(chargingCounts),
          backgroundColor: Object.keys(chargingCounts).map(
            key => chargingColorMap[key] || "#7a8aa0"
          ),
          borderWidth: 1
        }]
      },
      options: {
        cutout: "75%",
        radius: "80%",
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#cfe8ff",
              font: { size: 11 }
            }
          }
        }
      }
    });
  }

  // =========================
  // 3. PHASE DISTRIBUTION
  // =========================
  const phaseCounts = {};

  vehicles.forEach(v => {
    const phase = v.weeklyIntel?.signalLayer?.phase || "Unknown";
    phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
  });

  const phaseCtx = document.getElementById("phaseChart");

  if(phaseCtx){
    new Chart(phaseCtx, {
      type: "bar",
      data: {
        labels: Object.keys(phaseCounts).map(l => l || "Unknown Phase"),
        datasets: [{
          data: Object.values(phaseCounts),
          backgroundColor: "#00d4ff"
        }]
      }
    });
  }

}

function buildHeadline(v){

  const strategy = (v.market?.strategy || "").toLowerCase();

  if(strategy.includes("performance")){
    return "Performance-led scaling strategy";
  }

  if(strategy.includes("value")){
    return "Value-driven expansion strategy";
  }

  return "Balanced market expansion strategy";
}

function mapSegmentToFilter(segment){

  if(!segment) return "Other";

  segment = segment.toLowerCase();

  if(segment.includes("mid-size")) return "Mid-size SUV";
  if(segment.includes("compact")) return "Compact SUV";
  if(segment.includes("premium performance")) return "Premium";
  if(segment.includes("luxury")) return "Luxury";

  return "Other";
}


function initOEMControls(){

  const segmentFilter = document.getElementById("filter-segment");
  const phaseFilter = document.getElementById("filter-phase");
  const sortSelect = document.getElementById("sort-by");

  if(!segmentFilter || !phaseFilter || !sortSelect) return;

  // =========================
  // BUILD SEGMENT COUNTS
  // =========================
  const segmentCounts = {};

  oemVehicles.forEach(v => {
    const seg = mapSegmentToFilter(v.market?.segment);
    segmentCounts[seg] = (segmentCounts[seg] || 0) + 1;
  });

  // =========================
  // POPULATE DROPDOWN
  // =========================
  segmentFilter.innerHTML = `<option value="all">All Segments</option>`;

  Object.entries(segmentCounts)
    .sort((a, b) => b[1] - a[1]) // optional: biggest first
    .forEach(([seg, count]) => {

      const opt = document.createElement("option");

      opt.value = seg;                //  used for filtering
      opt.textContent = `${seg} (${count})`; //  display

      segmentFilter.appendChild(opt);

    });

  function applyFilters(){

    let filtered = [...oemVehicles];

    // SEGMENT FILTER
    if(segmentFilter.value !== "all"){
      filtered = filtered.filter(v =>
        mapSegmentToFilter(v.market?.segment) === segmentFilter.value
      );
    }

    // PHASE FILTER
    if(phaseFilter.value !== "all"){
      filtered = filtered.filter(v =>
        v.weeklyIntel?.signalLayer?.phase === phaseFilter.value
      );
    }

    const insights = generateInsights(filtered);

    document.getElementById("positioningInsight").textContent = insights.positioning;
    document.getElementById("chargingInsight").textContent = insights.charging;
    document.getElementById("phaseInsight").textContent = insights.phase;

    // SORTING
    if(sortSelect.value === "expansion"){
      filtered.sort((a, b) =>
        (b.momentum?.marketExpansion || 0) -
        (a.momentum?.marketExpansion || 0)
      );
    }

    if(sortSelect.value === "technology"){
      filtered.sort((a, b) =>
        (b.momentum?.technologyLeadership || 0) -
        (a.momentum?.technologyLeadership || 0)
      );
    }

    buildOEMDashboard(filtered);
    buildOEMCharts(filtered);
  }

  segmentFilter.addEventListener("change", applyFilters);
  phaseFilter.addEventListener("change", applyFilters);
  sortSelect.addEventListener("change", applyFilters);

}

function buildOEMHeatmap(vehicles){

  const container = document.getElementById("oem-heatmap");
  if(!container) return;

  container.innerHTML = `
    <div class="heatmap-grid">
      ${vehicles.map(v => {

        const phase = v.weeklyIntel?.signalLayer?.phase || "Unknown";
        const charging = v.intelligence?.systemBehaviour?.chargingProfile || "-";

        return `
          <div class="heatmap-card">
            <div class="heatmap-title">${v.vehicle}</div>

            <div class="heatmap-tags">
              <span class="tag phase">${phase}</span>
              <span class="tag charging">${charging}</span>
            </div>
          </div>
        `;

      }).join("")}
    </div>
  `;
}

function getSignals(v){

  const signals = [];

  const expansion = v.momentum?.marketExpansion || 0;
  const tech = v.momentum?.technologyLeadership || 0;

  if(expansion >= 90){
    signals.push("Expansion Leader");
  }

  if(tech >= 90){
    signals.push("Technology Leader");
  }

  if(expansion < 70){
    signals.push("Early Expansion");
  }

  if(v.intelligence?.systemBehaviour?.chargingProfile?.includes("front-loaded")){
    signals.push("Fast-Charge Optimised");
  }

  return signals;
}

function getPhaseClass(phase){
  if(!phase) return "";

  if(phase.includes("Expansion")) return "phase-expansion";
  if(phase.includes("Scaling")) return "phase-scaling";
  if(phase.includes("Entry")) return "phase-entry";

  return "";
}


function buildNarrative(v){

  const segment = (v.market?.segment || "").toLowerCase();
  const strategy = (v.market?.strategy || "").toLowerCase();
  const phaseRaw = v.weeklyIntel?.signalLayer?.phase || "Unknown";

  const phase =
    phaseRaw === "Segment Expansion" ? "Expansion" :
    phaseRaw === "Global Entry" ? "Global Entry" :
    phaseRaw === "Scaling" ? "Scaling" :
    "Other";


  const charging = (v.intelligence?.systemBehaviour?.chargingProfile || "").toLowerCase();

  let narrative = "";

  // POSITIONING
  if(segment.includes("premium")){
    narrative += "Positioned in the premium segment, ";
  }
  else if(segment.includes("mid")){
    narrative += "Targeting the mid-market segment, ";
  }
  else if(segment.includes("compact")){
    narrative += "Focused on volume-driven compact segments, ";
  }

  // PHASE
  if(phase === "Scaling"){
    narrative += "currently in a scaling phase, ";
  }
  else if(phase === "Global Entry"){
    narrative += "entering global markets, ";
  }
  else if(phase === "Segment Expansion"){
    narrative += "expanding within key segments, ";
  }

  // CHARGING SIGNAL
  if(charging.includes("front")){
    narrative += "with a front-loaded charging profile supporting rapid turnaround, ";
  }

  // STRATEGY
  if(strategy.includes("performance")){
    narrative += "prioritising performance-led positioning ";
  }
  else if(strategy.includes("value")){
    narrative += "focusing on value-driven adoption ";
  }
  else{
    narrative += "balancing performance, efficiency, and market reach ";
  }

  narrative += "to strengthen market positioning.";

  return narrative;
}