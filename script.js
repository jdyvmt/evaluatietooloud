const APP_PASSWORD = "geheim123";
const scores = [2.0, 1.5, 1.0, 0.5, 0.0];

// Timer Variabelen
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

// Evaluatie Data Variabelen
let currentEvalAssignment = null;
let currentEvalScores = {};

document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = sessionStorage.getItem("eval_logged_in");
  if (isLoggedIn === "true") {
    showApp();
    loadAssignments();
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
    populateEvalSelect();
  }
}

// --- OPDRACHTEN & PARAMETERS BUILDER LOGICA ---

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

// --- EVALUATIEMODUS & TIMER LOGICA ---

function populateEvalSelect() {
  const select = document.getElementById("eval-assignment-select");
  const saved = JSON.parse(localStorage.getItem("eval_assignments") || "[]");
  
  select.innerHTML = '<option value="">-- Selecteer een opdracht --</option>';
  saved.forEach(a => {
    select.innerHTML += `<option value="${a.id}">${a.title}</option>`;
  });
  
  document.getElementById("eval-form-container").classList.add("hidden");
}

function loadEvalForm() {
  const selectId = document.getElementById("eval-assignment-select").value;
  if (!selectId) {
    document.getElementById("eval-form-container").classList.add("hidden");
    return;
  }

  const saved = JSON.parse(localStorage.getItem("eval_assignments") || "[]");
  currentEvalAssignment = saved.find(a => a.id === selectId);

  if (!currentEvalAssignment) return;

  currentEvalScores = {};
  resetTimer();
  document.getElementById("student-name").value = "";
  document.getElementById("eval-feedback").value = "";

  const container = document.getElementById("eval-parameters-container");
  container.innerHTML = "";

  currentEvalAssignment.parameters.forEach((param, pIdx) => {
    let buttonsHTML = '';
    scores.forEach(s => {
      buttonsHTML += `
        <button type="button" class="score-btn" id="btn-p${pIdx}-s${s}" onclick="selectScore(${pIdx}, ${s})">
          ${s.toFixed(1)}
        </button>
      `;
    });

    const paramCardHTML = `
      <div class="parameter-card">
        <strong>${param.name}</strong>
        <div class="score-btn-group">
          ${buttonsHTML}
        </div>
        <div id="cond-box-p${pIdx}" class="selected-condition-box hidden"></div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', paramCardHTML);
  });

  updateTotalScoreDisplay();
  document.getElementById("eval-form-container").classList.remove("hidden");
}

function selectScore(paramIdx, score) {
  currentEvalScores[paramIdx] = score;

  // Visuals bijwerken
  scores.forEach(s => {
    const btn = document.getElementById(`btn-p${paramIdx}-s${s}`);
    if (btn) {
      if (s === score) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    }
  });

  // Voorwaarde-tekst tonen
  const param = currentEvalAssignment.parameters[paramIdx];
  const condText = param.criteria[score] || 'Geen specifieke voorwaarde ingesteld.';
  const condBox = document.getElementById(`cond-box-p${paramIdx}`);
  
  condBox.innerText = `Criteria voorwaarde (${score.toFixed(1)}): "${condText}"`;
  condBox.classList.remove("hidden");

  updateTotalScoreDisplay();
}

function updateTotalScoreDisplay() {
  if (!currentEvalAssignment) return;

  let total = 0;
  Object.values(currentEvalScores).forEach(val => total += val);
  const max = currentEvalAssignment.parameters.length * 2.0;

  document.getElementById("total-score-display").innerText = total.toFixed(1);
  document.getElementById("max-score-display").innerText = max.toFixed(1);
}

// Timer Functies
function toggleTimer() {
  const btn = document.getElementById("timer-toggle-btn");
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    btn.innerText = "Hervat Timer";
    btn.classList.remove("btn-danger");
    btn.classList.add("btn-primary");
  } else {
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
    }, 1000);
    isTimerRunning = true;
    btn.innerText = "Pauzeer Timer";
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-danger");
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerSeconds = 0;
  updateTimerDisplay();
  const btn = document.getElementById("timer-toggle-btn");
  if (btn) {
    btn.innerText = "Start Timer";
    btn.classList.remove("btn-danger");
    btn.classList.add("btn-primary");
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const secs = (timerSeconds % 60).toString().padStart(2, '0');
  document.getElementById("timer-display").innerText = `${mins}:${secs}`;
}

// --- PDF GENERATIE ---

function generatePDF() {
  const studentName = document.getElementById("student-name").value.trim() || "Onbekende Leerling";
  const feedback = document.getElementById("eval-feedback").value.trim();
  const timerText = document.getElementById("timer-display").innerText;
  const totalScore = document.getElementById("total-score-display").innerText;
  const maxScore = document.getElementById("max-score-display").innerText;

  let parametersRows = '';
  currentEvalAssignment.parameters.forEach((param, idx) => {
    const scoreVal = currentEvalScores[idx] !== undefined ? currentEvalScores[idx].toFixed(1) : '-';
    const condText = currentEvalScores[idx] !== undefined ? (param.criteria[currentEvalScores[idx]] || '-') : '-';

    parametersRows += `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 10px; font-weight: 600; width: 25%; color: #2a37b1;">${param.name}</td>
        <td style="padding: 10px; width: 15%; font-weight: 700; text-align: center; color: #2a37b1;">${scoreVal} / 2.0</td>
        <td style="padding: 10px; font-style: italic; color: #444;">${condText}</td>
      </tr>
    `;
  });

  // Tijdelijke HTML-container voor de PDF opmaak
  const element = document.createElement("div");
  element.style.padding = "30px";
  element.style.fontFamily = "'Inter', 'Helvetica', sans-serif";
  element.style.color = "#000000";

  element.innerHTML = `
    <div style="border-bottom: 2px solid #2a37b1; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
      <div>
        <h1 style="color: #2a37b1; font-size: 22px; margin: 0;">${currentEvalAssignment.title}</h1>
        <p style="font-size: 16px; font-weight: 600; margin: 5px 0 0 0;">Leerling: ${studentName}</p>
      </div>
      <div style="text-align: right; font-size: 14px; color: #555;">
        <p style="margin: 0;">Duur: <strong>${timerText}</strong></p>
        <p style="margin: 4px 0 0 0;">Datum: ${new Date().toLocaleDateString('nl-BE')}</p>
      </div>
    </div>

    <h3 style="color: #2a37b1; font-size: 16px; margin-bottom: 10px;">Beoordeling per Parameter</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
      <thead>
        <tr style="background-color: #f5f3f5; text-align: left;">
          <th style="padding: 8px 10px; color: #2a37b1;">Parameter</th>
          <th style="padding: 8px 10px; color: #2a37b1; text-align: center;">Score</th>
          <th style="padding: 8px 10px; color: #2a37b1;">Toegepaste Criteria</th>
        </tr>
      </thead>
      <tbody>
        ${parametersRows}
      </tbody>
    </table>

    <div style="background: #f5f3f5; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
      <h3 style="color: #2a37b1; font-size: 16px; margin-top: 0; margin-bottom: 8px;">Feedback & Opmerkingen</h3>
      <p style="font-size: 14px; line-height: 1.5; margin: 0; white-space: pre-wrap;">${feedback || "Geen extra opmerkingen ingevuld."}</p>
    </div>

    <div style="text-align: right; border-top: 2px solid #2a37b1; padding-top: 10px; font-size: 18px; font-weight: 700; color: #2a37b1;">
      Eindscore: ${totalScore} / ${maxScore}
    </div>
  `;

  const opt = {
    margin:       10,
    filename:     `Evaluatie_${studentName.replace(/[^a-z0-9]/gi, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2 },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
}
