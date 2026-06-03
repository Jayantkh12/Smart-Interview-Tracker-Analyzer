document.addEventListener("DOMContentLoaded", () => {
  const dataService = window.DataService;

  if (!dataService) {
    console.error("DataService is not loaded.");
    return;
  }

  const fileInput = document.getElementById("resume");
  const uploadBtn = document.getElementById("uploadBtn");
  const previewBtn = document.getElementById("previewBtn");
  const fileName = document.getElementById("fileName");
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("selectFilter");
  const form = document.getElementById("applicationForm");
  const body = document.getElementById("applicationsBody");

  const stats = {
    total: document.getElementById("totalApps"),
    applied: document.getElementById("appliedApps"),
    interview: document.getElementById("interviewApps"),
    offers: document.getElementById("offerApps"),
    rejected: document.getElementById("rejectedApps"),
  };

  let uploadedFile = null;

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

  function getFilteredApplications() {
    const searchTerm = searchInput.value;
    const status = statusFilter.value;

    return dataService.searchApplications(searchTerm).filter((application) => {
      return status === "All" || application.status === status;
    });
  }

  function renderStats() {
    const currentStats = dataService.getStats();

    stats.total.textContent = currentStats.total;
    stats.applied.textContent = currentStats.applied;
    stats.interview.textContent = currentStats.interview;
    stats.offers.textContent = currentStats.offers;
    stats.rejected.textContent = currentStats.rejected;
  }

  function renderApplications() {
    const applications = getFilteredApplications();

    if (!applications.length) {
      body.innerHTML = `
        <tr>
          <td colspan="6" class="empty-row">No applications found.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = applications
      .map((application) => {
        const statusClass = application.status.toLowerCase();

        return `
          <tr>
            <td>${escapeHtml(application.company)}</td>
            <td>${escapeHtml(application.role)}</td>
            <td>${escapeHtml(application.package || "--")}</td>
            <td>
              <span class="status ${statusClass}">
                ${escapeHtml(application.status)}
              </span>
            </td>
            <td>${formatDate(application.applicationDate)}</td>
            <td>
              <button
                class="view-btn"
                type="button"
                data-id="${escapeHtml(application.id)}"
              >
                View
              </button>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderPage() {
    renderStats();
    renderApplications();
  }

  uploadBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    uploadedFile = fileInput.files[0] || null;

    if (uploadedFile) {
      fileName.textContent = uploadedFile.name;
      previewBtn.disabled = false;
      return;
    }

    fileName.textContent = "No file selected";
    previewBtn.disabled = true;
  });

  previewBtn.addEventListener("click", () => {
    if (!uploadedFile) {
      alert("Please select a file first!");
      return;
    }

    const fileURL = URL.createObjectURL(uploadedFile);
    window.open(fileURL, "_blank");
  });

  searchInput.addEventListener("input", renderApplications);
  statusFilter.addEventListener("change", renderApplications);

  body.addEventListener("click", (event) => {
    const viewButton = event.target.closest(".view-btn");

    if (!viewButton) {
      return;
    }

    const application = dataService.getApplicationById(viewButton.dataset.id);

    if (!application) return;

    // Populate modal fields
    document.getElementById("modalCompany").textContent =
      application.company || "--";
    document.getElementById("modalRole").textContent = application.role || "--";
    document.getElementById("modalPackage").textContent =
      application.package || "--";
    document.getElementById("modalStatus").textContent =
      application.status || "--";
    document.getElementById("modalStatus").className =
      "modal-status " + (application.status || "").toLowerCase();
    document.getElementById("modalDate").textContent = formatDate(
      application.applicationDate,
    );
    document.getElementById("modalNotes").textContent =
      application.notes || "No notes added.";
    document.getElementById("modalResume").textContent =
      application.resumeName || "No resume uploaded.";

    const linkEl = document.getElementById("modalLink");
    if (application.applicationLink) {
      linkEl.textContent = application.applicationLink;
      linkEl.href = application.applicationLink;
      linkEl.target = "_blank";
      linkEl.rel = "noopener noreferrer";
      linkEl.style.display = "inline";
    } else {
      linkEl.textContent = "No link provided.";
      linkEl.removeAttribute("href");
      linkEl.removeAttribute("target");
      linkEl.style.display = "inline";
    }

    document.getElementById("appDetailModal").classList.add("active");
  });

  // Close modal
  document.getElementById("modalCloseBtn").addEventListener("click", () => {
    document.getElementById("appDetailModal").classList.remove("active");
  });

  document.getElementById("appDetailModal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      e.currentTarget.classList.remove("active");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const companyName = document.getElementById("companyname").value.trim();
    const jobRole = document.getElementById("jobrole").value.trim();
    const packageValue = document.getElementById("package").value.trim();
    const applicationLink = document
      .getElementById("applicationlink")
      .value.trim();
    const notes = document.getElementById("notes").value.trim();

    if (!companyName || !jobRole || !packageValue || !applicationLink) {
      alert("Please fill all fields");
      return;
    }

    dataService.addApplication({
      company: companyName,
      role: jobRole,
      package: `${packageValue} LPA`,
      applicationLink,
      notes,
      status: dataService.STATUS.APPLIED,
      resumeName: uploadedFile ? uploadedFile.name : "",
    });

    form.reset();
    uploadedFile = null;
    fileName.textContent = "No file selected";
    previewBtn.disabled = true;
    searchInput.value = "";
    statusFilter.value = "All";

    renderPage();
  });

  renderPage();
});
