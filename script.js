// Dynamisch Datamodel in LocalStorage
const DEFAULT_DATA = {
  tasks: [
    {
      id: "task-1",
      title: "Spreken: Presentatie",
      criteria: [
        {
          id: "crit-1",
          title: "Inhoud & Opbouw",
          levels: [
            { score: 1, label: "Onvoldoende", text: "Inhoud is onvolledig en mist structuur." },
            { score: 2, label: "Voldoende", text: "Inhoud is basaal, opbouw is helder." },
            { score: 3, label: "Goed", text: "Diepgaande inhoud met een zeer sterke structuur." }
          ]
        }
      ]
    }
  ],
  classes: [
    { id: "class-1", name: "4 LA", students: ["Jan Peeters", "Sophie Devos", "Lucas Janssens"] }
  ],
  evaluations: {}
};

let store = JSON.parse(localStorage.getItem('appStore')) || DEFAULT_DATA;
let activeTaskId = store.tasks[0]?.id || null;
let activeClassId = store.classes[0]?.id || null;
let activeStudent = store.classes[0]?.students[0] || null;
let activeEvaluations = {};

function saveData() {
  localStorage.setItem('appStore', JSON.stringify(store));
}

// Navigation
const btnEval = document.getElementById('btn-view-eval');
const btnAdmin = document.getElementById('btn-view-admin');
const viewEval = document.getElementById('view-eval');
const viewAdmin = document.getElementById('view-admin');

btnEval.onclick = () => {
  btnEval.classList.add('active'); btnAdmin.classList.remove('active');
  viewEval.classList.add('active'); viewAdmin.classList.remove('active');
  initEvalView();
};

btnAdmin.onclick = () => {
  btnAdmin.classList.add('active'); btnEval.classList.remove('active');
  viewAdmin.classList.add('active'); viewEval.classList.remove('active');
  initAdminView();
};

// --- EVALUATIEMODUS ---
function initEvalView() {
  const taskSelect = document.getElementById('select-task-eval');
  const classSelect = document.getElementById('select-klas-eval');
  
  taskSelect.innerHTML = store.tasks.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
  classSelect.innerHTML = store.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  taskSelect.value = activeTaskId;
  classSelect.value = activeClassId;

  taskSelect.onchange = (e) => { activeTaskId = e.target.value; renderStudentList(); renderRubrics(); };
  classSelect.onchange = (e) => { activeClassId = e.target.value; renderStudentList(); };

  renderStudentList();
  renderRubrics();
}

function renderStudentList() {
  const currentClass = store.classes.find(c => c.id === activeClassId);
  const list = document.getElementById('student-list');
  list.innerHTML = '';

  if (!currentClass) return;
  
  currentClass.students.forEach(student => {
    const li = document.createElement('li');
    li.innerText = student;
    if (student === activeStudent) li.classList.add('active');
    li.onclick = () => {
      activeStudent = student;
      renderStudentList();
      loadStudentEvaluation();
    };
    list.appendChild(li);
  });
}

function renderRubrics() {
  const task = store.tasks.find(t => t.id === activeTaskId);
  const container = document.getElementById('rubric-container');
  container.innerHTML = '';

  if (!task) return;
  document.getElementById('current-task-name').innerText = `Opdracht: ${task.title}`;

  task.criteria.forEach(crit => {
    const card = document.createElement('div');
    card.className = 'rubric-card';
    card.innerHTML = `<h4>${crit.title}</h4>`;

    const grid = document.createElement('div');
    grid.className = 'levels-grid';

    crit.levels.forEach(lvl => {
      const btn = document.createElement('button');
      btn.className = `level-btn ${activeEvaluations[crit.id] === lvl.score ? 'selected' : ''}`;
      btn.innerHTML = `<strong>${lvl.label || 'Niveau ' + lvl.score} (${lvl.score}p)</strong><br><small>${lvl.text}</small>`;
      btn.onclick = () => {
        activeEvaluations[crit.id] = lvl.score;
        renderRubrics();
        updateFeedbackText();
      };
      grid.appendChild(btn);
    });

    card.appendChild(grid);
    container.appendChild(card);
  });
}

function updateFeedbackText() {
  const task = store.tasks.find(t => t.id === activeTaskId);
  if (!task) return;

  let feedback = [];
  task.criteria.forEach(crit => {
    const score = activeEvaluations[crit.id];
    if (score) {
      const lvl = crit.levels.find(l => l.score === score);
      if (lvl && lvl.text) feedback.push(`- ${crit.title}: ${lvl.text}`);
    }
  });

  document.getElementById('general-feedback').value = feedback.join('\n');
}

function loadStudentEvaluation() {
  document.getElementById('current-student-name').innerText = activeStudent || 'Selecteer een leerling';
  const key = `${activeTaskId}_${activeStudent}`;
  activeEvaluations = store.evaluations[key]?.scores || {};
  document.getElementById('general-feedback').value = store.evaluations[key]?.feedback || '';
  renderRubrics();
}

document.getElementById('btn-save-eval').onclick = () => {
  if (!activeStudent || !activeTaskId) return;
  const key = `${activeTaskId}_${activeStudent}`;
  store.evaluations[key] = {
    scores: activeEvaluations,
    feedback: document.getElementById('general-feedback').value
  };
  saveData();
  alert('Evaluatie opgeslagen!');
};

// --- BEHEERMODUS ---
let editingTask = null;

function initAdminView() {
  renderAdminTaskList();
  if (store.tasks.length > 0) editTask(store.tasks[0].id);
}

function renderAdminTaskList() {
  const list = document.getElementById('admin-task-list');
  list.innerHTML = store.tasks.map(t => `<li class="${editingTask?.id === t.id ? 'active' : ''}" onclick="editTask('${t.id}')">${t.title}</li>`).join('');
}

function editTask(taskId) {
  editingTask = JSON.parse(JSON.stringify(store.tasks.find(t => t.id === taskId)));
  renderAdminTaskList();
  
  document.getElementById('task-title-input').value = editingTask.title;
  renderCriteriaEditor();
}

function renderCriteriaEditor() {
  const container = document.getElementById('criteria-editor-container');
  container.innerHTML = '';

  editingTask.criteria.forEach((crit, cIdx) => {
    const box = document.createElement('div');
    box.className = 'criterion-box';
    box.innerHTML = `
      <div class="form-group">
        <label>Titel Criterium:</label>
        <input type="text" value="${crit.title}" onchange="editingTask.criteria[${cIdx}].title = this.value">
      </div>
      <h4>Niveaus:</h4>
    `;

    crit.levels.forEach((lvl, lIdx) => {
      const row = document.createElement('div');
      row.className = 'level-row';
      row.innerHTML = `
        <input type="number" value="${lvl.score}" placeholder="Punten" onchange="editingTask.criteria[${cIdx}].levels[${lIdx}].score = parseInt(this.value)">
        <input type="text" value="${lvl.text}" placeholder="Feedbacktekst voor dit niveau" onchange="editingTask.criteria[${cIdx}].levels[${lIdx}].text = this.value">
        <button class="btn danger small" onclick="removeLevel(${cIdx}, ${lIdx})">X</button>
      `;
      box.appendChild(row);
    });

    const addLvlBtn = document.createElement('button');
    addLvlBtn.className = 'btn secondary small mt-4';
    addLvlBtn.innerText = '+ Niveau Toevoegen';
    addLvlBtn.onclick = () => {
      editingTask.criteria[cIdx].levels.push({ score: crit.levels.length + 1, label: '', text: '' });
      renderCriteriaEditor();
    };
    box.appendChild(addLvlBtn);

    container.appendChild(box);
  });
}

function removeLevel(cIdx, lIdx) {
  editingTask.criteria[cIdx].levels.splice(lIdx, 1);
  renderCriteriaEditor();
}

document.getElementById('btn-add-criterion').onclick = () => {
  editingTask.criteria.push({
    id: `crit-${Date.now()}`,
    title: "Nieuw Criterium",
    levels: [{ score: 1, label: "Basis", text: "" }]
  });
  renderCriteriaEditor();
};

document.getElementById('btn-new-task').onclick = () => {
  const newTask = {
    id: `task-${Date.now()}`,
    title: "Nieuwe Opdracht",
    criteria: []
  };
  store.tasks.push(newTask);
  editTask(newTask.id);
};

document.getElementById('btn-save-task').onclick = () => {
  editingTask.title = document.getElementById('task-title-input').value;
  const idx = store.tasks.findIndex(t => t.id === editingTask.id);
  if (idx !== -1) store.tasks[idx] = editingTask;
  saveData();
  renderAdminTaskList();
  alert('Opdracht opgeslagen!');
};

document.getElementById('btn-delete-task').onclick = () => {
  if (confirm('Zeker weten dat je deze opdracht wilt verwijderen?')) {
    store.tasks = store.tasks.filter(t => t.id !== editingTask.id);
    saveData();
    initAdminView();
  }
};

// PDF Export
document.getElementById('btn-pdf-eval').onclick = () => {
  const element = document.getElementById('view-eval');
  html2pdf().from(element).save(`${activeStudent || 'Evaluatie'}.pdf`);
};

// Start
initEvalView();
