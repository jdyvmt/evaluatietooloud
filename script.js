const STORAGE_KEY = "evaluatietool_app_data_v2";

let appData = {
  currentSchoolYear: "2025-2026",
  tasks: [],
  classes: [],
  evaluations: []
};

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
    tasks: [
      {
        id: "t1",
        title: "Spreken: Presentatie",
        presets: ["Duidelijke uitspraak", "Mooi oogcontact", "Let op spreektempo", "Lichaamstaal kan actiever"],
        criteria: [
          {
            id: "c1",
            title: "Inhoud & Opbouw",
            weight: 1,
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

document.addEventListener("DOMContentLoaded", async () => {
  loadData();
  setupEventListeners();
  populateGlobalSchoolYearSelect();
  initEvalScreen();
  
  // Synchroniseer met de cloud
  const cloudData = await laadEvaluatiesUitCloud();
  if (cloudData && Array.isArray(cloudData)) {
    console.log(`${cloudData.length} evaluaties gesynchroniseerd uit de cloud.`);
  }
});

function populateGlobalSchoolYearSelect() {
  const select = document.getElementById("global-schoolyear-select");
  if (!select) return;
  select.innerHTML = "";

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

function setupEventListeners() {
  document.getElementById("nav-eval").addEventListener("click", () => switchScreen("screen-eval"));
  document.getElementById("nav-dashboard").addEventListener("click", () => switchScreen("screen-dashboard"));
  document.getElementById("nav-classes").addEventListener("click", () => switchScreen("screen-classes"));

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
  }
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
    header.innerHTML = `<h4>${criterion.title}</h4>`;
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

async function saveCurrentEvaluation() {
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

  // 1. Lokaal opslaan
  appData.evaluations.push(evaluationData);
  saveData();

  // 2. Opslaan in Google Sheets (Cloud)
  const cloudPayload = {
    id: evaluationData.id,
    datum: evaluationData.date,
    leerling: currentSelectedStudent.name,
    klas: currentSelectedClass ? currentSelectedClass.name : "-",
    opdracht: currentSelectedTask.title,
    score: `${currentTotal} / ${maxTotal}`,
    details: {
      spreektijd: formattedTimer,
      feedback: evaluationData.feedback,
      scores: currentScores
    }
  };

  await slaEvaluatieOpInCloud(cloudPayload);

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

/* ==========================================================================
   PDF EXPORT FUNCTIONALITEIT
   ========================================================================== */

function verzamelPdfData(student, task, evaluation) {
  let parameters = [];
  let currentTotal = 0;
  let maxTotal = 0;

  task.criteria.forEach(c => {
    const w = c.weight || 1;
    const maxLevelScore = Math.max(...c.levels.map(l => Number(l.score) || 0), 0);
    maxTotal += maxLevelScore * w;
    const scoresObj = evaluation ? (evaluation.scores || {}) : currentScores;
    const sel = scoresObj[c.id];
    const level = sel ? c.levels[sel.levelIndex] : null;
    if (sel) currentTotal += (Number(sel.score) || 0) * w;
    parameters.push({
      naam: c.title,
      score: level ? `${level.score} / ${maxLevelScore}` : `0 / ${maxLevelScore}`,
      criterium: level ? (level.desc || level.label) : 'Niet beoordeeld'
    });
  });

  const durationStr = evaluation ? evaluation.timer || '00:00' : `${Math.floor(timerSeconds/60).toString().padStart(2,"0")}:${(timerSeconds%60).toString().padStart(2,"0")}`;

  return {
    titel: task.title,
    leerling: student.name,
    klas: appData.classes.find(c => (c.students||[]).some(s => s.id === student.id))?.name || '-',
    schooljaar: evaluation ? evaluation.schoolYear : appData.currentSchoolYear,
    datum: evaluation ? evaluation.date : new Date().toLocaleDateString("nl-BE"),
    duur: durationStr,
    parameters: parameters,
    feedback: evaluation ? evaluation.feedback || 'Geen.' : document.getElementById("eval-general-feedback").value.trim() || 'Geen.',
    eindscore: `${currentTotal} / ${maxTotal}`
  };
}

function bouwPdfHtml(data) {
  let rijen = '';
  data.parameters.forEach(p => {
    rijen += `<tr>
      <td class="col-naam">${p.naam}</td>
      <td class="col-score">${p.score}</td>
      <td class="col-desc">${p.criterium}</td>
    </tr>`;
  });

  return `
    <style>
      .pdf-page-sheet {
        width: 100%;
        padding: 10mm 15mm;
        box-sizing: border-box;
        font-family: system-ui, -apple-system, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      .pdf-titel {
        font-size: 20pt;
        font-weight: 800;
        color: #2563eb;
        margin: 0 0 4px 0;
        line-height: 1.2;
      }
      .pdf-subtitel {
        font-size: 13pt;
        font-weight: 600;
        color: #334155;
        margin: 0 0 12px 0;
      }
      .pdf-meta-bar {
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: 9pt;
        color: #475569;
        border-bottom: 2px solid #cbd5e1;
        padding-bottom: 6px;
        margin-bottom: 14px;
      }
      .pdf-sectie-titel {
        font-size: 11pt;
        font-weight: 700;
        color: #1e293b;
        margin: 12px 0 6px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .pdf-tabel {
        width: 100%;
        border-collapse: collapse;
        margin-top: 4px;
        font-size: 9.5pt;
      }
      .pdf-tabel th {
        background-color: #f1f5f9;
        color: #1e293b;
        font-weight: 700;
        padding: 6px 8px;
        border: 1px solid #cbd5e1;
        text-align: left;
      }
      .pdf-tabel td {
        padding: 6px 8px;
        border: 1px solid #cbd5e1;
        vertical-align: top;
      }
      .col-naam { width: 30%; font-weight: 600; }
      .col-score { width: 12%; text-align: center; }
      .col-desc { width: 58%; }
      
      .pdf-feedback-box {
        margin-top: 14px;
        padding: 10px;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        font-size: 9.5pt;
      }
      .pdf-eindscore {
        margin-top: 14px;
        font-size: 13pt;
        font-weight: 800;
        text-align: right;
        color: #1e3a8a;
      }
    </style>

    <div class="pdf-page-sheet">
      <div class="pdf-titel">${data.titel}</div>
      <div class="pdf-subtitel">${data.leerling} &mdash; Klas ${data.klas}</div>
      
      <div class="pdf-meta-bar">
        <span><strong>Datum:</strong> ${data.datum}</span>
        <span><strong>Leerkracht:</strong> J. Vermote</span>
        <span><strong>Schooljaar:</strong> ${data.schooljaar}</span>
      </div>

      <div class="pdf-sectie-titel">Beoordeling</div>
      
      <table class="pdf-tabel">
        <thead>
          <tr>
            <th style="width:30%;">Criterium</th>
            <th style="width:12%; text-align:center;">Score</th>
            <th style="width:58%;">Beschrijving</th>
          </tr>
        </thead>
        <tbody>
          ${rijen}
        </tbody>
      </table>

      <div class="pdf-feedback-box">
        <strong style="color:#0f172a;">Feedback:</strong><br>
        <span style="white-space:pre-wrap; color:#334155;">${data.feedback}</span>
      </div>

      <div class="pdf-eindscore">
        Eindscore: ${data.eindscore}
      </div>
    </div>
  `;
}

async function exportStudentPDF() {
  if (!currentSelectedStudent || !currentSelectedTask) {
    alert("Selecteer een leerling en opdracht.");
    return;
  }

  const evalData = appData.evaluations.find(
    e => e.studentId === currentSelectedStudent.id && 
         e.taskId === currentSelectedTask.id && 
         e.schoolYear === appData.currentSchoolYear
  );

  const data = verzamelPdfData(currentSelectedStudent, currentSelectedTask, evalData);
  const container = document.getElementById("pdf-export-container");

  container.innerHTML = bouwPdfHtml(data);
  window.scrollTo(0, 0);

 const opt = {
  margin: 0,
  filename: `Evaluatie_${currentSelectedStudent.name}_${currentSelectedTask.title}.pdf`,
  html2canvas: { scale: 2, useCORS: true, scrollX: 0, scrollY: 0, windowWidth: 800 },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
};
  
  try {
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error("PDF Export Fout:", err);
    alert("Er is een fout opgetreden bij het genereren van de PDF.");
  } finally {
    container.innerHTML = "";
  }
}
async function exportClassPDF() {
  if (!currentSelectedClass || !currentSelectedTask) {
    alert("Selecteer een klas en een opdracht.");
    return;
  }

  const container = document.getElementById("pdf-export-container");
  container.innerHTML = "";

  const students = currentSelectedClass.students || [];
  if (students.length === 0) {
    alert("Deze klas heeft geen leerlingen.");
    return;
  }

  students.forEach((student, index) => {
    const evalData = appData.evaluations.find(
      e => e.studentId === student.id && 
           e.taskId === currentSelectedTask.id && 
           e.schoolYear === appData.currentSchoolYear
    );
    const data = verzamelPdfData(student, currentSelectedTask, evalData);

    const wrapper = document.createElement("div");
    if (index > 0) {
      wrapper.className = "html2pdf__page-break";
    }
    wrapper.innerHTML = bouwPdfHtml(data);
    container.appendChild(wrapper);
  });

  window.scrollTo(0, 0);

  const opt = {
    margin: 10,
    filename: `Klas_${currentSelectedClass.name}_${currentSelectedTask.title}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 1024 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  try {
    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error("PDF Export Fout:", err);
  } finally {
    container.innerHTML = "";
  }
}

/* ==========================================================================
   DASHBOARD / OPDRACHTEN BEHEER
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
  const container = document.getElementById("criteria-editor-container");
  container.innerHTML = "";

  if (!editingTask || !editingTask.criteria) return;

  editingTask.criteria.forEach((criterion, cIdx) => {
    const card = document.createElement("div");
    card.className = "card-section mt-2";

    let levelsHtml = '';
    criterion.levels.forEach((lvl, lIdx) => {
      levelsHtml += `
        <div class="level-edit-row" style="display:flex;gap:0.5rem;align-items:center;margin-bottom:0.5rem;">
          <input type="text" value="${lvl.label}" placeholder="Label" style="width:120px;" onchange="updateLevelProp(${cIdx}, ${lIdx}, 'label', this.value)">
          <input type="number" value="${lvl.score}" placeholder="Pt" style="width:70px;" onchange="updateLevelProp(${cIdx}, ${lIdx}, 'score', Number(this.value))">
          <input type="text" value="${lvl.desc}" placeholder="Omschrijving" style="flex:1;" onchange="updateLevelProp(${cIdx}, ${lIdx}, 'desc', this.value)">
          <button type="button" class="btn btn-sm btn-danger" onclick="removeLevel(${cIdx}, ${lIdx})">X</button>
        </div>
      `;
    });

    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
        <input type="text" value="${criterion.title}" style="font-weight:bold;font-size:1.05rem;width:60%;" onchange="updateCriterionTitle(${cIdx}, this.value)">
        <div>
          <button type="button" class="btn btn-sm btn-secondary" onclick="addLevelToCriterion(${cIdx})">+ Niveau</button>
          <button type="button" class="btn btn-sm btn-danger" onclick="removeCriterion(${cIdx})">Verwijderen</button>
        </div>
      </div>
      <div class="levels-edit-wrapper">${levelsHtml}</div>
    `;

    container.appendChild(card);
  });
}

function updateCriterionTitle(cIdx, val) {
  if (editingTask && editingTask.criteria[cIdx]) {
    editingTask.criteria[cIdx].title = val;
  }
}

function updateLevelProp(cIdx, lIdx, prop, val) {
  if (editingTask && editingTask.criteria[cIdx] && editingTask.criteria[cIdx].levels[lIdx]) {
    editingTask.criteria[cIdx].levels[lIdx][prop] = val;
  }
}

function addLevelToCriterion(cIdx) {
  if (editingTask && editingTask.criteria[cIdx]) {
    editingTask.criteria[cIdx].levels.push({ label: "Nieuw", score: 0, desc: "" });
    renderCriteriaEditor();
  }
}

function removeLevel(cIdx, lIdx) {
  if (editingTask && editingTask.criteria[cIdx]) {
    editingTask.criteria[cIdx].levels.splice(lIdx, 1);
    renderCriteriaEditor();
  }
}

function removeCriterion(cIdx) {
  if (editingTask) {
    editingTask.criteria.splice(cIdx, 1);
    renderCriteriaEditor();
  }
}

function addCriterionToEditor() {
  if (!editingTask) return;
  editingTask.criteria.push({
    id: "c_" + Date.now(),
    title: "Nieuw Criterium",
    weight: 1,
    levels: [
      { label: "Onvoldoende", score: 2, desc: "" },
      { label: "Voldoende", score: 6, desc: "" },
      { label: "Goed", score: 8, desc: "" }
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
  populateTaskSelect("eval-task-select");
}

function copyCurrentTask() {
  if (!editingTask) return;
  const copied = JSON.parse(JSON.stringify(editingTask));
  copied.id = "t_" + Date.now();
  copied.title = copied.title + " (Kopie)";
  appData.tasks.push(copied);
  saveData();
  loadTaskInEditor(copied);
  populateTaskSelect("eval-task-select");
}

function saveTaskChanges() {
  if (!editingTask) return;
  editingTask.title = document.getElementById("task-name-input").value.trim();
  const presetsRaw = document.getElementById("task-presets-input").value;
  editingTask.presets = presetsRaw.split(",").map(s => s.trim()).filter(s => s.length > 0);

  const idx = appData.tasks.findIndex(t => t.id === editingTask.id);
  if (idx !== -1) {
    appData.tasks[idx] = editingTask;
  } else {
    appData.tasks.push(editingTask);
  }

  saveData();
  alert("Opdracht opgeslagen!");
  renderTaskList();
  populateTaskSelect("eval-task-select");
}

function deleteTask() {
  if (!editingTask) return;
  if (confirm(`Weet je zeker dat je '${editingTask.title}' wilt verwijderen?`)) {
    appData.tasks = appData.tasks.filter(t => t.id !== editingTask.id);
    saveData();
    editingTask = null;
    initDashboardScreen();
    populateTaskSelect("eval-task-select");
  }
}

/* ==========================================================================
   KLASSEN BEHEREN
   ========================================================================== */

let editingClass = null;

function initClassesScreen() {
  renderClassesList();
  if (appData.classes.length > 0 && !editingClass) {
    loadClassInEditor(appData.classes[0]);
  }
}

function renderClassesList() {
  const ul = document.getElementById("classes-list");
  ul.innerHTML = "";
  const currentClasses = appData.classes.filter(c => c.schoolYear === appData.currentSchoolYear);

  currentClasses.forEach(cls => {
    const li = document.createElement("li");
    if (editingClass && editingClass.id === cls.id) li.classList.add("active");
    li.textContent = cls.name;
    li.addEventListener("click", () => loadClassInEditor(cls));
    ul.appendChild(li);
  });
}

function loadClassInEditor(cls) {
  editingClass = JSON.parse(JSON.stringify(cls));
  renderClassesList();
  document.getElementById("class-name-input").value = editingClass.name;
  document.getElementById("class-year-input").value = editingClass.schoolYear || appData.currentSchoolYear;

  const names = (editingClass.students || []).map(s => s.name).join("\n");
  document.getElementById("class-students-textarea").value = names;

  populateStudentDetailSelect();
}

function createNewClass() {
  const newCls = {
    id: "k_" + Date.now(),
    name: "Nieuwe Klas",
    schoolYear: appData.currentSchoolYear,
    students: []
  };
  appData.classes.push(newCls);
  saveData();
  loadClassInEditor(newCls);
  populateClassSelect("eval-class-select");
}

function saveClassChanges() {
  if (!editingClass) return;

  editingClass.name = document.getElementById("class-name-input").value.trim();
  editingClass.schoolYear = document.getElementById("class-year-input").value.trim();

  const lines = document.getElementById("class-students-textarea").value.split("\n");
  const newStudentsList = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      const existing = (editingClass.students || []).find(s => s.name.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        newStudentsList.push(existing);
      } else {
        newStudentsList.push({
          id: "s_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
          name: trimmed
        });
      }
    }
  });

  editingClass.students = newStudentsList;

  const idx = appData.classes.findIndex(c => c.id === editingClass.id);
  if (idx !== -1) {
    appData.classes[idx] = editingClass;
  } else {
    appData.classes.push(editingClass);
  }

  saveData();
  alert("Klas opgeslagen!");
  renderClassesList();
  populateClassSelect("eval-class-select");
}

function deleteClass() {
  if (!editingClass) return;
  if (confirm(`Weet je zeker dat je klas '${editingClass.name}' wilt verwijderen?`)) {
    appData.classes = appData.classes.filter(c => c.id !== editingClass.id);
    saveData();
    editingClass = null;
    initClassesScreen();
    populateClassSelect("eval-class-select");
  }
}

function startNewSchoolYear() {
  const nextYear = prompt("Voer het nieuwe schooljaar in (bijv. 2026-2027):");
  if (nextYear && nextYear.trim() !== "") {
    appData.currentSchoolYear = nextYear.trim();
    saveData();
    populateGlobalSchoolYearSelect();
    initClassesScreen();
    alert(`Schooljaar gewijzigd naar ${appData.currentSchoolYear}`);
  }
}

function switchClassSubTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

  if (tabName === "edit") {
    document.getElementById("tab-btn-class-edit").classList.add("active");
    document.getElementById("tab-content-class-edit").classList.add("active");
  } else if (tabName === "overview") {
    document.getElementById("tab-btn-class-overview").classList.add("active");
    document.getElementById("tab-content-class-overview").classList.add("active");
    renderClassOverviewTable();
  } else if (tabName === "detail") {
    document.getElementById("tab-btn-student-detail").classList.add("active");
    document.getElementById("tab-content-student-detail").classList.add("active");
    populateStudentDetailSelect();
    renderStudentDetailContent();
  }
}

function renderClassOverviewTable() {
  const wrapper = document.getElementById("class-overview-table-wrapper");
  if (!editingClass) {
    wrapper.innerHTML = "<p class='text-muted'>Selecteer eerst een klas.</p>";
    return;
  }

  const students = editingClass.students || [];
  const tasks = appData.tasks;

  if (students.length === 0) {
    wrapper.innerHTML = "<p class='text-muted'>Geen leerlingen in deze klas.</p>";
    return;
  }

  let tableHtml = `<table class="overview-table" style="width:100%;border-collapse:collapse;margin-top:1rem;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:10px;border:1px solid #cbd5e1;text-align:left;">Leerling</th>`;

  tasks.forEach(t => {
    tableHtml += `<th style="padding:10px;border:1px solid #cbd5e1;text-align:center;">${t.title}</th>`;
  });

  tableHtml += `</tr></thead><tbody>`;

  students.forEach(s => {
    tableHtml += `<tr><td style="padding:10px;border:1px solid #cbd5e1;font-weight:600;">${s.name}</td>`;
    tasks.forEach(t => {
      const ev = appData.evaluations.find(e => e.studentId === s.id && e.taskId === t.id && e.schoolYear === appData.currentSchoolYear);
      if (ev) {
        tableHtml += `<td style="padding:10px;border:1px solid #cbd5e1;text-align:center;color:#16a34a;font-weight:bold;">${ev.totalScore} / ${ev.maxScore}</td>`;
      } else {
        tableHtml += `<td style="padding:10px;border:1px solid #cbd5e1;text-align:center;color:#94a3b8;">-</td>`;
      }
    });
    tableHtml += `</tr>`;
  });

  tableHtml += `</tbody></table>`;
  wrapper.innerHTML = tableHtml;
}

function exportOverviewClassPDF() {
  if (!editingClass) { alert("Selecteer een klas."); return; }
  const wrapper = document.getElementById("class-overview-table-wrapper");
  const opt = {
    margin: 10,
    filename: `Overzicht_${editingClass.name}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };
  html2pdf().set(opt).from(wrapper).save();
}

function populateStudentDetailSelect() {
  const select = document.getElementById("detail-student-select");
  if (!select) return;
  select.innerHTML = "";

  if (!editingClass || !editingClass.students) return;

  editingClass.students.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

function renderStudentDetailContent() {
  const select = document.getElementById("detail-student-select");
  const container = document.getElementById("student-detail-content");
  container.innerHTML = "";

  if (!select || !select.value) {
    container.innerHTML = "<p class='text-muted'>Selecteer een leerling.</p>";
    return;
  }

  const studentId = select.value;
  const evals = appData.evaluations.filter(e => e.studentId === studentId && e.schoolYear === appData.currentSchoolYear);

  if (evals.length === 0) {
    container.innerHTML = "<p class='text-muted'>Nog geen evaluaties gevonden voor deze leerling in dit schooljaar.</p>";
    return;
  }

  evals.forEach(ev => {
    const task = appData.tasks.find(t => t.id === ev.taskId);
    const card = document.createElement("div");
    card.className = "card-section mt-2";
    card.innerHTML = `
      <h3>${task ? task.title : 'Opdracht'} (${ev.date})</h3>
      <p style="margin:0.5rem 0;">Score: <strong>${ev.totalScore} / ${ev.maxScore}</strong> | Spreektijd: ${ev.timer || '00:00'}</p>
      <p style="font-size:0.9rem;color:#475569;">Feedback: ${ev.feedback || 'Geen.'}</p>
    `;
    container.appendChild(card);
  });
}

async function slaEvaluatieOpInCloud(payload) {
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyep7bhs2F1VzWfoOUZgpE1QRi_d841ou0BXrMSC4fDWK1mOiEmzD-HPCJTiBOK2sS_/exec";

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Nodig voor Google Apps Script Web Apps
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    console.log("Verzonden naar Google Sheets");
  } catch (error) {
    console.error("Fout bij opslaan in cloud:", error);
  }
}

// 2. Evaluaties ophalen uit Google Sheets
async function laadEvaluatiesUitCloud() {
  try {
    const response = await fetch(SCRIPT_URL);
    const data = await response.json();
    
    console.log("Opgehaalde evaluaties uit de cloud:", data);
    
    // 'data' bevat nu al je rijen uit Google Sheets!
    // Hier kun je je UI/historiek-lijst bijwerken met de opgehaalde gegevens.
    return data;
  } catch (err) {
    console.error("Fout bij ophalen uit de cloud:", err);
  }
}
