// Standaard datastructuur
let appData = JSON.parse(localStorage.getItem('evalData')) || {
  taskTitle: "Spreken: Presentatie",
  students: ["Jan Peeters", "Sophie Devos", "Lucas Janssens"],
  criteria: [
    { id: "c1", title: "Inhoud", levels: [1, 2, 3, 4] },
    { id: "c2", title: "Lichaamstaal", levels: [1, 2, 3, 4] }
  ]
};

let currentStudent = appData.students[0];
let currentEvaluations = {};

// Modus wisselen
const btnEval = document.getElementById('btn-mode-eval');
const btnAdmin = document.getElementById('btn-mode-admin');
const viewEval = document.getElementById('view-evaluation');
const viewAdmin = document.getElementById('view-admin');

btnEval.addEventListener('click', () => {
  btnEval.classList.add('active');
  btnAdmin.classList.remove('active');
  viewEval.classList.add('active');
  viewAdmin.classList.remove('active');
  renderEvalView();
});

btnAdmin.addEventListener('click', () => {
  btnAdmin.classList.add('active');
  btnEval.classList.remove('active');
  viewAdmin.classList.add('active');
  viewEval.classList.remove('active');
  renderAdminView();
});

// Render Evaluatiemodus
function renderEvalView() {
  document.getElementById('current-task-info').innerText = `Opdracht: ${appData.taskTitle}`;
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = '';
  
  appData.students.forEach((student, index) => {
    const li = document.createElement('li');
    li.innerText = student;
    if (student === currentStudent) li.classList.add('active');
    li.onclick = () => { currentStudent = student; renderEvalView(); };
    studentList.appendChild(li);
  });

  document.getElementById('current-student-name').innerText = currentStudent;
  
  const container = document.getElementById('rubric-container');
  container.innerHTML = '';
  
  appData.criteria.forEach(crit => {
    const div = document.createElement('div');
    div.className = 'rubric-card';
    div.innerHTML = `<h4>${crit.title}</h4>`;
    
    const levelGrid = document.createElement('div');
    levelGrid.className = 'levels-grid';
    
    crit.levels.forEach(lvl => {
      const btn = document.createElement('button');
      btn.className = 'level-btn';
      btn.innerText = `Niveau ${lvl}`;
      btn.onclick = () => {
        currentEvaluations[crit.id] = lvl;
        renderEvalView();
      };
      if (currentEvaluations[crit.id] === lvl) btn.classList.add('selected');
      levelGrid.appendChild(btn);
    });

    div.appendChild(levelGrid);
    container.appendChild(div);
  });
}

// Render Beheermodus
function renderAdminView() {
  document.getElementById('admin-task-title').value = appData.taskTitle;
  const list = document.getElementById('admin-criteria-list');
  list.innerHTML = '';

  appData.criteria.forEach((crit, idx) => {
    const item = document.createElement('div');
    item.className = 'admin-criterion-item';
    item.innerHTML = `
      <div class="form-group">
        <label>Criterium ${idx + 1}:</label>
        <input type="text" value="${crit.title}" data-idx="${idx}" class="crit-input">
      </div>
    `;
    list.appendChild(item);
  });
}

// Beheer Opslaan
document.getElementById('btn-save-admin').addEventListener('click', () => {
  appData.taskTitle = document.getElementById('admin-task-title').value;
  const inputs = document.querySelectorAll('.crit-input');
  inputs.forEach((input, idx) => {
    appData.criteria[idx].title = input.value;
  });
  
  localStorage.setItem('evalData', JSON.stringify(appData));
  alert('Wijzigingen opgeslagen!');
});

// Toevoegen Criterium
document.getElementById('btn-add-criterion').addEventListener('click', () => {
  appData.criteria.push({
    id: `c${Date.now()}`,
    title: "Nieuw Criterium",
    levels: [1, 2, 3, 4]
  });
  renderAdminView();
});

// PDF Exporteren
document.getElementById('btn-pdf').addEventListener('click', () => {
  const element = document.getElementById('view-evaluation');
  html2pdf().from(element).save(`${currentStudent}_evaluatie.pdf`);
});

// Eerste start
renderEvalView();
