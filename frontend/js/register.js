// ============================================================
// register.js – Smart Interview Tracker
// ============================================================

const API_URL = API_BASE;

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

// ── Registration Form Handling ───────────────────────────────
const registerForm = document.getElementById("registerForm");
const errorBox     = document.getElementById("registerError");
const registerBtn  = document.getElementById("registerBtn");
let registeredEmail = "";

registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name            = document.getElementById("name").value.trim();
  const phone           = document.getElementById("phone").value.trim();
  const email           = document.getElementById("email").value.trim();
  const password        = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!name || !phone || !email || !password || !confirmPassword) {
    showError("Please fill in all required fields.");
    return;
  }

  if (password !== confirmPassword) {
    showError("Passwords do not match.");
    showToast("Passwords do not match", "error");
    return;
  }

  // Basic telephone checks
  if (phone.length !== 10 || isNaN(phone)) {
    showError("Phone number must be a valid 10-digit number.");
    showToast("Invalid phone number", "error");
    return;
  }

  try {
    hideError();
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account…';

    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, phone, email, password }),
    });

    const data = await response.json();

    if (data.success) {
      registeredEmail = email;
      registerForm.style.display = "none";
      if (otpVerifyForm) otpVerifyForm.style.display = "block";
      showToast("✅ Verification code sent to your email!", "success");
    } else {
      showError(data.message || "Registration failed.");
      showToast(data.message || "Registration failed.", "error");
    }
  } catch (err) {
    console.error("Registration error:", err);
    showError("❌ Server Error. Please make sure the backend is running.");
    showToast("❌ Connection error.", "error");
  } finally {
    registerBtn.disabled = false;
    registerBtn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Register Account';
  }
});

// ── OTP Verification Handling ───────────────────────────────
const otpVerifyForm = document.getElementById("otpVerifyForm");
const otpCodeInput  = document.getElementById("otpCode");
const verifyBtn     = document.getElementById("verifyBtn");
const otpErrorBox   = document.getElementById("otpError");
const resendOtpLink = document.getElementById("resendOtpLink");

function showOtpError(msg) {
  if (!otpErrorBox) return;
  otpErrorBox.textContent = msg;
  otpErrorBox.style.display = "block";
}
function hideOtpError() {
  if (!otpErrorBox) return;
  otpErrorBox.style.display = "none";
}

otpVerifyForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const otp = otpCodeInput.value.trim();

  if (!otp || otp.length !== 6 || isNaN(otp)) {
    showOtpError("Please enter a valid 6-digit verification code.");
    return;
  }

  try {
    hideOtpError();
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying…';

    const response = await fetch(`${API_URL}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registeredEmail, otp }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      showToast("✅ Email verified! Redirecting…", "success");

      setTimeout(() => {
        window.location.href = "./profile.html";
      }, 1200);
    } else {
      showOtpError(data.message || "Verification failed.");
      showToast(data.message || "Verification failed.", "error");
    }
  } catch (err) {
    console.error("OTP verification error:", err);
    showOtpError("❌ Connection error. Try again later.");
    showToast("❌ Connection error.", "error");
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Verify &amp; Register';
  }
});

resendOtpLink?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!registeredEmail) return;

  try {
    showToast("Sending new code…", "success");
    const response = await fetch(`${API_URL}/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registeredEmail }),
    });

    const data = await response.json();
    if (data.success) {
      showToast("✅ New verification code sent!", "success");
      hideOtpError();
    } else {
      showToast(data.message || "Failed to resend code.", "error");
    }
  } catch (err) {
    console.error("Resend OTP error:", err);
    showToast("❌ Connection error.", "error");
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
