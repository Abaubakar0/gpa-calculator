// =========================================
//   IMS GPA CALCULATOR — script.js
// =========================================

// ----- Grade Scale -----
const GRADE_MAP = [
  { min: 91, grade: 'A+', gp: 4.0 },
  { min: 87, grade: 'A',  gp: 4.0 },
  { min: 80, grade: 'B+', gp: 3.5 },
  { min: 72, grade: 'B',  gp: 3.0 },
  { min: 66, grade: 'C+', gp: 2.5 },
  { min: 60, grade: 'C',  gp: 2.0 },
  { min: 0,  grade: 'F',  gp: 0.0 }
];

// Returns grade object {min, grade, gp} for a given percentage marks
function getGradeInfo(marks) {
  for (const g of GRADE_MAP) {
    if (marks >= g.min) return g;
  }
  return GRADE_MAP[GRADE_MAP.length - 1];
}

// Returns the CSS class for a grade badge
function gradeBadgeClass(grade) {
  if (grade.startsWith('A')) return 'badge-a';
  if (grade.startsWith('B')) return 'badge-b';
  if (grade.startsWith('C')) return 'badge-c';
  return 'badge-f';
}

// Returns a color hex for a GPA value (used in progress bars)
function gpaColor(gpa) {
  if (gpa >= 3.5) return '#16a34a';
  if (gpa >= 2.5) return '#2563eb';
  if (gpa >= 1.0) return '#d97706';
  return '#dc2626';
}

// ----- State -----
let semesterCount  = 0;
let semesters      = {};    // { semId: { name, gpa, credits, calculated } }
let courseCounters = {};    // { semId: number } — monotonically increasing row counter

// ----- Semester Management -----

function addSemester() {
  semesterCount++;
  const id = 'sem_' + semesterCount;
  semesters[id] = { name: 'Semester ' + semesterCount, gpa: null, credits: 0, calculated: false };

  const container = document.getElementById('semesters-container');
  const card = document.createElement('div');
  card.className = 'card';
  card.id = 'card_' + id;
  card.innerHTML = buildSemesterCardHTML(id, semesterCount);
  container.appendChild(card);

  // Start with one blank course row
  addCourseRow(id);
  updateCGPA();
}

function buildSemesterCardHTML(id, num) {
  return `
    <div class="card-head">
      <input
        type="text"
        class="sem-name-input"
        id="name_${id}"
        value="Semester ${num}"
        onchange="semesters['${id}'].name = this.value; updateCGPA();"
        title="Click to rename"
      >
      <button class="btn-danger" onclick="removeSemester('${id}')">Remove</button>
    </div>
    <div class="card-body">
      <div class="course-row header-row">
        <div class="col-label">Subject Name</div>
        <div class="col-label">Credits</div>
        <div class="col-label">Marks %</div>
        <div class="col-label">Grade</div>
        <div class="col-label">GP</div>
        <div></div>
      </div>
      <div id="courses_${id}"></div>
      <div class="action-row">
        <button class="btn-add" onclick="addCourseRow('${id}')">+ Add Course</button>
        <button class="btn-primary" onclick="calcSemGPA('${id}')">Calculate GPA</button>
        <button class="btn-secondary" onclick="resetSemester('${id}')">Reset</button>
      </div>
      <div id="result_${id}"></div>
    </div>
  `;
}

function removeSemester(id) {
  const card = document.getElementById('card_' + id);
  if (!card) return;
  card.style.opacity = '0';
  card.style.transform = 'scale(0.97)';
  card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
  setTimeout(() => {
    card.remove();
    delete semesters[id];
    delete courseCounters[id];
    updateCGPA();
  }, 200);
}

function resetSemester(id) {
  const coursesDiv = document.getElementById('courses_' + id);
  if (coursesDiv) coursesDiv.innerHTML = '';
  courseCounters[id] = 0;
  semesters[id].gpa        = null;
  semesters[id].credits    = 0;
  semesters[id].calculated = false;
  document.getElementById('result_' + id).innerHTML = '';
  addCourseRow(id);
  updateCGPA();
}

// ----- Course Row Management -----

function addCourseRow(semId) {
  if (!courseCounters[semId]) courseCounters[semId] = 0;
  courseCounters[semId]++;
  const cid = semId + '_c' + courseCounters[semId];

  const div = document.createElement('div');
  div.className = 'course-row';
  div.id = 'row_' + cid;
  div.innerHTML = `
    <input type="text"   id="subj_${cid}"  placeholder="e.g. Data Structures">
    <input type="number" id="cred_${cid}"  placeholder="1–3"   min="1" max="3"  step="1">
    <input type="number" id="marks_${cid}" placeholder="0–100" min="0" max="100" oninput="liveGrade('${cid}')">
    <div   id="grade_${cid}" class="grade-cell">—</div>
    <div   id="gp_${cid}"    class="gp-cell">—</div>
    <button class="btn-icon btn-del" onclick="removeCourse('${cid}')" title="Remove course">✕</button>
  `;
  document.getElementById('courses_' + semId).appendChild(div);
}

function removeCourse(cid) {
  const row = document.getElementById('row_' + cid);
  if (row) row.remove();
}

// ----- Live Grade Preview -----

function liveGrade(cid) {
  const marksEl = document.getElementById('marks_' + cid);
  const gradeEl = document.getElementById('grade_' + cid);
  const gpEl    = document.getElementById('gp_'    + cid);
  const marks   = parseFloat(marksEl.value);

  if (isNaN(marks) || marks < 0 || marks > 100) {
    gradeEl.innerHTML  = '—';
    gpEl.textContent   = '—';
    return;
  }

  const g = getGradeInfo(marks);
  gradeEl.innerHTML = `<span class="badge ${gradeBadgeClass(g.grade)}">${g.grade}</span>`;
  gpEl.textContent  = g.gp.toFixed(1);
}

// ----- GPA Calculation -----

function calcSemGPA(semId) {
  const coursesDiv = document.getElementById('courses_' + semId);
  const rows       = coursesDiv.querySelectorAll('.course-row');
  const resultDiv  = document.getElementById('result_' + semId);
  const errors     = [];
  let totalPts     = 0;
  let totalCreds   = 0;

  rows.forEach((row, i) => {
    const credEl  = row.querySelector('[id^="cred_"]');
    const marksEl = row.querySelector('[id^="marks_"]');
    const gradeEl = row.querySelector('[id^="grade_"]');
    const gpEl    = row.querySelector('[id^="gp_"]');
    if (!credEl || !marksEl) return;

    // Clear previous error styling
    credEl.classList.remove('error');
    marksEl.classList.remove('error');

    const cred  = parseFloat(credEl.value);
    const marks = parseFloat(marksEl.value);
    let rowErr  = false;

    // Validate credit hours
    if (isNaN(cred) || cred < 1 || cred > 3) {
      credEl.classList.add('error');
      errors.push(`Row ${i + 1}: Credit hours must be between 1 and 3`);
      rowErr = true;
    }

    // Validate marks
    if (isNaN(marks) || marks < 0 || marks > 100) {
      marksEl.classList.add('error');
      errors.push(`Row ${i + 1}: Marks must be between 0 and 100`);
      rowErr = true;
    }

    if (rowErr) return;

    // Assign grade and accumulate totals
    const g = getGradeInfo(marks);
    gradeEl.innerHTML = `<span class="badge ${gradeBadgeClass(g.grade)}">${g.grade}</span>`;
    gpEl.textContent  = g.gp.toFixed(1);
    totalPts   += g.gp * cred;
    totalCreds += cred;
  });

  if (errors.length) {
    const preview = errors.slice(0, 2).join('; ') + (errors.length > 2 ? ` (+${errors.length - 2} more)` : '');
    resultDiv.innerHTML = `<div class="error-box">⚠ ${preview}</div>`;
    semesters[semId].gpa        = null;
    semesters[semId].calculated = false;
    updateCGPA();
    return;
  }

  if (totalCreds === 0) {
    resultDiv.innerHTML = `<div class="error-box">⚠ No valid courses found. Add at least one course with credit hours and marks.</div>`;
    return;
  }

  const gpa    = totalPts / totalCreds;
  const gpaStr = gpa.toFixed(2);
  const g      = getGradeInfo(gpa * 25); // scale 0–4 GPA to 0–100 for grade lookup

  semesters[semId].gpa        = gpa;
  semesters[semId].credits    = totalCreds;
  semesters[semId].calculated = true;

  resultDiv.innerHTML = `
    <div class="gpa-result">
      <span class="lbl">Semester GPA</span>
      <span class="badge ${gradeBadgeClass(g.grade)}" style="font-size:13px">${g.grade}</span>
      <span class="val">${gpaStr}</span>
    </div>
  `;

  updateCGPA();
}

// ----- CGPA Calculation & Rendering -----

function updateCGPA() {
  const calculated = Object.entries(semesters).filter(([, s]) => s.calculated);
  document.getElementById('sem-count-val').textContent = Object.keys(semesters).length;

  if (!calculated.length) {
    document.getElementById('cgpa-val').textContent          = '—';
    document.getElementById('total-credits-val').textContent = '0';
    document.getElementById('overall-grade-val').innerHTML   = '—';
    document.getElementById('cgpa-breakdown').innerHTML =
      '<div class="empty-state">No semester GPA calculated yet.<br>Go to the Semester GPA tab and calculate each semester.</div>';
    return;
  }

  let totalPts   = 0;
  let totalCreds = 0;
  calculated.forEach(([, s]) => {
    totalPts   += s.gpa * s.credits;
    totalCreds += s.credits;
  });

  const cgpa = totalPts / totalCreds;
  const g    = getGradeInfo(cgpa * 25);

  document.getElementById('cgpa-val').textContent          = cgpa.toFixed(2);
  document.getElementById('total-credits-val').textContent = totalCreds;
  document.getElementById('overall-grade-val').innerHTML =
    `<span class="badge ${gradeBadgeClass(g.grade)}" style="font-size:18px;padding:4px 12px">${g.grade}</span>`;

  // Build semester breakdown rows
  const html = calculated.map(([id, s]) => {
    const pct  = (s.gpa / 4.0) * 100;
    const color = gpaColor(s.gpa);
    const sg   = getGradeInfo(s.gpa * 25);
    return `
      <div class="sem-row">
        <div style="flex:1">
          <div class="s-name">${semesters[id].name}</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct.toFixed(1)}%; background:${color}"></div>
          </div>
        </div>
        <div class="s-credits">${s.credits} credits</div>
        <span class="badge ${gradeBadgeClass(sg.grade)}" style="margin-left:8px">${sg.grade}</span>
        <div class="s-gpa">${s.gpa.toFixed(2)}</div>
      </div>
    `;
  }).join('');

  document.getElementById('cgpa-breakdown').innerHTML = html;
}

// ----- Tab Switching -----

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    btn.classList.toggle('active', ['gpa', 'cgpa'][i] === tab);
  });
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  if (tab === 'cgpa') updateCGPA();
}

// ----- Init -----
addSemester();
