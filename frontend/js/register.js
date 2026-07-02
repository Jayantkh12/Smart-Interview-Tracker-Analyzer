// ============================================================
// register.js – Smart Interview Tracker
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

// ── Registration Form Handling ───────────────────────────────
const registerForm = document.getElementById("registerForm");
const errorBox     = document.getElementById("registerError");
const registerBtn  = document.getElementById("registerBtn");

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
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user || { id: data.userId, name, email }));
      showToast("✅ Registration successful! Welcome aboard.", "success");
      
      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 1200);
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
