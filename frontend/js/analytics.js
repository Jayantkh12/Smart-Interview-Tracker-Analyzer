// ============================================================
// analytics.js – Smart Interview Tracker & Analyzer
// ============================================================
// Fetches data from the backend API (http://localhost:5500)
// and renders all analytics sections including Chart.js charts.
// ============================================================

const BASE = "http://localhost:5500";

// ── Auth guard ──────────────────────────────────────────────
const user = JSON.parse(localStorage.getItem("user"));
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

// ── Time filter ──────────────────────────────────────────────
document.getElementById("timeFilter")?.addEventListener("change", loadAnalytics);

// ── Export CSV ───────────────────────────────────────────────
document.getElementById("exportBtn")?.addEventListener("click", exportCSV);

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
// EXPORT CSV
// ============================================================
async function exportCSV() {
  try {
    const res  = await fetch(`${BASE}/api/applications/${user.id}`);
    const apps = await res.json();

    const months = parseInt(document.getElementById("timeFilter")?.value) || 0;
    const filtered = filterByMonths(apps, months, "application_date");

    const headers = ["Company", "Role", "Status", "Application Date", "Package (LPA)"];
    const rows = filtered.map(a => [
      `"${(a.company_name || "").replace(/"/g, '""')}"`,
      `"${(a.role        || "").replace(/"/g, '""')}"`,
      `"${(a.status      || "").replace(/"/g, '""')}"`,
      a.application_date || "",
      a.package_lpa || "",
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `applications_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Export failed:", err);
    alert("Export failed. Please try again.");
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
