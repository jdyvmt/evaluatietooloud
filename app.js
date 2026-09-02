// 1. DATAMODEL & STRUCTUUR
class Leerling {
  constructor(id, voornaam, achternaam) {
    this.id = id;
    this.voornaam = voornaam;
    this.achternaam = achternaam;
  }
}

class Klas {
  constructor(id, naam) {
    this.id = id;
    this.naam = naam;
    this.leerlingIds = [];
  }
}

class Criterium {
  constructor(id, titel, maxPunten, niveaus) {
    this.id = id;
    this.titel = titel;
    this.maxPunten = maxPunten;
    this.niveaus = niveaus;
  }
}

class Opdracht {
  constructor(id, titel, vak, klasId) {
    this.id = id;
    this.titel = titel;
    this.vak = vak;
    this.klasId = klasId;
    this.criteria = [];
    this.snelFeedbackOpties = [];
  }
}

class Evaluatie {
  constructor(id, opdrachtId, leerlingId) {
    this.id = id;
    this.opdrachtId = opdrachtId;
    this.leerlingId = leerlingId;
    this.datum = new Date().toISOString();
    this.scores = {};
    this.gekozenSnelFeedback = [];
    this.vrijeFeedback = "";
    this.isVolbracht = false;
  }
}

// 2. INITIALISATIE MET TESTDATA
const systeem = {
  leerlingen: [
    new Leerling("L-1001", "Jan", "Peeters"),
    new Leerling("L-1002", "Sophie", "Willems")
  ],
  klassen: [],
  opdrachten: [],
  evaluaties: []
};

// Klas opzetten
const klas4LA = new Klas("K-4LA", "4 Latijn");
klas4LA.leerlingIds = ["L-1001", "L-1002"];
systeem.klassen.push(klas4LA);

// Opdracht opzetten
const opd1 = new Opdracht("OPD-01", "Uiteenzetting Structuur & Taal", "Nederlands", "K-4LA");
opd1.criteria = [
  new Criterium("C-1", "Structuur & Alinea's", 4, [
    { punten: 0, omschrijving: "Geen duidelijke alinea-indeling aanwezig." },
    { punten: 2, omschrijving: "Alinea's aanwezig, maar overgangen ontbreken." },
    { punten: 4, omschrijving: "Logische opbouw met heldere kernzinnen." }
  ]),
  new Criterium("C-2", "Spelling & Grammatica", 2, [
    { punten: 0, omschrijving: "Meer dan 5 spelfouten." },
    { punten: 1, omschrijving: "1 tot 4 spelfouten." },
    { punten: 2, omschrijving: "Volledig foutloos." }
  ])
];
opd1.snelFeedbackOpties = [
  "Mooie inleiding met duidelijke stelling",
  "Let op werkwoordspelling (d/t-fouten)",
  "Verbindwoorden ontbreken tussen alinea's"
];
systeem.opdrachten.push(opd1);

// Historische evaluatie toevoegen ter illustratie
const oudeEval = new Evaluatie("EVAL-0", "OPD-OUD", "L-1001");
oudeEval.datum = "2026-02-14T10:00:00.000Z";
oudeEval.gekozenSnelFeedback = ["Aandachtspunt: Let op alinea-structuur en spreektempo."];
oudeEval.isVolbracht = true;
systeem.evaluaties.push(oudeEval);


// 3. APPLICATIE STATE
let actieveKlasId = "K-4LA";
let actieveOpdrachtId = "OPD-01";
let actieveLeerlingId = "L-1001";
let actieveEvaluatie = null;

// DOM Elementen
const studentSelect = document.getElementById("student-select");
const filterUncompleted = document.getElementById("filter-uncompleted");
const criteriaContainer = document.getElementById("criteria-container");
const quickFeedbackContainer = document.getElementById("quick-feedback-container");
const freeFeedbackInput = document.getElementById("free-feedback");
const historyContainer = document.getElementById("history-container");
const btnSave = document.getElementById("btn-save");

// 4. SCHERM RENDEREN
function laadBeoordelingsScherm() {
  const klas = systeem.klassen.find(k => k.id === actieveKlasId);
  const opdracht = systeem.opdrachten.find(o => o.id === actieveOpdrachtId);
  
  vulLeerlingenDropdown(klas, opdracht.id);
  laadEvaluatieVanLeerling(actieveLeerlingId, opdracht.id);
  
  renderHistoriek(actieveLeerlingId);
  renderCriteria(opdracht);
  renderSnelFeedback(opdracht);
  syncFeedback();
}

function vulLeerlingenDropdown(klas, opdrachtId) {
  studentSelect.innerHTML = "";
  let ids = klas.leerlingIds;

  if (filterUncompleted.checked) {
    ids = ids.filter(id => {
      const ev = systeem.evaluaties.find(e => e.opdrachtId === opdrachtId && e.leerlingId === id);
      return !ev || !ev.isVolbracht;
    });
  }

  ids.forEach(id => {
    const l = systeem.leerlingen.find(item => item.id === id);
    const option = document.createElement("option");
    option.value = l.id;
    option.textContent = `${l.voornaam} ${l.achternaam}`;
    if (l.id === actieveLeerlingId) option.selected = true;
    studentSelect.appendChild(option);
  });
}

function laadEvaluatieVanLeerling(leerlingId, opdrachtId) {
  actieveEvaluatie = systeem.evaluaties.find(
    e => e.opdrachtId === opdrachtId && e.leerlingId === leerlingId
  );

  if (!actieveEvaluatie) {
    actieveEvaluatie = new Evaluatie(`EVAL-${Date.now()}`, opdrachtId, leerlingId);
    systeem.evaluaties.push(actieveEvaluatie);
  }
}

function renderHistoriek(leerlingId) {
  const historie = systeem.evaluaties.filter(e => e.leerlingId === leerlingId && e.opdrachtId !== actieveOpdrachtId);
  historyContainer.innerHTML = "<h4>Eerdere evaluaties</h4>";

  if (historie.length === 0) {
    historyContainer.innerHTML += "<p style='color: var(--text-muted); font-size: 0.85rem;'>Geen eerdere evaluaties.</p>";
    return;
  }

  historie.forEach(evalData => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <span class="date">${evalData.datum.slice(0, 10)}</span>
      <p class="aandachtspunt">⚠️ <em>${evalData.gekozenSnelFeedback.join(", ")}</em></p>
    `;
    historyContainer.appendChild(item);
  });
}

function renderCriteria(opdracht) {
  criteriaContainer.innerHTML = "<h3>Criteria</h3>";

  opdracht.criteria.forEach(criterium => {
    const behaald = actieveEvaluatie.scores[criterium.id];
    const block = document.createElement("div");
    block.className = "criterium-block";
    
    let levelsHtml = "";
    criterium.niveaus.forEach(niveau => {
      const isActive = behaald === niveau.punten ? "active" : "";
      levelsHtml += `
        <button class="level-card ${isActive}" onclick="selecteerNiveau('${criterium.id}', ${niveau.punten}, this)">
          <span class="pts">${niveau.punten} pt</span>
          <span class="desc">${niveau.omschrijving}</span>
        </button>
      `;
    });

    block.innerHTML = `
      <div class="criterium-header">
        <h4>${criterium.titel}</h4>
        <span id="score-${criterium.id}">
          ${behaald !== undefined ? behaald : 0} / ${criterium.maxPunten} pt
        </span>
      </div>
      <div class="levels-grid">${levelsHtml}</div>
    `;
    criteriaContainer.appendChild(block);
  });
}

function renderSnelFeedback(opdracht) {
  quickFeedbackContainer.innerHTML = "";

  opdracht.snelFeedbackOpties.forEach(tekst => {
    const isGeselecteerd = actieveEvaluatie.gekozenSnelFeedback.includes(tekst);
    const label = document.createElement("label");
    label.className = "checkbox-card";
    label.innerHTML = `
      <input type="checkbox" ${isGeselecteerd ? "checked" : ""} onchange="toggleSnelFeedback('${tekst}', this.checked)">
      ${tekst}
    `;
    quickFeedbackContainer.appendChild(label);
  });
}

// 5. INTERACTIES
function selecteerNiveau(criteriumId, punten, knop) {
  actieveEvaluatie.scores[criteriumId] = punten;
  const parent = knop.parentElement;
  parent.querySelectorAll(".level-card").forEach(k => k.classList.remove("active"));
  knop.classList.add("active");

  const criterium = systeem.opdrachten.find(o => o.id === actieveOpdrachtId).criteria.find(c => c.id === criteriumId);
  document.getElementById(`score-${criteriumId}`).textContent = `${punten} / ${criterium.maxPunten} pt`;
}

function toggleSnelFeedback(tekst, isAangevinkt) {
  if (isAangevinkt) {
    actieveEvaluatie.gekozenSnelFeedback.push(tekst);
  } else {
    actieveEvaluatie.gekozenSnelFeedback = actieveEvaluatie.gekozenSnelFeedback.filter(t => t !== tekst);
  }
}

freeFeedbackInput.addEventListener("input", (e) => {
  actieveEvaluatie.vrijeFeedback = e.target.value;
});

studentSelect.addEventListener("change", (e) => {
  actieveLeerlingId = e.target.value;
  laadBeoordelingsScherm();
});

filterUncompleted.addEventListener("change", () => {
  const klas = systeem.klassen.find(k => k.id === actieveKlasId);
  vulLeerlingenDropdown(klas, actieveOpdrachtId);
});

btnSave.addEventListener("click", () => {
  actieveEvaluatie.isVolbracht = true;
  alert("Evaluatie opgeslagen!");
  
  // Schakel naar volgende leerling indien beschikbaar
  const klas = systeem.klassen.find(k => k.id === actieveKlasId);
  const currentIndex = klas.leerlingIds.indexOf(actieveLeerlingId);
  if (currentIndex < klas.leerlingIds.length - 1) {
    actieveLeerlingId = klas.leerlingIds[currentIndex + 1];
    laadBeoordelingsScherm();
  }
});

function syncFeedback() {
  freeFeedbackInput.value = actieveEvaluatie.vrijeFeedback || "";
}

// 6. EXPORT FUNCTIE VOOR PDF
function exporteerKlasPDF(klasId, opdrachtId) {
  const klas = systeem.klassen.find(k => k.id === klasId);
  const opdracht = systeem.opdrachten.find(o => o.id === opdrachtId);

  const exportContainer = document.createElement("div");

  klas.leerlingIds.forEach((leerlingId, index) => {
    const leerling = systeem.leerlingen.find(l => l.id === leerlingId);
    const evalData = systeem.evaluaties.find(e => e.opdrachtId === opdrachtId && e.leerlingId === leerlingId);

    if (!evalData) return;

    let criteriaTabelHtml = "";
    let totaal = 0;
    let max = 0;

    opdracht.criteria.forEach(criterium => {
      const behaald = evalData.scores[criterium.id] || 0;
      totaal += behaald;
      max += criterium.maxPunten;

      const gekozenNiveau = criterium.niveaus.find(n => n.punten === behaald);
      const omschrijving = gekozenNiveau ? gekozenNiveau.omschrijving : "-";

      criteriaTabelHtml += `
        <tr>
          <td><strong>${criterium.titel}</strong></td>
          <td>${omschrijving}</td>
          <td style="text-align: right;"><strong>${behaald} / ${criterium.maxPunten} pt</strong></td>
        </tr>
      `;
    });

    const pageBreak = index < klas.leerlingIds.length - 1 ? 'style="page-break-after: always;"' : '';

    exportContainer.innerHTML += `
      <div class="pdf-page" ${pageBreak}>
        <div class="pdf-header">
          <div>
            <h2>Evaluatie: ${opdracht.titel}</h2>
            <p><strong>Klas:</strong> ${klas.naam} | <strong>Vak:</strong> ${opdracht.vak}</p>
          </div>
          <div style="text-align: right;">
            <h3>${leerling.voornaam} ${leerling.achternaam}</h3>
            <p>Datum: ${evalData.datum.slice(0, 10)}</p>
          </div>
        </div>

        <table class="pdf-table">
          <thead>
            <tr>
              <th>Criterium</th>
              <th>Beoordeling / Feedback</th>
              <th style="text-align: right;">Score</th>
            </tr>
          </thead>
          <tbody>${criteriaTabelHtml}</tbody>
          <tfoot>
            <tr>
              <th colspan="2">Eindresultaat</th>
              <th style="text-align: right;">${totaal} / ${max} pt</th>
            </tr>
          </tfoot>
        </table>

        <div class="pdf-feedback-box">
          <h4>Feedback</h4>
          ${evalData.gekozenSnelFeedback.length > 0 ? `<ul>${evalData.gekozenSnelFeedback.map(f => `<li>${f}</li>`).join('')}</ul>` : ''}
          ${evalData.vrijeFeedback ? `<p><em>${evalData.vrijeFeedback}</em></p>` : ''}
        </div>
      </div>
    `;
  });

  const opties = {
    margin: 10,
    filename: `Evaluaties_${klas.naam}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opties).from(exportContainer).save();
}

// Start
document.addEventListener("DOMContentLoaded", laadBeoordelingsScherm);
