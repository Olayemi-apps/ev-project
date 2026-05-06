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

function initOEMControls(){

  const segmentFilter = document.getElementById("filter-segment");
  const phaseFilter = document.getElementById("filter-phase");
  const sortSelect = document.getElementById("sort-by");

  if(!segmentFilter || !phaseFilter || !sortSelect) return;

  function applyFilters(){

    let filtered = [...oemVehicles];

    // SEGMENT FILTER
    if(segmentFilter.value !== "all"){
      filtered = filtered.filter(v =>
        v.market?.segment === segmentFilter.value
      );
    }

    // PHASE FILTER
    if(phaseFilter.value !== "all"){
      filtered = filtered.filter(v =>
        v.weeklyIntel?.signalLayer?.phase === phaseFilter.value
      );
    }

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