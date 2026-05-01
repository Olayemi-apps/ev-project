/* ============================
   ANALYSIS ENTRY POINT
============================ */

function renderAnalysisCharts(analysis){
  if(!analysis) return;

  renderRadar(analysis.radar);
  renderChargingCurve(analysis.charging_curve);
  renderBreakdownChart(analysis.breakdown);
}

/* ============================
   RADAR CHART
============================ */

function renderRadar(radar){

  const canvas = document.getElementById("radarChart");
  if(!canvas || !radar) return;

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
        backgroundColor: "rgba(0, 200, 255, 0.2)",
        borderColor: "#00c8ff",
        borderWidth: 2,
        pointBackgroundColor: "#00c8ff"
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
            color: "rgba(255,255,255,0.08)"
          },

          angleLines: {
            color: "rgba(255,255,255,0.08)"
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

function renderChargingCurve(curve){

  const canvas = document.getElementById("chargingChart");
  if(!canvas || !curve) return;

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
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/*==================================
BREAKDOWN CHART
===================================*/

function renderBreakdownChart(breakdown){

  const canvas = document.getElementById("tcoChart");
  if(!canvas || !breakdown) return;

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
        backgroundColor: "#00c8ff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: { color: "#aaa" },
          grid: { color: "rgba(255,255,255,0.05)" }
        },
        y: {
          min: 0,
          max: 100,
          ticks: { color: "#aaa" },
          grid: { color: "rgba(255,255,255,0.05)" }
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
  const data = input.analysis ? input : { analysis: input };

  const analysis = data.analysis;

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
    if(data.battery_kwh){

      let totalTimeHours = 0;

      for(let i = 0; i < curve.length - 1; i++){

        const current = curve[i];
        const next = curve[i + 1];

        if(next.soc <= 10 || current.soc >= 80) continue;

        const startSOC = Math.max(current.soc, 10);
        const endSOC = Math.min(next.soc, 80);

        const socSpan = endSOC - startSOC;
        if(socSpan <= 0) continue;

        const energy = (socSpan / 100) * data.battery_kwh;
        const power = current.kw;

        totalTimeHours += energy / power;
      }

      chargeTime = Math.round(totalTimeHours * 60);
    }
  }

  /* ⚡ EFFICIENCY */
  let efficiency = null;

  if(data.range_km && data.battery_kwh){
    efficiency = Math.round((data.range_km / data.battery_kwh) * 10) / 10;
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
    el.innerHTML = `
        <p class="insight-label">Performance Interpretation</p>

        <p><strong>Key Strength:</strong> ${strongest}</p>
        <p><strong>Constraint:</strong> ${weakest}</p>

        ${peak !== null && peakSOC !== null ? `
        <p>
            Peak charging reaches <strong>${peak} kW</strong> at approximately 
            <strong>${peakSOC}% SOC</strong>.
        </p>` : `
        <p>
            Charging performance data is limited, but peak delivery behaviour remains a key indicator of real-world usability.
        </p>`}

        ${avgPower !== null ? `
        <p>
            Average charging power of <strong>${avgPower} kW</strong> 
            indicates ${avgPower > 220 
            ? "high sustained charging performance" 
            : avgPower > 150 
                ? "balanced charging consistency" 
                : "limited sustained charging performance"}.
        </p>` : `
        <p>
            Sustained charging performance varies across the curve, reflecting how power delivery reduces as the battery fills.
        </p>`}

        ${chargeTime !== null ? `
        <p>
            Estimated 10–80% charging time is approximately 
            <strong class="pulse">${chargeTime} mins</strong>.
        </p>` : `
        <p>
            Charging time depends on battery size and curve behaviour, with most vehicles showing slower rates beyond 70% SOC.
        </p>`}

        ${efficiency !== null ? `
        <p>
            Efficiency is approximately 
            <strong>${efficiency} km/kWh</strong>.
        </p>` : `
        <p>
            Efficiency reflects how effectively the vehicle converts stored energy into usable range under real-world conditions.
        </p>`}
    `;
}