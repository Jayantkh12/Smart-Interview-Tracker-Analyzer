if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}
window.onload = () => {
  window.scrollTo(0, 0);
};

const menuBtn = document.getElementById("menuBtn");
const navLinks = document.querySelector(".nav-links");
menuBtn.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});

let animated = false;

const statsSection = document.querySelector(".highlight-stats");

const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !animated) {
    animated = true;

    fetch("http://localhost:5500/api/dashboard/stats")
      .then((res) => res.json())
      .then((data) => {
        animateCounter("applications", data.applications, "+");
        animateCounter("interviews", data.interviews, "+");
        animateCounter("offers", data.offers, "+");
      })
      .catch((error) => {
        console.error("Error loading stats:", error);
      });
  }
});

observer.observe(statsSection);
function animateCounter(id, target, suffix = "") {
  let count = 0;
  const element = document.getElementById(id);
  const increment = Math.ceil(target / 50);
  const timer = setInterval(() => {
    count += increment;
    if (count >= target) {
      count = target;
      clearInterval(timer);
    }
    element.textContent = count + suffix;
  }, 25);
}
