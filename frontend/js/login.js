// ============================================================
// login.js – Smart Interview Tracker
// ============================================================

const API_URL = "http://localhost:5500";

// ── Hamburger Menu Toggling ──────────────────────────────────
const menuBtn  = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
const navbar   = document.getElementById("navbar");
const menuIcon = menuBtn?.querySelector("i");

function setMenuState(isOpen) {
  navLinks?.classList.toggle("active", isOpen);
  menuBtn?.setAttribute("aria-expanded", String(isOpen));
  menuBtn?.setAttribute(
    "aria-label",
    isOpen ? "Close navigation" : "Open navigation",
  );
  menuIcon?.classList.toggle("fa-bars", !isOpen);
  menuIcon?.classList.toggle("fa-xmark", isOpen);
}

menuBtn?.addEventListener("click", () => {
  setMenuState(menuBtn.getAttribute("aria-expanded") !== "true");
});

// Close menu when a link is clicked
navLinks?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => setMenuState(false));
});

document.addEventListener("click", (event) => {
  if (navbar && !navbar.contains(event.target)) setMenuState(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuBtn?.getAttribute("aria-expanded") === "true") {
    setMenuState(false);
    menuBtn?.focus();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 900) setMenuState(false);
});

// ── Forgot Password Flow ─────────────────────────────────────
const forgotPasswordBtn      = document.getElementById("forgotPasswordBtn");
const passwordResetModal     = document.getElementById("passwordResetModal");
const closeResetModalBtn     = document.getElementById("closeResetModal");
const passwordResetForm      = document.getElementById("passwordResetForm");
const resetEmail             = document.getElementById("resetEmail");
const resetVerificationFields = document.getElementById("resetVerificationFields");
const resetCode              = document.getElementById("resetCode");
const resetNewPassword       = document.getElementById("resetNewPassword");
const resetConfirmPassword   = document.getElementById("resetConfirmPassword");
const resetSubmitBtn         = document.getElementById("resetSubmitBtn");
const resetInstructions      = document.getElementById("resetInstructions");
const resetStatus            = document.getElementById("resetStatus");

let isResetCodeStep = false;
let elementBeforeResetModal = null;

function showResetStatus(message = "", type = "") {
  if (!resetStatus) return;
  resetStatus.textContent = message;
  resetStatus.className = `reset-status${type ? ` ${type}` : ""}`;
}

function setResetStep(showCodeStep) {
  isResetCodeStep = showCodeStep;
  if (resetVerificationFields) resetVerificationFields.hidden = !showCodeStep;
  if (resetEmail) resetEmail.readOnly = showCodeStep;
  if (resetCode) resetCode.required = showCodeStep;
  if (resetNewPassword) resetNewPassword.required = showCodeStep;
  if (resetConfirmPassword) resetConfirmPassword.required = showCodeStep;

  if (resetInstructions) {
    resetInstructions.textContent = showCodeStep
      ? "Enter the verification code and choose a new password."
      : "Enter your account email and we’ll send you a verification code.";
  }

  if (resetSubmitBtn) {
    resetSubmitBtn.innerHTML = showCodeStep
      ? '<i class="fa-solid fa-key" aria-hidden="true"></i> Reset Password'
      : '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Send Reset Code';
  }
}

function openResetModal() {
  if (!passwordResetModal || !passwordResetForm) return;
  elementBeforeResetModal = document.activeElement;
  passwordResetForm.reset();
  setResetStep(false);
  showResetStatus();

  const loginEmailValue = document.getElementById("loginEmail")?.value.trim();
  if (resetEmail && loginEmailValue) resetEmail.value = loginEmailValue;

  passwordResetModal.hidden = false;
  document.body.classList.add("modal-open");
  resetEmail?.focus();
}

function closeResetModal() {
  if (!passwordResetModal) return;
  passwordResetModal.hidden = true;
  document.body.classList.remove("modal-open");
  showResetStatus();
  elementBeforeResetModal?.focus?.();
}

function setResetBusy(isBusy, label) {
  if (!resetSubmitBtn) return;
  resetSubmitBtn.disabled = isBusy;
  if (isBusy) {
    resetSubmitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> ${label}`;
  } else {
    setResetStep(isResetCodeStep);
  }
}

forgotPasswordBtn?.addEventListener("click", openResetModal);
closeResetModalBtn?.addEventListener("click", closeResetModal);

passwordResetModal?.addEventListener("click", (event) => {
  if (event.target === passwordResetModal) closeResetModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && passwordResetModal && !passwordResetModal.hidden) {
    closeResetModal();
  }
});

passwordResetForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = resetEmail?.value.trim() || "";

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    showResetStatus("Please enter a valid email address.", "error");
    resetEmail?.focus();
    return;
  }

  if (!isResetCodeStep) {
    try {
      showResetStatus();
      setResetBusy(true, "Sending Code…");

      const response = await fetch(`${API_URL}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to send the reset code.");
      }

      setResetStep(true);
      if (data.devCode && resetCode) {
        resetCode.value = data.devCode;
        showResetStatus(
          `Development code ${data.devCode} has been filled in for you.`,
          "success",
        );
      } else {
        showResetStatus(data.message, "success");
      }
      resetCode?.focus();
    } catch (error) {
      showResetStatus(error.message || "Unable to send the reset code.", "error");
    } finally {
      setResetBusy(false);
    }
    return;
  }

  const code = resetCode?.value.trim() || "";
  const newPassword = resetNewPassword?.value || "";
  const confirmPassword = resetConfirmPassword?.value || "";

  if (!/^\d{6}$/.test(code)) {
    showResetStatus("Enter the 6-digit verification code.", "error");
    resetCode?.focus();
    return;
  }
  if (newPassword.length < 8) {
    showResetStatus("Your new password must be at least 8 characters.", "error");
    resetNewPassword?.focus();
    return;
  }
  if (newPassword !== confirmPassword) {
    showResetStatus("The new passwords do not match.", "error");
    resetConfirmPassword?.focus();
    return;
  }

  try {
    showResetStatus();
    setResetBusy(true, "Resetting Password…");

    const response = await fetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to reset your password.");
    }

    const loginEmailInput = document.getElementById("loginEmail");
    if (loginEmailInput) loginEmailInput.value = email;
    closeResetModal();
    document.getElementById("loginPassword")?.focus();
    showToast("Password reset successfully. You can now log in.", "success");
  } catch (error) {
    showResetStatus(error.message || "Unable to reset your password.", "error");
  } finally {
    setResetBusy(false);
  }
});

// ── Login Form Handling ──────────────────────────────────────
const loginForm = document.getElementById("loginForm");
const errorBox  = document.getElementById("loginError");
const loginBtn  = document.getElementById("loginBtn");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const rememberMeInput = document.getElementById("rememberMe");
const REMEMBERED_EMAIL_KEY = "interviewTrackerRememberedEmail";

const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
if (rememberedEmail && loginEmailInput && rememberMeInput) {
  loginEmailInput.value = rememberedEmail;
  rememberMeInput.checked = true;
}

rememberMeInput?.addEventListener("change", () => {
  if (!rememberMeInput.checked) {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }
});

loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email    = loginEmailInput?.value.trim() || "";
  const password = loginPasswordInput?.value || "";

  if (!email || !password) {
    showError("Please enter your email and password.");
    return;
  }

  try {
    hideError();
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in…';

    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      const serializedUser = JSON.stringify(data.user);

      if (rememberMeInput?.checked) {
        localStorage.setItem("user", serializedUser);
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        sessionStorage.removeItem("user");
      } else {
        sessionStorage.setItem("user", serializedUser);
        localStorage.removeItem("user");
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      showToast("✅ Login successful! Redirecting…", "success");

      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 1000);
    } else {
      showError(data.message || "Invalid credentials.");
      showToast("❌ Login failed.", "error");
    }
  } catch (error) {
    console.error("Login connection error:", error);
    showError("❌ Server Error. Please make sure the backend is running.");
    showToast("❌ Connection error.", "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> Login';
  }
});

// Helper functions for error box
function showError(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}
function hideError() {
  if (!errorBox) return;
  errorBox.style.display = "none";
}

// ── Toast Notification System ────────────────────────────────
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
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });
  });

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}
