/* ===== Study Planner - Tabs (Active / Done) ===== */

// ---------- State ----------
let tasks = [];
let selectedISO = new Date().toISOString().slice(0, 10);
let currentEditingId = null;
let cur = new Date(); cur.setDate(1);
let activeTab = 'active'; // 'active' | 'done'

// ---------- DOM refs ----------
const subject  = document.getElementById("subject");
const taskName = document.getElementById("taskName");
const memo     = document.getElementById("memo");
const dateBtn  = document.getElementById("dateBtn");

const listEl   = document.getElementById("todoList");
const hintEl   = document.getElementById("emptyHint");

const doneListEl     = document.getElementById("doneList");
const emptyDoneHint  = document.getElementById("emptyDoneHint");

const grid     = document.getElementById("grid");
const label    = document.getElementById("calLabel");
const prev     = document.getElementById("prevMon");
const next     = document.getElementById("nextMon");
const wdEl     = document.getElementById("wd");
const tooltip  = document.getElementById("tooltip");

const inputBox = document.getElementById("inputBox");
const tabActiveBtn = document.getElementById("tabActive");
const tabDoneBtn   = document.getElementById("tabDone");

// ---------- Utils ----------
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  }));
const iso = d => {
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
};

// ---------- Data ----------
const saveTasks = () => localStorage.setItem('plannerTasks', JSON.stringify(tasks));
const loadTasks = () => JSON.parse(localStorage.getItem('plannerTasks') || '[]');

// ---------- CRUD ----------
function addOrUpdateTask(){
  const name = taskName.value.trim();
  if (!name) return alert("과제명은 필수입니다.");

  if (currentEditingId){
    const t = tasks.find(x => x.id === currentEditingId);
    if (t) Object.assign(t, {
      subject: subject.value.trim(),
      name,
      memo: memo.value.trim(),
      date: selectedISO
    });
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
  subject.value = ""; taskName.value = ""; memo.value = "";
  taskName.focus();
}

function toggleTask(id){
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  renderAll();
}

// Notion confirm 대체: 2단계 확인
function askDeleteConfirm(btn, id){
  if (btn.dataset.confirming === "1"){ performDelete(id); return; }
  btn.dataset.confirming = "1";
  const prevText = btn.textContent;
  btn.textContent = "확인";
  btn.classList.add("confirming");
  clearTimeout(btn._t);
  btn._t = setTimeout(() => {
    btn.dataset.confirming = "0";
    btn.textContent = prevText;
    btn.classList.remove("confirming");
  }, 2000);
}
function performDelete(id){
  tasks = tasks.filter(x => x.id !== id);
  saveTasks();
  renderAll();
}

function enterEditMode(t){
  subject.value = t.subject || "";
  taskName.value = t.name || "";
  memo.value = t.memo || "";
  selectedISO = t.date;
  currentEditingId = t.id;
  taskName.focus();
  drawCalendar();
}

// ---------- Render ----------
const renderAll = () => { renderActiveList(); renderDoneList(); drawCalendar(); updateTabView(); };

function sortByDateThenCreated(a,b){
  return (a.date || "").localeCompare(b.date || "") || a.createdAt - b.createdAt;
}

// Active(미완료) 리스트
function renderActiveList(){
  const items = tasks.filter(t => !t.done).sort(sortByDateThenCreated);
  listEl.innerHTML = "";
  hintEl.hidden = items.length !== 0 ? true : false;

  items.forEach(t => {
    const li = document.createElement("li");
    const subj = t.subject ? `[${t.subject}] ` : "";
    const dateTx = t.date ? `${t.date.slice(5).replace('-', '/')} ` : "";
    const memoTx = t.memo ? ` · ${t.memo}` : "";

    li.innerHTML = `
      <input type="checkbox" class="chk" ${t.done ? "checked":""}>
      <span class="text">${dateTx}${subj}${t.name}${memoTx}</span>
      <button class="edit-btn" title="수정">수정</button>
      <button class="del-btn" title="삭제">삭제</button>
    `;
    li.querySelector(".chk").onchange = () => toggleTask(t.id);
    li.querySelector(".edit-btn").onclick = () => enterEditMode(t);
    const delBtn = li.querySelector(".del-btn");
    delBtn.onclick = (e) => { e.stopPropagation(); askDeleteConfirm(delBtn, t.id); };

    listEl.appendChild(li);
  });
}

// Done(완료) 리스트
function renderDoneList(){
  const items = tasks.filter(t => t.done).sort(sortByDateThenCreated);
  doneListEl.innerHTML = "";
  emptyDoneHint.hidden = items.length !== 0 ? true : false;

  items.forEach(t => {
    const li = document.createElement("li");
    const subj = t.subject ? `[${t.subject}] ` : "";
    const dateTx = t.date ? `${t.date.slice(5).replace('-', '/')} ` : "";
    const memoTx = t.memo ? ` · ${t.memo}` : "";

    li.innerHTML = `
      <input type="checkbox" class="chk" checked>
      <span class="text">${dateTx}${subj}${t.name}${memoTx}</span>
      <button class="edit-btn" title="수정">수정</button>
      <button class="del-btn" title="삭제">삭제</button>
    `;
    // 체크 해제 → 다시 활성 리스트로 이동
    li.querySelector(".chk").onchange = () => toggleTask(t.id);
    // 완료된 것도 수정 가능(체크 해제 후 다시 추가해도 되고, 그대로 편집 가능)
    li.querySelector(".edit-btn").onclick = () => enterEditMode(t);
    const delBtn = li.querySelector(".del-btn");
    delBtn.onclick = (e) => { e.stopPropagation(); askDeleteConfirm(delBtn, t.id); };

    doneListEl.appendChild(li);
  });
}

// Calendar 그대로
function drawCalendar(){
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat("ko", {year:"numeric", month:"long"}).format(cur);
  const todayISO = iso(new Date());

  const byDate = tasks.reduce((acc,t)=>{
    if (t.date) (acc[t.date] ||= []).push(t);
    return acc;
  },{});

  const y = cur.getFullYear();
  const m = cur.getMonth();
  const first = new Date(y, m, 1);
  const start = new Date(first);
  start.setDate(start.getDate() - (first.getDay() + 6) % 7);

  for (let i=0;i<42;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    const dISO = iso(d);
    const cell = document.createElement("div");
    cell.className = "cell";
    if (d.getMonth() !== m) cell.classList.add("muted");
    if (dISO === todayISO) cell.classList.add("today");
    if (dISO === selectedISO) cell.classList.add("selected");

    const tasksForDay = byDate[dISO];
    if (tasksForDay && tasksForDay.length){
      cell.classList.add("hasTasks");
      cell.addEventListener("mouseenter", ()=> showTooltip(cell, tasksForDay));
      cell.addEventListener("mouseleave", hideTooltip);
    }

    cell.textContent = d.getDate();
    cell.onclick = () => { selectedISO = dISO; drawCalendar(); };
    grid.appendChild(cell);
  }
}

// Tooltip (viewport-fixed)
function showTooltip(cell, tasksForDay){
  tooltip.innerHTML = tasksForDay.map(t => `• ${t.name}`).join('<br>');
  tooltip.style.position = 'fixed';
  tooltip.classList.add('visible');

  const ttW = tooltip.offsetWidth;
  const ttH = tooltip.offsetHeight;
  const r = cell.getBoundingClientRect();

  let top  = r.bottom + 6;
  let left = r.left + (r.width - ttW) / 2;

  const pad = 8;
  left = Math.max(pad, Math.min(left, window.innerWidth - ttW - pad));
  if (top + ttH > window.innerHeight - pad){ top = r.top - ttH - 6; }

  tooltip.style.top  = `${top}px`;
  tooltip.style.left = `${left}px`;
}
function hideTooltip(){ tooltip.classList.remove('visible'); }

// ---------- Tabs ----------
function setTab(tab){
  activeTab = tab; // 'active' or 'done'
  updateTabView();
}
function updateTabView(){
  // 탭 버튼 상태
  tabActiveBtn.classList.toggle('active', activeTab === 'active');
  tabDoneBtn.classList.toggle('active', activeTab === 'done');

  // 입력 박스 / 리스트 토글
  inputBox.hidden   = (activeTab !== 'active');
  listEl.hidden     = (activeTab !== 'active');
  hintEl.hidden     = (activeTab !== 'active') ? true : (listEl.children.length !== 0);

  doneListEl.hidden    = (activeTab !== 'done');
  emptyDoneHint.hidden = (activeTab !== 'done') ? true : (doneListEl.children.length !== 0);
}

// ---------- Init ----------
function init(){
  selectedISO = iso(new Date());
  wdEl.innerHTML = "";
  ["월","화","수","목","금","토","일"].forEach(w=>{
    const d = document.createElement("div"); d.textContent = w; wdEl.appendChild(d);
  });

  dateBtn.onclick = addOrUpdateTask;
  const onEnter = e => { if (e.key === "Enter") addOrUpdateTask(); };
  taskName.addEventListener("keydown", onEnter);
  memo.addEventListener("keydown", onEnter);

  prev.onclick = () => { cur.setMonth(cur.getMonth()-1); drawCalendar(); };
  next.onclick = () => { cur.setMonth(cur.getMonth()+1); drawCalendar(); };

  // 탭 이벤트
  tabActiveBtn.onclick = () => setTab('active');
  tabDoneBtn.onclick   = () => setTab('done');

  tasks = loadTasks();
  renderAll();
}
init();
