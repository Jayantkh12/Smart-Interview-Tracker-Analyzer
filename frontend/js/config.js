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
  window.location.hostname === "127.0.0.1"
)
  ? "http://localhost:5500"
  : "https://smart-interview-tracker-api.onrender.com"; // ← Replace with your Render URL after first deploy

// Expose globally so all page scripts can use it
window.API_BASE = API_BASE;
