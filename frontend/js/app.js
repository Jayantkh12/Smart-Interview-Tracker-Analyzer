// ============================================================
// app.js – Smart Interview Tracker Landing Page
// ============================================================

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.addEventListener("load", () => window.scrollTo(0, 0));

// ── Navbar hamburger ──────────────────────────────────────────
const menuBtn  = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");
menuBtn?.addEventListener("click", () => {
  navLinks?.classList.toggle("active");
});

// Close menu when a link is clicked
navLinks?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => navLinks.classList.remove("active"));
});

// ── Navbar scroll class ───────────────────────────────────────
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  if (navbar) {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
  }
}, { passive: true });

// ── Smooth-scroll for hash links ──────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// ── Stats counter animation ───────────────────────────────────
let statsAnimated = false;
const statsSection = document.getElementById("statsContainer");

function animateCounter(id, target, suffix = "") {
  const el = document.getElementById(id);
  if (!el) return;
  const duration  = 1200;
  const startTime = performance.now();
  function tick(now) {
    const p    = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 4);   // quartic ease-out
    el.textContent = Math.round(target * ease) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function runStats(data) {
  animateCounter("applications", data.applications  || 0, "+");
  animateCounter("interviews",   data.interviews     || 0, "+");
  animateCounter("offers",       data.offers         || 0, "+");
  animateCounter("satisfaction", data.satisfaction   || 0, "%");
}

const statsObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !statsAnimated) {
    statsAnimated = true;
    fetch("http://localhost:5500/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => runStats(data))
      .catch(() => {
        // Fallback values when server is not running
        runStats({ applications: 1250, interviews: 850, offers: 320, satisfaction: 95 });
      });
  }
}, { threshold: 0.3 });

if (statsSection) statsObserver.observe(statsSection);

// ── Animate elements on scroll ────────────────────────────────
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity      = "1";
      entry.target.style.transform    = "translateY(0)";
      entry.target.style.transition   = "opacity 0.6s ease, transform 0.6s ease";
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".feature-card, .about-mini-card, .contact-section .info-card, .contact-form-wrap").forEach((el, i) => {
  el.style.opacity   = "0";
  el.style.transform = "translateY(24px)";
  el.style.transitionDelay = `${i * 0.07}s`;
  fadeObserver.observe(el);
});

// ── Contact Form Handling ────────────────────────────────────
const contactForm = document.getElementById("contactForm");
const submitBtn   = document.getElementById("submitBtn");

contactForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name    = document.getElementById("name").value.trim();
  const email   = document.getElementById("email").value.trim();
  const subject = document.getElementById("subject").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!name || !email || !subject || !message) {
    showToast("Please fill in all fields.", "error");
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showToast("Please enter a valid email address.", "error");
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';

    const response = await fetch("http://localhost:5500/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, subject, message }),
    });

    const data = await response.json();

    if (response.ok) {
      showToast("✅ " + (data.message || "Message sent successfully!"), "success");
      contactForm.reset();
    } else {
      showToast(data.message || "Failed to send message.", "error");
    }
  } catch (error) {
    console.error("Error submitting contact form:", error);
    showToast("❌ Unable to connect to server. Try again later.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send Message';
  }
});

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
