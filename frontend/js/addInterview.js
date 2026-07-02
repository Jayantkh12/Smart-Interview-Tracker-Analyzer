// ============================================================
// addInterview.js – Smart Interview Tracker
// ============================================================
// Handles loading applications, displaying selection info,
// and submitting a new interview round to the backend.
// ============================================================

const BASE = "http://localhost:5500";

// ── Auth guard ───────────────────────────────────────────────
const user = JSON.parse(
  localStorage.getItem("user") || sessionStorage.getItem("user"),
);
if (!user) {
  window.location.href = "./login.html";
}

// ── Navbar toggle ────────────────────────────────────────────
document.getElementById("menuBtn")?.addEventListener("click", () => {
  document.getElementById("navLinks")?.classList.toggle("active");
});

// ── Logout ───────────────────────────────────────────────────
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
  window.location.href = "../index.html";
});

// ── State ─────────────────────────────────────────────────────
let applications = [];

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadApplications();
  setupFormHandlers();
});

// ============================================================
// LOAD APPLICATIONS into the select dropdown
// ============================================================
async function loadApplications() {
  const select = document.getElementById("applicationSelect");
  try {
    const res  = await fetch(`${BASE}/api/applications/${user.id}`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      select.innerHTML = '<option value="">No applications found — add one first!</option>';
      return;
    }

    applications = data;

    select.innerHTML = '<option value="">— Select an application —</option>' +
      data.map(app => {
        const statusEmoji = {
          "Applied":              "📋",
          "OA Cleared":           "✅",
          "Interview Scheduled":  "📅",
          "Selected":             "🎉",
          "Rejected":             "❌",
        }[app.status] || "📋";
        return `<option value="${app.application_id}" data-company="${escHtml(app.company_name)}" data-role="${escHtml(app.role)}" data-status="${escHtml(app.status)}" data-pkg="${escHtml(app.package_lpa || '—')}">
          ${statusEmoji} ${escHtml(app.company_name)} — ${escHtml(app.role)}
        </option>`;
      }).join("");

    // Auto-select if URL has applicationId
    const params = new URLSearchParams(window.location.search);
    const preselect = params.get("appId");
    if (preselect) {
      select.value = preselect;
      updateAppInfo(preselect);
    }

  } catch (err) {
    console.error("[addInterview] load applications:", err);
    select.innerHTML = '<option value="">Failed to load — is the server running?</option>';
  }
}

// ============================================================
// UPDATE APP INFO CARD ON SELECTION
// ============================================================
function updateAppInfo(appId) {
  const app = applications.find(a => String(a.application_id) === String(appId));
  const infoBody = document.getElementById("appInfoBody");
  const hint = document.getElementById("appHint");

  if (!app || !infoBody) return;

  if (hint) hint.textContent = `Application ID: #${app.application_id}`;

  const statusClass = {
    "Applied":              "sp-applied",
    "OA Cleared":           "sp-oa-cleared",
    "Interview Scheduled":  "sp-interview-scheduled",
    "Selected":             "sp-selected",
    "Rejected":             "sp-rejected",
  }[app.status] || "sp-applied";

  infoBody.className = "app-info-grid";
  infoBody.innerHTML = `
    <div class="app-info-row">
      <div class="app-info-icon icon-building"><i class="fa-solid fa-building"></i></div>
      <div>
        <div class="app-info-label">Company</div>
        <div class="app-info-value">${escHtml(app.company_name || "—")}</div>
      </div>
    </div>
    <div class="app-info-row">
      <div class="app-info-icon icon-role"><i class="fa-solid fa-briefcase"></i></div>
      <div>
        <div class="app-info-label">Role</div>
        <div class="app-info-value">${escHtml(app.role || "—")}</div>
      </div>
    </div>
    <div class="app-info-row">
      <div class="app-info-icon icon-pkg"><i class="fa-solid fa-indian-rupee-sign"></i></div>
      <div>
        <div class="app-info-label">Package</div>
        <div class="app-info-value">${escHtml(app.package_lpa ? app.package_lpa + " LPA" : "—")}</div>
      </div>
    </div>
    <div class="app-info-row">
      <div class="app-info-icon icon-status"><i class="fa-solid fa-circle-dot"></i></div>
      <div>
        <div class="app-info-label">Current Status</div>
        <div class="app-info-value">
          <span class="status-pill ${statusClass}">${escHtml(app.status || "—")}</span>
        </div>
      </div>
    </div>`;
}

// ============================================================
// SETUP FORM HANDLERS
// ============================================================
function setupFormHandlers() {
  const select = document.getElementById("applicationSelect");
  const form   = document.getElementById("addInterviewForm");
  const submitBtn = document.getElementById("submitBtn");

  // Application select change
  select?.addEventListener("change", (e) => {
    updateAppInfo(e.target.value);
  });

  // Form submit
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const applicationId = document.getElementById("applicationSelect").value;
    const roundType     = form.querySelector('input[name="roundType"]:checked')?.value;
    const roundDate     = document.getElementById("roundDate").value;
    const result        = document.getElementById("resultSelect").value;
    const updateStatus  = document.getElementById("updateStatusSelect").value;

    // Validate
    if (!applicationId) { showToast("Please select an application.", "error"); return; }
    if (!roundType)      { showToast("Please select a round type.",   "error"); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    try {
      const res  = await fetch(`${BASE}/api/interview-rounds`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: +applicationId,
          roundType,
          roundDate:    roundDate || null,
          result:       result    || null,
          updateStatus: updateStatus || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed");

      showToast("✅ Interview round saved!", "success");

      // Redirect to dashboard after a moment
      setTimeout(() => { window.location.href = "dashboard.html"; }, 1800);

    } catch (err) {
      console.error("[addInterview] submit:", err);
      showToast("Failed to save. Check if server is running.", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Interview Round';
    }
  });
}

// ── Toast ─────────────────────────────────────────────────────
let toastTimer = null;
function showToast(message, type = "success") {
  const toast = document.getElementById("globalToast");
  if (!toast) return;

  toast.className = `toast toast-${type} show`;
  toast.innerHTML = type === "success"
    ? `<i class="fa-solid fa-circle-check" style="color:#34d399"></i> ${message}`
    : `<i class="fa-solid fa-circle-xmark" style="color:#f87171"></i> ${message}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

// ── Util ──────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
