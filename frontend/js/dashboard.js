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

    document.getElementById("resumeLastUpdated").textContent = data.lastUpdated;

    document.getElementById("totalResumes").textContent = data.totalResumes;
  } catch (error) {
    console.error(error);
  }
}

loadResumeData();

applications.forEach((app) => {
  const row = document.createElement("tr");

  const companyCell = document.createElement("td");
  companyCell.textContent = app.company_name;

  const roleCell = document.createElement("td");
  roleCell.textContent = app.role;

  const statusCell = document.createElement("td");
  statusCell.textContent = app.status;

  statusCell.classList.add(
    `status-${app.status.toLowerCase().replace(/\s+/g, "-")}`,
  );

  const dateCell = document.createElement("td");
  dateCell.textContent = new Date(app.application_date).toLocaleDateString();

  row.appendChild(companyCell);
  row.appendChild(roleCell);
  row.appendChild(statusCell);
  row.appendChild(dateCell);

  tbody.appendChild(row);
});
