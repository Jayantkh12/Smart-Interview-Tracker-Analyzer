const registerForm = document.getElementById("registerForm");
const errorBox = document.getElementById("registerError");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
    errorBox.style.display = "block";
    errorBox.textContent = "Passwords do not match";
    return;
  }

  try {
    const response = await fetch("http://localhost:5500/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (data.success) {
      alert("Registration Successful");

      window.location.href = "./profile.html";
    } else {
      errorBox.style.display = "block";
      errorBox.textContent = data.message;
    }
  } catch (err) {
    console.error(err);

    errorBox.style.display = "block";
    errorBox.textContent = "Server Error";
  }
});
