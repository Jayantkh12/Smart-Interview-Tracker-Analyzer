const form = document.getElementById("contactForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault(); // when form submit it prevents page from auto refresh

  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const subject = document.getElementById("subject").value;
  const message = document.getElementById("message").value;

  try {
    const response = await fetch("http://localhost:5500/contact", {
      method: "POST",

      headers: {
        "Content-Type": "application/json", // We'll inform the server that the data is in JSON format.
      },

      body: JSON.stringify({
        name,
        email,
        subject,
        message,
      }),
    });

    const data = await response.json();

    alert(data.message);

    form.reset();
  } catch (error) {
    console.error(error);

    alert("Failed to send message");
  }
});
