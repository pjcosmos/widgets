/* ===== Study Planner - Transparent Notion (Tooltip Final Fix) ===== */

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
const wdEl = document.getElementById("wd");
const tooltip = document.getElementById("tooltip");

// ---------- Utils ----------
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }));
const iso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);

// ---------- Data Persistence ----------
const saveTasks = () => localStorage.setItem('plannerTasks', JSON.stringify(tasks));
const loadTasks = () => JSON.parse(localStorage.getItem('plannerTasks') || '[]');

// ---------- CRUD Functions ----------
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
    const subjText = t.subject ? `[${t.subject}] ` : '';
    const dateText = t.date ? `${t.date.slice(5).replace('-', '/')} ` : '';
    const memoText = t.memo ? ` · ${t.memo}` : '';
    
    li.innerHTML = `
      <input type="checkbox" class="chk">
      <span class="text">${dateText}${subjText}${t.name}${memoText}</span>
      <button class="edit-btn">수정</button>
      <button class="del-btn">삭제</button>
    `;
    li.querySelector('.chk').onchange = () => toggleTask(t.id);
    li.querySelector('.edit-btn').onclick = () => enterEditMode(t);
    li.querySelector('.del-btn').onclick = () => deleteTask(t.id);
    listEl.append(li);
  });
}

function drawCalendar() {
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat("ko", { year: "numeric", month: "long" }).format(cur);
  const todayISO = iso(new Date());

  const byDate = tasks.reduce((acc, t) => {
    if (t.date) (acc[t.date] ||= []).push(t);
    return acc;
  }, {});

  const year = cur.getFullYear();
  const month = cur.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - (firstDayOfMonth.getDay() + 6) % 7);

  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(startDate);
    cellDate.setDate(startDate.getDate() + i);
    const dISO = iso(cellDate);
    const cell = document.createElement("div");
    cell.className = "cell";
    
    if (cellDate.getMonth() !== month) cell.classList.add("muted");
    if (dISO === todayISO) cell.classList.add("today");
    if (dISO === selectedISO) cell.classList.add("selected");
    
    const tasksForDay = byDate[dISO];
    if (tasksForDay) {
      cell.classList.add("hasTasks");
      cell.addEventListener("mouseenter", (e) => showTooltip(e.currentTarget, tasksForDay));
      cell.addEventListener("mouseleave", hideTooltip);
    }
    
    cell.textContent = cellDate.getDate();
    cell.onclick = () => { selectedISO = dISO; drawCalendar(); };
    grid.appendChild(cell);
  }
}

// ✅ 툴팁 보여주기 함수 (수정)
function showTooltip(cell, tasksForDay) {
  tooltip.innerHTML = tasksForDay.map(t => `• ${t.name}`).join('<br>');
  tooltip.classList.add('visible');

  const cellRect = cell.getBoundingClientRect();
  const calendarRect = cell.closest('.calendar').getBoundingClientRect();
  
  // 기본 위치: 셀의 아래쪽 중앙
  let top = cellRect.bottom - calendarRect.top + 8;
  let left = cellRect.left - calendarRect.left + (cellRect.width / 2) - (tooltip.offsetWidth / 2);

  // 화면 가장자리에 닿지 않도록 위치 보정
  if (left < 5) left = 5;
  if (left + tooltip.offsetWidth > calendarRect.width) {
    left = calendarRect.width - tooltip.offsetWidth - 5;
  }
  
  // 아래 공간이 부족하면 위로 이동
  if (top + tooltip.offsetHeight > calendarRect.height) {
    top = cellRect.top - calendarRect.top - tooltip.offsetHeight - 8;
  }
  
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

// ✅ 툴팁 숨기기 함수 (수정)
function hideTooltip() {
  tooltip.classList.remove('visible');
}

// ---------- Initializer ----------
function init() {
  wdEl.innerHTML = "";
  ["월", "화", "수", "목", "금", "토", "일"].forEach(w => {
    const d = document.createElement("div"); d.textContent = w; wdEl.appendChild(d);
  });

  dateBtn.onclick = addOrUpdateTask;
  const enterHandler = e => { if (e.key === "Enter") addOrUpdateTask(); };
  taskName.addEventListener("keydown", enterHandler);
  memo.addEventListener("keydown", enterHandler);
  prev.onclick = () => { cur.setMonth(cur.getMonth() - 1); drawCalendar(); };
  next.onclick = () => { cur.setMonth(cur.getMonth() + 1); drawCalendar(); };

  tasks = loadTasks();
  renderAll();
}

init();
