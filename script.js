// Datamodel met maxScore per criterium
const DEFAULT_APP_STATE = {
  tasks: [
    {
      id: "task-demo-1",
      title: "Spreken: Presentatie",
      criteria: [
        {
          id: "crit-1",
          title: "Inhoud & Opbouw",
          maxScore: 10,
          levels: [
            { score: 3, text: "Inhoud is onvolledig en mist structuur." },
            { score: 7, text: "Inhoud is basaal, de structuur is voldoende." },
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
    { id: "class-demo-1", name: "4 LA", students: ["Jan Peeters", "Sophie Devos", "Lucas Janssens"] }
  ],
  evaluations: {}
};

// State variabelen
let appData = JSON.parse(localStorage.getItem('evalToolData')) || DEFAULT_APP_STATE;
let selectedTaskId = appData.tasks[0]?.id || null;
let selectedClassId = appData.classes[0]?.id || null;
let selectedStudent = appData.classes[0]?.students[0] || null;
let currentScores = {};

let editingTaskId = null;
let editingClassId = null;

function saveToStorage() {
  localStorage.setItem('evalToolData', JSON.stringify(appData));
}

// Navigatie
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

// --- SCHERM 1: EVALUATIE ---
function initEvalScreen() {
  const taskSelect = document.getElementById('eval-task-select');
  const classSelect = document.getElementById('eval-class-select');

  taskSelect.innerHTML = appData.tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
  classSelect.innerHTML = appData.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (selectedTaskId) taskSelect.value = selectedTaskId;
  if (selectedClassId) classSelect.value = selectedClassId;

  taskSelect.onchange = (e) => { selectedTaskId = e.target.value; renderStudents(); renderRubrics(); };
  classSelect.onchange = (e) => { selectedClassId = e.target.value; renderStudents(); };

  renderStudents();
  renderRubrics();
}

function renderStudents() {
  const currentClass = appData.classes.find(c => c.id === selectedClassId);
  const list = document.getElementById('eval-student-list');
  list.innerHTML = '';

  if (!currentClass || currentClass.students.length === 0) {
    list.innerHTML = '<li>Geen leerlingen gevonden</li>';
    return;
  }

  if (!currentClass.students.includes(selectedStudent)) {
    selectedStudent = currentClass.students[0];
  }

  currentClass.students.forEach(student => {
    const li = document.createElement('li');
    li.innerText = student;
    if (student === selectedStudent) li.classList.add('active');
    li.onclick = () => {
      selectedStudent = student;
      renderStudents();
      loadStudentEvaluation();
    };
    list.appendChild(li);
  });

  loadStudentEvaluation();
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
      btn.innerHTML = `<strong>${lvl.score} / ${max} ptn</strong><br><small>${lvl.text}</small>`;
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
  document.getElementById('eval-student-title').innerText = selectedStudent || 'Selecteer een leerling';
  const key = `${selectedTaskId}_${selectedStudent}`;
  currentScores = appData.evaluations[key]?.scores || {};
  document.getElementById('eval-general-feedback').value = appData.evaluations[key]?.feedback || '';
  renderRubrics();
}

document.getElementById('btn-save-evaluation').onclick = () => {
  if (!selectedStudent || !selectedTaskId) return;
  const key = `${selectedTaskId}_${selectedStudent}`;
  appData.evaluations[key] = {
    scores: currentScores,
    feedback: document.getElementById('eval-general-feedback').value
  };
  saveToStorage();
  alert('Evaluatie opgeslagen!');
};

document.getElementById('btn-export-pdf').onclick = () => {
  const el = document.getElementById('screen-eval');
  html2pdf().from(el).save(`${selectedStudent || 'Evaluatie'}.pdf`);
};

// --- SCHERM 2: DASHBOARD (OPDRACHTEN BEHEREN) ---
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
  const newTask = { id: `task-${Date.now()}`, title: "Nieuwe Opdracht", criteria: [] };
  appData.tasks.push(newTask);
  selectTaskForEditing(newTask.id);
};

document.getElementById('btn-save-task-changes').onclick = () => {
  const task = appData.tasks.find(t => t.id === editingTaskId);
  if (task) {
    task.title = document.getElementById('task-name-input').value;
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

// --- SCHERM 3: KLASSENBEHEER ---
function initClassesScreen() {
  renderClassesList();
  if (appData.classes.length > 0) {
    selectClassForEditing(appData.classes[0].id);
  }
}

function renderClassesList() {
  const list = document.getElementById('classes-class-list');
  list.innerHTML = appData.classes.map(c => 
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
  const newClass = { id: `class-${Date.now()}`, name: "Nieuwe Klas", students: [] };
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

// Start
switchScreen('eval');
