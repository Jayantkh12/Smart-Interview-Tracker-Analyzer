const API = "http://localhost:5500";

const DEFAULT_IMAGE = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

// Check login
const user = JSON.parse(localStorage.getItem("user"));
if (!user) window.location.href = "login.html";

// DOM Elements
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

// ─── Load Profile from Backend ───────────────────────────────
async function loadProfile() {
  try {
    const res  = await fetch(`${API}/api/profile/${user.id}`);
    const data = await res.json();

    if (!data.success) return;

    // Fill basic fields
    fullNameInput.value  = data.name  || "";
    emailInput.value     = data.email || "";
    phoneInput.value     = data.phone || "";
    collegeInput.value   = data.college || "";
    branchInput.value    = data.branch  || "";

    if (data.graduationYear) gradYearSelect.value = String(data.graduationYear);

    // Fill career preferences
    if (preferredRoleInput)     preferredRoleInput.value     = data.preferredRole     || "";
    if (expectedPackageInput)   expectedPackageInput.value   = data.expectedPackage   || "";
    if (preferredLocationInput) preferredLocationInput.value = data.preferredLocation || "";
    if (workTypeSelect && data.workType) workTypeSelect.value = data.workType;

    // Profile photo
    photoPreview.src = data.profilePic
      ? data.profilePic + "?t=" + Date.now()
      : DEFAULT_IMAGE;

    // Hide "new user" message if profile is filled
    const newUserMsg = document.getElementById("newUserMessage");
    if (newUserMsg && (data.college || data.branch)) {
      newUserMsg.style.display = "none";
    }
  } catch (err) {
    console.error("Failed to load profile:", err);
    photoPreview.src = DEFAULT_IMAGE;
  }
}

// ─── Load Stats from Backend ─────────────────────────────────
async function loadStats() {
  try {
    const res  = await fetch(`${API}/api/applications/stats/${user.id}`);
    const data = await res.json();

    if (totalAppsEl)  totalAppsEl.textContent  = data.applications  ?? 0;
    if (interviewsEl) interviewsEl.textContent = data.interviews    ?? 0;
    if (offersEl)     offersEl.textContent      = data.offers        ?? 0;
    if (rejectedEl)   rejectedEl.textContent    = data.rejections    ?? 0;
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

// ─── Save Profile ─────────────────────────────────────────────
saveBtn.addEventListener("click", async () => {
  const name             = fullNameInput.value.trim();
  const phone            = phoneInput.value.trim();
  const college          = collegeInput.value.trim();
  const branch           = branchInput.value.trim();
  const graduationYear   = gradYearSelect.value;
  const preferredRole    = preferredRoleInput?.value.trim()     || "";
  const expectedPackage  = expectedPackageInput?.value.trim()   || "";
  const preferredLocation= preferredLocationInput?.value.trim() || "";
  const workType         = workTypeSelect?.value                || "";

  if (!name) {
    showStatus("Please enter your full name.", "error");
    return;
  }

  try {
    saveBtn.disabled    = true;
    saveBtn.textContent = "Saving...";

    const res = await fetch(`${API}/api/profile/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, college, branch, graduationYear, preferredRole, expectedPackage, preferredLocation, workType }),
    });

    const data = await res.json();

    if (data.success) {
      // Update name in localStorage
      user.name = name;
      localStorage.setItem("user", JSON.stringify(user));
      showStatus("✅ Profile saved successfully!", "success");
    } else {
      showStatus(data.message || "Failed to save.", "error");
    }
  } catch (err) {
    console.error(err);
    showStatus("❌ Server error. Please try again.", "error");
  } finally {
    saveBtn.disabled    = false;
    saveBtn.innerHTML   = '<i class="fa-solid fa-floppy-disk"></i> Save Profile';
  }
});

// ─── Upload Profile Photo ─────────────────────────────────────
photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) return;

  // Instant preview
  photoPreview.src = URL.createObjectURL(file);

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
      photoPreview.src = data.imageUrl + "?t=" + Date.now();
      showStatus("✅ Profile photo updated!", "success");
    } else {
      showStatus(data.message || "Upload failed.", "error");
    }
  } catch (err) {
    console.error(err);
    showStatus("❌ Upload failed.", "error");
  }
});

// ─── Resume ───────────────────────────────────────────────────
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
      resumeFileName.innerHTML = `<i class="fa-solid fa-file-pdf"></i> ${data.resumeTitle}`;
      viewResumeBtn.disabled   = false;
    }
  } catch (err) {
    console.error("Failed to load resume:", err);
  }
}

viewResumeBtn.addEventListener("click", () => {
  if (currentResumeUrl) window.open(currentResumeUrl, "_blank");
});

resumeInput.addEventListener("change", async () => {
  const file = resumeInput.files[0];
  if (!file) return;

  resumeFileName.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading...`;

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
      resumeFileName.innerHTML = `<i class="fa-solid fa-file-pdf"></i> ${data.resumeTitle}`;
      viewResumeBtn.disabled   = false;
      showStatus("✅ Resume uploaded successfully!", "success");
    } else {
      resumeFileName.innerHTML = `<i class="fa-solid fa-circle-info"></i> No resume uploaded yet`;
      showStatus(data.message || "Upload failed.", "error");
    }
  } catch (err) {
    console.error(err);
    resumeFileName.innerHTML = `<i class="fa-solid fa-circle-info"></i> No resume uploaded yet`;
    showStatus("❌ Resume upload failed.", "error");
  }
});

// ─── Skills (localStorage based) ──────────────────────────────
function getSkills() {
  return JSON.parse(localStorage.getItem("userSkills") || "[]");
}

function saveSkills(skills) {
  localStorage.setItem("userSkills", JSON.stringify(skills));
}

function renderSkills() {
  const skills = getSkills();
  skillsContainer.innerHTML = "";

  if (skills.length === 0) {
    noSkillsMsg.style.display = "block";
    return;
  }

  noSkillsMsg.style.display = "none";

  skills.forEach((skill, index) => {
    const tag = document.createElement("div");
    tag.className = "skill-tag";
    tag.innerHTML = `
      <span>${skill}</span>
      <button onclick="removeSkill(${index})" aria-label="Remove ${skill}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    skillsContainer.appendChild(tag);
  });
}

addSkillBtn.addEventListener("click", () => {
  const skill = skillInput.value.trim();
  if (!skill) return;

  const skills = getSkills();
  if (skills.includes(skill)) {
    showStatus("Skill already added!", "error");
    return;
  }

  skills.push(skill);
  saveSkills(skills);
  skillInput.value = "";
  renderSkills();
});

skillInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSkillBtn.click();
});

window.removeSkill = function (index) {
  const skills = getSkills();
  skills.splice(index, 1);
  saveSkills(skills);
  renderSkills();
};

// ─── Status Message Helper ───────────────────────────────────
function showStatus(msg, type = "success") {
  statusMsg.textContent    = msg;
  statusMsg.style.display  = "block";
  statusMsg.style.color    = type === "success" ? "#22c55e" : "#ef4444";

  setTimeout(() => {
    statusMsg.style.display = "none";
  }, 3500);
}

// ─── Change Password Modal ────────────────────────────────────
const changePassBtn    = document.getElementById("changePassBtn");
const changePassModal  = document.getElementById("changePassModal");
const closeModalBtn    = document.getElementById("closeModalBtn");
const cancelPassBtn    = document.getElementById("cancelPassBtn");
const submitPassBtn    = document.getElementById("submitPassBtn");
const changePassStatus = document.getElementById("changePassStatus");
const currentPassInput = document.getElementById("currentPass");
const newPassInput     = document.getElementById("newPass");
const confirmPassInput = document.getElementById("confirmPass");

function openModal() {
  changePassModal.classList.add("active");
  currentPassInput.value = "";
  newPassInput.value     = "";
  confirmPassInput.value = "";
  changePassStatus.style.display = "none";
  currentPassInput.focus();
}

function closeModal() {
  changePassModal.classList.remove("active");
}

changePassBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
cancelPassBtn.addEventListener("click", closeModal);

// Close when clicking outside modal box
changePassModal.addEventListener("click", (e) => {
  if (e.target === changePassModal) closeModal();
});

// Eye toggle for all 3 password fields
document.querySelectorAll(".toggle-eye").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    const isHidden = target.type === "password";
    target.type = isHidden ? "text" : "password";
    btn.querySelector("i").className = isHidden
      ? "fa-solid fa-eye-slash"
      : "fa-solid fa-eye";
  });
});

function showModalStatus(msg, type) {
  changePassStatus.textContent   = msg;
  changePassStatus.style.display = "block";
  changePassStatus.style.color   = type === "success" ? "#22c55e" : "#ef4444";
  changePassStatus.style.background = type === "success"
    ? "rgba(34,197,94,0.1)"
    : "rgba(239,68,68,0.1)";
}

submitPassBtn.addEventListener("click", async () => {
  const current = currentPassInput.value.trim();
  const newPass  = newPassInput.value.trim();
  const confirm  = confirmPassInput.value.trim();

  if (!current || !newPass || !confirm) {
    showModalStatus("Please fill all fields.", "error");
    return;
  }
  if (newPass.length < 6) {
    showModalStatus("New password must be at least 6 characters.", "error");
    return;
  }
  if (newPass === current) {
    showModalStatus("New password cannot be same as current password.", "error");
    return;
  }
  if (newPass !== confirm) {
    showModalStatus("New passwords do not match.", "error");
    return;
  }

  submitPassBtn.disabled    = true;
  submitPassBtn.textContent = "Updating...";

  try {
    const res  = await fetch(`${API}/api/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, currentPassword: current, newPassword: newPass }),
    });
    const data = await res.json();

    if (data.success) {
      showModalStatus("✅ Password changed successfully!", "success");
      setTimeout(closeModal, 2000);
    } else {
      showModalStatus(data.message || "Failed to update password.", "error");
    }
  } catch (err) {
    console.error(err);
    showModalStatus("❌ Server error. Please try again.", "error");
  } finally {
    submitPassBtn.disabled  = false;
    submitPassBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update Password';
  }
});

// ─── Delete Account Modal ─────────────────────────────────────
const deleteAccBtn       = document.querySelector(".delete-btn");
const deleteAccModal     = document.getElementById("deleteAccModal");
const closeDeleteModalBtn= document.getElementById("closeDeleteModalBtn");
const cancelDeleteBtn    = document.getElementById("cancelDeleteBtn");
const submitDeleteBtn    = document.getElementById("submitDeleteBtn");
const deleteAccStatus    = document.getElementById("deleteAccStatus");
const deleteConfirmPass  = document.getElementById("deleteConfirmPass");

function openDeleteModal() {
  deleteAccModal.classList.add("active");
  deleteConfirmPass.value        = "";
  deleteAccStatus.style.display  = "none";
  deleteConfirmPass.focus();
}

function closeDeleteModal() {
  deleteAccModal.classList.remove("active");
}

deleteAccBtn.addEventListener("click", openDeleteModal);
closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
cancelDeleteBtn.addEventListener("click", closeDeleteModal);

deleteAccModal.addEventListener("click", (e) => {
  if (e.target === deleteAccModal) closeDeleteModal();
});

function showDeleteStatus(msg, type) {
  deleteAccStatus.textContent        = msg;
  deleteAccStatus.style.display      = "block";
  deleteAccStatus.style.color        = type === "success" ? "#22c55e" : "#ef4444";
  deleteAccStatus.style.background   = type === "success"
    ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
}

submitDeleteBtn.addEventListener("click", async () => {
  const password = deleteConfirmPass.value.trim();

  if (!password) {
    showDeleteStatus("Please enter your password to confirm.", "error");
    return;
  }

  submitDeleteBtn.disabled    = true;
  submitDeleteBtn.textContent = "Deleting...";

  try {
    const res  = await fetch(`${API}/api/user/${user.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (data.success) {
      showDeleteStatus("✅ Account deleted. Redirecting...", "success");
      setTimeout(() => {
        localStorage.clear();
        window.location.href = "../index.html";
      }, 2000);
    } else {
      showDeleteStatus(data.message || "Deletion failed.", "error");
      submitDeleteBtn.disabled  = false;
      submitDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete My Account';
    }
  } catch (err) {
    console.error(err);
    showDeleteStatus("❌ Server error. Please try again.", "error");
    submitDeleteBtn.disabled  = false;
    submitDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Delete My Account';
  }
});

// ─── Init ────────────────────────────────────────────────────
loadProfile();
loadStats();
loadResume();
renderSkills();
