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
// applications.js – Smart Interview Tracker
// ============================================================

const BASE = API_BASE;
const user = JSON.parse(
  localStorage.getItem("user") || sessionStorage.getItem("user"),
);
if (!user) window.location.href = "./login.html";

// ── State ──────────────────────────────────────────────────────
let allApplications    = [];
let editingApplicationId = null;
let packageSortAsc     = true;
let dateSortAsc        = true;

// ── Navbar ────────────────────────────────────────────────────
document.getElementById("menuBtn")?.addEventListener("click", () => {
  document.getElementById("navLinks")?.classList.toggle("active");
});

document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
  window.location.href = "../index.html";
});

// ── Scroll to form ────────────────────────────────────────────
document.getElementById("scrollToFormBtn")?.addEventListener("click", () => {
  document.getElementById("formCard")?.scrollIntoView({ behavior: "smooth" });
});

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadApplications();
  setupSorting();
});

// ============================================================
// STATS
// ============================================================
async function loadStats() {
  try {
    const res  = await fetch(`${BASE}/api/applications/stats/${user.id}`);
    const data = await res.json();

    animateCount("totalApps",      data.applications        || 0);
    animateCount("appliedApps",    data.appliedApplications || 0);
    animateCount("interviewApps",  data.interviews          || 0);
    animateCount("offerApps",      data.offers              || 0);
    animateCount("rejectedApps",   data.rejections          || 0);
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

// ============================================================
// LOAD APPLICATIONS
// ============================================================
async function loadApplications() {
  const tbody = document.getElementById("applicationsBody");
  try {
    const res  = await fetch(`${BASE}/api/applications/${user.id}`);
    const data = await res.json();
    allApplications = Array.isArray(data) ? data : [];
    renderTable(allApplications);
  } catch (err) {
    console.error("Error loading applications:", err);
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row" style="color:#f87171">
      <i class="fa-solid fa-triangle-exclamation"></i> Failed to load. Check if server is running.</td></tr>`;
  }
}

// ============================================================
// RENDER TABLE
// ============================================================
function renderTable(apps) {
  const tbody = document.getElementById("applicationsBody");

  if (!apps || apps.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-row">
      <i class="fa-solid fa-inbox" style="font-size:1.6rem;color:#334155;display:block;margin-bottom:10px"></i>
      No applications yet. Click <strong>Add Application</strong> to get started!
    </td></tr>`;
    return;
  }

  const badgeClass = (s) => ({
    "Applied":             "badge-applied",
    "OA Cleared":          "badge-oa-cleared",
    "Interview Scheduled": "badge-interview-scheduled",
    "Selected":            "badge-selected",
    "Rejected":            "badge-rejected",
  }[s] || "badge-applied");

  tbody.innerHTML = apps.map(app => {
    const date = app.application_date
      ? new Date(app.application_date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"2-digit" })
      : "—";
    const pkg = app.package_lpa ? `₹${parseFloat(app.package_lpa).toFixed(1)} LPA` : "—";

    return `<tr>
      <td class="company-cell">${escHtml(app.company_name || "—")}</td>
      <td class="role-cell">${escHtml(app.role || "—")}</td>
      <td class="pkg-cell">${pkg}</td>
      <td><span class="status-badge ${badgeClass(app.status)}">${escHtml(app.status || "—")}</span></td>
      <td class="date-cell">${date}</td>
      <td>
        <div class="action-btns">
          <button class="btn-view"      onclick="viewApplication(${app.application_id})" title="View Details">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn-edit"      onclick="editApplication(${app.application_id})" title="Edit">
            <i class="fa-solid fa-pen"></i>
          </button>
          <a href="addInterview.html?appId=${app.application_id}" class="btn-interview" title="Add Interview Round">
            <i class="fa-solid fa-calendar-plus"></i>
          </a>
          <button class="btn-delete"    onclick="deleteApplication(${app.application_id})" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// ============================================================
// SORTING
// ============================================================
function setupSorting() {
  document.getElementById("packageSortBtn")?.addEventListener("click", () => {
    packageSortAsc = !packageSortAsc;
    const btn = document.getElementById("packageSortBtn");
    btn.classList.toggle("active", true);
    document.getElementById("dateSortBtn")?.classList.remove("active");

    const sorted = [...allApplications].sort((a, b) => {
      const pa = parseFloat(a.package_lpa) || 0;
      const pb = parseFloat(b.package_lpa) || 0;
      return packageSortAsc ? pa - pb : pb - pa;
    });
    renderTable(sorted);
    showToast(`Sorted by package: ${packageSortAsc ? "low → high" : "high → low"}`, "success");
  });

  document.getElementById("dateSortBtn")?.addEventListener("click", () => {
    dateSortAsc = !dateSortAsc;
    const btn = document.getElementById("dateSortBtn");
    btn.classList.toggle("active", true);
    document.getElementById("packageSortBtn")?.classList.remove("active");

    const sorted = [...allApplications].sort((a, b) => {
      const da = a.application_date ? new Date(a.application_date).getTime() : 0;
      const db = b.application_date ? new Date(b.application_date).getTime() : 0;
      return dateSortAsc ? da - db : db - da;
    });
    renderTable(sorted);
    showToast(`Sorted by date: ${dateSortAsc ? "oldest first" : "newest first"}`, "success");
  });
}

// ============================================================
// SEARCH & FILTER
// ============================================================
document.getElementById("searchInput")?.addEventListener("input", applyFilters);
document.getElementById("selectFilter")?.addEventListener("change", applyFilters);

function applyFilters() {
  const q      = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const status = document.getElementById("selectFilter")?.value || "All";

  let filtered = [...allApplications];

  if (q) {
    filtered = filtered.filter(a =>
      (a.company_name || "").toLowerCase().includes(q) ||
      (a.role         || "").toLowerCase().includes(q)
    );
  }

  if (status !== "All") {
    filtered = filtered.filter(a => a.status === status);
  }

  renderTable(filtered);
}

// ============================================================
// VIEW APPLICATION MODAL
// ============================================================
async function viewApplication(applicationId) {
  try {
    const res = await fetch(`${BASE}/api/application/${applicationId}`);
    const app = await res.json();
    if (!app || !app.application_id) return;

    document.getElementById("modalCompany").textContent = app.company_name || "—";
    document.getElementById("modalRole").textContent    = app.role         || "—";
    document.getElementById("modalPackage").textContent = app.package_lpa ? `₹${app.package_lpa} LPA` : "—";
    document.getElementById("modalDate").textContent    = app.application_date
      ? new Date(app.application_date).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })
      : "—";

    const statusEl = document.getElementById("modalStatus");
    if (statusEl) {
      statusEl.textContent = app.status || "—";
      statusEl.className = "modal-status " + ({
        "Applied":             "status-applied",
        "OA Cleared":          "status-oa",
        "Interview Scheduled": "status-interview",
        "Selected":            "status-selected",
        "Rejected":            "status-rejected",
      }[app.status] || "status-applied");
    }

    const linkEl = document.getElementById("modalLink");
    if (linkEl) {
      linkEl.textContent = app.application_link || "—";
      if (app.application_link) {
        linkEl.href   = app.application_link;
        linkEl.target = "_blank";
        linkEl.rel    = "noopener noreferrer";
      } else {
        linkEl.removeAttribute("href");
      }
    }

    document.getElementById("modalResume").textContent = "—";
    document.getElementById("modalNotes").textContent  = app.note_text || "No notes added.";

    // Wire modal edit button
    const editBtn = document.getElementById("modalEditBtn");
    if (editBtn) {
      editBtn.onclick = () => {
        closeModal();
        editApplication(applicationId);
      };
    }

    document.getElementById("appDetailModal")?.classList.add("active");
    document.body.style.overflow = "hidden";
  } catch (err) {
    console.error("Error loading application details:", err);
    showToast("Failed to load application details.", "error");
  }
}

function closeModal() {
  document.getElementById("appDetailModal")?.classList.remove("active");
  document.body.style.overflow = "";
}

// Close modal
document.getElementById("modalCloseBtn")?.addEventListener("click", closeModal);
document.getElementById("modalCloseFooter")?.addEventListener("click", closeModal);
document.getElementById("appDetailModal")?.addEventListener("click", (e) => {
  if (e.target.id === "appDetailModal") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ============================================================
// DELETE APPLICATION
// ============================================================
async function deleteApplication(applicationId) {
  if (!confirm("Delete this application? This action cannot be undone.")) return;
  try {
    const res  = await fetch(`${BASE}/api/application/${applicationId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Application deleted.", "success");
      loadStats();
      loadApplications();
    } else {
      showToast(data.message || "Delete failed.", "error");
    }
  } catch (err) {
    showToast("Failed to delete. Check if server is running.", "error");
  }
}

// ============================================================
// EDIT APPLICATION
// ============================================================
let editingStatus = "Applied";

async function editApplication(applicationId) {
  try {
    const res = await fetch(`${BASE}/api/application/${applicationId}`);
    const app = await res.json();
    if (!app || !app.application_id) return;

    editingApplicationId = app.application_id;
    editingStatus        = app.status || "Applied";

    document.getElementById("companyname").value     = app.company_name      || "";
    document.getElementById("jobrole").value         = app.role              || "";
    document.getElementById("package").value         = app.package_lpa       || "";
    document.getElementById("applicationlink").value = app.application_link  || "";
    document.getElementById("notes").value           = app.note_text         || "";

    // Update form title and submit button
    const formTitle = document.getElementById("formTitle");
    if (formTitle) formTitle.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Application';

    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Application';
    }

    const cancelBtn = document.getElementById("cancelEditBtn");
    if (cancelBtn) cancelBtn.style.display = "flex";

    document.getElementById("formCard")?.scrollIntoView({ behavior: "smooth" });
    showToast("Application loaded for editing.", "success");
  } catch (err) {
    console.error("Failed to load application for edit:", err);
    showToast("Failed to load application details.", "error");
  }
}

// Cancel edit
document.getElementById("cancelEditBtn")?.addEventListener("click", () => {
  resetForm();
  showToast("Edit cancelled.", "success");
});

function resetForm() {
  document.getElementById("applicationForm")?.reset();
  editingApplicationId = null;
  editingStatus        = "Applied";

  const formTitle = document.getElementById("formTitle");
  if (formTitle) formTitle.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Add New Application';

  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.innerHTML  = '<i class="fa-solid fa-floppy-disk"></i> Save Application';
    submitBtn.disabled   = false;
  }

  const cancelBtn = document.getElementById("cancelEditBtn");
  if (cancelBtn) cancelBtn.style.display = "none";

  if (fileNameEl) fileNameEl.textContent = "No file selected";
  if (previewBtn) previewBtn.disabled = true;
  selectedResume = null;
}

// ============================================================
// RESUME UPLOAD (local preview only)
// ============================================================
const resumeInput = document.getElementById("resume");
const uploadBtn   = document.getElementById("uploadBtn");
const previewBtn  = document.getElementById("previewBtn");
const fileNameEl  = document.getElementById("fileName");

let selectedResume = null;

uploadBtn?.addEventListener("click", () => resumeInput?.click());

resumeInput?.addEventListener("change", () => {
  const file = resumeInput.files[0];
  if (!file) return;
  selectedResume = file;
  if (fileNameEl) fileNameEl.textContent = file.name;
  if (previewBtn) previewBtn.disabled = false;
});

previewBtn?.addEventListener("click", () => {
  if (!selectedResume) return;
  const url = URL.createObjectURL(selectedResume);
  window.open(url, "_blank");
});

// ============================================================
// FORM SUBMIT (Add / Edit)
// ============================================================
const form = document.getElementById("applicationForm");

form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) {
    submitBtn.disabled   = true;
    submitBtn.innerHTML  = editingApplicationId
      ? '<i class="fa-solid fa-spinner fa-spin"></i> Updating…'
      : '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';
  }

  try {
    const isEdit = !!editingApplicationId;
    const url    = isEdit
      ? `${BASE}/api/application/${editingApplicationId}`
      : `${BASE}/api/applications`;
    const method = isEdit ? "PUT" : "POST";

    const body = {
      userId:          user.id,
      companyName:     document.getElementById("companyname").value.trim(),
      role:            document.getElementById("jobrole").value.trim(),
      packageLpa:      document.getElementById("package").value
                         ? parseFloat(document.getElementById("package").value) : null,
      applicationLink: document.getElementById("applicationlink").value.trim() || null,
      notes:           document.getElementById("notes").value.trim(),
      status:          isEdit ? editingStatus : "Applied",
    };

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.success) {
      showToast(
        isEdit ? "✅ Application updated successfully!" : "✅ Application saved successfully!",
        "success"
      );
      resetForm();
      loadStats();
      loadApplications();
    } else {
      showToast(data.message || "Operation failed.", "error");
    }
  } catch (error) {
    console.error("Error:", error);
    showToast("Operation failed. Check if server is running.", "error");
  } finally {
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
      submitBtn.disabled  = false;
      if (!editingApplicationId) {
        submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Application';
      }
    }
  }
});

// ============================================================
// UTILITIES
// ============================================================
function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration  = 700;
  const startTime = performance.now();
  function update(now) {
    const p    = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * ease);
    if (p < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

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
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add("show")));
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
