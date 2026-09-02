const APP_PASSWORD = "geheim123";

document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = sessionStorage.getItem("eval_logged_in");
  if (isLoggedIn === "true") {
    showApp();
    loadAssignments();
    // Start standaard met 1 lege parameter als er niks staat
    if (document.querySelectorAll('.parameter-card').length === 0) {
      addParameterField();
    }
  }
});

function checkPassword() {
  const input = document.getElementById("password-input").value;
  const errorMsg = document.getElementById("login-error");

  if (input === APP_PASSWORD) {
    sessionStorage.setItem("eval_logged_in", "true");
    errorMsg.innerText = "";
    showApp();
    loadAssignments();
    if (document.querySelectorAll('.parameter-card').length === 0) {
      addParameterField();
    }
  } else {
    errorMsg.innerText = "Onjuist wachtwoord. Probeer opnieuw.";
  }
}

function checkEnter(event) {
  if (event.key === "Enter") {
    checkPassword();
  }
}

function logout() {
  sessionStorage.removeItem("eval_logged_in");
  document.getElementById("app-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("password-input").value = "";
}

function showApp() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("app-screen").classList.remove("hidden");
}

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

// --- OPDRACHTEN & PARAMETERS BUILDER LOGICA ---

const scores = [2.0, 1.5, 1.0, 0.5, 0.0];

// Parameter toe te voegen in de builder
function addParameterField(name = '', criteria = {}) {
  const container = document.getElementById("parameters-container");
  const paramId = Date.now() + Math.random().toString(36).substr(2, 4);

  let criteriaHTML = '';
  scores.forEach(score => {
    const val = criteria[score] || '';
    criteriaHTML += `
      <div class="criteria-item">
        <label>Score ${score.toFixed(1)}</label>
        <input type="text" data-score="${score}" value="${val}" placeholder="Voorwaarde bij ${score.toFixed(1)}...">
      </div>
    `;
  });

  const cardHTML = `
    <div class="parameter-card" id="param-${paramId}">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <input type="text" class="param-title" placeholder="Naam parameter (bv. Standaardnederlands)" value="${name}" style="font-weight: 600; width: 70%;">
        <button type="button" onclick="removeParameterField('param-${paramId}')" class="btn-danger">Verwijderen</button>
      </div>
      <div class="criteria-grid">
        ${criteriaHTML}
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', cardHTML);
}

function removeParameterField(id) {
  const elem = document.getElementById(id);
  if (elem) elem.remove();
}

function resetAssignmentForm() {
  document.getElementById("current-assignment-id").value = "";
  document.getElementById("assignment-title").value = "";
  document.getElementById("builder-title").innerText = "Nieuwe Opdracht Aanmaken";
  document.getElementById("parameters-container").innerHTML = "";
  addParameterField();
}

// Opslaan in localStorage
function saveAssignment() {
  const title = document.getElementById("assignment-title").value.trim();
  if (!title) {
    alert("Vul een titel in voor de opdracht.");
    return;
  }

  const paramCards = document.querySelectorAll(".parameter-card");
  if (paramCards.length === 0) {
    alert("Voeg ten minste één parameter toe.");
    return;
  }

  const parameters = [];
  paramCards.forEach(card => {
    const paramName = card.querySelector(".param-title").value.trim();
    if (paramName) {
      const criteria = {};
      const inputs = card.querySelectorAll(".criteria-grid input");
      inputs.forEach(input => {
        const score = input.getAttribute("data-score");
        criteria[score] = input.value.trim();
      });
      parameters.push({ name: paramName, criteria: criteria });
    }
  });

  const assignmentId = document.getElementById("current-assignment-id").value || 'assign_' + Date.now();
  const assignment = { id: assignmentId, title: title, parameters: parameters };

  let saved = JSON.parse(localStorage.getItem("eval_assignments") || "[]");
  const existingIdx = saved.findIndex(a => a.id === assignmentId);
  if (existingIdx >= 0) {
    saved[existingIdx] = assignment;
  } else {
    saved.push(assignment);
  }

  localStorage.setItem("eval_assignments", JSON.stringify(saved));
  alert("Opdracht succesvol opgeslagen!");
  resetAssignmentForm();
  loadAssignments();
}

// Laden uit localStorage
function loadAssignments() {
  const container = document.getElementById("saved-assignments-list");
  const saved = JSON.parse(localStorage.getItem("eval_assignments") || "[]");

  if (saved.length === 0) {
    container.innerHTML = "<p><em>Nog geen opgeslagen opdrachten. Maak er hieronder een aan.</em></p>";
    return;
  }

  let html = '';
  saved.forEach(item => {
    html += `
      <div class="saved-item">
        <div>
          <strong>${item.title}</strong>
          <span style="font-size: 0.85rem; color: #666; margin-left: 10px;">(${item.parameters.length} parameters)</span>
        </div>
        <div>
          <button type="button" onclick="editAssignment('${item.id}')" class="btn-secondary btn-small">Bewerken</button>
          <button type="button" onclick="cloneAssignment('${item.id}')" class="btn-secondary btn-small">Kopiëren</button>
          <button type="button" onclick="deleteAssignment('${item.id}')" class="btn-danger btn-small" style="margin-left: 5px;">X</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function editAssignment(id) {
  const saved = JSON.parse(localStorage.getItem("eval_assignments") || "[]");
  const assignment = saved.find(a => a.id === id);
  if (!assignment) return;

  document.getElementById("current-assignment-id").value = assignment.id;
  document.getElementById("assignment-title").value = assignment.title;
  document.getElementById("builder-title").innerText = "Opdracht Bewerken";

  const container = document.getElementById("parameters-container");
  container.innerHTML = "";

  assignment.parameters.forEach(p => {
    addParameterField(p.name, p.criteria);
  });
}

function cloneAssignment(id) {
  editAssignment(id);
  document.getElementById("current-assignment-id").value = "";
  document.getElementById("assignment-title").value += " (Kopie)";
  document.getElementById("builder-title").innerText = "Nieuwe Opdracht (Kopie)";
}

function deleteAssignment(id) {
  if (confirm("Weet je zeker dat je deze opdracht wilt verwijderen?")) {
    let saved = JSON.parse(localStorage.getItem("eval_assignments") || "[]");
    saved = saved.filter(a => a.id !== id);
    localStorage.setItem("eval_assignments", JSON.stringify(saved));
    loadAssignments();
  }
}
