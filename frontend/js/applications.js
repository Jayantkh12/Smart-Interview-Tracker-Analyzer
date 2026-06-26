const user = JSON.parse(localStorage.getItem("user"));

async function loadStats() {
  try {
    const response = await fetch(
      `http://localhost:5500/api/applications/stats/${user.id}`,
    );

    const data = await response.json();

    document.getElementById("totalApps").textContent = data.applications;

    document.getElementById("appliedApps").textContent =
      data.appliedApplications;

    document.getElementById("interviewApps").textContent = data.interviews;

    document.getElementById("offerApps").textContent = data.offers;

    document.getElementById("rejectedApps").textContent = data.rejections;
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

loadStats();

//search-bar

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", () => {
  const searchText = searchInput.value.toLowerCase();
  const rows = document.querySelectorAll("#applicationsBody tr");

  rows.forEach((row) => {
    const company = row.cells[0]?.textContent.toLowerCase() || "";

    const role = row.cells[1]?.textContent.toLowerCase() || "";

    const match = company.includes(searchText) || role.includes(searchText);

    row.style.display = match ? "" : "none";
  });
});

//application-form

const form = document.getElementById("applicationForm");

const companyInput = document.getElementById("companyname");
const roleInput = document.getElementById("jobrole");
const packageInput = document.getElementById("package");
const linkInput = document.getElementById("applicationlink");
const notesInput = document.getElementById("notes");

const resumeInput = document.getElementById("resume");
const uploadBtn = document.getElementById("uploadBtn");
const previewBtn = document.getElementById("previewBtn");
const fileName = document.getElementById("fileName");

let selectedResume = null;

// Open File Picker
uploadBtn.addEventListener("click", () => {
  resumeInput.click();
});

// File Selected
resumeInput.addEventListener("change", () => {
  const file = resumeInput.files[0];

  if (!file) return;

  selectedResume = file;

  fileName.textContent = file.name;

  previewBtn.disabled = false;
});

// Preview Resume
previewBtn.addEventListener("click", () => {
  if (!selectedResume) return;

  const fileURL = URL.createObjectURL(selectedResume);

  window.open(fileURL, "_blank");
});

// Save Application

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    const response = await fetch("http://localhost:5500/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user.id,
        companyName: companyInput.value,
        role: roleInput.value,
        packageLpa: packageInput.value,
        applicationLink: linkInput.value,
        notes: notesInput.value,
        status: "Applied",
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert("Application Saved Successfully ✅");

      form.reset();

      selectedResume = null;
      fileName.textContent = "No file selected";
      previewBtn.disabled = true;

      loadStats();
      // loadApplications();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to save application");
  }
});
