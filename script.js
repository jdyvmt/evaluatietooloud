/* ==========================================================================
   DATAMODEL & INITIALISATIE
   ========================================================================== */

const STORAGE_KEY = "evaluatietool_app_data_v2";

let appData = {
  currentSchoolYear: "2025-2026",
  users: [
    { id: "u1", username: "jordy", password: "password123" }
  ],
  tasks: [],
  classes: [],
  evaluations: []
};

// Sessiestatus
let currentUser = null;
let currentSelectedTask = null;
let currentSelectedClass = null;
let currentSelectedStudent = null;
let currentScores = {}; // Key: criterionId, Value: { levelIndex, score, weight }

// Timer Status
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

/* ==========================================================================
   OPSLAG & LAAD LOGICA (localStorage)
   ========================================================================== */

function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      appData = JSON.parse(savedData);
    } catch (e) {
      console.error("Fout bij laden van data:", e);
      seedDefaultData();
    }
  } else {
    seedDefaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

function seedDefaultData() {
  appData = {
    currentSchoolYear: "2025-2026",
    users: [
      { id: "u1", username: "jordy", password: "password123" }
    ],
    tasks: [
      {
        id: "t1",
        title: "Spreken: Presentatie",
        presets: ["Duidelijke uitspraak", "Mooi oogcontact", "Let op spreektempo", "Lichaamstaal kan actiever"],
        criteria: [
          {
            id: "c1",
            title: "Inhoud & Opbouw",
            weight: 2,
            levels: [
              { label: "Onvoldoende", score: 2, desc: "Onvolledige structuur, mist rode draad." },
              { label: "Voldoende", score: 6, desc: "Logische opbouw, basiselementen aanwezig." },
              { label: "Goed", score: 8, desc: "Sterke structuur en goed onderbouwd." },
              { label: "Zeer Goed", score: 10, desc: "Uitzonderlijk helder, boeiend en volledig." }
            ]
          },
          {
            id: "c2",
            title: "Taalgebruik & Stem",
            weight: 1,
            levels: [
              { label: "Onvoldoende", score: 2, desc: "Veel spreektaal of onduidelijke articulatie." },
              { label: "Voldoende", score: 6, desc: "Verstaanbaar, verzorgd Nederlands." },
              { label: "Goed", score: 8, desc: "Rijk taalgebruik, gevarieerde intonatie." },
              { label: "Zeer Goed", score: 10, desc: "Foutloos, zeer dynamisch en professioneel." }
            ]
          }
        ]
      }
    ],
    classes: [
      {
        id: "k1",
        name: "4 LA",
        schoolYear: "2025-2026",
        students: [
          { id: "s1", name: "Jan Peeters" },
          { id: "s2", name: "Sophie Devos" },
          { id: "s3", name: "Lucas Janssens" }
        ]
      }
    ],
    evaluations: []
  };
  saveData();
}

/* ==========================================================================
   INITIALISATIE VAN DE APPLICATIE
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupEventListeners();
  updateSchoolYearBadge();
  checkLoginSession();
});

function updateSchoolYearBadge() {
  const badge = document.getElementById("current-year-badge");
  if (badge) badge.textContent = `Schooljaar: ${appData.currentSchoolYear}`;
}

function checkLoginSession() {
  const loginOverlay = document.getElementById("screen-login");
  if (!currentUser) {
    loginOverlay.classList.add("active");
  } else {
    loginOverlay.classList.remove("active");
    initEvalScreen();
  }
}

/* ==========================================================================
   EVENT LISTENERS & NAVIGATIE
   ========================================================================== */

function setupEventListeners() {
  // Inloggen & Uitloggen
  document.getElementById("btn-login").addEventListener("click", handleLogin);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  // Navigatietabs
  document.getElementById("nav-eval").addEventListener("click", () => switchScreen("screen-eval"));
  document.getElementById("nav-dashboard").addEventListener("click", () => switchScreen("screen-dashboard"));
  document.getElementById("nav-classes").addEventListener("click", () => switchScreen("screen-classes"));
  document.getElementById("nav-users").addEventListener("click", () => switchScreen("screen-users"));

  // Evaluatiescherm Selecties & Filters
  document.getElementById("eval-task-select").addEventListener("change", (e) => {
    currentSelectedTask = appData.tasks.find(t => t.id === e.target.value) || null;
    renderStudentList();
    renderRubrics();
    renderPresetChips();
  });

  document.getElementById("eval-class-select").addEventListener("change", (e) => {
    currentSelectedClass = appData.classes.find(c => c.id === e.target.value) || null;
    renderStudentList();
  });

  document.getElementById("eval-student-search").addEventListener("input", renderStudentList);
  document.getElementById("eval-filter-todo").addEventListener("change", renderStudentList);

  // Evaluatie Acties
  document.getElementById("btn-save-evaluation").addEventListener("click", saveCurrentEvaluation);
  document.getElementById("btn-retry-eval").addEventListener("click", startRetryEvaluation);
  document.getElementById("btn-export-pdf").addEventListener("click", exportStudentPDF);
  document.getElementById("btn-export-class-pdf").addEventListener("click", exportClassPDF);

  // Timer Knopen
  document.getElementById("btn-timer-toggle").addEventListener("click", toggleTimer);
  document.getElementById("btn-timer-reset").addEventListener("click", resetTimer);

  // Dashboard (Opdrachten) Acties
  document.getElementById("btn-add-task").addEventListener("click", createNewTask);
  document.getElementById("btn-copy-task").addEventListener("click", copyCurrentTask);
  document.getElementById("btn-save-task-changes").addEventListener("click", saveTaskChanges);
  document.getElementById("btn-delete-task").addEventListener("click", deleteTask);
  document.getElementById("btn-add-criterion").addEventListener("click", addCriterionToEditor);

  // Klassenbeheer Acties
  document.getElementById("btn-add-class").addEventListener("click", createNewClass);
  document.getElementById("btn-save-class-changes").addEventListener("click", saveClassChanges);
  document.getElementById("btn-delete-class").addEventListener("click", deleteClass);
  document.getElementById("btn-new-schoolyear").addEventListener("click", startNewSchoolYear);

  // Klassenbeheer Sub-tabs
  document.getElementById("tab-btn-class-edit").addEventListener("click", () => switchClassSubTab("edit"));
  document.getElementById("tab-btn-class-overview").addEventListener("click", () => switchClassSubTab("overview"));
  document.getElementById("btn-download-overview-class-pdf").addEventListener("click", exportOverviewClassPDF);

  // Gebruikersbeheer Acties
  document.getElementById("btn-add-user").addEventListener("click", createNewUser);
  document.getElementById("btn-change-password").addEventListener("click", changePassword);
}

function switchScreen(screenId) {
  document.querySelectorAll(".app-screen").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

  document.getElementById(screenId).classList.add("active");

  if (screenId === "screen-eval") {
    document.getElementById("nav-eval").classList.add("active");
    initEvalScreen();
  } else if (screenId === "screen-dashboard") {
    document.getElementById("nav-dashboard").classList.add("active");
    initDashboardScreen();
  } else if (screenId === "screen-classes") {
    document.getElementById("nav-classes").classList.add("active");
    initClassesScreen();
  } else if (screenId === "screen-users") {
    document.getElementById("nav-users").classList.add("active");
    initUsersScreen();
  }
}

/* ==========================================================================
   AUTHENTICATIE & GEBRUIKERS
   ========================================================================== */

function handleLogin() {
  const userIn = document.getElementById("login-username").value.trim();
  const passIn = document.getElementById("login-password").value.trim();
  const errorEl = document.getElementById("login-error");

  const found = appData.users.find(u => u.username.toLowerCase() === userIn.toLowerCase() && u.password === passIn);

  if (found) {
    currentUser = found;
    errorEl.textContent = "";
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
    checkLoginSession();
  } else {
    errorEl.textContent = "Ongeldige gebruikersnaam of wachtwoord.";
  }
}

function handleLogout() {
  currentUser = null;
  resetTimer();
  checkLoginSession();
}

/* ==========================================================================
   TIMER FUNCTIONALITEIT
   ========================================================================== */

function toggleTimer() {
  const btn = document.getElementById("btn-timer-toggle");
  if (isTimerRunning) {
    clearInterval(timerInterval);
    isTimerRunning = false;
    btn.textContent = "Start";
    btn.classList.replace("btn-danger", "btn-primary");
  } else {
    isTimerRunning = true;
    btn.textContent = "Pauze";
    btn.classList.replace("btn-primary", "btn-danger");
    timerInterval = setInterval(() => {
      timerSeconds++;
      updateTimerDisplay();
    }, 1000);
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timerSeconds = 0;
  updateTimerDisplay();
  const btn = document.getElementById("btn-timer-toggle");
  if (btn) {
    btn.textContent = "Start";
    btn.classList.replace("btn-danger", "btn-primary");
  }
}

function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
  const secs = (timerSeconds % 60).toString().padStart(2, "0");
  const display = document.getElementById("timer-display");
  if (display) display.textContent = `${mins}:${secs}`;
}

/* ==========================================================================
   SCHERM 1: EVALUATIEMODUS
   ========================================================================== */

function initEvalScreen() {
  populateTaskSelect("eval-task-select");
  populateClassSelect("eval-class-select");

  if (appData.tasks.length > 0 && !currentSelectedTask) {
    currentSelectedTask = appData.tasks[0];
  }
  if (appData.classes.length > 0 && !currentSelectedClass) {
    const currentClasses = appData.classes.filter(c => c.schoolYear === appData.currentSchoolYear);
    if (currentClasses.length > 0) currentSelectedClass = currentClasses[0];
  }

  if (currentSelectedTask) document.getElementById("eval-task-select").value = currentSelectedTask.id;
  if (currentSelectedClass) document.getElementById("eval-class-select").value = currentSelectedClass.id;

  renderStudentList();
  renderRubrics();
  renderPresetChips();
}

function populateTaskSelect(elementId) {
  const select = document.getElementById(elementId);
  if (!select) return;
  select.innerHTML = "";
  appData.tasks.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.title;
    select.appendChild(opt);
  });
}

function populateClassSelect(elementId) {
  const select = document.getElementById(elementId);
  if (!select) return;
  select.innerHTML = "";
  const currentClasses = appData.classes.filter(c => c.schoolYear === appData.currentSchoolYear);
  currentClasses.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

function renderStudentList() {
  const ul = document.getElementById("eval-student-list");
  ul.innerHTML = "";

  if (!currentSelectedClass || !currentSelectedTask) return;

  const searchQuery = document.getElementById("eval-student-search").value.toLowerCase();
  const filterTodo = document.getElementById("eval-filter-todo").checked;

  const students = currentSelectedClass.students || [];

  students.forEach(student => {
    if (searchQuery && !student.name.toLowerCase().includes(searchQuery)) return;

    const hasEval = appData.evaluations.some(e => 
      e.studentId === student.id && 
      e.taskId === currentSelectedTask.id && 
      e.schoolYear === appData.currentSchoolYear
    );

    if (filterTodo && hasEval) return;

    const li = document.createElement("li");
    if (currentSelectedStudent && currentSelectedStudent.id === student.id) {
      li.classList.add("active");
    }

    li.innerHTML = `
      <span>${student.name}</span>
      ${hasEval ? '<span class="status-done">✓</span>' : ''}
    `;

    li.addEventListener("click", () => selectStudent(student));
    ul.appendChild(li);
  });
}

function selectStudent(student) {
  currentSelectedStudent = student;
  renderStudentList();
  resetTimer();

  document.getElementById("eval-student-title").textContent = student.name;
  document.getElementById("eval-task-subtitle").textContent = `Opdracht: ${currentSelectedTask ? currentSelectedTask.title : '-'}`;

  loadEvaluationForStudent();
}

function loadEvaluationForStudent() {
  currentScores = {};
  document.getElementById("eval-general-feedback").value = "";

  if (!currentSelectedStudent || !currentSelectedTask) return;

  const evals = appData.evaluations
    .filter(e => e.studentId === currentSelectedStudent.id && e.taskId === currentSelectedTask.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const historyCard = document.getElementById("student-history-card");
  const historyContent = document.getElementById("history-content");
  const retryBtn = document.getElementById("btn-retry-eval");

  if (evals.length > 0) {
    historyCard.style.display = "block";
    retryBtn.style.display = "inline-block";
    historyContent.innerHTML = evals.map((ev, idx) => `
      <div class="history-item">
        <strong>${idx === 0 ? 'Laatste Evaluatie' : 'Vorige poging'} (${ev.date}) - Spreektijd: ${ev.timer || '00:00'}:</strong> 
        Score: <strong>${ev.totalScore} / ${ev.maxScore}</strong> | Opmerkingen: ${ev.feedback || 'Geen'}
      </div>
    `).join("");

    const latest = evals[0];
    currentScores = JSON.parse(JSON.stringify(latest.scores || {}));
    document.getElementById("eval-general-feedback").value = latest.feedback || "";
    if (latest.timerSeconds) timerSeconds = latest.timerSeconds;
    updateTimerDisplay();
  } else {
    historyCard.style.display = "none";
    retryBtn.style.display = "none";
  }

  renderRubrics();
}

function renderRubrics() {
  const wrapper = document.getElementById("eval-rubrics-wrapper");
  wrapper.innerHTML = "";

  if (!currentSelectedTask) {
    wrapper.innerHTML = "<p class='text-muted'>Selecteer eerst een opdracht.</p>";
    updateScoreDisplay();
    return;
  }

  currentSelectedTask.criteria.forEach(criterion => {
    const block = document.createElement("div");
    block.className = "rubric-block";

    const header = document.createElement("div");
    header.className = "rubric-header";
    header.innerHTML = `
      <h4>${criterion.title}</h4>
      <span class="badge">Gewicht: ${criterion.weight || 1}x</span>
    `;
    block.appendChild(header);

    const levelsFlex = document.createElement("div");
    levelsFlex.className = "levels-flex";

    criterion.levels.forEach((level, lIdx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "level-button";

      const isSelected = currentScores[criterion.id] && currentScores[criterion.id].levelIndex === lIdx;
      if (isSelected) btn.classList.add("selected");

      btn.innerHTML = `
        <div class="level-score-tag">${level.label} (${level.score}pt)</div>
        <div class="level-desc-text">${level.desc}</div>
      `;

      btn.addEventListener("click", () => {
        currentScores[criterion.id] = {
          levelIndex: lIdx,
          score: level.score,
          weight: criterion.weight || 1
        };
        renderRubrics();
      });

      levelsFlex.appendChild(btn);
    });

    block.appendChild(levelsFlex);
    wrapper.appendChild(block);
  });

  updateScoreDisplay();
}

function updateScoreDisplay() {
  let currentTotal = 0;
  let maxTotal = 0;

  if (currentSelectedTask) {
    currentSelectedTask.criteria.forEach(c => {
      const w = c.weight || 1;
      const maxLevelScore = Math.max(...c.levels.map(l => l.score), 0);
      maxTotal += maxLevelScore * w;

      if (currentScores[c.id]) {
        currentTotal += currentScores[c.id].score * w;
      }
    });
  }

  document.getElementById("eval-total-score").textContent = `${currentTotal} / ${maxTotal}`;
}

function renderPresetChips() {
  const container = document.getElementById("preset-feedback-chips");
  container.innerHTML = "";

  if (!currentSelectedTask || !currentSelectedTask.presets) {
    container.innerHTML = "<p class='text-muted'>Geen snelle opmerkingen ingesteld voor deze opdracht.</p>";
    return;
  }

  currentSelectedTask.presets.forEach(text => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip-btn";
    chip.textContent = text;
    chip.addEventListener("click", () => {
      const textarea = document.getElementById("eval-general-feedback");
      if (textarea.value.trim() !== "") {
        textarea.value += ", " + text;
      } else {
        textarea.value = text;
      }
    });
    container.appendChild(chip);
  });
}

function saveCurrentEvaluation() {
  if (!currentSelectedStudent) {
    alert("Selecteer eerst een leerling.");
    return;
  }
  if (!currentSelectedTask) {
    alert("Selecteer eerst een opdracht.");
    return;
  }

  const mins = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
  const secs = (timerSeconds % 60).toString().padStart(2, "0");
  const formattedTimer = `${mins}:${secs}`;

  let currentTotal = 0;
  let maxTotal = 0;

  currentSelectedTask.criteria.forEach(c => {
    const w = c.weight || 1;
    const maxLevelScore = Math.max(...c.levels.map(l => l.score), 0);
    maxTotal += maxLevelScore * w;

    if (currentScores[c.id]) {
      currentTotal += currentScores[c.id].score * w;
    }
  });

  const evaluationData = {
    id: "eval_" + Date.now(),
    studentId: currentSelectedStudent.id,
    taskId: currentSelectedTask.id,
    classId: currentSelectedClass ? currentSelectedClass.id : null,
    schoolYear: appData.currentSchoolYear,
    date: new Date().toLocaleDateString("nl-BE"),
    timer: formattedTimer,
    timerSeconds: timerSeconds,
    scores: currentScores,
    totalScore: currentTotal,
    maxScore: maxTotal,
    feedback: document.getElementById("eval-general-feedback").value.trim()
  };

  appData.evaluations.push(evaluationData);
  saveData();

  alert(`Evaluatie voor ${currentSelectedStudent.name} succesvol opgeslagen!`);
  loadEvaluationForStudent();
  renderStudentList();
}

function startRetryEvaluation() {
  currentScores = {};
  document.getElementById("eval-general-feedback").value = "";
  resetTimer();
  renderRubrics();
  alert("Nieuwe poging/herkansing gestart. Vul het formulier in en klik op Opslaan.");
}

/* ==========================================================================
   PDF EXPORT FUNCTIONALITEIT
   ========================================================================== */

function verzamelPdfData(student, task, evaluation) {
  let parameters = [];
  let currentTotal = 0;
  let maxTotal = 0;

  task.criteria.forEach(c => {
    const w = c.weight || 1;
    const maxLevelScore = Math.max(...c.levels.map(l => l.score), 0);
    maxTotal += maxLevelScore * w;

    const scoresObj = evaluation ? evaluation.scores : currentScores;
    const sel = scoresObj[c.id];
    const level = sel ? c.levels[sel.levelIndex] : null;

    if (sel) {
      currentTotal += sel.score * w;
    }

    parameters.push({
      naam: c.title,
      score: level ? level.score : 0,
      max: maxLevelScore,
      criterium: level ? level.desc || level.label : 'Niet beoordeeld'
    });
  });

  const mins = Math.floor((evaluation ? evaluation.timerSeconds : timerSeconds) / 60).toString().padStart(2, "0");
  const secs = ((evaluation ? evaluation.timerSeconds : timerSeconds) % 60).toString().padStart(2, "0");

  return {
    titel: task.title,
    leerling: student.name,
    klas: currentSelectedClass ? currentSelectedClass.name : '-',
    datum: evaluation ? evaluation.date : new Date().toLocaleDateString("nl-BE"),
    duur: `${mins}:${secs}`,
    parameters: parameters,
    feedback: evaluation ? evaluation.feedback || 'Geen extra opmerkingen.' : document.getElementById("eval-general-feedback").value.trim() || 'Geen extra opmerkingen.',
    eindscore: currentTotal,
    maxEindscore: maxTotal
  };
}

function bouwPdfHtml(data) {
  let rijen = '';
  data.parameters.forEach(param => {
    rijen += `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${param.naam}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">${param.score} / ${param.max}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${param.criterium}</td>
      </tr>`;
  });

  return `
    <div style="font-family: Helvetica, Arial, sans-serif; padding: 30px; color: #111;">
      <h2 style="text-transform: uppercase; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 15px;">
        ${data.titel}
      </h2>
      
      <p style="font-size: 11pt; color: #444; margin-bottom: 25px;">
        <strong>Leerling:</strong> ${data.leerling} (${data.klas})<br>
        <strong>Datum:</strong> ${data.datum} | <strong>Duur:</strong> ${data.duur}
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: left;">
        <thead>
          <tr style="border-bottom: 1.5px solid #111; font-size: 9pt; text-transform: uppercase; color: #666;">
            <th style="padding: 8px;">Parameter</th>
            <th style="padding: 8px;">Score</th>
            <th style="padding: 8px;">Toegepaste Criteria</th>
          </tr>
        </thead>
        <tbody>
          ${rijen}
        </tbody>
      </table>

      <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #666; margin-bottom: 6px;">
        Feedback & Opmerkingen
      </div>
      <div style="background: #f9f9f9; border-left: 3px solid #111; padding: 12px; margin-bottom: 30px;">
        ${data.feedback}
      </div>

      <div style="text-align: right; border-top: 1.5px solid #111; padding-top: 10px;">
        <span style="font-size: 9pt; text-transform: uppercase; color: #666; font-weight: bold;">Eindscore</span><br>
        <span style="font-size: 18pt; font-weight: bold;">${data.eindscore} / ${data.maxEindscore}</span>
      </div>
    </div>
  `;
}

function exportStudentPDF() {
  if (!currentSelectedStudent || !currentSelectedTask) {
    alert("Selecteer een leerling en opdracht.");
    return;
  }
  const evalData = appData.evaluations.find(e => e.studentId === currentSelectedStudent.id && e.taskId === currentSelectedTask.id && e.schoolYear === appData.currentSchoolYear);
  const data = verzamelPdfData(currentSelectedStudent, currentSelectedTask, evalData);
  
  const element = document.createElement("div");
  element.innerHTML = bouwPdfHtml(data);

  const opt = {
    margin: 10,
    filename: `Evaluatie_${currentSelectedStudent.name}_${currentSelectedTask.title}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

function exportClassPDF() {
  if (!currentSelectedClass || !currentSelectedTask) {
    alert("Selecteer een klas en een opdracht.");
    return;
  }

  const container = document.createElement("div");
  currentSelectedClass.students.forEach((student, index) => {
    const evalData = appData.evaluations.find(e => e.studentId === student.id && e.taskId === currentSelectedTask.id && e.schoolYear === appData.currentSchoolYear);
    const data = verzamelPdfData(student, currentSelectedTask, evalData);
    
    const pageDiv = document.createElement("div");
    pageDiv.innerHTML = bouwPdfHtml(data);
    if (index < currentSelectedClass.students.length - 1) {
      pageDiv.style.pageBreakAfter = "always";
    }
    container.appendChild(pageDiv);
  });

  const opt = {
    margin: 10,
    filename: `Klas_Evaluatie_${currentSelectedClass.name}_${currentSelectedTask.title}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(container).save();
}

/* ==========================================================================
   SCHERM 2: DASHBOARD (OPDRACHTEN & RUBRICS BEWERKEN)
   ========================================================================== */

let editingTask = null;

function initDashboardScreen() {
  renderTaskList();
  if (appData.tasks.length > 0 && !editingTask) {
    loadTaskInEditor(appData.tasks[0]);
  }
}

function renderTaskList() {
  const ul = document.getElementById("dashboard-task-list");
  ul.innerHTML = "";

  appData.tasks.forEach(task => {
    const li = document.createElement("li");
    if (editingTask && editingTask.id === task.id) li.classList.add("active");
    li.textContent = task.title;
    li.addEventListener("click", () => loadTaskInEditor(task));
    ul.appendChild(li);
  });
}

function loadTaskInEditor(task) {
  editingTask = JSON.parse(JSON.stringify(task));
  renderTaskList();

  document.getElementById("task-name-input").value = editingTask.title;
  document.getElementById("task-presets-input").value = (editingTask.presets || []).join(", ");

  renderCriteriaEditor();
}

function renderCriteriaEditor() {
  const container = document.getElementById("editor-criteria-container");
  container.innerHTML = "";

  if (!editingTask || !editingTask.criteria) return;

  editingTask.criteria.forEach((c, cIdx) => {
    const box = document.createElement("div");
    box.className = "criterion-editor-box";

    box.innerHTML = `
      <div class="criterion-header-inputs mb-2">
        <div>
          <label>Criterium Titel:</label>
          <input type="text" value="${c.title}" onchange="updateCriterionTitle(${cIdx}, this.value)">
        </div>
        <div>
          <label>Gewicht (x):</label>
          <input type="number" min="1" value="${c.weight || 1}" onchange="updateCriterionWeight(${cIdx}, this.value)">
        </div>
      </div>
      <h5>Niveaus:</h5>
      <div id="levels-editor-${cIdx}"></div>
      <button class="btn btn-sm btn-danger mt-2" onclick="removeCriterion(${cIdx})">Verwijder Criterium</button>
    `;

    container.appendChild(box);

    const levelsContainer = box.querySelector(`#levels-editor-${cIdx}`);
    c.levels.forEach((lvl, lIdx) => {
      const row = document.createElement("div");
      row.className = "level-editor-row";
      row.innerHTML = `
        <input type="number" value="${lvl.score}" placeholder="pt" onchange="updateLevelScore(${cIdx}, ${lIdx}, this.value)">
        <input type="text" value="${lvl.label}" placeholder="Label" onchange="updateLevelLabel(${cIdx}, ${lIdx}, this.value)">
        <input type="text" value="${lvl.desc}" placeholder="Omschrijving" onchange="updateLevelDesc(${cIdx}, ${lIdx}, this.value)">
      `;
      levelsContainer.appendChild(row);
    });
  });
}

window.updateCriterionTitle = (cIdx, val) => { editingTask.criteria[cIdx].title = val; };
window.updateCriterionWeight = (cIdx, val) => { editingTask.criteria[cIdx].weight = parseFloat(val) || 1; };
window.removeCriterion = (cIdx) => { editingTask.criteria.splice(cIdx, 1); renderCriteriaEditor(); };
window.updateLevelScore = (cIdx, lIdx, val) => { editingTask.criteria[cIdx].levels[lIdx].score = parseFloat(val) || 0; };
window.updateLevelLabel = (cIdx, lIdx, val) => { editingTask.criteria[cIdx].levels[lIdx].label = val; };
window.updateLevelDesc = (cIdx, lIdx, val) => { editingTask.criteria[cIdx].levels[lIdx].desc = val; };

function addCriterionToEditor() {
  if (!editingTask) return;
  editingTask.criteria.push({
    id: "c_" + Date.now(),
    title: "Nieuw Criterium",
    weight: 1,
    levels: [
      { label: "Onvoldoende", score: 2, desc: "" },
      { label: "Voldoende", score: 6, desc: "" },
      { label: "Goed", score: 8, desc: "" },
      { label: "Zeer Goed", score: 10, desc: "" }
    ]
  });
  renderCriteriaEditor();
}

function createNewTask() {
  const newTask = {
    id: "t_" + Date.now(),
    title: "Nieuwe Opdracht",
    presets: [],
    criteria: []
  };
  appData.tasks.push(newTask);
  saveData();
  loadTaskInEditor(newTask);
}

function copyCurrentTask() {
  if (!editingTask) return;
  const copiedTask = JSON.parse(JSON.stringify(editingTask));
  copiedTask.id = "t_" + Date.now();
  copiedTask.title += " (Kopie)";

  appData.tasks.push(copiedTask);
  saveData();
  loadTaskInEditor(copiedTask);
  alert("Opdracht gekopieerd!");
}

function saveTaskChanges() {
  if (!editingTask) return;

  editingTask.title = document.getElementById("task-name-input").value.trim();
  const presetsVal = document.getElementById("task-presets-input").value;
  editingTask.presets = presetsVal.split(",").map(s => s.trim()).filter(s => s.length > 0);

  const index = appData.tasks.findIndex(t => t.id === editingTask.id);
  if (index !== -1) {
    appData.tasks[index] = editingTask;
    saveData();
    alert("Wijzigingen in opdracht opgeslagen!");
    renderTaskList();
  }
}

function deleteTask() {
  if (!editingTask) return;
  if (confirm(`Weet je zeker dat je '${editingTask.title}' wilt verwijderen?`)) {
    appData.tasks = appData.tasks.filter(t => t.id !== editingTask.id);
    saveData();
    editingTask = null;
    initDashboardScreen();
  }
}

/* ==========================================================================
   SCHERM 3: KLASSENBEHEER & OVERZICHT
   ========================================================================== */

let editingClass = null;

function initClassesScreen() {
  renderClassesList();
  populateTaskSelect("overview-task-select");
  if (appData.classes.length > 0 && !editingClass) {
    const currentClasses = appData.classes.filter(c => c.schoolYear === appData.currentSchoolYear);
    if (currentClasses.length > 0) loadClassInEditor(currentClasses[0]);
  }
}

function renderClassesList() {
  const ul = document.getElementById("classes-class-list");
  ul.innerHTML = "";

  const currentClasses = appData.classes.filter(c => c.schoolYear === appData.currentSchoolYear);

  currentClasses.forEach(c => {
    const li = document.createElement("li");
    if (editingClass && editingClass.id === c.id) li.classList.add("active");
    li.textContent = c.name;
    li.addEventListener("click", () => loadClassInEditor(c));
    ul.appendChild(li);
  });
}

function loadClassInEditor(c) {
  editingClass = JSON.parse(JSON.stringify(c));
  renderClassesList();

  document.getElementById("class-name-input").value = editingClass.name;
  const names = (editingClass.students || []).map(s => s.name).join("\n");
  document.getElementById("class-students-input").value = names;

  renderOverviewTab();
}

function switchClassSubTab(tab) {
  const editTab = document.getElementById("tab-content-class-edit");
  const overviewTab = document.getElementById("tab-content-class-overview");
  const btnEdit = document.getElementById("tab-btn-class-edit");
  const btnOverview = document.getElementById("tab-btn-class-overview");

  if (tab === "edit") {
    editTab.style.display = "block";
    overviewTab.style.display = "none";
    btnEdit.className = "btn btn-sm btn-primary";
    btnOverview.className = "btn btn-sm btn-secondary";
  } else {
    editTab.style.display = "none";
    overviewTab.style.display = "block";
    btnEdit.className = "btn btn-sm btn-secondary";
    btnOverview.className = "btn btn-sm btn-primary";
    renderOverviewTab();
  }
}

function renderOverviewTab() {
  const container = document.getElementById("class-students-overview-list");
  container.innerHTML = "";

  if (!editingClass) {
    container.innerHTML = "<p class='text-muted'>Selecteer eerst een klas.</p>";
    return;
  }

  editingClass.students.forEach(student => {
    const evals = appData.evaluations.filter(e => e.studentId === student.id && e.schoolYear === appData.currentSchoolYear);
    const row = document.createElement("div");
    row.className = "overview-eval-row";
    row.innerHTML = `
      <span><strong>${student.name}</strong></span>
      <span>Evaluaties voltooid: ${evals.length}</span>
    `;
    container.appendChild(row);
  });
}

function saveClassChanges() {
  if (!editingClass) return;

  editingClass.name = document.getElementById("class-name-input").value.trim();
  const rawNames = document.getElementById("class-students-input").value.split("\n");

  const updatedStudents = rawNames
    .map(n => n.trim())
    .filter(n => n.length > 0)
    .map((name, idx) => {
      const existing = (editingClass.students || [])[idx];
      return {
        id: existing ? existing.id : "s_" + Date.now() + "_" + idx,
        name: name
      };
    });

  editingClass.students = updatedStudents;

  const index = appData.classes.findIndex(c => c.id === editingClass.id);
  if (index !== -1) {
    appData.classes[index] = editingClass;
    saveData();
    alert("Klaswijzigingen opgeslagen!");
    renderClassesList();
  }
}

function createNewClass() {
  const newClass = {
    id: "k_" + Date.now(),
    name: "Nieuwe Klas",
    schoolYear: appData.currentSchoolYear,
    students: []
  };
  appData.classes.push(newClass);
  saveData();
  loadClassInEditor(newClass);
}

function deleteClass() {
  if (!editingClass) return;
  if (confirm(`Weet je zeker dat je klas '${editingClass.name}' wilt verwijderen?`)) {
    appData.classes = appData.classes.filter(c => c.id !== editingClass.id);
    saveData();
    editingClass = null;
    initClassesScreen();
  }
}

function startNewSchoolYear() {
  const newYear = prompt("Voer de naam van het nieuwe schooljaar in (bijv. 2026-2027):", "2026-2027");
  if (newYear) {
    appData.currentSchoolYear = newYear;
    saveData();
    updateSchoolYearBadge();
    initClassesScreen();
    alert(`Schooljaar gewijzigd naar ${newYear}. Je kunt nu nieuwe klassen aanmaken.`);
  }
}

function exportOverviewClassPDF() {
  const taskId = document.getElementById("overview-task-select").value;
  if (!taskId) {
    alert("Selecteer een opdracht.");
    return;
  }
  currentSelectedTask = appData.tasks.find(t => t.id === taskId);
  currentSelectedClass = editingClass;
  exportClassPDF();
}

/* ==========================================================================
   SCHERM 4: GEBRUIKERS & WACHTWOORD BEHEREN
   ========================================================================== */

function initUsersScreen() {
  renderUsersList();
  const loggedEl = document.getElementById("current-logged-user");
  if (currentUser) {
    loggedEl.textContent = `Ingelogd als: ${currentUser.username}`;
  }
}

function renderUsersList() {
  const ul = document.getElementById("users-list");
  ul.innerHTML = "";

  appData.users.forEach(u => {
    const li = document.createElement("li");
    li.textContent = u.username;
    ul.appendChild(li);
  });
}

function createNewUser() {
  const userIn = document.getElementById("new-username").value.trim();
  const passIn = document.getElementById("new-password").value.trim();

  if (!userIn || !passIn) {
    alert("Vul een gebruikersnaam en wachtwoord in.");
    return;
  }

  const exists = appData.users.some(u => u.username.toLowerCase() === userIn.toLowerCase());
  if (exists) {
    alert("Gebruikersnaam bestaat al.");
    return;
  }

  appData.users.push({
    id: "u_" + Date.now(),
    username: userIn,
    password: passIn
  });

  saveData();
  document.getElementById("new-username").value = "";
  document.getElementById("new-password").value = "";
  renderUsersList();
  alert("Nieuwe gebruiker aangemaakt!");
}

function changePassword() {
  const passIn = document.getElementById("change-password-input").value.trim();
  if (!passIn) {
    alert("Voer een nieuw wachtwoord in.");
    return;
  }

  if (currentUser) {
    currentUser.password = passIn;
    const uIndex = appData.users.findIndex(u => u.id === currentUser.id);
    if (uIndex !== -1) {
      appData.users[uIndex].password = passIn;
      saveData();
      document.getElementById("change-password-input").value = "";
      alert("Wachtwoord succesvol gewijzigd!");
    }
  }
}
