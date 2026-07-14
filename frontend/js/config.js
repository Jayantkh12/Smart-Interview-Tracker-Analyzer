// ============================================================
// config.js – Smart Interview Tracker API Configuration
// ============================================================
//
// This is the SINGLE source of truth for the backend API URL.
// To switch environments, change only this file.
//
// LOCAL DEV : http://localhost:5500
// PRODUCTION: Your Render backend URL (set below)
// ============================================================

const API_BASE = (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "" ||
  window.location.protocol === "file:"
)
  ? "http://localhost:5500"
  : "https://smart-interview-tracker-backendsmart.onrender.com";

// Expose globally so all page scripts can use it
window.API_BASE = API_BASE;
