/* ===== Study Planner - LocalStorage Version =====
    - Firebase 없이 브라우저 자체에 데이터를 저장합니다.
    - 다른 기기와 동기화는 되지 않지만, 설정 없이 바로 작동합니다.
======================================================================= */

/* ---------- State ---------- */
let tasks = [];         // 모든 할 일 데이터를 담는 배열 (메모리)
let selectedISO = new Date().toISOString().slice(0, 10); // 오늘 날짜 기본 선택
let currentEditingId = null; // 수정 중인 task의 ID 추적

/* ---------- DOM refs ---------- */
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

/* ---------- Utils ---------- */
// 고유 ID 생성 함수
const uuid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

// 날짜 객체를 'YYYY-MM-DD' 형식의 문자열로 변환
const iso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  .toISOString().slice(0, 10);

/* ---------- Data Persistence (LocalStorage) ---------- */
// ✅ 데이터를 브라우저에 저장하는 함수
function saveTasks() {
  localStorage.setItem('plannerTasks', JSON.stringify(tasks));
}

// ✅ 브라우저에서 데이터를 불러오는 함수
function loadTasks() {
  const savedTasks = localStorage.getItem('plannerTasks');
  return savedTasks ? JSON.parse(savedTasks) : [];
}

/* ---------- CRUD (Create, Read, Update, Delete) ---------- */
function addOrUpdateTask() {
  const name = taskName.value.trim();
  if (!name) {
    alert("과제명은 필수입니다.");
    return;
  }

  if (currentEditingId) { // 수정 모드
    const task = tasks.find(t => t.id === currentEditingId);
    if (task) {
      task.subject = subject.value.trim();
      task.name = name;
      task.memo = memo.value.trim();
      task.date = selectedISO;
    }
    currentEditingId = null; // 수정 모드 종료
  } else { // 추가 모드
    const newTask = {
      id: uuid(),
      subject: subject.value.trim(),
      name,
      memo: memo.value.trim(),
      date: selectedISO,
      done: false,
      createdAt: Date.now()
    };
    tasks.push(newTask);
  }

  saveTasks(); // 변경사항 저장
  renderAll(); // 화면 전체 새로고침
  
  // 입력 필드 초기화
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
  drawCalendar(); // 선택 날짜가 바뀌었을 수 있으므로 달력 다시 그림
}

/* ---------- UI Rendering ---------- */
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
    chk.type = "checkbox";
    chk.className = "chk";
    chk.checked = t.done;
    chk.onchange = () => toggleTask(t.id, chk.checked);

    const text = document.createElement("span");
    text.className = "text";
    const subj = t.subject ? `[${t.subject}] ` : "";
    const dateStr = t.date ? `${t.date.slice(5).replace('-', '/')} ` : '';
    text.textContent = `${dateStr}${subj}${t.name}${t.memo ? " · " + t.memo : ""}`;

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "수정";
    editBtn.onclick = () => enterEditMode(t);

    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.textContent = "삭제";
    delBtn.onclick = () => deleteTask(t.id);

    li.append(chk, text, editBtn, delBtn);
    listEl.append(li);
  }
}

/* ---------- Calendar ---------- */
let cur = new Date(); cur.setDate(1);

function drawCalendar() {
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat("ko", { year: "numeric", month: "long" }).format(cur);

  const y = cur.getFullYear(), m = cur.getMonth();
  const start = (new Date(y, m, 1).getDay() + 6) % 7;
  const last = new Date(y, m + 1, 0).getDate();
  const prevLast = new Date(y, m, 0).getDate();
  const todayISO = new Date().toISOString().slice(0, 10);

  const byDate = {};
  for (const t of tasks) {
    if (!t.date) continue;
    (byDate[t.date] ||= []).push(t);
  }

  const addCell = (n, d, muted) => {
    const cell = document.createElement("div");
    cell.className = "cell" + (muted ? " muted" : "");
    cell.textContent = String(n);

    const dISO = iso(d);
    if (dISO === todayISO) cell.classList.add("today");
    if (byDate[dISO]?.length) cell.classList.add("hasTasks");
    if (dISO === selectedISO) cell.classList.add("selected");

    cell.addEventListener("click", () => {
      selectedISO = dISO;
      drawCalendar();
    });

    cell.addEventListener("mouseenter", (e) => {
      const arr = byDate[dISO] || [];
      if (arr.length === 0) { tip.hidden = true; return; }
      
      tip.innerHTML = `<ul>${arr.map(t => `<li style="${t.done ? 'text-decoration:line-through;opacity:0.6' : ''}">${t.name}</li>`).join('')}</ul>`;
      tip.hidden = false;

      const gap = 8, cellRect = e.currentTarget.getBoundingClientRect(), cardRect = grid.closest(".calendar").getBoundingClientRect(), tipRect = tip.getBoundingClientRect();
      let left = cellRect.left + cellRect.width / 2 - cardRect.left - tipRect.width / 2;
      let top = cellRect.bottom - cardRect.top + gap;
      left = Math.max(4, Math.min(left, cardRect.width - tipRect.width - 4));
      if (top + tipRect.height > cardRect.height - 4) top = cellRect.top - cardRect.top - tipRect.height - gap;
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    });
    cell.addEventListener("mouseleave", () => tip.hidden = true);
    grid.appendChild(cell);
  };

  for (let i = 0; i < start; i++) addCell(prevLast - start + 1 + i, new Date(y, m - 1, prevLast - start + 1 + i), true);
  for (let d = 1; d <= last; d++) addCell(d, new Date(y, m, d), false);
  const tail = (7 - (start + last) % 7) % 7;
  for (let i = 1; i <= tail; i++) addCell(i, new Date(y, m + 1, i), true);
}

/* ---------- Boot / Initializer ---------- */
function init() {
  // 요일 헤더 그리기
  ["월", "화", "수", "목", "금", "토", "일"].forEach(w => {
    const d = document.createElement("div");
    d.textContent = w;
    wdEl.appendChild(d);
  });
  
  // 이벤트 리스너 연결
  dateBtn.onclick = addOrUpdateTask;
  taskName.addEventListener("keydown", e => e.key === "Enter" && addOrUpdateTask());
  memo.addEventListener("keydown", e => e.key === "Enter" && addOrUpdateTask());
  prev.onclick = () => { cur.setMonth(cur.getMonth() - 1); drawCalendar(); };
  next.onclick = () => { cur.setMonth(cur.getMonth() + 1); drawCalendar(); };
  document.addEventListener("click", e => !grid.contains(e.target) && (tip.hidden = true));

  // 데이터 불러와서 화면에 그리기
  tasks = loadTasks();
  renderAll();
}

// 앱 시작!
init();
