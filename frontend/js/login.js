const loginForm = document.getElementById("loginForm");
const errorBox = document.getElementById("loginError");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch("http://localhost:5500/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    console.log(data);

    if (data.success) {
      localStorage.setItem("user", JSON.stringify(data.user));

      window.location.href = "./dashboard.html";
    } else {
      errorBox.style.display = "block";
      errorBox.textContent = data.message;
    }
  } catch (error) {
    console.error(error);

    errorBox.style.display = "block";
    errorBox.textContent = "Server Error";
  }
});
