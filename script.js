// Standaard wachtwoord (pas dit gerust aan)
const APP_PASSWORD = "geheim123";

// Controleer inlogstatus bij het laden van de pagina
document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = sessionStorage.getItem("eval_logged_in");
  if (isLoggedIn === "true") {
    showApp();
  }
});

// Wachtwoord controleren via formulier submit
function handleLogin(event) {
  event.preventDefault(); // Voorkom dat de pagina opnieuw ververst
  const input = document.getElementById("password-input").value;
  const errorMsg = document.getElementById("login-error");

  if (input === APP_PASSWORD) {
    sessionStorage.setItem("eval_logged_in", "true");
    errorMsg.innerText = "";
    showApp();
  } else {
    errorMsg.innerText = "Onjuist wachtwoord. Probeer opnieuw.";
  }
}

// Uitloggen
function logout() {
  sessionStorage.removeItem("eval_logged_in");
  document.getElementById("app-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("password-input").value = "";
}

// Toon hoofdinterface
function showApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
}

// Schakelen tussen tabbladen
function switchTab(tabName) {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => tab.classList.remove("active"));
  
  const contents = document.querySelectorAll(".tab-content");
  contents.forEach(content => content.classList.add("hidden"));

  if (tabName === 'opdrachten') {
    document.getElementById("tab-opdrachten").classList.remove("hidden");
    tabs[0].classList.add("active");
  } else if (tabName === 'evalueren') {
    document.getElementById("tab-evalueren").classList.remove("hidden");
    tabs[1].classList.add("active");
  }
}
