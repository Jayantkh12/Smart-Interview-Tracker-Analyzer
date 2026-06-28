const photoInput = document.getElementById("photoInput");
const photoPreview = document.getElementById("photoPreview");

const DEFAULT_IMAGE = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  window.location.href = "login.html";
}

// Load profile image
async function loadProfile() {
  try {
    const res = await fetch(`http://localhost:5500/api/profile/${user.id}`);

    const data = await res.json();

    if (data.success && data.profilePic) {
      photoPreview.src =
        `http://localhost:5500/uploads/profile/${data.profilePic}?t=` +
        Date.now();
    } else {
      photoPreview.src = DEFAULT_IMAGE;
    }
  } catch (err) {
    console.error(err);
    photoPreview.src = DEFAULT_IMAGE;
  }
}

// Upload profile image
photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];

  if (!file) return;

  // Preview immediately
  photoPreview.src = URL.createObjectURL(file);

  const formData = new FormData();
  formData.append("profile", file);
  formData.append("userId", user.id);

  try {
    const res = await fetch("http://localhost:5500/api/profile/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.success) {
      await loadProfile();
      alert("Profile picture updated successfully.");
    } else {
      alert(data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Upload failed.");
  }
});

loadProfile();
