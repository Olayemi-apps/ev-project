/* ============================
   ANALYSIS ENTRY POINT
============================ */

function renderAnalysisCharts(analysis){
  if(!analysis) return;

  const color = analysis.themeColor || "#00c8ff";

  renderRadar(analysis.radar, color);
  renderChargingCurve(analysis.charging_curve, color);
  renderBreakdownChart(analysis.breakdown, color);
}

/* ============================
   RADAR CHART
============================ */

function renderRadar(radar, color){

  const canvas = document.getElementById("radarChart");
  if(
    !canvas ||
    !radar ||
    !Array.isArray(radar.labels) ||
    !Array.isArray(radar.values)
  ) {
    console.warn("Radar data invalid:", radar);
    return;
  }

  //  HARD RESET (goes BEFORE destroy)
  canvas.width = canvas.width;

  if(window.radarChart && typeof window.radarChart.destroy === "function"){
    window.radarChart.destroy();
  }

  window.radarChart = new Chart(canvas, {
    type: "radar",
    data: {
      labels: radar.labels,
      datasets: [{
        label: "Performance Profile",
        data: radar.values,
        backgroundColor: color + "33", // transparency
        borderColor: color,
        borderWidth: 2,
        pointBackgroundColor: color
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,

      scales: {
        r: {
          beginAtZero: true,
          min: 0,
          max: 100,

          ticks: {
            color: "#aaa",
            backdropColor: "transparent"
          },

          grid: {
            color: color + "22"
          },

          angleLines: {
            color: color + "22"
          },

          pointLabels: {
            color: "#bbb",
            font: {
              size: 11
            }
          }
        }
      },

      plugins: {
        legend: {
          labels: {
            color: "#ddd"
          }
        }
      }
    }
  });
}

/* ============================
   CHARGING CURVE
============================ */

function renderChargingCurve(curve, color){

  const canvas = document.getElementById("chargingChart");

  // ✅ DATA GUARD (goes HERE)
  if(!canvas || !Array.isArray(curve) || curve.length === 0) return;

  //  HARD RESET
  canvas.width = canvas.width;

  if(window.chargingChart && typeof window.chargingChart.destroy === "function"){
    window.chargingChart.destroy();
  }

  window.chargingChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: curve.map(p => p.soc),
      datasets: [{
        label: "Charging Power (kW)",
        data: curve.map(p => p.kw),
        tension: 0.35,
        borderColor: color,
        borderWidth: 2,
        fill: true,
        backgroundColor: color + "22",
        pointBackgroundColor: color,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
          x: {
            ticks: { color: "#aaa" },
            grid: {
              color: color + "22"
            }
          },
          y: {
            ticks: { color: "#aaa" },
            grid: {
              color: color + "22"
            }
          }
      },
    }
  });
}

/*==================================
BREAKDOWN CHART
===================================*/

function renderBreakdownChart(breakdown, color){

  const canvas = document.getElementById("tcoChart");
  if(!canvas || !breakdown) return;

  //  HARD RESET
  canvas.width = canvas.width;

  if(window.breakdownChart && typeof window.breakdownChart.destroy === "function"){
    window.breakdownChart.destroy();
  }

  window.breakdownChart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: breakdown.labels,
      datasets: [{
        label: "Score",
        data: breakdown.values,
        backgroundColor: color
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#aaa" },
            grid: {
              color: color + "22"
            }
          },
        y: {
          min: 0,
          max: 100,
          ticks: { color: "#aaa" },
           grid: {
            color: color + "22"
          }
        }
        },
      plugins: {
        legend: {
          labels: { color: "#ddd" }
        }
      }
    }
  });
}

/*================================
ANALYTICS INSIGHTS
==================================*/

function renderAnalysisInsight(input){

  const el = document.getElementById("analysis-insight");
  if(!el || !input) return;

  //  Handle BOTH cases
  const analysis = input;
  const vehicleData = window.currentVehicleData || {};

  const intelligence = vehicleData.intelligence || null;

  let peak = null;
  let peakSOC = null;
  let avgPower = null;
  let chargeTime = null;

  /* 🔋 CHARGING CURVE METRICS */
  if(Array.isArray(analysis.charging_curve)){

    const curve = analysis.charging_curve;

    // Peak
    peak = Math.max(...curve.map(p => p.kw));
    peakSOC = curve.find(p => p.kw === peak)?.soc;

    // Weighted average
    let totalWeightedPower = 0;
    let totalSpan = 0;

    for(let i = 0; i < curve.length - 1; i++){
      const current = curve[i];
      const next = curve[i + 1];

      const socSpan = next.soc - current.soc;

      totalWeightedPower += current.kw * socSpan;
      totalSpan += socSpan;
    }

    if(totalSpan > 0){
      avgPower = Math.round(totalWeightedPower / totalSpan);
    }

    /* 🔋 10–80% CHARGE TIME */
    if(vehicleData.range_km && vehicleData.battery_kwh){

      let totalTimeHours = 0;

      for(let i = 0; i < curve.length - 1; i++){

        const current = curve[i];
        const next = curve[i + 1];

        if(next.soc <= 10 || current.soc >= 80) continue;

        const startSOC = Math.max(current.soc, 10);
        const endSOC = Math.min(next.soc, 80);

        const socSpan = endSOC - startSOC;
        if(socSpan <= 0) continue;

        const energy = (socSpan / 100) * vehicleData.battery_kwh;
        const power = current.kw;

        totalTimeHours += energy / power;
      }

      chargeTime = Math.round(totalTimeHours * 60);
    }
  }

  /* ⚡ EFFICIENCY */
  let efficiency = null;

  if(vehicleData.range_km && vehicleData.battery_kwh){
    efficiency = Math.round((vehicleData.range_km / vehicleData.battery_kwh) * 10) / 10;
  }

  /* 📊 RADAR INSIGHTS */
  let strongest = "N/A";
  let weakest = "N/A";

  if(analysis.radar && Array.isArray(analysis.radar.values)){

    const { radar } = analysis;

    const max = Math.max(...radar.values);
    const min = Math.min(...radar.values);

    strongest = radar.labels[radar.values.indexOf(max)];
    weakest = radar.labels[radar.values.indexOf(min)];
  }

    /*  OUTPUT */
    if(el){
      el.innerHTML = `
        <div class="insight-header">
          STRATUM INTELLIGENCE FRAMEWORK
        </div>

        ${intelligence ? `
          <div class="insight-section">
            <p class="insight-sub">System Behaviour</p>

            <p class="insight-row">
              <span class="insight-label">Charging</span>
              <span class="insight-value">${intelligence?.systemBehaviour?.chargingProfile || ""}</span>
            </p>

            <p class="insight-row">
              <span class="insight-label">Efficiency</span>
              <span class="insight-value">${intelligence.systemBehaviour.efficiencyProfile}</span>
            </p>

            <p class="insight-row">
              <span class="insight-label">Performance</span>
              <span class="insight-value">${intelligence.systemBehaviour.performanceProfile}</span>
            </p>
          </div>

          <div class="insight-section">
            <p class="insight-sub">Operational Interpretation</p>

            <p class="insight-row">
              <span class="insight-value">${intelligence.operationalInterpretation.chargingImplication}</span>
            </p>

            <p class="insight-row">
              <span class="insight-value">${intelligence.operationalInterpretation.efficiencyImplication}</span>
            </p>

            <p class="insight-row">
              <span class="insight-value">${intelligence.operationalInterpretation.performanceImplication}</span>
            </p>
          </div>

          <div class="insight-section">
            <p class="insight-sub">Environment Fit</p>

            <p class="insight-row">
              <span class="insight-label">Urban</span>
              <span class="insight-value">${intelligence.environmentFit.urban}</span>
            </p>

            <p class="insight-row">
              <span class="insight-label">Motorway</span>
              <span class="insight-value">${intelligence.environmentFit.motorway}</span>
            </p>

            <p class="insight-row">
              <span class="insight-label">Cold Climate</span>
              <span class="insight-value">${intelligence.environmentFit.coldClimate}</span>
            </p>
          </div>
        ` : ``}

        <div class="insight-section">
          <p class="insight-sub">Data Interpretation</p>

          <p class="insight-row">
            <span class="insight-label">Primary Characteristic</span>
            <span class="insight-value">${strongest}</span>
          </p>
          <p class="insight-row">
            <span class="insight-label">Operational Trade-off</span>
            <span class="insight-value">${weakest}</span>
          </p>

          ${peak !== null && peakSOC !== null ? `
          <p class="insight-row">
            <span class="insight-label">Peak Charging</span>
            <span class="insight-value">${peak} kW @ ${peakSOC}%</span>
          </p>` : ``}

          ${avgPower !== null ? `
          <p class="insight-row">
            <span class="insight-label">Avg Charging Power</span>
            <span class="insight-value">${avgPower} kW</span>
          </p>` : ``}

          ${chargeTime !== null ? `
          <p class="insight-row">
            <span class="insight-label">10–80% Time</span>
            <span class="insight-value pulse">${chargeTime} mins</span>
          </p>` : ``}

          ${efficiency !== null ? `
          <p class="insight-row">
            <span class="insight-label">Efficiency</span>
            <span class="insight-value">${efficiency} km/kWh</span>
          </p>` : ``}
        </div>
      `;
    }
}