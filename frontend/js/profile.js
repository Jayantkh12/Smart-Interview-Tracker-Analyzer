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
// profile.js – Smart Interview Tracker
// ============================================================

const API = API_BASE;
const DEFAULT_IMAGE = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

// ── Auth guard ────────────────────────────────────────────────
const user = JSON.parse(
  localStorage.getItem("user") || sessionStorage.getItem("user"),
);
if (!user) window.location.href = "login.html";

// ── DOM Elements ─────────────────────────────────────────────
const photoPreview    = document.getElementById("photoPreview");
const photoInput      = document.getElementById("photoInput");
const fullNameInput   = document.getElementById("fullName");
const emailInput      = document.getElementById("email");
const phoneInput      = document.getElementById("phone");
const collegeInput    = document.getElementById("college");
const branchInput     = document.getElementById("branch");
const gradYearSelect  = document.getElementById("graduationYear");
const saveBtn         = document.getElementById("saveProfileBtn");
const statusMsg       = document.getElementById("profileStatus");
const skillInput      = document.getElementById("skillInput");
const addSkillBtn     = document.getElementById("addSkillBtn");
const skillsContainer = document.getElementById("skillsContainer");
const noSkillsMsg     = document.getElementById("noSkillsMessage");

// Photo card display elements
const photoName  = document.getElementById("photoName");
const photoEmail = document.getElementById("photoEmail");

// Career preference fields
const preferredRoleInput     = document.getElementById("preferredRole");
const expectedPackageInput   = document.getElementById("expectedPackage");
const preferredLocationInput = document.getElementById("preferredLocation");
const workTypeSelect         = document.getElementById("workType");

// Stats elements
const totalAppsEl  = document.getElementById("profileTotalApps");
const interviewsEl = document.getElementById("profileInterviews");
const offersEl     = document.getElementById("profileOffers");
const rejectedEl   = document.getElementById("profileRejected");

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

// ============================================================
// LOAD PROFILE
// ============================================================
async function loadProfile() {
  try {
    const res  = await fetch(`${API}/api/profile/${user.id}`);
    const data = await res.json();
    if (!data.success) return;

    // Fill basic fields
    fullNameInput.value = data.name  || "";
    emailInput.value    = data.email || "";
    phoneInput.value    = data.phone || "";
    collegeInput.value  = data.college || "";
    branchInput.value   = data.branch  || "";

    if (data.graduationYear) {
      gradYearSelect.value = String(data.graduationYear);
    }

    // Career preferences
    if (preferredRoleInput)     preferredRoleInput.value     = data.preferredRole     || "";
    if (expectedPackageInput)   expectedPackageInput.value   = data.expectedPackage   || "";
    if (preferredLocationInput) preferredLocationInput.value = data.preferredLocation || "";
    if (workTypeSelect && data.workType) workTypeSelect.value = data.workType;

    // Photo card display
    if (photoName)  photoName.textContent  = data.name  || "Your Name";
    if (photoEmail) photoEmail.textContent = data.email || "your@email.com";

    // Profile photo
    if (photoPreview) {
      if (data.profilePic) {
        photoPreview.src = data.profilePic.startsWith("data:")
          ? data.profilePic
          : data.profilePic + "?t=" + Date.now();
      } else {
        photoPreview.src = DEFAULT_IMAGE;
      }
    }

    // Hide "new user" message if profile is filled
    const newUserMsg = document.getElementById("newUserMessage");
    if (newUserMsg && (data.college || data.branch)) {
      newUserMsg.textContent = "Looking good! Keep your profile up to date.";
    }

  } catch (err) {
    console.error("Failed to load profile:", err);
    if (photoPreview) photoPreview.src = DEFAULT_IMAGE;
  }
}

// ============================================================
// LOAD STATS
// ============================================================
async function loadStats() {
  try {
    const res  = await fetch(`${API}/api/applications/stats/${user.id}`);
    const data = await res.json();

    animateCount("profileTotalApps",  data.applications || 0);
    animateCount("profileInterviews", data.interviews   || 0);
    animateCount("profileOffers",     data.offers       || 0);
    animateCount("profileRejected",   data.rejections   || 0);
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

// ============================================================
// SAVE PROFILE
// ============================================================
saveBtn?.addEventListener("click", async () => {
  const name              = fullNameInput.value.trim();
  const phone             = phoneInput.value.trim();
  const college           = collegeInput.value.trim();
  const branch            = branchInput.value.trim();
  const graduationYear    = gradYearSelect.value;
  const preferredRole     = preferredRoleInput?.value.trim()     || "";
  const expectedPackage   = expectedPackageInput?.value.trim()   || "";
  const preferredLocation = preferredLocationInput?.value.trim() || "";
  const workType          = workTypeSelect?.value                || "";

  if (!name) {
    showToast("Please enter your full name.", "error");
    return;
  }

  try {
    saveBtn.disabled   = true;
    saveBtn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    const res = await fetch(`${API}/api/profile/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, phone, college, branch, graduationYear,
        preferredRole, expectedPackage, preferredLocation, workType,
      }),
    });

    const data = await res.json();

    if (data.success) {
      // Update localStorage name
      user.name = name;
      const authStorage = localStorage.getItem("user") ? localStorage : sessionStorage;
      authStorage.setItem("user", JSON.stringify(user));

      // Update photo card name
      if (photoName) photoName.textContent = name;

      showToast("✅ Profile saved successfully!", "success");
    } else {
      showToast(data.message || "Failed to save.", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Server error. Please try again.", "error");
  } finally {
    saveBtn.disabled  = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Profile';
  }
});

// ============================================================
// UPLOAD PROFILE PHOTO
// ============================================================
photoInput?.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) return;

  // Instant preview
  if (photoPreview) photoPreview.src = URL.createObjectURL(file);

  const formData = new FormData();
  formData.append("profile", file);
  formData.append("userId", user.id);

  try {
    const res  = await fetch(`${API}/api/profile/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      if (photoPreview) {
        photoPreview.src = data.imageUrl.startsWith("data:")
          ? data.imageUrl
          : data.imageUrl + "?t=" + Date.now();
      }
      showToast("✅ Profile photo updated!", "success");
    } else {
      showToast(data.message || "Upload failed.", "error");
      if (photoPreview) photoPreview.src = DEFAULT_IMAGE;
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Photo upload failed.", "error");
  }
});

// ============================================================
// RESUME
// ============================================================
const resumeInput    = document.getElementById("resumeInput");
const resumeFileName = document.getElementById("resumeFileName");
const viewResumeBtn  = document.getElementById("viewResumeBtn");

let currentResumeUrl = null;

async function loadResume() {
  try {
    const res  = await fetch(`${API}/api/resume/${user.id}`);
    const data = await res.json();

    if (data.success) {
      currentResumeUrl = data.resumeUrl;
      if (resumeFileName) {
        resumeFileName.innerHTML = `<i class="fa-solid fa-file-pdf" style="color:#f87171"></i> ${data.resumeTitle}`;
      }
      if (viewResumeBtn) viewResumeBtn.disabled = false;
    }
  } catch (err) {
    console.error("Failed to load resume:", err);
  }
}

viewResumeBtn?.addEventListener("click", () => {
  if (currentResumeUrl) window.open(currentResumeUrl, "_blank");
});

resumeInput?.addEventListener("change", async () => {
  const file = resumeInput.files[0];
  if (!file) return;

  if (resumeFileName) {
    resumeFileName.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading…`;
  }

  const formData = new FormData();
  formData.append("resume", file);
  formData.append("userId", user.id);
  formData.append("resumeTitle", file.name);

  try {
    const res  = await fetch(`${API}/api/resume/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (data.success) {
      currentResumeUrl = data.resumeUrl;
      if (resumeFileName) {
        resumeFileName.innerHTML = `<i class="fa-solid fa-file-pdf" style="color:#f87171"></i> ${data.resumeTitle}`;
      }
      if (viewResumeBtn) viewResumeBtn.disabled = false;
      showToast("✅ Resume uploaded successfully!", "success");
    } else {
      if (resumeFileName) {
        resumeFileName.innerHTML = `<i class="fa-solid fa-circle-info"></i> No resume uploaded yet`;
      }
      showToast(data.message || "Upload failed.", "error");
    }
  } catch (err) {
    console.error(err);
    if (resumeFileName) {
      resumeFileName.innerHTML = `<i class="fa-solid fa-circle-info"></i> No resume uploaded yet`;
    }
    showToast("❌ Resume upload failed.", "error");
  }
});

// ============================================================
// SKILLS (localStorage-backed)
// ============================================================
function getSkills() {
  return JSON.parse(localStorage.getItem("userSkills") || "[]");
}
function saveSkills(skills) {
  localStorage.setItem("userSkills", JSON.stringify(skills));
}

function renderSkills() {
  const skills = getSkills();
  if (!skillsContainer) return;
  skillsContainer.innerHTML = "";

  if (skills.length === 0) {
    if (noSkillsMsg) noSkillsMsg.style.display = "block";
    return;
  }
  if (noSkillsMsg) noSkillsMsg.style.display = "none";

  skills.forEach((skill, index) => {
    const tag = document.createElement("div");
    tag.className = "skill-tag";
    tag.innerHTML = `
      <span>${escHtml(skill)}</span>
      <button onclick="removeSkill(${index})" aria-label="Remove ${escHtml(skill)}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    skillsContainer.appendChild(tag);
  });
}

addSkillBtn?.addEventListener("click", () => {
  const skill = skillInput?.value.trim();
  if (!skill) return;

  const skills = getSkills();
  if (skills.includes(skill)) {
    showToast("Skill already added!", "error");
    return;
  }

  skills.push(skill);
  saveSkills(skills);
  if (skillInput) skillInput.value = "";
  renderSkills();
  showToast(`✅ "${skill}" added!`, "success");
});

skillInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addSkillBtn?.click(); }
});

window.removeSkill = function (index) {
  const skills = getSkills();
  const removed = skills[index];
  skills.splice(index, 1);
  saveSkills(skills);
  renderSkills();
  showToast(`Removed "${removed}"`, "success");
};

// ============================================================
// CHANGE PASSWORD MODAL
// ============================================================
const changePassBtn    = document.getElementById("changePassBtn");
const changePassModal  = document.getElementById("changePassModal");
const closeModalBtn    = document.getElementById("closeModalBtn");
const cancelPassBtn    = document.getElementById("cancelPassBtn");
const submitPassBtn    = document.getElementById("submitPassBtn");
const changePassStatus = document.getElementById("changePassStatus");
const currentPassInput = document.getElementById("currentPass");
const newPassInput     = document.getElementById("newPass");
const confirmPassInput = document.getElementById("confirmPass");

function openPassModal() {
  if (!changePassModal) return;
  changePassModal.classList.add("active");
  document.body.style.overflow = "hidden";
  if (currentPassInput) currentPassInput.value = "";
  if (newPassInput)     newPassInput.value     = "";
  if (confirmPassInput) confirmPassInput.value = "";
  if (changePassStatus) changePassStatus.style.display = "none";
  currentPassInput?.focus();
}
function closePassModal() {
  changePassModal?.classList.remove("active");
  document.body.style.overflow = "";
}

changePassBtn?.addEventListener("click", openPassModal);
closeModalBtn?.addEventListener("click", closePassModal);
cancelPassBtn?.addEventListener("click", closePassModal);
changePassModal?.addEventListener("click", (e) => { if (e.target === changePassModal) closePassModal(); });

submitPassBtn?.addEventListener("click", async () => {
  const current = currentPassInput?.value.trim();
  const newPass  = newPassInput?.value.trim();
  const confirm  = confirmPassInput?.value.trim();

  if (!current || !newPass || !confirm) {
    showModalStatus(changePassStatus, "Please fill all fields.", "error");
    return;
  }
  if (newPass.length < 6) {
    showModalStatus(changePassStatus, "New password must be at least 6 characters.", "error");
    return;
  }
  if (newPass === current) {
    showModalStatus(changePassStatus, "New password cannot be the same as current.", "error");
    return;
  }
  if (newPass !== confirm) {
    showModalStatus(changePassStatus, "Passwords do not match.", "error");
    return;
  }

  submitPassBtn.disabled   = true;
  submitPassBtn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i> Updating…';

  try {
    const res  = await fetch(`${API}/api/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, currentPassword: current, newPassword: newPass }),
    });
    const data = await res.json();

    if (data.success) {
      showModalStatus(changePassStatus, "✅ Password changed successfully!", "success");
      setTimeout(closePassModal, 1800);
    } else {
      showModalStatus(changePassStatus, data.message || "Failed to update password.", "error");
    }
  } catch (err) {
    console.error(err);
    showModalStatus(changePassStatus, "❌ Server error. Please try again.", "error");
  } finally {
    submitPassBtn.disabled  = false;
    submitPassBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Password';
  }
});

// ============================================================
// DELETE ACCOUNT MODAL
// ============================================================
const deleteAccBtn        = document.querySelector(".btn-delete-acc");
const deleteAccModal      = document.getElementById("deleteAccModal");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const cancelDeleteBtn     = document.getElementById("cancelDeleteBtn");
const submitDeleteBtn     = document.getElementById("submitDeleteBtn");
const deleteAccStatus     = document.getElementById("deleteAccStatus");
const deleteConfirmPass   = document.getElementById("deleteConfirmPass");

function openDeleteModal() {
  if (!deleteAccModal) return;
  deleteAccModal.classList.add("active");
  document.body.style.overflow = "hidden";
  if (deleteConfirmPass) deleteConfirmPass.value = "";
  if (deleteAccStatus)   deleteAccStatus.style.display = "none";
  deleteConfirmPass?.focus();
}
function closeDeleteModal() {
  deleteAccModal?.classList.remove("active");
  document.body.style.overflow = "";
}

deleteAccBtn?.addEventListener("click", openDeleteModal);
closeDeleteModalBtn?.addEventListener("click", closeDeleteModal);
cancelDeleteBtn?.addEventListener("click", closeDeleteModal);
deleteAccModal?.addEventListener("click", (e) => { if (e.target === deleteAccModal) closeDeleteModal(); });

submitDeleteBtn?.addEventListener("click", async () => {
  const password = deleteConfirmPass?.value.trim();

  if (!password) {
    showModalStatus(deleteAccStatus, "Please enter your password to confirm.", "error");
    return;
  }

  submitDeleteBtn.disabled   = true;
  submitDeleteBtn.innerHTML  = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting…';

  try {
    const res  = await fetch(`${API}/api/user/${user.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (data.success) {
      showModalStatus(deleteAccStatus, "✅ Account deleted. Redirecting…", "success");
      setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "../index.html";
      }, 2000);
    } else {
      showModalStatus(deleteAccStatus, data.message || "Deletion failed.", "error");
      submitDeleteBtn.disabled  = false;
      submitDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete My Account';
    }
  } catch (err) {
    console.error(err);
    showModalStatus(deleteAccStatus, "❌ Server error. Please try again.", "error");
    submitDeleteBtn.disabled  = false;
    submitDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete My Account';
  }
});

// ── Password visibility toggles ───────────────────────────────
document.querySelectorAll(".toggle-eye").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target  = document.getElementById(btn.dataset.target);
    if (!target) return;
    const hidden  = target.type === "password";
    target.type   = hidden ? "text" : "password";
    const icon    = btn.querySelector("i");
    if (icon) icon.className = hidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
  });
});

// Escape closes any open modal
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  closePassModal();
  closeDeleteModal();
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

function showModalStatus(el, msg, type = "success") {
  if (!el) return;
  el.textContent   = msg;
  el.style.display = "block";
  el.style.color   = type === "success" ? "#22c55e" : "#ef4444";
  el.style.background = type === "success"
    ? "rgba(34,197,94,0.1)"
    : "rgba(239,68,68,0.1)";
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
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ============================================================
// INIT
// ============================================================
loadProfile();
loadStats();
loadResume();
renderSkills();
