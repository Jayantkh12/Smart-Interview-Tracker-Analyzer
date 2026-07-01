// ============================================================
// dashboard.js – Smart Interview Tracker
// ============================================================
// Fetches all dashboard data from the backend API at localhost:5500
// and renders: stats, recent applications, upcoming interviews,
// resume info, and status summary bars.
// ============================================================

const BASE = "http://localhost:5500";

// ── Auth guard ───────────────────────────────────────────────
const user = JSON.parse(localStorage.getItem("user"));
if (!user) {
  window.location.href = "./login.html";
}

// ── Welcome message + date ───────────────────────────────────
document.getElementById("welcomeMessage").textContent =
  `Welcome Back, ${user.name} 👋`;

const dateEl = document.getElementById("welcomeDate");
if (dateEl) {
  const now = new Date();
  dateEl.textContent = now.toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

// ── Navbar toggle ────────────────────────────────────────────
document.getElementById("menuBtn")?.addEventListener("click", () => {
  document.getElementById("navLinks")?.classList.toggle("active");
});

// ── Logout ───────────────────────────────────────────────────
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("user");
  window.location.href = "../index.html";
});

// ── Boot ─────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  loadDashboardStats();
  loadRecentApplications();
  loadUpcomingInterviews();
  loadResumeData();
  loadQuestionAnalysis();
  loadRecentQuestions();
  loadResumeAnalytics();
  loadDifficultyBreakdown();
  initQuestionModal();
});


// ============================================================
// QUESTION MODAL
// ============================================================
function initQuestionModal() {
  const modal      = document.getElementById("questionModal");
  const openBtn    = document.getElementById("openAddQuestionBtn");
  const closeBtn   = document.getElementById("closeModalBtn");
  const cancelBtn  = document.getElementById("cancelModalBtn");
  const form       = document.getElementById("addQuestionForm");
  const saveBtn    = document.getElementById("saveQuestionBtn");

  if (!modal || !openBtn || !form) return;

  function openModal()  { modal.classList.add("active");    document.body.style.overflow = "hidden"; }
  function closeModal() { modal.classList.remove("active"); document.body.style.overflow = "";       form.reset(); }

  openBtn.addEventListener("click",  openModal);
  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);

  // Close on backdrop click
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  // Escape key
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("active")) closeModal(); });

  // Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const qText      = document.getElementById("qText").value.trim();
    const qTopic     = document.getElementById("qTopic").value.trim();
    const difficulty = form.querySelector('input[name="difficulty"]:checked')?.value;
    const qCompany   = document.getElementById("qCompany").value.trim();
    const qNotes     = document.getElementById("qNotes").value.trim();

    if (!qText)      { showToast("Please enter the question text.", "error");  return; }
    if (!difficulty) { showToast("Please select a difficulty level.", "error"); return; }

    saveBtn.disabled   = true;
    saveBtn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    try {
      const res  = await fetch(`${BASE}/api/questions/add`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId:     user.id,
          questionText: qText,
          topic:      qTopic  || "General",
          difficulty,
          company:    qCompany || null,
          notes:      qNotes   || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed");

      showToast(`✅ Question saved as ${difficulty}!`, "success");
      closeModal();

      // Refresh difficulty counts & recent questions
      loadDifficultyBreakdown();
      loadRecentQuestions();
      loadQuestionAnalysis();

    } catch (err) {
      console.error("[addQuestion]", err);
      showToast("Failed to save question. Try again.", "error");
    } finally {
      saveBtn.disabled  = false;
      saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Question';
    }
  });
}


// ── Toast helper ─────────────────────────────────────────────
let toastTimer = null;
function showToast(message, type = "success") {
  let toast = document.getElementById("globalToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "globalToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.className = `toast toast-${type}`;
  toast.innerHTML = type === "success"
    ? `<i class="fa-solid fa-circle-check" style="color:#34d399"></i> ${message}`
    : `<i class="fa-solid fa-circle-xmark" style="color:#f87171"></i> ${message}`;

  clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("show"));
  });
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}


});


// ============================================================
// 1. DASHBOARD STATS
// ============================================================
async function loadDashboardStats() {
  try {
    const res  = await fetch(`${BASE}/api/analytics/stats/${user.id}`);
    const data = await res.json();

    animateCount("dashboardTotalApplications", data.total     || 0);
    animateCount("dashboardInterviews",        data.interview || 0);
    animateCount("dashboardOffers",            data.offers    || 0);
    animateCount("dashboardRejections",        data.rejected  || 0);

  } catch (err) {
    console.error("[dashboard] stats error:", err);
    // fallback to old endpoint
    try {
      const res  = await fetch(`${BASE}/api/dashboard/stats/${user.id}`);
      const data = await res.json();
      setEl("dashboardTotalApplications", data.applications || 0);
      setEl("dashboardInterviews",        data.interviews   || 0);
      setEl("dashboardOffers",            data.offers       || 0);
      setEl("dashboardRejections",        data.rejections   || 0);
    } catch (err2) {
      console.error("[dashboard] fallback stats error:", err2);
    }
  }
}


// ============================================================
// 2. RECENT APPLICATIONS TABLE
// ============================================================
async function loadRecentApplications() {
  const tbody = document.getElementById("applicationsTableBody");
  try {
    const res  = await fetch(`${BASE}/api/dashboard/recent-applications/${user.id}`);
    const apps = await res.json();

    if (!Array.isArray(apps) || apps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-loading">No applications yet. <a href="applications.html" style="color:#6c63ff">Add one!</a></td></tr>`;
      return;
    }

    tbody.innerHTML = apps.map(app => {
      const badgeCls = statusBadgeClass(app.status);
      const date     = app.application_date
        ? new Date(app.application_date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"2-digit" })
        : "—";
      return `
        <tr>
          <td class="company-cell">${escHtml(app.company_name || "—")}</td>
          <td class="role-cell">${escHtml(app.role || "—")}</td>
          <td><span class="status-badge ${badgeCls}">${escHtml(app.status || "—")}</span></td>
          <td style="color:#64748b;font-size:0.82rem">${date}</td>
        </tr>`;
    }).join("");

  } catch (err) {
    console.error("[dashboard] recent apps error:", err);
    tbody.innerHTML = `<tr><td colspan="4" class="table-loading" style="color:#f87171">Failed to load. Check if server is running.</td></tr>`;
  }
}


// ============================================================
// 3. UPCOMING INTERVIEWS
// ============================================================
async function loadUpcomingInterviews() {
  const container  = document.getElementById("upcomingInterviews");
  const badgeCount = document.getElementById("interviewCount");

  try {
    const res        = await fetch(`${BASE}/api/dashboard/upcoming-interviews/${user.id}`);
    const interviews = await res.json();

    if (!Array.isArray(interviews) || interviews.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-calendar-xmark"></i>
          <p>No upcoming interviews scheduled.</p>
        </div>`;
      if (badgeCount) badgeCount.textContent = "0";
      return;
    }

    if (badgeCount) badgeCount.textContent = interviews.length;

    container.innerHTML = `<div class="interview-cards">${
      interviews.map(iv => {
        const date = iv.round_date
          ? new Date(iv.round_date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })
          : "Date TBD";
        const daysLeft = iv.round_date ? daysUntil(iv.round_date) : null;
        const urgency  = daysLeft !== null && daysLeft <= 2 ? "border-left-color:#f87171" : "";
        return `
          <div class="interview-card" style="${urgency}">
            <div>
              <div class="interview-company">${escHtml(iv.company_name || "—")}</div>
              <div class="interview-role">${escHtml(iv.role || "—")}</div>
            </div>
            <div class="interview-meta">
              <div class="interview-type">${escHtml(iv.round_type || "Interview")}</div>
              <div class="interview-date">${date}${daysLeft !== null ? ` · ${daysLeft === 0 ? "Today!" : daysLeft + "d left"}` : ""}</div>
            </div>
          </div>`;
      }).join("")
    }</div>`;

  } catch (err) {
    console.error("[dashboard] interviews error:", err);
    container.innerHTML = `<p class="empty">Could not load interviews.</p>`;
  }
}


// ============================================================
// 4. RESUME DATA
// ============================================================
async function loadResumeData() {
  try {
    const res  = await fetch(`${BASE}/api/resume/${user.id}`);
    const data = await res.json();

    if (data.success) {
      setEl("activeResume", data.resumeTitle || "Unnamed Resume");
      setEl("resumeLastUpdated", data.uploadDate
        ? new Date(data.uploadDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })
        : "—");
    } else {
      setEl("activeResume", "No Resume Uploaded");
      setEl("resumeLastUpdated", "—");
    }

    // Count total resumes via dashboard endpoint
    try {
      const r2   = await fetch(`${BASE}/api/dashboard/resume/${user.id}`);
      const d2   = await r2.json();
      setEl("totalResumes", d2.totalResumes ?? 0);
    } catch { setEl("totalResumes", "—"); }

  } catch (err) {
    console.error("[dashboard] resume error:", err);
    setEl("activeResume", "—");
    setEl("resumeLastUpdated", "—");
  }
}


// ============================================================
// 5. STATUS SUMMARY BARS
// ============================================================
function renderStatusSummary(stats) {
  const el = document.getElementById("statusSummary");
  if (!el) return;

  const rows = [
    { label: "Applied",               count: stats.applied   || 0, cls: "bar-applied"             },
    { label: "OA Cleared",            count: stats.oaCleared || 0, cls: "bar-oa-cleared"          },
    { label: "Interview Scheduled",   count: stats.interview || 0, cls: "bar-interview-scheduled" },
    { label: "Selected",              count: stats.offers    || 0, cls: "bar-selected"            },
    { label: "Rejected",              count: stats.rejected  || 0, cls: "bar-rejected"            },
  ];

  const total = Math.max(stats.total || 1, 1);

  el.innerHTML = rows.map(({ label, count, cls }) => {
    const pct = Math.round((count / total) * 100);
    return `
      <div class="summary-row">
        <span class="summary-label">${label}</span>
        <div class="summary-bar-wrap">
          <div class="summary-bar ${cls}" style="width:0%" data-target="${pct}%"></div>
        </div>
        <span class="summary-count">${count}</span>
      </div>`;
  }).join("");

  // Animate bars
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.querySelectorAll(".summary-bar").forEach(bar => {
      bar.style.width = bar.dataset.target;
    });
  }));
}


// ============================================================
// UTILITIES
// ============================================================

function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration  = 700;
  const startTime = performance.now();
  function update(now) {
    const p   = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * ease);
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function statusBadgeClass(status) {
  const map = {
    "Applied":              "badge-applied",
    "OA Cleared":           "badge-oa-cleared",
    "Interview Scheduled":  "badge-interview-scheduled",
    "Selected":             "badge-selected",
    "Rejected":             "badge-rejected",
  };
  return map[status] || "badge-applied";
}

function daysUntil(dateStr) {
  const today    = new Date(); today.setHours(0,0,0,0);
  const target   = new Date(dateStr); target.setHours(0,0,0,0);
  const diffMs   = target - today;
  return diffMs >= 0 ? Math.round(diffMs / 86400000) : null;
}

// ============================================================
// 6. INTERVIEW QUESTIONS ANALYSIS
// ============================================================
async function loadQuestionAnalysis() {
  const el = document.getElementById("questionAnalysis");
  if (!el) return;
  try {
    const res  = await fetch(`${BASE}/api/analytics/questions/${user.id}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<p class="empty">No interview question data yet.</p>';
      return;
    }
    // Count by topic keyword frequency
    const topicMap = {};
    data.forEach(item => {
      const text = (item.questions_asked || "").toLowerCase();
      const keywords = ["array","string","tree","graph","dp","sql","system design",
                        "oop","os","dbms","react","javascript","python","java","api"];
      keywords.forEach(kw => {
        if (text.includes(kw)) topicMap[kw] = (topicMap[kw] || 0) + 1;
      });
    });
    const sorted = Object.entries(topicMap).sort(([,a],[,b]) => b - a).slice(0, 8);
    if (sorted.length === 0) {
      el.innerHTML = '<p class="empty">No topic data extracted yet.</p>';
      return;
    }
    el.innerHTML = sorted.map(([topic, count]) =>
      `<div class="qa-item">
        <span class="qa-topic">${topic.toUpperCase()}</span>
        <span class="qa-count">${count} mention${count !== 1 ? "s" : ""}</span>
      </div>`
    ).join("");
    el.className = "";
  } catch (err) {
    console.error("[dashboard] question analysis:", err);
    el.textContent = "Could not load question analysis.";
  }
}


// ============================================================
// 7. RECENTLY ASKED QUESTIONS
// ============================================================
async function loadRecentQuestions() {
  const el = document.getElementById("recentQuestions");
  if (!el) return;
  try {
    const res  = await fetch(`${BASE}/api/analytics/questions/${user.id}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      el.innerHTML = '<p class="empty">No questions recorded yet.</p>';
      return;
    }
    el.innerHTML = data.slice(0, 4).map(item =>
      `<div class="q-card">
        <div class="q-card-company">${escHtml(item.company_name || "Unknown")}</div>
        ${item.role ? `<span class="q-card-role">${escHtml(item.role)}</span>` : ""}
        <p class="q-card-text">${escHtml(item.questions_asked || "").replace(/\n/g, "<br>")}</p>
      </div>`
    ).join("");
  } catch (err) {
    console.error("[dashboard] recent questions:", err);
    el.innerHTML = '<p class="empty">Could not load questions.</p>';
  }
}


// ============================================================
// 8. RESUME USAGE ANALYTICS
// ============================================================
async function loadResumeAnalytics() {
  const el = document.getElementById("resumeAnalytics");
  if (!el) return;
  try {
    const res  = await fetch(`${BASE}/api/dashboard/resume/${user.id}`);
    const data = await res.json();
    if (!data || data.totalResumes === 0) {
      el.textContent = "Upload resumes to view analytics.";
      return;
    }
    el.className = "";
    el.innerHTML = `
      <div class="qa-item">
        <span class="qa-topic">Total Resumes</span>
        <span class="qa-count">${data.totalResumes}</span>
      </div>
      <div class="qa-item">
        <span class="qa-topic">Active Resume</span>
        <span class="qa-count" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(data.activeResume || "—")}</span>
      </div>
      <div class="qa-item">
        <span class="qa-topic">Last Uploaded</span>
        <span class="qa-count">${data.lastUpdated ? new Date(data.lastUpdated).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"2-digit"}) : "—"}</span>
      </div>`;
  } catch (err) {
    console.error("[dashboard] resume analytics:", err);
    el.textContent = "Could not load resume analytics.";
  }
}


// ============================================================
// 9. DIFFICULTY BREAKDOWN  (from QuestionPractice table)
// ============================================================
async function loadDifficultyBreakdown() {
  try {
    const res  = await fetch(`${BASE}/api/dashboard/difficulty/${user.id}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    setEl("difficultyEasy",   data.easy   || 0);
    setEl("difficultyMedium", data.medium || 0);
    setEl("difficultyHard",   data.hard   || 0);
  } catch {
    // Default to 0 — endpoint may not exist yet
    setEl("difficultyEasy",   0);
    setEl("difficultyMedium", 0);
    setEl("difficultyHard",   0);
  }
}


function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}
