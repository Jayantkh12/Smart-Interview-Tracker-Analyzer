const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  window.location.href = "./login.html";
}

document.getElementById("welcomeMessage").textContent =
  `Welcome Back, ${user.name} 👋`;

async function loadDashboardStats() {
  try {
    const response = await fetch(
      `http://localhost:5500/api/dashboard/stats/${user.id}`,
    );

    const data = await response.json();

    document.getElementById("dashboardTotalApplications").textContent =
      data.applications;

    document.getElementById("dashboardInterviews").textContent =
      data.interviews;

    document.getElementById("dashboardOffers").textContent = data.offers;

    document.getElementById("dashboardRejections").textContent =
      data.rejections;
  } catch (error) {
    console.error(error);
  }
}

loadDashboardStats();

async function loadResumeData() {
  try {
    const response = await fetch(
      `http://localhost:5500/api/dashboard/resume/${user.id}`,
    );

    const data = await response.json();

    document.getElementById("activeResume").textContent = data.activeResume;
    document.getElementById("atsScore").textContent = data.atsScore
      ? `${data.atsScore}/100`
      : "--";
    document.getElementById("resumeLastUpdated").textContent = data.lastUpdated;
    document.getElementById("totalResumes").textContent = data.totalResumes;
  } catch (error) {
    console.error(error);
  }
}

loadResumeData();

async function loadRecentApplications() {
  console.log("loadRecentApplications called");
  try {
    const response = await fetch(
      `http://localhost:5500/api/dashboard/recent-applications/${user.id}`,
    );

    const applications = await response.json();
    console.log("Applications:", applications);
    const tableBody = document.getElementById("applicationsTableBody");

    tableBody.innerHTML = "";

    if (applications.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4">No applications found</td>
        </tr>
      `;
      return;
    }

    applications.forEach((app) => {
      tableBody.innerHTML += `
        <tr>
          <td>${app.company_name}</td>
          <td>${app.role}</td>
          <td>
            <span class="status-badge">
              ${app.status}
            </span>
          </td>
          <td>
            ${new Date(app.application_date).toLocaleDateString()}
          </td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Error loading recent applications:", error);

    document.getElementById("applicationsTableBody").innerHTML = `
      <tr>
        <td colspan="4">Failed to load applications</td>
      </tr>
    `;
  }
}
loadRecentApplications();

// Upcoming Interviews
async function loadUpcomingInterviews() {
  try {
    const response = await fetch(
      `http://localhost:5500/api/dashboard/upcoming-interviews/${user.id}`,
    );

    const interviews = await response.json();

    const container = document.getElementById("upcomingInterviews");

    if (interviews.length === 0) {
      container.innerHTML =
        "<div class='empty'>No interviews scheduled yet.</div>";
      return;
    }

    container.innerHTML = interviews
      .map(
        (interview) => `
        <div class="interview-item">
          <div>
            <strong>${interview.company_name}</strong>
            <p>${interview.role}</p>
          </div>

          <div>
            <span>${interview.round_type}</span>
            <br>
            <small>
              ${new Date(interview.round_date).toLocaleDateString()}
            </small>
          </div>
        </div>
      `,
      )
      .join("");
  } catch (error) {
    console.error(error);
  }
}
