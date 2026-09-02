// Standaard datastructuur met niveauteksten
let appData = JSON.parse(localStorage.getItem('evalData')) || {
  taskTitle: "Spreken: Presentatie",
  students: ["Jan Peeters", "Sophie Devos", "Lucas Janssens"],
  criteria: [
    { 
      id: "c1", 
      title: "Inhoud & Structuur", 
      levels: [
        { score: 1, text: "Inhoud is onvolledig en de structuur ontbreekt." },
        { score: 2, text: "Inhoud is basaal, structuur is bij vlagen onduidelijk." },
        { score: 3, text: "Goede inhoud met een duidelijke en logische opbouw." },
        { score: 4, text: "Uitstekende diepgang, zeer heldere en sterke structuur." }
      ]
    },
    { 
      id: "c2", 
      title: "Lichaamstaal & Oogcontact", 
      levels: [
        { score: 1, text: "Weinig oogcontact en een erg gesloten houding." },
        { score: 2, text: "Af en toe oogcontact, houding kan opener." },
        { score: 3, text: "Voldoende oogcontact en een open, natuurlijke houding." },
        { score: 4, text: "Steevast overtuigend oogcontact en een zeer professionele houding." }
      ]
    }
  ]
};

let currentStudent = appData.students[0];
let currentEvaluations = {}; 

// Navigatie tussen modi
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

// Automatische feedback herberekenen
function updateGeneralFeedback() {
  let feedbackArray = [];
  appData.criteria.forEach(crit => {
    const selectedScore = currentEvaluations[crit.id];
    if (selectedScore) {
      const levelObj = crit.levels.find(l => l.score === selectedScore);
      if (levelObj && levelObj.text.trim() !== '') {
        feedbackArray.push(`- ${crit.title}: ${levelObj.text}`);
      }
    }
  });
  document.getElementById('general-feedback').value = feedbackArray.join('\n');
}

// Render Evaluatiemodus
function renderEvalView() {
  document.getElementById('current-task-info').innerText = `Opdracht: ${appData.taskTitle}`;
  const studentList = document.getElementById('student-list');
  studentList.innerHTML = '';
  
  appData.students.forEach((student) => {
    const li = document.createElement('li');
    li.innerText = student;
    if (student === currentStudent) li.classList.add('active');
    li.onclick = () => { 
      currentStudent = student; 
      currentEvaluations = {}; 
      renderEvalView(); 
      updateGeneralFeedback();
    };
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
      btn.innerText = `Niveau ${lvl.score}`;
      if (currentEvaluations[crit.id] === lvl.score) btn.classList.add('selected');
      
      btn.onclick = () => {
        currentEvaluations[crit.id] = lvl.score;
        renderEvalView();
        updateGeneralFeedback();
      };
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

  appData.criteria.forEach((crit, cIdx) => {
    const item = document.createElement('div');
    item.className = 'admin-criterion-item';
    
    let levelsHTML = '';
    crit.levels.forEach((lvl, lIdx) => {
      levelsHTML += `
        <div class="level-feedback-group">
          <label>Feedback Niveau ${lvl.score}:</label>
          <input type="text" class="level-text-input" data-cidx="${cIdx}" data-lidx="${lIdx}" value="${lvl.text}">
        </div>
      `;
    });

    item.innerHTML = `
      <div class="form-group">
        <label>Criterium ${cIdx + 1} Titel:</label>
        <input type="text" value="${crit.title}" data-cidx="${cIdx}" class="crit-title-input">
      </div>
      <div class="admin-levels-grid">
        ${levelsHTML}
      </div>
    `;
    list.appendChild(item);
  });
}

// Beheer Opslaan
document.getElementById('btn-save-admin').addEventListener('click', () => {
  appData.taskTitle = document.getElementById('admin-task-title').value;
  
  const titleInputs = document.querySelectorAll('.crit-title-input');
  titleInputs.forEach(input => {
    const cIdx = input.dataset.cidx;
    appData.criteria[cIdx].title = input.value;
  });

  const levelInputs = document.querySelectorAll('.level-text-input');
  levelInputs.forEach(input => {
    const cIdx = input.dataset.cidx;
    const lIdx = input.dataset.lidx;
    appData.criteria[cIdx].levels[lIdx].text = input.value;
  });
  
  localStorage.setItem('evalData', JSON.stringify(appData));
  alert('Instellingen en feedbackteksten opgeslagen!');
});

// Toevoegen Criterium
document.getElementById('btn-add-criterion').addEventListener('click', () => {
  appData.criteria.push({
    id: `c${Date.now()}`,
    title: "Nieuw Criterium",
    levels: [
      { score: 1, text: "" },
      { score: 2, text: "" },
      { score: 3, text: "" },
      { score: 4, text: "" }
    ]
  });
  renderAdminView();
});

// PDF Exporteren
document.getElementById('btn-pdf').addEventListener('click', () => {
  const element = document.getElementById('view-evaluation');
  html2pdf().from(element).save(`${currentStudent}_evaluatie.pdf`);
});

// Start de app
renderEvalView();
