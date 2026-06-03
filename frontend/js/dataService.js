// ============================================================
// dataService.js  –  Smart Interview Tracker & Analyzer
// ============================================================
//
// PURPOSE
//   Single source of truth for all data in the frontend.
//   UI files (dashboard.js, applications.js, analytics.js,
//   profile.js) must NEVER contain raw data arrays or direct
//   localStorage calls.  They ask DataService for everything.
//
// CURRENT STORAGE LAYER  →  localStorage (with in-memory fallback)
//
// FUTURE MIGRATION  (when Node.js backend is ready)
//   1. Replace the readJson / writeJson calls inside each
//      public method with fetch() calls to your REST API.
//   2. Change the method signatures to return Promises.
//   3. UI files already treat DataService as the only data
//      source, so the rest of the code stays the same.
//
// ============================================================

const DataService = (() => {
  // ----------------------------------------------------------
  // 1. STORAGE KEYS  –  namespaced to avoid collisions
  // ----------------------------------------------------------
  const STORAGE_KEYS = {
    applications: "smartInterviewTracker.applications",
    profile: "smartInterviewTracker.profile",
    auth: "smartInterviewTracker.auth",
  };

  // ----------------------------------------------------------
  // 2. SEED / DEFAULT DATA
  //    Shown the very first time the app loads.
  //    Kept here so UI files never hard-code example records.
  // ----------------------------------------------------------
  const SEED_APPLICATIONS = [
    {
      id: 1001,
      company: "Google",
      role: "Software Engineer Intern",
      package: "20 LPA",
      status: "Interview",
      applicationDate: "2026-06-01",
      applicationLink: "",
      notes: "Technical round scheduled.",
      questionsAsked: "Arrays, strings, and project discussion",
      nextRoundQuestions: "Prepare system design basics and behavioral answers",
      interviewDate: "2026-06-10",
      resumeName: "SWE Resume.pdf",
      resumeData: "",
      createdAt: "2026-06-01T09:00:00.000Z",
      updatedAt: "2026-06-01T09:00:00.000Z",
    },
    {
      id: 1002,
      company: "Microsoft",
      role: "SDE Intern",
      package: "18 LPA",
      status: "Applied",
      applicationDate: "2026-06-02",
      applicationLink: "",
      notes: "Application submitted through career portal.",
      questionsAsked: "",
      nextRoundQuestions: "",
      interviewDate: "",
      resumeName: "Campus Resume.pdf",
      resumeData: "",
      createdAt: "2026-06-02T10:30:00.000Z",
      updatedAt: "2026-06-02T10:30:00.000Z",
    },
    {
      id: 1003,
      company: "Amazon",
      role: "Backend Intern",
      package: "22 LPA",
      status: "Offer",
      applicationDate: "2026-05-28",
      applicationLink: "",
      notes: "Offer received after final interview.",
      questionsAsked: "OOP, DBMS, and API design",
      nextRoundQuestions: "",
      interviewDate: "",
      resumeName: "Backend Resume.pdf",
      resumeData: "",
      createdAt: "2026-05-28T11:15:00.000Z",
      updatedAt: "2026-05-28T11:15:00.000Z",
    },
    {
      id: 1004,
      company: "Flipkart",
      role: "Frontend Intern",
      package: "15 LPA",
      status: "Rejected",
      applicationDate: "2026-05-20",
      applicationLink: "",
      notes: "Did not clear the coding round.",
      questionsAsked: "Array manipulation and CSS layout",
      nextRoundQuestions: "",
      interviewDate: "2026-05-25",
      resumeName: "Frontend Resume.pdf",
      resumeData: "",
      createdAt: "2026-05-20T08:00:00.000Z",
      updatedAt: "2026-05-25T14:00:00.000Z",
    },
    {
      id: 1005,
      company: "Infosys",
      role: "Systems Engineer",
      package: "6.5 LPA",
      status: "Applied",
      applicationDate: "2026-06-03",
      applicationLink: "",
      notes: "Applied through campus placement portal.",
      questionsAsked: "",
      nextRoundQuestions: "",
      interviewDate: "",
      resumeName: "Campus Resume.pdf",
      resumeData: "",
      createdAt: "2026-06-03T07:00:00.000Z",
      updatedAt: "2026-06-03T07:00:00.000Z",
    },
  ];

  const SEED_PROFILE = {
    fullName: "Student",
    email: "",
    phone: "",
    college: "",
    branch: "",
    graduationYear: "",
    preferredRole: "",
    expectedPackage: "",
    preferredLocation: "",
    workType: "",
    skills: [],
    photoData: "",
    resumeName: "",
    resumeData: "",
    updatedAt: "",
  };

  // ----------------------------------------------------------
  // 3. CONSTANTS
  // ----------------------------------------------------------

  /** All valid application statuses. */
  const VALID_STATUSES = ["Applied", "Interview", "Offer", "Rejected"];

  // ----------------------------------------------------------
  // 4. LOW-LEVEL STORAGE HELPERS
  //    Wrap localStorage so the rest of the code is insulated
  //    from storage exceptions (e.g. private-browsing quota).
  // ----------------------------------------------------------

  /** In-memory fallback when localStorage is unavailable. */
  const _memStore = {};

  function _readRaw(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return Object.prototype.hasOwnProperty.call(_memStore, key)
        ? _memStore[key]
        : null;
    }
  }

  function _writeRaw(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {
      _memStore[key] = value;
    }
  }

  function _removeRaw(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {
      delete _memStore[key];
    }
  }

  function _readJson(key, fallback) {
    const raw = _readRaw(key);
    if (raw === null) {
      _writeJson(key, fallback);
      return _clone(fallback);
    }
    try {
      return JSON.parse(raw);
    } catch (_) {
      _writeJson(key, fallback);
      return _clone(fallback);
    }
  }

  function _writeJson(key, value) {
    _writeRaw(key, JSON.stringify(value));
  }

  /** Deep-clone a JSON-serialisable value so callers can't mutate the store. */
  function _clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  // ----------------------------------------------------------
  // 5. NORMALISATION HELPERS
  //    Ensure every record that enters the store is complete
  //    and consistently shaped.
  // ----------------------------------------------------------

  function _normalizeStatus(status) {
    return VALID_STATUSES.includes(status) ? status : "Applied";
  }

  /**
   * Returns a fully-populated application object.
   * Missing fields are filled with sensible defaults.
   * @param {Object} raw - Partial or full application object.
   * @returns {Object} Normalised application.
   */
  function _normalizeApplication(raw) {
    const now = new Date().toISOString();
    return {
      id: raw.id || Date.now(),
      company: raw.company || "",
      role: raw.role || "",
      package: raw.package || "",
      status: _normalizeStatus(raw.status),
      applicationDate: raw.applicationDate || now.slice(0, 10),
      applicationLink: raw.applicationLink || "",
      notes: raw.notes || "",
      questionsAsked: raw.questionsAsked || "",
      nextRoundQuestions: raw.nextRoundQuestions || "",
      interviewDate: raw.interviewDate || "",
      resumeName: raw.resumeName || "",
      resumeData: raw.resumeData || "",
      createdAt: raw.createdAt || now,
      updatedAt: now,
    };
  }

  // ----------------------------------------------------------
  // 6. INTERNAL READ / WRITE PRIMITIVES
  //    These private functions are the ONLY code that touches
  //    localStorage.  When migrating to an API, swap these out.
  // ----------------------------------------------------------

  function _getApplications() {
    const list = _readJson(STORAGE_KEYS.applications, SEED_APPLICATIONS);
    return Array.isArray(list) ? list : _clone(SEED_APPLICATIONS);
  }

  function _saveApplications(list) {
    _writeJson(STORAGE_KEYS.applications, list);
  }

  function _getProfile() {
    const stored = _readJson(STORAGE_KEYS.profile, SEED_PROFILE);
    // Merge with defaults so new fields added to SEED_PROFILE are always present
    return {
      ..._clone(SEED_PROFILE),
      ...(stored && typeof stored === "object" ? stored : {}),
    };
  }

  function _saveProfile(data) {
    const next = {
      ..._getProfile(),
      ...data,
      updatedAt: new Date().toISOString(),
    };
    _writeJson(STORAGE_KEYS.profile, next);
    return next;
  }

  // ----------------------------------------------------------
  // 7. PUBLIC API
  //    Everything below is exported on window.DataService.
  //
  //    FUTURE API MIGRATION NOTE
  //    Each method currently returns values synchronously.
  //    When you add fetch() calls, wrap the return value in
  //    Promise.resolve() first so UI code can adopt async/await
  //    without breaking immediately.
  // ----------------------------------------------------------

  return {
    // ── Status constants ──────────────────────────────────────
    /** Enum-like object so UI files never hard-code status strings. */
    STATUS: {
      APPLIED: "Applied",
      INTERVIEW: "Interview",
      OFFER: "Offer",
      REJECTED: "Rejected",
    },

    // ── Applications: READ ────────────────────────────────────

    /**
     * Returns every application in the store.
     * @returns {Array<Object>}
     */
    getApplications() {
      return _getApplications();
    },

    /**
     * Finds a single application by its id.
     * @param {number|string} id
     * @returns {Object|undefined}
     */
    getApplicationById(id) {
      return _getApplications().find((a) => String(a.id) === String(id));
    },

    /**
     * Returns applications whose company or role contains the search term.
     * Returns all applications when term is empty.
     * @param {string} [term=""]
     * @returns {Array<Object>}
     */
    searchApplications(term = "") {
      const q = term.trim().toLowerCase();
      if (!q) return _getApplications();
      return _getApplications().filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q),
      );
    },

    /**
     * Returns applications matching the given status.
     * Passing "All" or nothing returns every record.
     * @param {string} [status]
     * @returns {Array<Object>}
     */
    getApplicationsByStatus(status) {
      if (!status || status === "All") return _getApplications();
      return _getApplications().filter((a) => a.status === status);
    },

    /**
     * Returns the N most recently created applications (default 5).
     * @param {number} [limit=5]
     * @returns {Array<Object>}
     */
    getRecentApplications(limit = 5) {
      return [..._getApplications()]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);
    },

    /**
     * Returns upcoming interviews sorted by date (soonest first).
     * Only includes records whose interviewDate is today or later.
     * @param {number} [limit=5]
     * @returns {Array<Object>}
     */
    getUpcomingInterviews(limit = 5) {
      const today = new Date().toISOString().slice(0, 10);
      return _getApplications()
        .filter(
          (a) =>
            a.status === "Interview" &&
            a.interviewDate &&
            a.interviewDate >= today,
        )
        .sort((a, b) => a.interviewDate.localeCompare(b.interviewDate))
        .slice(0, limit);
    },

    // ── Applications: WRITE ───────────────────────────────────

    /**
     * Persists an entire array of applications (replaces store).
     * Each record is normalised before saving.
     * @param {Array<Object>} list
     */
    saveApplications(list) {
      _saveApplications(list.map(_normalizeApplication));
    },

    /**
     * Adds a new application and returns the saved record.
     * @param {Object} data - Partial application object.
     * @returns {Object} The newly created application.
     */
    addApplication(data) {
      const list = _getApplications();
      const record = _normalizeApplication(data);
      list.push(record);
      _saveApplications(list);
      return record;
    },

    /**
     * Merges updatedData into the matching application record.
     * @param {number|string} id
     * @param {Object} updatedData
     * @returns {boolean} True if the record was found and updated.
     */
    updateApplication(id, updatedData) {
      const list = _getApplications();
      const idx = list.findIndex((a) => String(a.id) === String(id));
      if (idx === -1) return false;

      list[idx] = _normalizeApplication({
        ...list[idx],
        ...updatedData,
        id: list[idx].id,
        createdAt: list[idx].createdAt,
      });

      _saveApplications(list);
      return true;
    },

    /**
     * Removes the application with the given id.
     * @param {number|string} id
     * @returns {Array<Object>} Remaining applications.
     */
    deleteApplication(id) {
      const remaining = _getApplications().filter(
        (a) => String(a.id) !== String(id),
      );
      _saveApplications(remaining);
      return remaining;
    },

    // ── Statistics & Analytics ────────────────────────────────

    /**
     * Returns headline counts used by the dashboard and applications page.
     * @returns {{ total, applied, interview, offers, rejected, selected }}
     */
    getStats() {
      const list = _getApplications();
      return {
        total: list.length,
        applied: list.filter((a) => a.status === "Applied").length,
        interview: list.filter((a) => a.status === "Interview").length,
        offers: list.filter((a) => a.status === "Offer").length,
        selected: list.filter((a) => a.status === "Offer").length, // alias
        rejected: list.filter((a) => a.status === "Rejected").length,
      };
    },

    /**
     * Returns a full analytics payload consumed by analytics.js.
     * All chart/graph data lives here — never inside the UI file.
     *
     * @returns {Object} Analytics data object with the following shape:
     *   - statusBreakdown  {Array<{label, count, percent}>}
     *   - applicationsPerMonth {Array<{month, count}>}
     *   - topCompanies    {Array<{company, count}>}
     *   - conversionRate  {number}  percent of applications that became offers
     *   - interviewRate   {number}  percent of applications that reached interview
     *   - avgDaysToInterview {number|null}
     *   - questionsLog    {Array<{company, role, questionsAsked, nextRoundQuestions}>}
     */
    getAnalytics() {
      const list = _getApplications();
      const total = list.length || 1; // avoid divide-by-zero

      // Status breakdown
      const statusBreakdown = ["Applied", "Interview", "Offer", "Rejected"].map(
        (label) => {
          const count = list.filter((a) => a.status === label).length;
          return { label, count, percent: Math.round((count / total) * 100) };
        },
      );

      // Applications per calendar month (last 6 months)
      const monthMap = {};
      list.forEach((a) => {
        const d = new Date(a.createdAt);
        if (!isNaN(d)) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          monthMap[key] = (monthMap[key] || 0) + 1;
        }
      });
      const applicationsPerMonth = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, count]) => ({ month, count }));

      // Top companies by application count
      const companyMap = {};
      list.forEach((a) => {
        if (a.company) companyMap[a.company] = (companyMap[a.company] || 0) + 1;
      });
      const topCompanies = Object.entries(companyMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([company, count]) => ({ company, count }));

      // Conversion rates
      const offers = list.filter((a) => a.status === "Offer").length;
      const interviews = list.filter((a) => a.status === "Interview").length;
      const conversionRate = Math.round((offers / total) * 100);
      const interviewRate = Math.round((interviews / total) * 100);

      // Average days from applicationDate to interviewDate
      const durationsMs = list
        .filter((a) => a.applicationDate && a.interviewDate)
        .map((a) => new Date(a.interviewDate) - new Date(a.applicationDate))
        .filter((ms) => ms > 0);
      const avgDaysToInterview = durationsMs.length
        ? Math.round(
            durationsMs.reduce((sum, ms) => sum + ms, 0) /
              durationsMs.length /
              86400000,
          )
        : null;

      // Questions log for the "Interview Prep" section
      const questionsLog = list
        .filter((a) => a.questionsAsked || a.nextRoundQuestions)
        .map((a) => ({
          company: a.company,
          role: a.role,
          questionsAsked: a.questionsAsked,
          nextRoundQuestions: a.nextRoundQuestions,
        }));

      return {
        statusBreakdown,
        applicationsPerMonth,
        topCompanies,
        conversionRate,
        interviewRate,
        avgDaysToInterview,
        questionsLog,
      };
    },

    // ── Profile ───────────────────────────────────────────────

    /**
     * Returns the current user profile, merged with defaults.
     * @returns {Object}
     */
    getProfile() {
      return _getProfile();
    },

    /**
     * Merges partial data into the profile and persists it.
     * Always stamps updatedAt automatically.
     * @param {Object} data - Partial profile fields.
     * @returns {Object} The full updated profile.
     */
    saveProfile(data) {
      return _saveProfile(data);
    },

    // ── Auth stub ─────────────────────────────────────────────
    //
    // FUTURE  Replace these with fetch('/api/auth/...') calls.
    //

    /**
     * Persists a lightweight auth token to storage.
     * @param {{ token: string, email: string }} authData
     */
    saveAuth(authData) {
      _writeJson(STORAGE_KEYS.auth, authData);
    },

    /**
     * Returns the stored auth token payload, or null.
     * @returns {{ token: string, email: string }|null}
     */
    getAuth() {
      return _readJson(STORAGE_KEYS.auth, null);
    },

    /**
     * Returns true when a user is considered logged in.
     * @returns {boolean}
     */
    isLoggedIn() {
      const auth = this.getAuth();
      return Boolean(auth && auth.token);
    },

    /** Clears only the auth record (logs the user out). */
    clearAuth() {
      _removeRaw(STORAGE_KEYS.auth);
    },

    // ── Utility ───────────────────────────────────────────────

    /**
     * Wipes all application and profile data.
     * Useful for a "Clear Data" button in Settings.
     */
    clearAllData() {
      _saveApplications([]);
      _saveProfile(_clone(SEED_PROFILE));
    },

    /**
     * Restores the built-in seed data.
     * Useful for demos or first-run onboarding.
     */
    resetToSeedData() {
      _saveApplications(_clone(SEED_APPLICATIONS));
      _saveProfile(_clone(SEED_PROFILE));
    },

    /**
     * Exports the full data set as a formatted JSON string.
     * @returns {string}
     */
    exportData() {
      return JSON.stringify(
        { applications: _getApplications(), profile: _getProfile() },
        null,
        2,
      );
    },

    /**
     * Imports data from a JSON string produced by exportData().
     * Accepts either a plain array (legacy) or a { applications, profile } object.
     * @param {string} jsonString
     * @returns {boolean} True on success.
     */
    importData(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);

        if (Array.isArray(parsed)) {
          _saveApplications(parsed.map(_normalizeApplication));
          return true;
        }

        if (Array.isArray(parsed.applications)) {
          _saveApplications(parsed.applications.map(_normalizeApplication));
        }
        if (parsed.profile && typeof parsed.profile === "object") {
          _saveProfile(parsed.profile);
        }

        return true;
      } catch (err) {
        console.error("[DataService] importData error:", err);
        return false;
      }
    },

    /**
     * Removes all storage keys managed by this service.
     * After calling this the next read will re-seed from SEED_APPLICATIONS.
     */
    removeStorage() {
      _removeRaw(STORAGE_KEYS.applications);
      _removeRaw(STORAGE_KEYS.profile);
      _removeRaw(STORAGE_KEYS.auth);
    },
  };
})();

// Expose globally so every page script can access it via window.DataService
window.DataService = DataService;
