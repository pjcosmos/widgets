/* ===== Study Planner - LocalStorage Version (Calendar Bug Fixed) ===== */

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
function saveTasks() {
  localStorage.setItem('plannerTasks', JSON.stringify(tasks));
}

function loadTasks() {
  const savedTasks = localStorage.getItem('plannerTasks');
  return savedTasks ? JSON.parse(savedTasks) : [];
}

// ---------- CRUD ----------
function addOrUpdateTask() {
  const name = taskName.value.trim();
  if (!name) {
    alert("과제명은 필수입니다.");
    return;
  }

  if (currentEditingId) {
    const task = tasks.find(t => t.id === currentEditingId);
    if (task) {
      task.subject = subject.value.trim();
      task.name = name;
      task.memo = memo.value.trim();
      task.date = selectedISO;
    }
    currentEditingId = null;
  } else {
    tasks.push({
      id: uuid(),
      subject: subject.value.trim(),
      name,
      memo: memo.value.trim(),
      date: selectedISO,
      done: false,
      createdAt: Date.now()
    });
  }

  saveTasks();
  renderAll();
  subject.value = "";
  taskName.value = "";
  memo.value = "";
  taskName.focus();
}

function toggleTask(id, isDone) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = isDone;
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
function renderAll() {
  renderTodos();
  drawCalendar();
}

function renderTodos() {
  const items = tasks
    .filter(t => !t.done)
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || 0) - (b.createdAt || 0));

  listEl.innerHTML = "";
  hintEl.style.display = items.length === 0 ? "block" : "none";

  for (const t of items) {
    const li = document.createElement("li");
    const chk = document.createElement("input");
    chk.type = "checkbox"; chk.className = "chk"; chk.checked = t.done;
    chk.onchange = () => toggleTask(t.id, chk.checked);

    const text = document.createElement("span");
    text.className = "text";
    const subj = t.subject ? `[${t.subject}] ` : "";
    const dateStr = t.date ? `${t.date.slice(5).replace('-', '/')} ` : '';
    text.textContent = `${dateStr}${subj}${t.name}${t.memo ? " · " + t.memo : ""}`;

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn"; editBtn.textContent = "수정";
    editBtn.onclick = () => enterEditMode(t);

    const delBtn = document.createElement("button");
    delBtn.className = "del-btn"; delBtn.textContent = "삭제";
    delBtn.onclick = () => deleteTask(t.id);

    li.append(chk, text, editBtn, delBtn);
    listEl.append(li);
  }
}

function drawCalendar() {
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat("ko", { year: "numeric", month: "long" }).format(cur);

  const y = cur.getFullYear(), m = cur.getMonth();
  const start = (new Date(y, m, 1).getDay() + 6) % 7;
  const last = new Date(y, m + 1, 0).getDate();
  const prevLast = new Date(y, m, 0).getDate();
  const todayISO = iso(new Date());

  const byDate = tasks.reduce((acc, t) => {
    if (t.date) (acc[t.date] ||= []).push(t);
    return acc;
  }, {});

  const addCell = (n, d, muted) => {
    const cell = document.createElement("div");
    cell.className = "cell" + (muted ? " muted" : "");
    cell.textContent = String(n);

    const dISO = iso(d);
    if (dISO === todayISO) cell.classList.add("today");
    if (byDate[dISO]?.length) cell.classList.add("hasTasks");
    if (dISO === selectedISO) cell.classList.add("selected");

    cell.onclick = () => { selectedISO = dISO; drawCalendar(); };

    cell.onmouseenter = (e) => {
      const arr = byDate[dISO] || [];
      if (arr.length === 0) { tip.hidden = true; return; }
      tip.innerHTML = `<ul>${arr.map(t => `<li style="${t.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${t.name}</li>`).join('')}</ul>`;
      tip.hidden = false;
      const { top, left } = calculateTooltipPosition(e.currentTarget, tip);
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };
    cell.onmouseleave = () => { tip.hidden = true; };
    grid.appendChild(cell);
  };

  for (let i = start - 1; i >= 0; i--) addCell(prevLast - i, new Date(y, m - 1, prevLast - i), true);
  for (let d = 1; d <= last; d++) addCell(d, new Date(y, m, d), false);
  const tail = 42 - (start + last); // 6-week grid
  for (let i = 1; i <= tail; i++) addCell(i, new Date(y, m + 1, i), true);
}

function calculateTooltipPosition(cell, tooltip) {
    const gap = 8, cellRect = cell.getBoundingClientRect(), cardRect = grid.closest(".calendar").getBoundingClientRect(), tipRect = tooltip.getBoundingClientRect();
    let left = cellRect.left + cellRect.width / 2 - cardRect.left - tipRect.width / 2;
    let top = cellRect.bottom - cardRect.top + gap;
    left = Math.max(4, Math.min(left, cardRect.width - tipRect.width - 4));
    if (top + tipRect.height > cardRect.height - 4) top = cellRect.top - cardRect.top - tipRect.height - gap;
    return { top, left };
}

// ---------- Initializer ----------
function init() {
  wdEl.innerHTML = "";
  ["월", "화", "수", "목", "금", "토", "일"].forEach(w => {
    const d = document.createElement("div");
    d.textContent = w;
    wdEl.appendChild(d);
  });
  
  dateBtn.onclick = addOrUpdateTask;
  taskName.addEventListener("keydown", e => e.key === "Enter" && addOrUpdateTask());
  memo.addEventListener("keydown", e => e.key === "Enter" && addOrUpdateTask());
  prev.onclick = () => { cur.setMonth(cur.getMonth() - 1); drawCalendar(); };
  next.onclick = () => { cur.setMonth(cur.getMonth() + 1); drawCalendar(); };
  document.addEventListener("click", e => !grid.contains(e.target) && (tip.hidden = true));

  tasks = loadTasks();
  renderAll();
}

init();
