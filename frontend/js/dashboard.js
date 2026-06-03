document.addEventListener("DOMContentLoaded", () => {
  const dataService = window.DataService;

  if (!dataService) {
    console.error("DataService is not loaded.");
    return;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(dateValue) {
    if (!dateValue) {
      return "--";
    }

    return new Date(dateValue).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function renderList(containerId, items, emptyText, renderItem) {
    const container = document.getElementById(containerId);

    if (!container) {
      return;
    }

    if (!items.length) {
      container.className = "empty";
      container.textContent = emptyText;
      return;
    }

    container.className = "mini-list";
    container.innerHTML = items.map(renderItem).join("");
  }

  function renderDashboardStats() {
    const stats = dataService.getStats();

    setText("dashboardTotalApplications", stats.total);
    setText("dashboardInterviews", stats.interview);
    setText("dashboardOffers", stats.offers);
    setText("dashboardRejections", stats.rejected);
  }

  function renderResumeSummary() {
    const profile = dataService.getProfile();
    const applications = dataService.getApplications();
    const resumeNames = applications
      .map((application) => application.resumeName)
      .filter(Boolean);
    const uniqueResumeNames = [...new Set(resumeNames)];
    const activeResume = profile.resumeName || uniqueResumeNames[0] || "";
    const lastResumeUpdate =
      profile.updatedAt ||
      applications
        .filter((application) => application.resumeName)
        .map((application) => application.updatedAt)
        .sort()
        .pop();

    setText("activeResume", activeResume || "No Resume Uploaded");
    setText("atsScore", "Not Available");
    setText("resumeLastUpdated", formatDate(lastResumeUpdate));
    setText("totalResumes", uniqueResumeNames.length + (profile.resumeName ? 1 : 0));
  }

  function renderRecentApplications() {
    const applications = dataService.getRecentApplications(4);

    renderList(
      "recentApplications",
      applications,
      "No applications added yet.",
      (application) => `
        <div class="mini-item">
          <strong>${escapeHtml(application.company)}</strong>
          <span>${escapeHtml(application.role)} &middot; ${escapeHtml(application.status)}</span>
        </div>
      `,
    );
  }

  function renderUpcomingInterviews() {
    const interviews = dataService.getUpcomingInterviews(4);

    renderList(
      "upcomingInterviews",
      interviews,
      "No interviews scheduled yet.",
      (application) => `
        <div class="mini-item">
          <strong>${escapeHtml(application.company)}</strong>
          <span>${formatDate(application.interviewDate)} &middot; ${escapeHtml(application.role)}</span>
        </div>
      `,
    );
  }

  function renderQuestions() {
    const questions = dataService
      .getApplications()
      .filter((application) => application.questionsAsked)
      .slice(0, 4);

    renderList(
      "recentQuestions",
      questions,
      "No questions recorded yet.",
      (application) => `
        <div class="mini-item">
          <strong>${escapeHtml(application.company)}</strong>
          <span>${escapeHtml(application.questionsAsked)}</span>
        </div>
      `,
    );

    setText(
      "questionAnalysis",
      questions.length
        ? `${questions.length} application records include interview questions.`
        : "No interview data available.",
    );
  }

  function bindQuickActions() {
    document.querySelectorAll(".actions button[data-href]").forEach((button) => {
      button.addEventListener("click", () => {
        window.location.href = button.dataset.href;
      });
    });
  }

  function renderDashboard() {
    const profile = dataService.getProfile();

    setText("welcomeMessage", `Welcome Back, ${profile.fullName || "Student"}`);
    renderDashboardStats();
    renderResumeSummary();
    renderRecentApplications();
    renderUpcomingInterviews();
    renderQuestions();
    bindQuickActions();
  }

  renderDashboard();
});
