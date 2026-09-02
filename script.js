// Datamodel met uitgebreide ondersteuning voor schooljaren, feedbackpresets en herkansingen
const DEFAULT_APP_STATE = {
  password: "leerkracht123",
  currentSchoolYear: "2025-2026",
  tasks: [
    {
      id: "task-demo-1",
      title: "Spreken: Presentatie",
      presetFeedback: ["Duidelijke uitspraak", "Te snel gesproken", "Mooi visueel materiaal", "Let op lichaamshouding"],
      criteria: [
        {
          id: "crit-1",
          title: "Inhoud & Opbouw",
          maxScore: 10,
          levels: [
            { score: 3, text: "Inhoud is onvolledig en mist duidelijke structuur." },
            { score: 7, text: "Inhoud is basaal, de structuur is voldoende logisch." },
            { score: 10, text: "Grondige inhoud met een zeer heldere opbouw." }
          ]
        },
        {
          id: "crit-2",
          title: "Lichaamstaal & Oogcontact",
          maxScore: 5,
          levels: [
            { score: 1, text: "Weinig oogcontact en een gesloten houding." },
            { score: 3, text: "Voldoende oogcontact, rustige houding." },
            { score: 5, text: "Zeer overtuigend en natuurlijk oogcontact." }
          ]
        }
      ]
    }
  ],
  classes: [
    { id: "class-demo-1", year: "2025-2026", name: "4 LA", students: ["Jan Peeters", "Sophie Devos", "Lucas Janssens"] }
  ],
  evaluations: [] // Array van objecten: { taskId, studentName, schoolYear, attempt: 1, scores: {}, feedback: "", speakingTime: 0, date: "" }
};

// State variabelen
let appData = JSON.parse(localStorage.getItem('evalToolData_v2')) || DEFAULT_APP_STATE;
let isLoggedIn = false;

let selectedTaskId = appData.tasks[0]?.id || null;
let selectedClassId = appData.classes.find(c => c.year === appData.currentSchoolYear)?.id || null;
let selectedStudent = null;
let currentAttempt = 1;
let currentScores = {};

let editingTaskId = null;
let editingClassId = null;

// Timer variabelen
let timerInterval = null;
let timerSeconds = 0;
let isTimerRunning = false;

function saveToStorage() {
  localStorage.setItem('evalToolData_v2', JSON.stringify(appData));
}

// INLOGGEN & SESSIE
document.getElementById('btn-login').onclick = handleLogin;
document.getElementById('login-password').onkeyup = (e) => { if (e.key === 'Enter') handleLogin(); };

function handleLogin() {
  const input = document.getElementById('login-password').value;
  if (input === appData.password) {
    isLoggedIn = true;
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('current-year-badge').innerText = `Schooljaar: ${appData.currentSchoolYear}`;
    switchScreen('eval');
  } else {
    document.getElementById('login-error').innerText = 'Ongeldig wachtwoord!';
  }
}

document.getElementById('btn-logout').onclick = () => {
  isLoggedIn = false;
  document.getElementById('login-password').value = '';
  document.getElementById('screen-login').classList.add('active');
};

// NAVIGATIE
const screens = {
  eval: document.getElementById('screen-eval'),
  dashboard: document.getElementById('screen-dashboard'),
  classes: document.getElementById('screen-classes')
};

const navLinks = {
  eval: document.getElementById('nav-eval'),
  dashboard: document.getElementById('nav-dashboard'),
  classes: document.getElementById('nav-classes')
};

function switchScreen(targetScreen) {
  if (!isLoggedIn) return;
  Object.keys(screens).forEach(key => {
    screens[key].classList.toggle('active', key === targetScreen);
    navLinks[key].classList.toggle('active', key === targetScreen);
  });

  if (targetScreen === 'eval') initEvalScreen();
  if (targetScreen === 'dashboard') initDashboardScreen();
  if (targetScreen === 'classes') initClassesScreen();
}

navLinks.eval.onclick = () => switchScreen('eval');
navLinks.dashboard.onclick = () => switchScreen('dashboard');
navLinks.classes.onclick = () => switchScreen('classes');

// TIMER FUNCTIONALITEIT
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  if (display) display.innerText = formatTime(timerSeconds);
}

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  document.getElementById('btn-timer-toggle').innerText = 'Pauze';
  document.getElementById('btn-timer-toggle').classList.replace('btn-primary', 'btn-danger');
  
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  isTimerRunning = false;
  clearInterval(timerInterval);
  const btn = document.getElementById('btn-timer-toggle');
  if (btn) {
    btn.innerText = 'Start';
    btn.classList.replace('btn-danger', 'btn-primary');
  }
}

function resetTimer() {
  stopTimer();
  timerSeconds = 0;
  updateTimerDisplay();
}

document.getElementById('btn-timer-toggle').onclick = () => {
  if (isTimerRunning) stopTimer(); else startTimer();
};
document.getElementById('btn-timer-reset').onclick = resetTimer;

// SCHERM 1: EVALUATIE
function initEvalScreen() {
  const taskSelect = document.getElementById('eval-task-select');
  const classSelect = document.getElementById('eval-class-select');

  taskSelect.innerHTML = appData.tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
  
  const currentYearClasses = appData.classes.filter(c => c.year === appData.currentSchoolYear);
  classSelect.innerHTML = currentYearClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (selectedTaskId && appData.tasks.some(t => t.id === selectedTaskId)) {
    taskSelect.value = selectedTaskId;
  } else if (appData.tasks[0]) {
    selectedTaskId = appData.tasks[0].id;
  }

  if (selectedClassId && currentYearClasses.some(c => c.id === selectedClassId)) {
    classSelect.value = selectedClassId;
  } else if (currentYearClasses[0]) {
    selectedClassId = currentYearClasses[0].id;
  }

  taskSelect.onchange = (e) => { selectedTaskId = e.target.value; renderStudents(); renderRubrics(); renderPresetChips(); };
  classSelect.onchange = (e) => { selectedClassId = e.target.value; renderStudents(); };

  document.getElementById('eval-student-search').oninput = renderStudents;
  document.getElementById('eval-filter-todo').onchange = renderStudents;

  renderStudents();
  renderRubrics();
  renderPresetChips();
}

function renderStudents() {
  const currentClass = appData.classes.find(c => c.id === selectedClassId);
  const list = document.getElementById('eval-student-list');
  list.innerHTML = '';

  if (!currentClass || currentClass.students.length === 0) {
    list.innerHTML = '<li>Geen leerlingen gevonden</li>';
    return;
  }

  const searchQuery = document.getElementById('eval-student-search').value.toLowerCase();
  const filterTodo = document.getElementById('eval-filter-todo').checked;

  let filteredStudents = currentClass.students.filter(s => s.toLowerCase().includes(searchQuery));

  if (filterTodo) {
    filteredStudents = filteredStudents.filter(student => {
      const hasEval = appData.evaluations.some(e => 
        e.taskId === selectedTaskId && 
        e.studentName === student && 
        e.schoolYear === appData.currentSchoolYear
      );
      return !hasEval;
    });
  }

  if (filteredStudents.length === 0) {
    list.innerHTML = '<li>Geen resultaten</li>';
    return;
  }

  if (!filteredStudents.includes(selectedStudent)) {
    selectedStudent = filteredStudents[0];
    currentAttempt = 1;
  }

  filteredStudents.forEach(student => {
    const li = document.createElement('li');
    
    // Check of er al een evaluatie is
    const studentEvals = appData.evaluations.filter(e => 
      e.taskId === selectedTaskId && 
      e.studentName === student && 
      e.schoolYear === appData.currentSchoolYear
    );

    const isDone = studentEvals.length > 0;
    li.innerHTML = `<span>${student}</span> ${isDone ? '<span class="status-done">✓</span>' : ''}`;
    
    if (student === selectedStudent) li.classList.add('active');
    
    li.onclick = () => {
      selectedStudent = student;
      currentAttempt = 1;
      renderStudents();
      loadStudentEvaluation();
    };
    list.appendChild(li);
  });

  loadStudentEvaluation();
}

function renderPresetChips() {
  const task = appData.tasks.find(t => t.id === selectedTaskId);
  const container = document.getElementById('preset-feedback-chips');
  container.innerHTML = '';

  if (!task || !task.presetFeedback || task.presetFeedback.length === 0) {
    container.innerHTML = '<small class="text-muted">Geen snelle opmerkingen ingesteld voor deze opdracht.</small>';
    return;
  }

  task.presetFeedback.forEach(text => {
    const chip = document.createElement('button');
    chip.className = 'chip-btn';
    chip.innerText = `+ ${text}`;
    chip.onclick = () => {
      const area = document.getElementById('eval-general-feedback');
      if (area.value.trim() === '') {
        area.value = text;
      } else {
        area.value += `\n- ${text}`;
      }
    };
    container.appendChild(chip);
  });
}

function renderRubrics() {
  const task = appData.tasks.find(t => t.id === selectedTaskId);
  const container = document.getElementById('eval-rubrics-wrapper');
  container.innerHTML = '';

  if (!task) return;
  document.getElementById('eval-task-subtitle').innerText = `Opdracht: ${task.title}`;

  task.criteria.forEach(crit => {
    const block = document.createElement('div');
    block.className = 'rubric-block';
    
    const max = crit.maxScore || 10;
    block.innerHTML = `
      <div class="rubric-header">
        <h4>${crit.title}</h4>
        <span class="badge">Max: ${max} ptn</span>
      </div>
    `;

    const flex = document.createElement('div');
    flex.className = 'levels-flex';

    crit.levels.forEach(lvl => {
      const btn = document.createElement('button');
      btn.className = `level-button ${currentScores[crit.id] === lvl.score ? 'selected' : ''}`;
      
      // Duidelijke weergave van criteria en punten
      btn.innerHTML = `
        <div class="level-score-tag">${lvl.score} / ${max} ptn</div>
        <div class="level-desc-text">${lvl.text}</div>
      `;

      btn.onclick = () => {
        currentScores[crit.id] = lvl.score;
        renderRubrics();
        calculateTotalScore();
        buildAutomaticFeedback();
      };
      flex.appendChild(btn);
    });

    block.appendChild(flex);
    container.appendChild(block);
  });

  calculateTotalScore();
}

function calculateTotalScore() {
  const task = appData.tasks.find(t => t.id === selectedTaskId);
  if (!task) return;

  let totalEarned = 0;
  let totalMax = 0;

  task.criteria.forEach(crit => {
    const max = Number(crit.maxScore) || 0;
    totalMax += max;

    if (currentScores[crit.id] !== undefined) {
      totalEarned += Number(currentScores[crit.id]);
    }
  });

  document.getElementById('eval-total-score').innerText = `${totalEarned} / ${totalMax}`;
}

function buildAutomaticFeedback() {
  const task = appData.tasks.find(t => t.id === selectedTaskId);
  if (!task) return;

  let feedbackLines = [];
  if (timerSeconds > 0) {
    feedbackLines.push(`- Spreektijd: ${formatTime(timerSeconds)}`);
  }

  task.criteria.forEach(crit => {
    const score = currentScores[crit.id];
    if (score !== undefined) {
      const lvl = crit.levels.find(l => l.score === score);
      if (lvl && lvl.text) feedbackLines.push(`- ${crit.title}: ${lvl.text}`);
    }
  });

  document.getElementById('eval-general-feedback').value = feedbackLines.join('\n');
}

function loadStudentEvaluation() {
  resetTimer();
  document.getElementById('eval-student-title').innerText = selectedStudent ? `${selectedStudent} (Poging ${currentAttempt})` : 'Selecteer een leerling';
  
  // Ophalen van bestaande evaluatie
  const existing = appData.evaluations.find(e => 
    e.taskId === selectedTaskId && 
    e.studentName === selectedStudent && 
    e.schoolYear === appData.currentSchoolYear &&
    e.attempt === currentAttempt
  );

  if (existing) {
    currentScores = existing.scores || {};
    document.getElementById('eval-general-feedback').value = existing.feedback || '';
    if (existing.speakingTime) {
      timerSeconds = existing.speakingTime;
      updateTimerDisplay();
    }
  } else {
    currentScores = {};
    document.getElementById('eval-general-feedback').value = '';
  }

  // Herkansing knop tonen indien van toepassing
  const retryBtn = document.getElementById('btn-retry-eval');
  const allAttempts = appData.evaluations.filter(e => e.taskId === selectedTaskId && e.studentName === selectedStudent && e.schoolYear === appData.currentSchoolYear);
  if (allAttempts.length > 0 && selectedStudent) {
    retryBtn.style.display = 'inline-block';
    retryBtn.onclick = () => {
      currentAttempt = allAttempts.length + 1;
      loadStudentEvaluation();
    };
  } else {
    retryBtn.style.display = 'none';
  }

  renderStudentHistory();
  renderRubrics();
}

function renderStudentHistory() {
  const historyCard = document.getElementById('student-history-card');
  const historyContent = document.getElementById('history-content');
  
  if (!selectedStudent) {
    historyCard.style.display = 'none';
    return;
  }

  // Alle voorgaande evaluaties ophalen van deze leerling
  const previousEvals = appData.evaluations.filter(e => e.studentName === selectedStudent);

  if (previousEvals.length === 0) {
    historyCard.style.display = 'none';
    return;
  }

  historyCard.style.display = 'block';
  historyContent.innerHTML = previousEvals.map(e => {
    const task = appData.tasks.find(t => t.id === e.taskId);
    const taskTitle = task ? task.title : "Onbekende Opdracht";
    let scoreSum = 0;
    Object.values(e.scores).forEach(s => scoreSum += Number(s));

    return `
      <div class="history-item">
        <strong>${e.schoolYear} | ${taskTitle} (Poging ${e.attempt || 1}):</strong> ${scoreSum} ptn 
        <small>(${e.date || 'Datum onbekend'})</small>
        <div><em>"${e.feedback || 'Geen opmerkingen'}"</em></div>
      </div>
    `;
  }).join('');
}

// OPSLAAN EVALUATIE
document.getElementById('btn-save-evaluation').onclick = () => {
  if (!selectedStudent || !selectedTaskId) return;
  stopTimer();

  const evalIndex = appData.evaluations.findIndex(e => 
    e.taskId === selectedTaskId && 
    e.studentName === selectedStudent && 
    e.schoolYear === appData.currentSchoolYear &&
    e.attempt === currentAttempt
  );

  const evalData = {
    taskId: selectedTaskId,
    studentName: selectedStudent,
    schoolYear: appData.currentSchoolYear,
    attempt: currentAttempt,
    scores: currentScores,
    feedback: document.getElementById('eval-general-feedback').value,
    speakingTime: timerSeconds,
    date: new Date().toLocaleDateString('nl-BE')
  };

  if (evalIndex >= 0) {
    appData.evaluations[evalIndex] = evalData;
  } else {
    appData.evaluations.push(evalData);
  }

  saveToStorage();
  renderStudents();
  alert('Evaluatie succesvol opgeslagen!');
};

// EXPORT PDF PER LEERLING
document.getElementById('btn-export-pdf').onclick = () => {
  if (!selectedStudent) return;
  const el = document.getElementById('screen-eval');
  html2pdf().from(el).save(`Evaluatie_${selectedStudent}_Poging${currentAttempt}.pdf`);
};

// BULK PDF EXPORT PER KLAS
document.getElementById('btn-export-class-pdf').onclick = () => {
  const currentClass = appData.classes.find(c => c.id === selectedClassId);
  const task = appData.tasks.find(t => t.id === selectedTaskId);
  if (!currentClass || !task) return;

  const container = document.createElement('div');
  container.style.padding = '20px';

  container.innerHTML = `<h1>Evaluatierapport Klas: ${currentClass.name}</h1><h3>Opdracht: ${task.title} (${appData.currentSchoolYear})</h3><hr><br>`;

  currentClass.students.forEach(student => {
    const studentEvals = appData.evaluations.filter(e => 
      e.taskId === selectedTaskId && 
      e.studentName === student && 
      e.schoolYear === appData.currentSchoolYear
    );

    container.innerHTML += `<h2>Leerling: ${student}</h2>`;
    if (studentEvals.length === 0) {
      container.innerHTML += `<p><em>Nog geen evaluatie uitgevoerd.</em></p>`;
    } else {
      studentEvals.forEach(e => {
        let scoreSum = 0;
        Object.values(e.scores).forEach(s => scoreSum += Number(s));
        container.innerHTML += `
          <div style="border:1px solid #ccc; padding:10px; margin-bottom:15px; border-radius:5px;">
            <p><strong>Poging ${e.attempt}</strong> (${e.date}) - <strong>Score: ${scoreSum} ptn</strong></p>
            <p><strong>Spreektijd:</strong> ${formatTime(e.speakingTime || 0)}</p>
            <p><strong>Feedback:</strong><br>${(e.feedback || '').replace(/\n/g, '<br>')}</p>
          </div>
        `;
      });
    }
    container.innerHTML += `<hr style="margin:20px 0;">`;
  });

  html2pdf().from(container).save(`Klasrapport_${currentClass.name}_${task.title}.pdf`);
};

// SCHERM 2: DASHBOARD (OPDRACHTEN BEHEREN)
function initDashboardScreen() {
  renderDashboardTaskList();
  if (appData.tasks.length > 0) {
    selectTaskForEditing(appData.tasks[0].id);
  }
}

function renderDashboardTaskList() {
  const list = document.getElementById('dashboard-task-list');
  list.innerHTML = appData.tasks.map(t => 
    `<li class="${editingTaskId === t.id ? 'active' : ''}" onclick="selectTaskForEditing('${t.id}')">${t.title}</li>`
  ).join('');
}

function selectTaskForEditing(taskId) {
  editingTaskId = taskId;
  renderDashboardTaskList();
  const task = appData.tasks.find(t => t.id === taskId);
  if (!task) return;

  document.getElementById('task-name-input').value = task.title;
  document.getElementById('task-presets-input').value = (task.presetFeedback || []).join(', ');
  renderCriteriaEditor(task);
}

function renderCriteriaEditor(task) {
  const container = document.getElementById('editor-criteria-container');
  container.innerHTML = '';

  task.criteria.forEach((crit, cIdx) => {
    const box = document.createElement('div');
    box.className = 'criterion-editor-box';
    box.innerHTML = `
      <div class="criterion-header-inputs">
        <div class="field-group">
          <label>Criterium Titel:</label>
          <input type="text" value="${crit.title}" onchange="appData.tasks.find(t => t.id === '${task.id}').criteria[${cIdx}].title = this.value">
        </div>
        <div class="field-group">
          <label>Max. Punten:</label>
          <input type="number" min="1" value="${crit.maxScore || 10}" onchange="appData.tasks.find(t => t.id === '${task.id}').criteria[${cIdx}].maxScore = parseInt(this.value)">
        </div>
      </div>
      <label class="field-group label">Niveaus (Punten & Feedback):</label>
    `;

    crit.levels.forEach((lvl, lIdx) => {
      const row = document.createElement('div');
      row.className = 'level-editor-row';
      row.innerHTML = `
        <input type="number" value="${lvl.score}" placeholder="Punten" onchange="appData.tasks.find(t => t.id === '${task.id}').criteria[${cIdx}].levels[${lIdx}].score = parseInt(this.value)">
        <input type="text" value="${lvl.text}" placeholder="Feedbacktekst" onchange="appData.tasks.find(t => t.id === '${task.id}').criteria[${cIdx}].levels[${lIdx}].text = this.value">
        <button class="btn btn-sm btn-danger" onclick="deleteLevel('${task.id}', ${cIdx}, ${lIdx})">X</button>
      `;
      box.appendChild(row);
    });

    const addLvlBtn = document.createElement('button');
    addLvlBtn.className = 'btn btn-sm btn-secondary mt-3';
    addLvlBtn.innerText = '+ Niveau Toevoegen';
    addLvlBtn.onclick = () => {
      task.criteria[cIdx].levels.push({ score: 0, text: '' });
      renderCriteriaEditor(task);
    };
    box.appendChild(addLvlBtn);
    container.appendChild(box);
  });
}

function deleteLevel(taskId, cIdx, lIdx) {
  const task = appData.tasks.find(t => t.id === taskId);
  task.criteria[cIdx].levels.splice(lIdx, 1);
  renderCriteriaEditor(task);
}

document.getElementById('btn-add-criterion').onclick = () => {
  const task = appData.tasks.find(t => t.id === editingTaskId);
  if (!task) return;
  task.criteria.push({ id: `crit-${Date.now()}`, title: "Nieuw Criterium", maxScore: 10, levels: [{ score: 0, text: "" }] });
  renderCriteriaEditor(task);
};

document.getElementById('btn-add-task').onclick = () => {
  const newTask = { id: `task-${Date.now()}`, title: "Nieuwe Opdracht", presetFeedback: [], criteria: [] };
  appData.tasks.push(newTask);
  selectTaskForEditing(newTask.id);
};

document.getElementById('btn-save-task-changes').onclick = () => {
  const task = appData.tasks.find(t => t.id === editingTaskId);
  if (task) {
    task.title = document.getElementById('task-name-input').value;
    const presetsRaw = document.getElementById('task-presets-input').value;
    task.presetFeedback = presetsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);
    saveToStorage();
    renderDashboardTaskList();
    alert('Opdracht succesvol opgeslagen!');
  }
};

document.getElementById('btn-delete-task').onclick = () => {
  if (confirm('Wil je deze opdracht echt verwijderen?')) {
    appData.tasks = appData.tasks.filter(t => t.id !== editingTaskId);
    saveToStorage();
    initDashboardScreen();
  }
};

// SCHERM 3: KLASSENBEHEER & SCHOOLJAAR
function initClassesScreen() {
  renderClassesList();
  const currentClasses = appData.classes.filter(c => c.year === appData.currentSchoolYear);
  if (currentClasses.length > 0) {
    selectClassForEditing(currentClasses[0].id);
  }
}

function renderClassesList() {
  const list = document.getElementById('classes-class-list');
  const currentClasses = appData.classes.filter(c => c.year === appData.currentSchoolYear);
  
  list.innerHTML = currentClasses.map(c => 
    `<li class="${editingClassId === c.id ? 'active' : ''}" onclick="selectClassForEditing('${c.id}')">${c.name}</li>`
  ).join('');
}

function selectClassForEditing(classId) {
  editingClassId = classId;
  renderClassesList();
  const cls = appData.classes.find(c => c.id === classId);
  if (!cls) return;

  document.getElementById('class-name-input').value = cls.name;
  document.getElementById('class-students-input').value = cls.students.join('\n');
}

document.getElementById('btn-add-class').onclick = () => {
  const newClass = { id: `class-${Date.now()}`, year: appData.currentSchoolYear, name: "Nieuwe Klas", students: [] };
  appData.classes.push(newClass);
  selectClassForEditing(newClass.id);
};

document.getElementById('btn-save-class-changes').onclick = () => {
  const cls = appData.classes.find(c => c.id === editingClassId);
  if (cls) {
    cls.name = document.getElementById('class-name-input').value;
    cls.students = document.getElementById('class-students-input').value.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    saveToStorage();
    renderClassesList();
    alert('Klas opgeslagen!');
  }
};

document.getElementById('btn-delete-class').onclick = () => {
  if (confirm('Wil je deze klas echt verwijderen?')) {
    appData.classes = appData.classes.filter(c => c.id !== editingClassId);
    saveToStorage();
    initClassesScreen();
  }
};

// NIEUW SCHOOLJAAR STARTEN
document.getElementById('btn-new-schoolyear').onclick = () => {
  const nextYear = prompt("Voer het nieuwe schooljaar in:", "2026-2027");
  if (nextYear && nextYear !== appData.currentSchoolYear) {
    appData.currentSchoolYear = nextYear;
    saveToStorage();
    document.getElementById('current-year-badge').innerText = `Schooljaar: ${appData.currentSchoolYear}`;
    alert(`Overgestapt naar schooljaar ${nextYear}. Je kunt nu nieuwe klassen toevoegen. De evaluatiehistoriek van je leerlingen blijft bewaard!`);
    initClassesScreen();
  }
};
