/* ===== Study Planner - Transparent Notion (BUG FIXED) ===== */

// ---------- State ----------
let tasks = [];
let selectedISO = new Date().toISOString().slice(0, 10);
let currentEditingId = null;
let cur = new Date(); cur.setDate(1);

// ---------- DOM refs ----------
const subject = document.getElementById("subject");
const taskName = document.getElementById("taskName");
const memo = document.getElementById("memo");
const dateBtn = document.getElementById("dateBtn");
const listEl = document.getElementById("todoList");
const hintEl = document.getElementById("emptyHint");
const grid = document.getElementById("grid");
const label = document.getElementById("calLabel");
const prev = document.getElementById("prevMon");
const next = document.getElementById("nextMon");
const tip = document.getElementById("tooltip");
const wdEl = document.getElementById("wd");

// ---------- Utils ----------
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }));
const iso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);

// ---------- Data Persistence ----------
const saveTasks = () => localStorage.setItem('plannerTasks', JSON.stringify(tasks));
const loadTasks = () => JSON.parse(localStorage.getItem('plannerTasks') || '[]');

// ---------- CRUD ----------
function addOrUpdateTask() {
  const name = taskName.value.trim();
  if (!name) return alert("과제명은 필수입니다.");

  if (currentEditingId) {
    const task = tasks.find(t => t.id === currentEditingId);
    if (task) Object.assign(task, { subject: subject.value.trim(), name, memo: memo.value.trim(), date: selectedISO });
    currentEditingId = null;
  } else {
    tasks.push({ id: uuid(), subject: subject.value.trim(), name, memo: memo.value.trim(), date: selectedISO, done: false, createdAt: Date.now() });
  }

  saveTasks();
  renderAll();
  subject.value = ""; taskName.value = ""; memo.value = "";
  taskName.focus();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks();
    renderAll();
  }
}

function deleteTask(id) {
  if (confirm("정말 삭제하시겠습니까?")) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderAll();
  }
}

function enterEditMode(task) {
  subject.value = task.subject || "";
  taskName.value = task.name || "";
  memo.value = task.memo || "";
  selectedISO = task.date;
  currentEditingId = task.id;
  taskName.focus();
  drawCalendar();
}

// ---------- UI Rendering ----------
const renderAll = () => { renderTodos(); drawCalendar(); };

function renderTodos() {
  const items = tasks.filter(t => !t.done).sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.createdAt - b.createdAt);
  listEl.innerHTML = "";
  hintEl.style.display = items.length === 0 ? "block" : "none";

  items.forEach(t => {
    const li = document.createElement("li");
    li.innerHTML = `
      <input type="checkbox" class="chk" onchange="toggleTask('${t.id}')">
      <span class="text">${t.date ? `${t.date.slice(5).replace('-', '/')} ` : ''}${t.subject ? `[${t.subject}] ` : ''}${t.name}${t.memo ? ` · ${t.memo}` : ''}</span>
      <button class="edit-btn">수정</button>
      <button class="del-btn">삭제</button>
    `;
    li.querySelector('.edit-btn').onclick = () => enterEditMode(t);
    li.querySelector('.del-btn').onclick = () => deleteTask(t.id);
    listEl.append(li);
  });
}

function drawCalendar() {
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat("ko", { year: "numeric", month: "long" }).format(cur);

  const y = cur.getFullYear(), m = cur.getMonth();
  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7; // 월요일=0

  const byDate = tasks.reduce((acc, t) => {
    if (t.date) (acc[t.date] ||= []).push(t);
    return acc;
  }, {});

  const calendarDays = [];
  // 이전 달
  for (let i = startDay; i > 0; i--) {
    const d = new Date(y, m, 1 - i);
    calendarDays.push({ date: d, muted: true });
  }
  // 현재 달
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(y, m, i);
    calendarDays.push({ date: d, muted: false });
  }
  // 다음 달
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(y, m + 1, i);
    calendarDays.push({ date: d, muted: true });
  }

  calendarDays.forEach(day => {
    const dISO = iso(day.date);
    const cell = document.createElement("div");
    cell.className = `cell ${day.muted ? 'muted' : ''} ${dISO === iso(new Date()) ? 'today' : ''} ${dISO === selectedISO ? 'selected' : ''} ${byDate[dISO] ? 'hasTasks' : ''}`;
    cell.textContent = day.date.getDate();
    cell.onclick = () => { selectedISO = dISO; drawCalendar(); };
    grid.append(cell);
  });
}


// ---------- Initializer ----------
function init() {
  wdEl.innerHTML = "";
  ["월", "화", "수", "목", "금", "토", "일"].forEach(w => {
    const d = document.createElement("div"); d.textContent = w; wdEl.appendChild(d);
  });
  
  dateBtn.onclick = addOrUpdateTask;
  taskName.addEventListener("keydown", e => e.key === "Enter" && addOrUpdateTask());
  memo.addEventListener("keydown", e => e.key === "Enter" && addOrUpdateTask());
  prev.onclick = () => { cur.setMonth(cur.getMonth() - 1); drawCalendar(); };
  next.onclick = () => { cur.setMonth(cur.getMonth() + 1); drawCalendar(); };

  tasks = loadTasks();
  renderAll();
}

init();
