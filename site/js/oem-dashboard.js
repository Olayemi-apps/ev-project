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

              <div class="oem-row signal-row">
                <span>Expansion Phase</span>
                <span class="signal-phase ${getPhaseClass(v.weeklyIntel?.signalLayer?.phase)}">
                  ${v.weeklyIntel?.signalLayer?.phase || "-"}
                </span>
              </div>

              <div class="oem-row signal-row">
                <span>Expansion</span>
                <span class="signal-value high">
                  ${v.momentum?.marketExpansion || 0}
                </span>
              </div>

              <div class="oem-row signal-row">
                <span>Technology</span>
                <span class="signal-value mid">
                  ${v.momentum?.technologyLeadership || 0}
                </span>
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
            label: v.vehicle
          })),
          backgroundColor: "#00d4ff"
        }]
      },
      options: {
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => ctx.raw.label
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "Expansion" }},
          y: { title: { display: true, text: "Technology" }}
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
        cutout: "70%",
        radius: "85%",
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
  const phase = v.weeklyIntel?.signalLayer?.phase || "";
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