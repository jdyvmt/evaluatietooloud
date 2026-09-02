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

let currentUser = null;
let currentSelectedTask = null;
let currentSelectedClass = null;
let currentSelectedStudent = null;
let currentScores = {};

let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      appData = JSON.parse(savedData);
      if (!appData.currentSchoolYear) appData.currentSchoolYear = "2025-2026";
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
          { id: "s2", name: "Sophie Devos" }
        ]
      }
    ],
    evaluations: []
  };
  saveData();
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupEventListeners();
  populateGlobalSchoolYearSelect();
  checkLoginSession();
});

function populateGlobalSchoolYearSelect() {
  const select = document.getElementById("global-schoolyear-select");
  if (!select) return;
  select.innerHTML = "";

  // Verzamel alle unieke schooljaren uit klassen en evaluaties plus huidige
  const yearsSet = new Set([appData.currentSchoolYear, "2024-2025", "2025-2026", "2026-2027"]);
  appData.classes.forEach(c => { if (c.schoolYear) yearsSet.add(c.schoolYear); });
  appData.evaluations.forEach(e => { if (e.schoolYear) yearsSet.add(e.schoolYear); });

  Array.from(yearsSet).sort().forEach(year => {
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    if (year === appData.currentSchoolYear) opt.selected = true;
    select.appendChild(opt);
  });

  select.onchange = (e) => {
    appData.currentSchoolYear = e.target.value;
    saveData();
    initEvalScreen();
    if (document.getElementById("screen-classes").classList.contains("active")) {
      initClassesScreen();
    }
  };
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

function setupEventListeners() {
  document.getElementById("btn-login").addEventListener("click", handleLogin);
  document.getElementById("btn-logout").addEventListener("click", handleLogout);

  document.getElementById("nav-eval").addEventListener("click", () => switchScreen("screen-eval"));
  document.getElementById("nav-dashboard").addEventListener("click", () => switchScreen("screen-dashboard"));
  document.getElementById("nav-classes").addEventListener("click", () => switchScreen("screen-classes"));
  document.getElementById("nav-users").addEventListener("click", () => switchScreen("screen-users"));

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

  document.getElementById("btn-save-evaluation").addEventListener("click", saveCurrentEvaluation);
  document.getElementById("btn-retry-eval").addEventListener("click", startRetryEvaluation);
  document.getElementById("btn-export-pdf").addEventListener("click", exportStudentPDF);
  document.getElementById("btn-export-class-pdf").addEventListener("click", exportClassPDF);

  document.getElementById("btn-timer-toggle").addEventListener("click", toggleTimer);
  document.getElementById("btn-timer-reset").addEventListener("click", resetTimer);

  document.getElementById("btn-add-task").addEventListener("click", createNewTask);
  document.getElementById("btn-copy-task").addEventListener("click", copyCurrentTask);
  document.getElementById("btn-save-task-changes").addEventListener("click", saveTaskChanges);
  document.getElementById("btn-delete-task").addEventListener("click", deleteTask);
  document.getElementById("btn-add-criterion").addEventListener("click", addCriterionToEditor);

  document.getElementById("btn-add-class").addEventListener("click", createNewClass);
  document.getElementById("btn-save-class-changes").addEventListener("click", saveClassChanges);
  document.getElementById("btn-delete-class").addEventListener("click", deleteClass);
  document.getElementById("btn-new-schoolyear").addEventListener("click", startNewSchoolYear);

  document.getElementById("tab-btn-class-edit").addEventListener("click", () => switchClassSubTab("edit"));
  document.getElementById("tab-btn-class-overview").addEventListener("click", () => switchClassSubTab("overview"));
  document.getElementById("tab-btn-student-detail").addEventListener("click", () => switchClassSubTab("detail"));
  document.getElementById("btn-download-overview-class-pdf").addEventListener("click", exportOverviewClassPDF);
  document.getElementById("detail-student-select").addEventListener("change", renderStudentDetailContent);

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
    .filter(e => e.studentId === currentSelectedStudent.id && e.taskId === currentSelectedTask.id && e.schoolYear === appData.currentSchoolYear)
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
          score: level.score
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
      const maxLevelScore = Math.max(...c.levels.map(l => l.score), 0);
      maxTotal += maxLevelScore;

      if (currentScores[c.id]) {
        currentTotal += currentScores[c.id].score;
      }
    });
  }

  document.getElementById("eval-total-score").textContent = `${currentTotal} / ${maxTotal}`;
}
function renderPresetChips() {
  const container = document.getElementById("preset-feedback-chips");
  container.innerHTML = "";

  if (!currentSelectedTask || !currentSelectedTask.presets) {
    container.innerHTML = "<p class='text-muted'>Geen snelle opmerkingen ingesteld.</p>";
    return;
  }

  currentSelectedTask.presets.forEach(text => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip-btn";
    chip.textContent = text;
    chip.addEventListener("click", () => {
      const textarea = document.getElementById("eval-general-feedback");
      textarea.value = textarea.value.trim() !== "" ? textarea.value + " " + text : text;
    });
    container.appendChild(chip);
  });
}

function saveCurrentEvaluation() {
  if (!currentSelectedStudent) { alert("Selecteer eerst een leerling."); return; }
  if (!currentSelectedTask) { alert("Selecteer eerst een opdracht."); return; }

  const mins = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
  const secs = (timerSeconds % 60).toString().padStart(2, "0");
  const formattedTimer = `${mins}:${secs}`;

  let currentTotal = 0;
  let maxTotal = 0;

  currentSelectedTask.criteria.forEach(c => {
    const maxLevelScore = Math.max(...c.levels.map(l => l.score), 0);
maxTotal += maxLevelScore;

if (currentScores[c.id]) {
  currentTotal += currentScores[c.id].score;
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

  alert(`Evaluatie voor ${currentSelectedStudent.name} opgeslagen!`);
  loadEvaluationForStudent();
  renderStudentList();
}

function startRetryEvaluation() {
  currentScores = {};
  document.getElementById("eval-general-feedback").value = "";
  resetTimer();
  renderRubrics();
  alert("Nieuwe herkansing gestart.");
}

function formatScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  const rounded = Math.round((number + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function formatScorePair(score, maxScore) {
  return `${formatScore(score)} / ${formatScore(maxScore)}`;
}

/* ==========================================================================
   PDF EXPORT FUNCTIONALITEIT (Exact afgestemd op voorbeeld)
   ========================================================================== */

function verzamelPdfData(student, task, evaluation) {
  let parameters = [];
  let currentTotal = 0;
  let maxTotal = 0;

  // Bepaal de juiste bron voor de scores (opgeslagen evaluatie of live selectie)
  const scoresObj = evaluation ? (evaluation.scores || {}) : currentScores;

  if (task && task.criteria) {
    task.criteria.forEach(c => {
      const maxLevelScore = Math.max(...c.levels.map(l => Number(l.score) || 0), 0);
      maxTotal += maxLevelScore;

      const sel = scoresObj[c.id];
      let earnedScore = 0;
      let description = 'Niet beoordeeld';

      if (sel !== undefined && sel !== null) {
        // Ondersteun zowel object-notatie ({levelIndex, score}) als directe index/score
        const levelIndex = typeof sel === 'object' ? sel.levelIndex : sel;
        earnedScore = typeof sel === 'object' ? Number(sel.score) : Number(c.levels[sel]?.score || 0);
        
        if (!isNaN(earnedScore)) {
          currentTotal += earnedScore;
        }

        if (c.levels && c.levels[levelIndex]) {
          description = c.levels[levelIndex].desc || c.levels[levelIndex].label || 'Beoordeeld';
        }
      }

      parameters.push({
        naam: c.title || c.name || 'Criterium',
        score: formatScorePair(earnedScore, maxLevelScore),
        criterium: description
      });
    });
  }

  const durationStr = evaluation ? evaluation.timer || '00:00' : (() => {
    const mins = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
    const secs = (timerSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  })();

  const className = appData.classes.find(cls => (cls.students || []).some(s => s.id === student.id))?.name ||
    (currentSelectedClass ? currentSelectedClass.name : '-');

  return {
    titel: task ? task.title : 'Evaluatie',
    leerling: student.name,
    klas: className,
    schooljaar: evaluation ? evaluation.schoolYear : appData.currentSchoolYear,
    datum: evaluation ? evaluation.date : new Date().toLocaleDateString("nl-BE"),
    duur: durationStr,
    leerkracht: currentUser ? currentUser.username : "Leerkracht",
    school: "Atheneum Brugge",
    parameters: parameters,
    feedback: evaluation ? evaluation.feedback || 'Geen extra opmerkingen.' : (document.getElementById("eval-general-feedback")?.value.trim() || 'Geen extra opmerkingen.'),
    eindscore: formatScorePair(currentTotal, maxTotal)
  };
}
function bouwPdfHtml(data) {
  let rijen = '';
  data.parameters.forEach(param => {
    rijen += `
      <tr>
        <td class="pdf-param">${param.naam}</td>
        <td class="pdf-score">${param.score}</td>
        <td class="pdf-criteria">${param.criterium}</td>
      </tr>`;
  });

  return `
    <div class="pdf-document">
      <div class="pdf-topline">
        <h1 class="pdf-title">${data.titel}</h1>
        <div class="pdf-student-line">${data.leerling} &middot; ${data.klas}</div>
        <div class="pdf-meta-line">
          <span><strong>Datum:</strong> ${data.datum}</span>
          <span><strong>Spreektijd:</strong> ${data.duur}</span>
          <span>${data.leerkracht}</span>
          <span>${data.schooljaar}</span>
          <span>${data.school}</span>
        </div>
      </div>

      <h2 class="pdf-section-title">Beoordeling</h2>

      <table class="pdf-table">
        <thead>
          <tr>
            <th class="pdf-param">Criteria</th>
            <th class="pdf-score">Score</th>
            <th class="pdf-criteria">Uitleg</th>
          </tr>
        </thead>
        <tbody>${rijen}</tbody>
      </table>

      <div class="pdf-feedback">
        <div class="pdf-feedback-title">Feedback</div>
        <div class="pdf-feedback-text">${data.feedback}</div>
      </div>

      <div class="pdf-final-score">Eindscore: ${data.eindscore}</div>
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
  document.body.appendChild(element);

  const opt = {
    margin: 0,
    filename: `Evaluatie_${currentSelectedStudent.name}_${currentSelectedTask.title}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    pagebreak: { mode: ['css', 'legacy'] },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save().then(() => {
    document.body.removeChild(element);
  });
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

  document.body.appendChild(container);

  const opt = {
    margin: 0,
    filename: `Klas_Evaluatie_${currentSelectedClass.name}_${currentSelectedTask.title}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    pagebreak: { mode: ['css', 'legacy'] },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(container).save().then(() => {
    document.body.removeChild(container);
  });
}

/* ==========================================================================
   SCHERM 2: DASHBOARD
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
    box.draggable = true;
    box.dataset.index = cIdx;

    box.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", cIdx);
      box.classList.add("dragging");
    });

    box.addEventListener("dragend", () => {
      box.classList.remove("dragging");
    });

    box.addEventListener("dragover", (e) => {
      e.preventDefault();
      const draggingEl = container.querySelector(".dragging");
      const siblings = [...container.querySelectorAll(".criterion-editor-box:not(.dragging)")];
      const nextSibling = siblings.find(sibling => {
        const rect = sibling.getBoundingClientRect();
        return e.clientY <= rect.top + rect.height / 2;
      });
      container.insertBefore(draggingEl, nextSibling);
    });

    box.addEventListener("drop", (e) => {
      e.preventDefault();
      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const allBoxes = [...container.querySelectorAll(".criterion-editor-box")];
      const toIdx = allBoxes.indexOf(box);

      const movedItem = editingTask.criteria.splice(fromIdx, 1)[0];
      editingTask.criteria.splice(toIdx, 0, movedItem);
      
      renderCriteriaEditor();
    });

    box.innerHTML = `
      <div class="criterion-header-inputs mb-2">
        <div>
          <label>Criterium Titel:</label>
          <input type="text" value="${c.title.replace(/"/g, '&quot;')}" onchange="updateCriterionTitle(${cIdx}, this.value)">
        </div>
      </div>
      <h5>Niveaus:</h5>
      <div id="levels-editor-${cIdx}"></div>

      <div class="mt-2">
        <button type="button" class="btn btn-sm btn-secondary" onclick="addLevelToCriterion(${cIdx})">+ Niveau</button>
        <button type="button" class="btn btn-sm btn-secondary" onclick="removeLevelFromCriterion(${cIdx})">− Niveau</button>
      </div>

      <div class="mt-2">
        <button type="button" class="btn btn-sm btn-outline-secondary me-1" onclick="duplicateCriterion(${cIdx})">Dupliceer Criterium</button>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeCriterion(${cIdx})">Verwijder Criterium</button>
      </div>
    `;
    container.appendChild(box);

    const levelsContainer = box.querySelector(`#levels-editor-${cIdx}`);
    c.levels.forEach((lvl, lIdx) => {
      const row = document.createElement("div");
      row.className = "level-editor-row";
      row.innerHTML = `
        <input type="number" value="${lvl.score}" placeholder="pt" onchange="updateLevelScore(${cIdx}, ${lIdx}, this.value)">
        <input type="text" value="${lvl.label.replace(/"/g, '&quot;')}" placeholder="Label" onchange="updateLevelLabel(${cIdx}, ${lIdx}, this.value)">
        <input type="text" value="${lvl.desc.replace(/"/g, '&quot;')}" placeholder="Omschrijving" onchange="updateLevelDesc(${cIdx}, ${lIdx}, this.value)">
      `;
      levelsContainer.appendChild(row);
    });
  });
}

window.updateCriterionTitle = (cIdx, val) => { editingTask.criteria[cIdx].title = val; };
window.removeCriterion = (cIdx) => { editingTask.criteria.splice(cIdx, 1); renderCriteriaEditor(); };
window.updateLevelScore = (cIdx, lIdx, val) => { editingTask.criteria[cIdx].levels[lIdx].score = parseFloat(val) || 0; };
window.updateLevelLabel = (cIdx, lIdx, val) => { editingTask.criteria[cIdx].levels[lIdx].label = val; };
window.updateLevelDesc = (cIdx, lIdx, val) => { editingTask.criteria[cIdx].levels[lIdx].desc = val; };
window.addLevelToCriterion = (cIdx) => {
  const criterion = editingTask.criteria[cIdx];

  criterion.levels.push({
    label: "Nieuw niveau",
    score: 0,
    desc: ""
  });

  renderCriteriaEditor();
};

window.removeLevelFromCriterion = (cIdx) => {
  const criterion = editingTask.criteria[cIdx];

  if (criterion.levels.length <= 1) {
    alert("Een criterium moet minstens één niveau hebben.");
    return;
  }

  criterion.levels.pop();
  renderCriteriaEditor();
};

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
  const newTask = { id: "t_" + Date.now(), title: "Nieuwe Opdracht", presets: [], criteria: [] };
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
    alert("Wijzigingen opgeslagen!");
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
   SCHERM 3: KLASSENBEHEER & OVERZICHT & LEERLING DETAIL
   ========================================================================== */

let editingClass = null;

function initClassesScreen() {
  renderClassesList();
  populateTaskSelect("overview-task-select");
  populateDetailStudentSelect();

  const currentClasses = appData.classes.filter(c => c.schoolYear === appData.currentSchoolYear);
  if (currentClasses.length > 0 && !editingClass) {
    loadClassInEditor(currentClasses[0]);
  } else if (appData.classes.length > 0 && !editingClass) {
    loadClassInEditor(appData.classes[0]);
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
    li.addEventListener("click", () => {
      loadClassInEditor(c);
      populateDetailStudentSelect();
    });
    ul.appendChild(li);
  });
}

function loadClassInEditor(c) {
  editingClass = JSON.parse(JSON.stringify(c));
  renderClassesList();

  document.getElementById("class-name-input").value = editingClass.name;
  document.getElementById("class-students-input").value = "";

  renderOverviewTab();
  populateDetailStudentSelect();
  renderStudentManagementList();
}

function switchClassSubTab(tab) {
  const editTab = document.getElementById("tab-content-class-edit");
  const overviewTab = document.getElementById("tab-content-class-overview");
  const detailTab = document.getElementById("tab-content-student-detail");
  
  const btnEdit = document.getElementById("tab-btn-class-edit");
  const btnOverview = document.getElementById("tab-btn-class-overview");
  const btnDetail = document.getElementById("tab-btn-student-detail");

  editTab.style.display = "none";
  overviewTab.style.display = "none";
  detailTab.style.display = "none";
  btnEdit.className = "btn btn-sm btn-secondary";
  btnOverview.className = "btn btn-sm btn-secondary";
  btnDetail.className = "btn btn-sm btn-secondary";

  if (tab === "edit") {
    editTab.style.display = "block";
    btnEdit.className = "btn btn-sm btn-primary";
  } else if (tab === "overview") {
    overviewTab.style.display = "block";
    btnOverview.className = "btn btn-sm btn-primary";
    renderOverviewTab();
  } else if (tab === "detail") {
    detailTab.style.display = "block";
    btnDetail.className = "btn btn-sm btn-primary";
    populateDetailStudentSelect();
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

function populateDetailStudentSelect() {
  const select = document.getElementById("detail-student-select");
  if (!select) return;
  select.innerHTML = "<option value=''>-- Kies een leerling --</option>";

  // Verzamel alle leerlingen uit alle klassen of huidige klas
  const allStudents = [];
  appData.classes.forEach(c => {
    if (c.students) {
      c.students.forEach(s => allStudents.push({ ...s, className: c.name, schoolYear: c.schoolYear }));
    }
  });

  allStudents.forEach(student => {
    const opt = document.createElement("option");
    opt.value = student.id;
    opt.textContent = `${student.name} (${student.className} - ${student.schoolYear})`;
    select.appendChild(opt);
  });
}

function renderStudentDetailContent() {
  const studentId = document.getElementById("detail-student-select").value;
  const container = document.getElementById("student-detail-content");
  container.innerHTML = "";

  if (!studentId) {
    container.innerHTML = "<p class='text-muted'>Selecteer een leerling om het overzicht te tonen.</p>";
    return;
  }

  // Zoek leerling naam
  let studentName = "";
  appData.classes.forEach(c => {
    const found = c.students?.find(s => s.id === studentId);
    if (found) studentName = found.name;
  });

  const evals = appData.evaluations.filter(e => e.studentId === studentId);
  if (evals.length === 0) {
    container.innerHTML = `<p class='text-muted'>Geen ingevulde evaluaties gevonden voor ${studentName}.</p>`;
    return;
  }

  evals.forEach(ev => {
    const task = appData.tasks.find(t => t.id === ev.taskId);
    const taskTitle = task ? task.title : "Onbekende opdracht";

    let criteriaHtml = "";
    if (task && ev.scores) {
      task.criteria.forEach(c => {
        const sel = ev.scores[c.id];
        const lvl = sel ? c.levels[sel.levelIndex] : null;
        criteriaHtml += `
          <div style="font-size: 0.9rem; margin-top: 0.3rem;">
            <strong>${c.title}:</strong> ${lvl ? `${lvl.label} (${lvl.score}pt) - ${lvl.desc}` : 'Niet beoordeeld'}
          </div>
        `;
      });
    }

    const card = document.createElement("div");
    card.className = "detail-eval-card";
    card.innerHTML = `
      <div class="detail-eval-header">
        <h4 style="color: #1e293b; margin: 0;">${taskTitle} (${ev.schoolYear})</h4>
        <div class="student-management-actions">
          <span class="badge detail-score-badge">Score: ${formatScorePair(ev.totalScore, ev.maxScore)}</span>
          <button type="button" class="btn btn-sm btn-danger" onclick="deleteEvaluation('${ev.id}')">Verwijderen</button>
        </div>
      </div>
      <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">Datum: ${ev.date} | Spreektijd: ${ev.timer || '00:00'}</p>
      <div style="border-top: 1px dashed #cbd5e1; padding-top: 0.5rem; margin-top: 0.5rem;">
        ${criteriaHtml}
      </div>
      <div style="margin-top: 0.5rem; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 0.9rem;">
        <strong>Feedback:</strong> ${ev.feedback || 'Geen feedback opgegeven.'}
      </div>
    `;
    container.appendChild(card);
  });
}

function deleteEvaluation(evaluationId) {
  const evaluation = appData.evaluations.find(e => e.id === evaluationId);
  if (!evaluation) return;

  const student = appData.classes.flatMap(c => c.students || []).find(s => s.id === evaluation.studentId);
  const task = appData.tasks.find(t => t.id === evaluation.taskId);
  const studentName = student ? student.name : 'deze leerling';
  const taskTitle = task ? task.title : 'deze evaluatie';

  if (!confirm(`Weet je zeker dat je de evaluatie van ${studentName} voor '${taskTitle}' wilt verwijderen?`)) return;

  appData.evaluations = appData.evaluations.filter(e => e.id !== evaluationId);
  saveData();

  if (document.getElementById('detail-student-select').value === evaluation.studentId) {
    renderStudentDetailContent();
  }
  renderOverviewTab();
  if (currentSelectedStudent && currentSelectedStudent.id === evaluation.studentId) {
    loadEvaluationForStudent();
    renderStudentList();
  }
}

function getCurrentSchoolYearStudents() {
  const students = [];
  appData.classes
    .filter(c => c.schoolYear === appData.currentSchoolYear)
    .forEach(c => {
      (c.students || []).forEach(student => {
        students.push({
          id: student.id,
          name: student.name,
          classId: c.id,
          className: c.name
        });
      });
    });
  return students;
}

function renderStudentManagementList() {
  const container = document.getElementById('student-management-list');
  if (!container) return;
  container.innerHTML = '';

  const students = getCurrentSchoolYearStudents();
  const classes = appData.classes.filter(c => c.schoolYear === appData.currentSchoolYear);

  if (students.length === 0) {
    container.innerHTML = '<p class="text-muted">Nog geen leerlingen aangemaakt in dit schooljaar.</p>';
    return;
  }

  students.forEach(student => {
    const row = document.createElement('div');
    row.className = 'student-management-row';
    row.innerHTML = `
      <div class="field-group">
        <label>Naam</label>
        <input type="text" value="${student.name.replace(/"/g, '&quot;')}" data-student-name>
      </div>
      <div class="field-group">
        <label>Klas</label>
        <select data-student-class>
          ${classes.map(c => `<option value="${c.id}" ${c.id === student.classId ? 'selected' : ''}>${c.name}</option>`).join('')}
          <option value="__new_class__">+ Nieuwe klas aanmaken...</option>
        </select>
      </div>
      <div class="student-management-actions">
        <button type="button" class="btn btn-sm btn-primary" data-save-student>Opslaan</button>
        <button type="button" class="btn btn-sm btn-danger" data-delete-student>Verwijderen</button>
      </div>
    `;

    row.querySelector('[data-save-student]').addEventListener('click', () => {
      const classSelect = row.querySelector('[data-student-class]');
      let targetClassId = classSelect.value;

      if (targetClassId === '__new_class__') {
        const newClassName = prompt('Naam van de nieuwe klas:', 'Nieuwe Klas');
        if (!newClassName || !newClassName.trim()) {
          classSelect.value = student.classId;
          return;
        }

        const trimmedClassName = newClassName.trim();
        const existingClass = classes.find(c => c.name.trim().toLowerCase() === trimmedClassName.toLowerCase());
        if (existingClass) {
          targetClassId = existingClass.id;
        } else {
          const newClass = {
            id: 'k_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            name: trimmedClassName,
            schoolYear: appData.currentSchoolYear,
            students: []
          };
          appData.classes.push(newClass);
          targetClassId = newClass.id;
        }
      }

      updateStudentManagement(student.id, row.querySelector('[data-student-name]').value, targetClassId);
    });

    row.querySelector('[data-delete-student]').addEventListener('click', () => {
      deleteStudent(student.id);
    });

    container.appendChild(row);
  });
}

function updateStudentManagement(studentId, newName, newClassId) {
  const name = newName.trim();
  if (!name) {
    alert('Een leerling moet een naam hebben.');
    return;
  }

  const targetClass = appData.classes.find(c => c.id === newClassId && c.schoolYear === appData.currentSchoolYear);
  if (!targetClass) {
    alert('Selecteer een geldige klas.');
    return;
  }

  let student = null;
  let sourceClass = null;
  appData.classes.forEach(c => {
    const found = (c.students || []).find(s => s.id === studentId);
    if (found) {
      student = found;
      sourceClass = c;
    }
  });

  if (!student || !sourceClass) {
    alert('Leerling niet gevonden.');
    return;
  }

  const duplicate = (targetClass.students || []).some(s => s.id !== studentId && s.name.trim().toLowerCase() === name.toLowerCase());
  if (duplicate) {
    alert(`Er bestaat al een leerling met de naam '${name}' in klas ${targetClass.name}.`);
    return;
  }

  student.name = name;

  if (sourceClass.id !== targetClass.id) {
    sourceClass.students = (sourceClass.students || []).filter(s => s.id !== studentId);
    targetClass.students = targetClass.students || [];
    targetClass.students.push(student);
  }

  saveData();

  currentSelectedClass = appData.classes.find(c => currentSelectedClass && c.id === currentSelectedClass.id) || currentSelectedClass;

  if (editingClass && editingClass.id === sourceClass.id) {
    editingClass = JSON.parse(JSON.stringify(sourceClass));
  }
  if (editingClass && editingClass.id === targetClass.id) {
    editingClass = JSON.parse(JSON.stringify(targetClass));
  }

  if (currentSelectedStudent && currentSelectedStudent.id === studentId) {
    currentSelectedStudent = student;
  }

  renderClassesList();
  renderStudentManagementList();
  populateDetailStudentSelect();
  renderOverviewTab();
  renderStudentList();
  alert(`Leerling '${name}' is bijgewerkt. De evaluaties zijn behouden.`);
}

function deleteStudent(studentId) {
  let student = null;
  let sourceClass = null;
  appData.classes.forEach(c => {
    const found = (c.students || []).find(s => s.id === studentId);
    if (found) {
      student = found;
      sourceClass = c;
    }
  });

  if (!student || !sourceClass) {
    alert('Leerling niet gevonden.');
    return;
  }

  const evaluationCount = appData.evaluations.filter(e => e.studentId === studentId).length;
  const message = evaluationCount > 0
    ? `Weet je zeker dat je leerling '${student.name}' wilt verwijderen? Dit verwijdert ook ${evaluationCount} gekoppelde evaluatie(s).`
    : `Weet je zeker dat je leerling '${student.name}' wilt verwijderen?`;

  if (!confirm(message)) return;

  sourceClass.students = (sourceClass.students || []).filter(s => s.id !== studentId);
  appData.evaluations = appData.evaluations.filter(e => e.studentId !== studentId);
  saveData();

  if (currentSelectedStudent && currentSelectedStudent.id === studentId) {
    currentSelectedStudent = null;
    currentScores = {};
    document.getElementById('eval-student-title').textContent = 'Selecteer een leerling';
    document.getElementById('eval-task-subtitle').textContent = 'Opdracht: -';
    document.getElementById('eval-general-feedback').value = '';
    resetTimer();
  }

  if (editingClass && editingClass.id === sourceClass.id) {
    editingClass = JSON.parse(JSON.stringify(sourceClass));
    document.getElementById('class-name-input').value = editingClass.name;
  }

  renderClassesList();
  renderStudentManagementList();
  populateDetailStudentSelect();
  renderOverviewTab();
  renderStudentList();
  alert(`Leerling '${student.name}' is verwijderd.`);
}

function saveClassChanges() {
  if (!editingClass) return;

  const newClassName = document.getElementById("class-name-input").value.trim();
  if (!newClassName) {
    alert("Geef de klas een naam.");
    return;
  }

  editingClass.name = newClassName;
  const rawNames = document.getElementById("class-students-input").value.split("\n");
  const namesToAdd = rawNames.map(n => n.trim()).filter(n => n.length > 0);

  namesToAdd.forEach(name => {
    const exists = (editingClass.students || []).some(s => s.name.trim().toLowerCase() === name.toLowerCase());
    if (!exists) {
      editingClass.students = editingClass.students || [];
      editingClass.students.push({ id: "s_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), name });
    }
  });

  const index = appData.classes.findIndex(c => c.id === editingClass.id);
  if (index !== -1) {
    appData.classes[index] = editingClass;
    saveData();
    if (currentSelectedClass && currentSelectedClass.id === editingClass.id) {
      currentSelectedClass = appData.classes[index];
    }
    document.getElementById("class-students-input").value = "";
    alert(namesToAdd.length ? "Klaswijzigingen en nieuwe leerlingen opgeslagen!" : "Klaswijzigingen opgeslagen!");
    renderClassesList();
    populateDetailStudentSelect();
    renderStudentManagementList();
    renderOverviewTab();
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
    populateGlobalSchoolYearSelect();
    initClassesScreen();
    alert(`Schooljaar gewijzigd naar ${newYear}.`);
  }
}

function exportOverviewClassPDF() {
  const taskId = document.getElementById("overview-task-select").value;
  if (!taskId) { alert("Selecteer een opdracht."); return; }
  currentSelectedTask = appData.tasks.find(t => t.id === taskId);
  currentSelectedClass = editingClass;
  exportClassPDF();
}

/* ==========================================================================
   SCHERM 4: GEBRUIKERS
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
    li.className = "user-list-item";

    const name = document.createElement("span");
    name.className = "user-name";
    name.textContent = u.username;
    li.appendChild(name);

    if (currentUser && currentUser.id === u.id) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Ingelogd";
      li.appendChild(badge);
    } else {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-sm btn-danger";
      deleteBtn.textContent = "Verwijderen";
      deleteBtn.addEventListener("click", () => deleteUser(u.id));
      li.appendChild(deleteBtn);
    }

    ul.appendChild(li);
  });
}

function deleteUser(userId) {
  const user = appData.users.find(u => u.id === userId);
  if (!user) return;

  if (currentUser && currentUser.id === userId) {
    alert("Je kunt de gebruiker waarmee je momenteel bent ingelogd niet verwijderen. Maak eerst een andere gebruiker aan en log daarmee in.");
    return;
  }

  if (appData.users.length <= 1) {
    alert("Er moet minstens één gebruiker overblijven.");
    return;
  }

  if (!confirm(`Weet je zeker dat je gebruiker '${user.username}' wilt verwijderen?`)) return;

  appData.users = appData.users.filter(u => u.id !== userId);
  saveData();
  renderUsersList();
  alert(`Gebruiker '${user.username}' is verwijderd.`);
}

function createNewUser() {
  const userIn = document.getElementById("new-username").value.trim();
  const passIn = document.getElementById("new-password").value.trim();
  if (!userIn || !passIn) { alert("Vul een gebruikersnaam en wachtwoord in."); return; }

  if (appData.users.some(u => u.username.toLowerCase() === userIn.toLowerCase())) {
    alert("Gebruikersnaam bestaat al.");
    return;
  }

  appData.users.push({ id: "u_" + Date.now(), username: userIn, password: passIn });
  saveData();
  document.getElementById("new-username").value = "";
  document.getElementById("new-password").value = "";
  renderUsersList();
  alert("Nieuwe gebruiker aangemaakt!");
}

function changePassword() {
  const passIn = document.getElementById("change-password-input").value.trim();
  if (!passIn) { alert("Voer een nieuw wachtwoord in."); return; }

  if (currentUser) {
    currentUser.password = passIn;
    const uIndex = appData.users.findIndex(u => u.id === currentUser.id);
    if (uIndex !== -1) {
      appData.users[uIndex].password = passIn;
      saveData();
      document.getElementById("change-password-input").value = "";
      alert("Wachtwoord gewijzigd!");
    }
  }
}
function duplicateCriterion(cIdx) {
  if (!editingTask || !editingTask.criteria) return;
  
  // Maak een diepe kopie van het criterium om objectkoppelingen te vermijden
  const criterionToCopy = editingTask.criteria[cIdx];
  const duplicatedCriterion = JSON.parse(JSON.stringify(criterionToCopy));
  
  // Geef de kopie eventueel een herkenbare toevoeging aan de titel
  duplicatedCriterion.title = `${duplicatedCriterion.title} (kopie)`;
  
  // Voeg het gekopieerde criterium direct achter het origineel in
  editingTask.criteria.splice(cIdx + 1, 0, duplicatedCriterion);
  
  // Herteken de criteria-editor
  renderCriteriaEditor();
}
