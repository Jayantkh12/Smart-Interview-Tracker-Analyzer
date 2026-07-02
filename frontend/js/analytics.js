// Global fetch interceptor to append JWT Authorization header
(function() {
  const originalFetch = window.fetch;
  window.fetch = async function(resource, init) {
    init = init || {};
    init.headers = init.headers || {};
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      if (init.headers instanceof Headers) {
        init.headers.set("Authorization", `Bearer ${token}`);
      } else {
        init.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return originalFetch(resource, init);
  };
})();

// ============================================================
// analytics.js – Smart Interview Tracker & Analyzer
// ============================================================
// Fetches data from the backend API (http://localhost:5500)
// and renders all analytics sections including Chart.js charts.
// ============================================================

const BASE = "http://localhost:5500";

// ── Auth guard ──────────────────────────────────────────────
const user = JSON.parse(
  localStorage.getItem("user") || sessionStorage.getItem("user"),
);
if (!user) {
  window.location.href = "./login.html";
}

// ── Chart instances (kept for destroy/rebuild on filter) ──
let statusDonutInstance = null;
let monthlyBarInstance  = null;
let roundsBarInstance   = null;

// ── Navbar mobile toggle ─────────────────────────────────────
document.getElementById("menuBtn")?.addEventListener("click", () => {
  document.getElementById("navLinks")?.classList.toggle("active");
});

document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
  window.location.href = "../index.html";
});

// ── Time filter ──────────────────────────────────────────────
document.getElementById("timeFilter")?.addEventListener("change", loadAnalytics);

// ── Export PDF ───────────────────────────────────────────────
document.getElementById("exportBtn")?.addEventListener("click", exportPDF);

// ── On load ──────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", loadAnalytics);


// ============================================================
// MAIN LOAD FUNCTION
// ============================================================
async function loadAnalytics() {
  const months = parseInt(document.getElementById("timeFilter")?.value) || 0;

  try {
    // Fetch all data in parallel
    const [statsData, monthlyData, topData, roundsData, questionsData, oaData] =
      await Promise.all([
        fetchStats(months),
        fetchMonthly(months),
        fetchTopCompanies(months),
        fetchRounds(months),
        fetchQuestions(months),
        fetchOACleared(months),
      ]);

    renderHeadlineStats(statsData, oaData);
    renderStatusDonut(statsData);
    renderMonthlyBar(monthlyData);
    renderRoundsBar(roundsData);
    renderTopCompanies(topData);
    renderQuestionsLog(questionsData);

  } catch (err) {
    console.error("[Analytics] Load error:", err);
    showFallback();
  }
}


// ============================================================
// API FETCH HELPERS
// ============================================================

async function fetchStats(months) {
  try {
    const url = `${BASE}/api/analytics/stats/${user.id}${months ? `?months=${months}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Stats API failed");
    return await res.json();
  } catch {
    // Graceful fallback using applications list
    return fetchStatsFallback(months);
  }
}

async function fetchStatsFallback(months) {
  try {
    const res = await fetch(`${BASE}/api/applications/${user.id}`);
    const apps = await res.json();
    const filtered = filterByMonths(apps, months, "application_date");

    const total       = filtered.length;
    const applied     = filtered.filter(a => a.status === "Applied").length;
    const interview   = filtered.filter(a => a.status === "Interview Scheduled").length;
    const offers      = filtered.filter(a => a.status === "Selected").length;
    const rejected    = filtered.filter(a => a.status === "Rejected").length;
    const oaCleared   = filtered.filter(a => a.status === "OA Cleared").length;

    return { total, applied, interview, offers, rejected, oaCleared };
  } catch {
    return { total: 0, applied: 0, interview: 0, offers: 0, rejected: 0, oaCleared: 0 };
  }
}

async function fetchMonthly(months) {
  try {
    const url = `${BASE}/api/analytics/monthly/${user.id}${months ? `?months=${months}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return fetchMonthlyFallback(months);
  }
}

async function fetchMonthlyFallback(months) {
  try {
    const res  = await fetch(`${BASE}/api/applications/${user.id}`);
    const apps = await res.json();
    const filtered = filterByMonths(apps, months, "application_date");

    const map = {};
    filtered.forEach(a => {
      if (!a.application_date) return;
      const d   = new Date(a.application_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key]  = (map[key] || 0) + 1;
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }));
  } catch {
    return [];
  }
}

async function fetchTopCompanies(months) {
  try {
    const url = `${BASE}/api/analytics/top-companies/${user.id}${months ? `?months=${months}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return fetchTopCompaniesFallback(months);
  }
}

async function fetchTopCompaniesFallback(months) {
  try {
    const res  = await fetch(`${BASE}/api/applications/${user.id}`);
    const apps = await res.json();
    const filtered = filterByMonths(apps, months, "application_date");

    const map = {};
    filtered.forEach(a => {
      if (a.company_name) map[a.company_name] = (map[a.company_name] || 0) + 1;
    });

    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([company, count]) => ({ company, count }));
  } catch {
    return [];
  }
}

async function fetchRounds(months) {
  try {
    const url = `${BASE}/api/analytics/rounds/${user.id}${months ? `?months=${months}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchQuestions(months) {
  try {
    const url = `${BASE}/api/analytics/questions/${user.id}${months ? `?months=${months}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return fetchQuestionsFallback(months);
  }
}

async function fetchQuestionsFallback(months) {
  try {
    const res  = await fetch(`${BASE}/api/applications/${user.id}`);
    const apps = await res.json();
    const filtered = filterByMonths(apps, months, "application_date");

    return filtered
      .filter(a => a.note_text)
      .map(a => ({
        company_name: a.company_name || "Unknown",
        role: a.role || "",
        questions_asked: a.note_text || "",
        next_round_prep: "",
      }));
  } catch {
    return [];
  }
}

async function fetchOACleared(months) {
  try {
    const url = `${BASE}/api/analytics/oa-cleared/${user.id}${months ? `?months=${months}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.count ?? data.oaCleared ?? 0;
  } catch {
    return null;
  }
}


// ============================================================
// HELPERS
// ============================================================

function filterByMonths(list, months, dateField) {
  if (!months) return list;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return list.filter(item => {
    const d = new Date(item[dateField]);
    return !isNaN(d) && d >= cutoff;
  });
}

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return String(n);
}


// ============================================================
// RENDER: Headline Stats
// ============================================================
function renderHeadlineStats(stats, oaCount) {
  const total     = stats.total       || 0;
  const interview = stats.interview   || 0;
  const offers    = stats.offers      || 0;
  const rejected  = stats.rejected    || 0;
  const oaCleared = oaCount !== null ? oaCount : (stats.oaCleared || 0);

  const offerRate     = total ? Math.round((offers    / total) * 100) : 0;
  const interviewRate = total ? Math.round((interview / total) * 100) : 0;

  animateCount("analyticsTotal",      total);
  animateCount("analyticsInterviews", interview);
  animateCount("analyticsOffers",     offers);
  animateCount("analyticsRejected",   rejected);
  animateCount("analyticsOACleared",  oaCleared);

  setEl("conversionRate",   offerRate + "%");
  setEl("interviewRate",    interviewRate + "%");
  setEl("avgDaysToInterview", stats.avgDays != null ? `${stats.avgDays}d` : "N/A");
}


// ============================================================
// RENDER: Status Donut (Chart.js)
// ============================================================
function renderStatusDonut(stats) {
  const canvas = document.getElementById("statusDonutChart");
  if (!canvas) return;

  const labels = ["Applied", "Interview Scheduled", "Selected", "Rejected", "OA Cleared"];
  const values = [
    stats.applied   || 0,
    stats.interview || 0,
    stats.offers    || 0,
    stats.rejected  || 0,
    stats.oaCleared || 0,
  ];
  const colors = ["#38bdf8", "#a78bfa", "#34d399", "#f87171", "#facc15"];
  const total  = values.reduce((s, v) => s + v, 0);

  // Update center count
  const center = document.getElementById("donutCenterCount");
  if (center) animateCount("donutCenterCount", total);

  if (statusDonutInstance) statusDonutInstance.destroy();

  statusDonutInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: "rgba(8, 15, 30, 0.9)",
        hoverOffset: 8,
      }],
    },
    options: {
      cutout: "72%",
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = total ? Math.round((ctx.parsed / total) * 100) : 0;
              return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
            },
          },
          backgroundColor: "rgba(8, 15, 30, 0.95)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 10,
          titleColor: "#e2e8f0",
          bodyColor: "#94a3b8",
        },
      },
      animation: {
        animateScale: true,
        duration: 900,
        easing: "easeInOutQuart",
      },
    },
  });

  // Build custom legend
  const legend = document.getElementById("donutLegend");
  if (legend) {
    legend.innerHTML = labels.map((lbl, i) => {
      const pct = total ? Math.round((values[i] / total) * 100) : 0;
      return `<li>
        <span class="legend-dot" style="background:${colors[i]}"></span>
        <span>${lbl}</span>
        <span class="legend-pct">${pct}%</span>
      </li>`;
    }).join("");
  }
}


// ============================================================
// RENDER: Monthly Bar Chart (Chart.js)
// ============================================================
function renderMonthlyBar(data) {
  const canvas = document.getElementById("monthlyBarChart");
  if (!canvas) return;

  if (!data || data.length === 0) {
    canvas.closest(".card").querySelector(".canvas-wrap").innerHTML =
      '<p class="empty">No monthly data available.</p>';
    return;
  }

  const labels = data.map(d => formatMonth(d.month));
  const values = data.map(d => d.count);

  if (monthlyBarInstance) monthlyBarInstance.destroy();

  monthlyBarInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Applications",
        data: values,
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          gradient.addColorStop(0,   "rgba(108, 99, 255, 0.85)");
          gradient.addColorStop(1,   "rgba(56, 189, 248, 0.25)");
          return gradient;
        },
        borderColor: "rgba(108, 99, 255, 0.9)",
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(8, 15, 30, 0.95)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 10,
          titleColor: "#e2e8f0",
          bodyColor: "#94a3b8",
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} application${ctx.parsed.y !== 1 ? "s" : ""}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#64748b", font: { family: "Poppins", size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: {
            color: "#64748b",
            font: { family: "Poppins", size: 11 },
            stepSize: 1,
          },
        },
      },
      animation: { duration: 900, easing: "easeInOutQuart" },
    },
  });
}


// ============================================================
// RENDER: Interview Rounds Bar Chart
// ============================================================
function renderRoundsBar(data) {
  const canvas  = document.getElementById("roundsBarChart");
  const noMsg   = document.getElementById("noRoundsMsg");
  if (!canvas) return;

  if (!data || data.length === 0) {
    canvas.style.display = "none";
    if (noMsg) noMsg.style.display = "block";
    return;
  }

  canvas.style.display = "";
  if (noMsg) noMsg.style.display = "none";

  const labels = data.map(d => d.round_type || d.type || d.label);
  const values = data.map(d => d.count);
  const palette = ["#a78bfa", "#38bdf8", "#34d399", "#facc15", "#f87171", "#fb923c"];

  if (roundsBarInstance) roundsBarInstance.destroy();

  roundsBarInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Rounds",
        data: values,
        backgroundColor: labels.map((_, i) => palette[i % palette.length] + "cc"),
        borderColor: labels.map((_, i) => palette[i % palette.length]),
        borderWidth: 2,
        borderRadius: 7,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(8, 15, 30, 0.95)",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          padding: 10,
          titleColor: "#e2e8f0",
          bodyColor: "#94a3b8",
          callbacks: { label: ctx => ` ${ctx.parsed.x} round${ctx.parsed.x !== 1 ? "s" : ""}` },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.06)" },
          ticks: { color: "#64748b", font: { family: "Poppins", size: 11 }, stepSize: 1 },
        },
        y: {
          grid: { display: false },
          ticks: { color: "#cbd5e1", font: { family: "Poppins", size: 11 } },
        },
      },
      animation: { duration: 900, easing: "easeInOutQuart" },
    },
  });
}


// ============================================================
// RENDER: Top Companies
// ============================================================
function renderTopCompanies(data) {
  const el = document.getElementById("topCompanies");
  if (!el) return;

  if (!data || data.length === 0) {
    el.innerHTML = '<p class="empty">No company data available.</p>';
    return;
  }

  const max = data[0]?.count || 1;
  el.innerHTML = data.map(({ company, count }, i) => {
    const rank     = i + 1;
    const pct      = Math.round((count / max) * 100);
    const initial  = (company || "?")[0].toUpperCase();
    const rankClass = rank <= 3 ? `rank-${rank}` : "rank-other";
    const medal    = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

    return `
      <div class="company-row">
        <span class="company-rank ${rankClass}">${medal}</span>
        <div class="company-avatar">${initial}</div>
        <span class="company-name">${escHtml(company)}</span>
        <div class="company-status-bar">
          <div class="company-status-fill" style="width:${pct}%"></div>
        </div>
        <span class="company-count">${count} app${count !== 1 ? "s" : ""}</span>
      </div>`;
  }).join("");
}


// ============================================================
// RENDER: Status Breakdown Bars
// ============================================================
function renderStatusBreakdown(stats) {
  const el = document.getElementById("statusBreakdown");
  if (!el) return;

  const statuses = [
    { label: "Applied",               key: "applied",   cls: "Applied"              },
    { label: "Interview Scheduled",   key: "interview", cls: "Interview_Scheduled"  },
    { label: "OA Cleared",            key: "oaCleared", cls: "OA_Cleared"           },
    { label: "Selected / Offer",      key: "offers",    cls: "Selected"             },
    { label: "Rejected",              key: "rejected",  cls: "Rejected"             },
  ];

  const total = Math.max(stats.total || 1, 1);

  el.innerHTML = statuses.map(({ label, key, cls }) => {
    const count = stats[key] || 0;
    const pct   = Math.round((count / total) * 100);
    return `
      <div class="breakdown-row">
        <span class="breakdown-label">${label}</span>
        <div class="breakdown-bar-wrap">
          <div class="breakdown-bar ${cls}" style="width:0%" data-target="${pct}%"></div>
        </div>
        <span class="breakdown-count">${count} (${pct}%)</span>
      </div>`;
  }).join("");

  // Animate bars with a slight delay
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.querySelectorAll(".breakdown-bar").forEach(bar => {
        bar.style.width = bar.dataset.target;
      });
    });
  });
}


// ============================================================
// RENDER: Questions Log
// ============================================================
function renderQuestionsLog(data) {
  const el = document.getElementById("questionsLog");
  if (!el) return;

  if (!data || data.length === 0) {
    el.innerHTML = '<p class="empty">No interview question notes recorded yet. Add notes when editing applications.</p>';
    return;
  }

  el.innerHTML = data.map(item => {
    const company  = escHtml(item.company_name || "Unknown Company");
    const role     = escHtml(item.role         || "");
    const asked    = escHtml(item.questions_asked    || item.questionsAsked    || "");
    const nextPrep = escHtml(item.next_round_prep    || item.nextRoundQuestions || "");

    const askedSection = asked ? `
      <div class="question-section">
        <label>Questions Asked</label>
        <p>${asked.replace(/\n/g, "<br>")}</p>
      </div>` : "";

    const prepSection = nextPrep ? `
      <div class="question-section">
        <label>Next Round Prep</label>
        <p><em>${nextPrep.replace(/\n/g, "<br>")}</em></p>
      </div>` : "";

    if (!askedSection && !prepSection) return "";

    return `
      <div class="question-card">
        <div class="question-header">
          <span class="question-company">${company}</span>
          ${role ? `<span class="question-role">${role}</span>` : ""}
        </div>
        <div class="question-body">
          ${askedSection}${prepSection}
        </div>
      </div>`;
  }).filter(Boolean).join("");

  if (!el.innerHTML.trim()) {
    el.innerHTML = '<p class="empty">No interview question notes recorded yet.</p>';
  }
}


// ============================================================
// EXPORT PDF
// ============================================================
async function exportPDF() {
  const exportBtn = document.getElementById("exportBtn");
  if (!exportBtn) return;
  const originalHtml = exportBtn.innerHTML;
  
  try {
    // Show spinner during PDF generation
    exportBtn.disabled = true;
    exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF…';

    const totalApps = document.getElementById("analyticsTotal")?.textContent || "0";
    const scheduled = document.getElementById("analyticsInterviews")?.textContent || "0";
    const offers = document.getElementById("analyticsOffers")?.textContent || "0";
    const rejected = document.getElementById("analyticsRejected")?.textContent || "0";
    const conversionRate = document.getElementById("conversionRate")?.textContent || "0%";
    const interviewRate = document.getElementById("interviewRate")?.textContent || "0%";
    const avgDays = document.getElementById("avgDaysToInterview")?.textContent || "0";
    const oaCleared = document.getElementById("analyticsOACleared")?.textContent || "0";

    const topCompaniesHtml = document.getElementById("topCompanies")?.innerHTML || "";
    const questionsLogHtml = document.getElementById("questionsLog")?.innerHTML || "";
    
    // Get charts as images
    const statusDonutImg = statusDonutInstance ? statusDonutInstance.toBase64Image() : null;
    const monthlyBarImg = monthlyBarInstance ? monthlyBarInstance.toBase64Image() : null;
    const roundsBarImg = roundsBarInstance ? roundsBarInstance.toBase64Image() : null;

    const timePeriodLabel = document.getElementById("timeFilter")?.options[document.getElementById("timeFilter").selectedIndex]?.text || "All Time";

    // Create temporary styled container for PDF
    const element = document.createElement("div");
    element.className = "pdf-report-container";
    
    element.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        .pdf-body {
          font-family: 'Poppins', sans-serif;
          color: #0f172a;
          background: #ffffff;
          padding: 24px;
          line-height: 1.5;
        }
        .pdf-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #6c63ff;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .pdf-title-area h1 {
          font-size: 24px;
          font-weight: 800;
          color: #1e1b4b;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pdf-title-area p {
          font-size: 13px;
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .pdf-meta {
          text-align: right;
          font-size: 11px;
          color: #64748b;
        }
        .pdf-section-title {
          font-size: 15px;
          font-weight: 700;
          color: #1e1b4b;
          margin: 20px 0 12px 0;
          padding-bottom: 6px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pdf-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .pdf-stat-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }
        .pdf-stat-card h4 {
          font-size: 10px;
          text-transform: uppercase;
          color: #64748b;
          margin: 0 0 4px 0;
          letter-spacing: 0.5px;
        }
        .pdf-stat-card p {
          font-size: 18px;
          font-weight: 700;
          color: #6c63ff;
          margin: 0;
        }
        .pdf-charts-row {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
        }
        .pdf-chart-box {
          flex: 1;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 16px;
          text-align: center;
        }
        .pdf-chart-box.flex-2 {
          flex: 2;
        }
        .pdf-chart-box h3 {
          font-size: 12px;
          font-weight: 600;
          color: #1e1b4b;
          margin: 0 0 12px 0;
          text-align: left;
        }
        .pdf-chart-img {
          max-height: 200px;
          max-width: 100%;
          object-fit: contain;
        }
        .company-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .company-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .company-rank {
          font-size: 11px;
          font-weight: 800;
          min-width: 24px;
          text-align: center;
        }
        .rank-1 { color: #d97706; }
        .rank-2 { color: #64748b; }
        .rank-3 { color: #b45309; }
        .rank-other { color: #64748b; }
        .company-avatar {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: #e0e7ff;
          border: 1px solid #c7d2fe;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #4f46e5;
          flex-shrink: 0;
        }
        .company-name {
          flex: 1;
          font-weight: 600;
          font-size: 12px;
          color: #1e293b;
        }
        .company-status-bar {
          width: 80px;
          height: 6px;
          background: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }
        .company-status-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #6c63ff, #38bdf8);
        }
        .company-count {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
          white-space: nowrap;
        }
        .pdf-questions-log {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .question-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 12px;
          font-size: 11px;
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 10px;
        }
        .question-header {
          display: flex;
          justify-content: space-between;
          font-weight: 700;
          color: #1e1b4b;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .question-company {
          font-size: 12px;
          color: #6c63ff;
        }
        .question-role {
          font-size: 11px;
          color: #64748b;
        }
        .question-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .question-section label {
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          font-size: 9px;
          display: block;
          margin-bottom: 2px;
        }
        .question-section p {
          margin: 0;
          color: #1e293b;
        }
        .html2pdf__page-break {
          page-break-before: always;
          break-before: always;
        }
        .empty {
          color: #94a3b8;
          font-size: 11px;
          font-style: italic;
          text-align: center;
          margin: 12px 0;
        }
      </style>
      <div class="pdf-body">
        <div class="pdf-header">
          <div class="pdf-title-area">
            <h1>InterviewTracker</h1>
            <p>Smart Placement Analytics &amp; Performance Report</p>
          </div>
          <div class="pdf-meta">
            <strong>Candidate:</strong> ${escHtml(user.name)} (${escHtml(user.email)})<br/>
            <strong>Filter Period:</strong> ${escHtml(timePeriodLabel)}<br/>
            <strong>Generated:</strong> ${new Date().toLocaleDateString()}
          </div>
        </div>

        <div class="pdf-section-title">Key Performance Indicators</div>
        <div class="pdf-stats-grid">
          <div class="pdf-stat-card">
            <h4>Total Applied</h4>
            <p>${escHtml(totalApps)}</p>
          </div>
          <div class="pdf-stat-card">
            <h4>Interviews</h4>
            <p>${escHtml(scheduled)}</p>
          </div>
          <div class="pdf-stat-card">
            <h4>Offers Received</h4>
            <p>${escHtml(offers)}</p>
          </div>
          <div class="pdf-stat-card">
            <h4>Rejections</h4>
            <p>${escHtml(rejected)}</p>
          </div>
          <div class="pdf-stat-card">
            <h4>Offer Rate</h4>
            <p>${escHtml(conversionRate)}</p>
          </div>
          <div class="pdf-stat-card">
            <h4>Interview Rate</h4>
            <p>${escHtml(interviewRate)}</p>
          </div>
          <div class="pdf-stat-card">
            <h4>Avg. Days to Interview</h4>
            <p>${escHtml(avgDays)}</p>
          </div>
          <div class="pdf-stat-card">
            <h4>OA Cleared</h4>
            <p>${escHtml(oaCleared)}</p>
          </div>
        </div>

        <div class="pdf-section-title">Distribution &amp; Trends</div>
        <div class="pdf-charts-row">
          <div class="pdf-chart-box">
            <h3>Status Distribution</h3>
            ${statusDonutImg ? `<img src="${statusDonutImg}" class="pdf-chart-img" alt="Status Distribution"/>` : '<p class="empty">No status data available</p>'}
          </div>
          <div class="pdf-chart-box flex-2">
            <h3>Applications Timeline</h3>
            ${monthlyBarImg ? `<img src="${monthlyBarImg}" class="pdf-chart-img" alt="Applications Timeline"/>` : '<p class="empty">No monthly data available</p>'}
          </div>
        </div>

        ${roundsBarImg ? `
        <div class="pdf-charts-row">
          <div class="pdf-chart-box">
            <h3>Interview Rounds Breakdown</h3>
            <img src="${roundsBarImg}" class="pdf-chart-img" alt="Rounds Breakdown"/>
          </div>
        </div>
        ` : ""}

        <div class="html2pdf__page-break"></div>

        <div class="pdf-section-title">Target Companies &amp; Top Pipeline</div>
        <div class="pdf-list-box" style="margin-bottom: 24px;">
          <h3>Top Companies Applied</h3>
          <div class="company-list">
            ${topCompaniesHtml.includes("empty") || !topCompaniesHtml.trim() ? '<p class="empty">No company applications logged yet</p>' : topCompaniesHtml}
          </div>
        </div>

        <div class="pdf-section-title">Interview Questions &amp; Preparation Log</div>
        <div class="pdf-questions-log">
          ${questionsLogHtml.includes("empty") || !questionsLogHtml.trim() ? '<p class="empty">No questions or preparation notes logged yet</p>' : questionsLogHtml}
        </div>
      </div>
    `;

    const opt = {
      margin:       [8, 8, 8, 8],
      filename:     `placement_report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();

  } catch (err) {
    console.error("PDF Export failed:", err);
    alert("Failed to export PDF. Please try again.");
  } finally {
    exportBtn.disabled = false;
    exportBtn.innerHTML = originalHtml;
  }
}


// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start    = 0;
  const duration = 800;
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease     = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * ease);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function formatMonth(str) {
  if (!str) return "";
  const [year, month] = str.split("-");
  const d = new Date(+year, +month - 1, 1);
  return d.toLocaleString("default", { month: "short", year: "2-digit" });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showFallback() {
  ["analyticsTotal","analyticsInterviews","analyticsOffers",
   "analyticsRejected","conversionRate","interviewRate",
   "avgDaysToInterview","analyticsOACleared"].forEach(id => setEl(id, "—"));

  const msgs = {
    statusBreakdown: "Could not load status data.",
    topCompanies:    "Could not load company data.",
    questionsLog:    "Could not load questions data.",
  };
  Object.entries(msgs).forEach(([id, msg]) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<p class="empty">${msg}</p>`;
  });
}
