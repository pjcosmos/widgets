/* ===== Study Planner - Tabs (Active / Done) ===== */

// ---------- State ----------
let tasks = [];
let selectedISO = new Date().toISOString().slice(0, 10);
let currentEditingId = null;
let cur = new Date(); cur.setDate(1);
let activeTab = 'active'; // 'active' | 'done'

// ---------- DOM refs ----------
const subject      = document.getElementById("subject");
const taskName     = document.getElementById("taskName");
const memo         = document.getElementById("memo");
const dateBtn      = document.getElementById("dateBtn");
const dateInput    = document.getElementById("dateInput"); // ✅ 날짜 입력

const listEl       = document.getElementById("todoList");
const hintEl       = document.getElementById("emptyHint");

const doneListEl   = document.getElementById("doneList");
const emptyDoneHint= document.getElementById("emptyDoneHint");

const grid         = document.getElementById("grid");
const label        = document.getElementById("calLabel");
const prev         = document.getElementById("prevMon");
const next         = document.getElementById("nextMon");
const wdEl         = document.getElementById("wd");
const tooltip      = document.getElementById("tooltip");

const inputBox     = document.getElementById("inputBox");
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

  // ✅ dateInput 우선, 비어있으면 selectedISO
  const chosenDate = (dateInput.value || selectedISO);

  if (currentEditingId){
    const t = tasks.find(x => x.id === currentEditingId);
    if (t) Object.assign(t, {
      subject: subject.value.trim(),
      name,
      memo: memo.value.trim(),
      date: chosenDate
    });
    currentEditingId = null;
  } else {
    tasks.push({
      id: uuid(),
      subject: subject.value.trim(),
      name,
      memo: memo.value.trim(),
      date: chosenDate,
      done: false,
      createdAt: Date.now()
    });
  }
  // ✅ state 동기화
  selectedISO = chosenDate;
  saveTasks();
  renderAll();

  subject.value = ""; taskName.value = ""; memo.value = "";
  // 새로 추가할 때 날짜는 유지(연속 입력 편의)
  taskName.focus();
}

function toggleTask(id){
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTasks();
  renderAll();
}

// 2단계 삭제 확인
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
  // 1) '할 일 입력' 탭으로 전환
  setTab('active');

  // 2) 입력값 채우기
  subject.value   = t.subject || "";
  taskName.value  = t.name || "";
  memo.value      = t.memo || "";

  // 3) 날짜 동기화
  selectedISO     = t.date || selectedISO;
  if (typeof dateInput !== 'undefined' && dateInput) {
    dateInput.value = t.date || "";
  }

  // 4) 편집 상태 지정
  currentEditingId = t.id;

  // 5) 날짜 입력칸 포커스 + 하이라이트
  if (dateInput) {
    dateInput.focus({ preventScroll: true });
    dateInput.classList.remove('pulse'); // 재적용 위해 제거
    void dateInput.offsetWidth;          // 강제 리플로우
    dateInput.classList.add('pulse');
  }

  // 6) 입력 박스가 화면에 잘 보이게
  document.getElementById('inputBox')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // 7) 캘린더 선택일 강조 갱신
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
  hintEl.hidden = items.length !== 0;

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
  emptyDoneHint.hidden = items.length !== 0;

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
    li.querySelector(".chk").onchange = () => toggleTask(t.id);
    li.querySelector(".edit-btn").onclick = () => enterEditMode(t);
    const delBtn = li.querySelector(".del-btn");
    delBtn.onclick = (e) => { e.stopPropagation(); askDeleteConfirm(delBtn, t.id); };

    doneListEl.appendChild(li);
  });
}

// Calendar
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
    cell.onclick = () => {
      selectedISO = dISO;
      // ✅ 달력 클릭 시 dateInput 동기화
      dateInput.value = dISO;
      drawCalendar();
    };
    grid.appendChild(cell);
  }
}

// Tooltip
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
  tabActiveBtn.classList.toggle('active', activeTab === 'active');
  tabDoneBtn.classList.toggle('active', activeTab === 'done');

  inputBox.hidden   = (activeTab !== 'active');
  listEl.hidden     = (activeTab !== 'active');
  hintEl.hidden     = (activeTab !== 'active') ? true : (listEl.children.length !== 0);

  doneListEl.hidden    = (activeTab !== 'done');
  emptyDoneHint.hidden = (activeTab !== 'done') ? true : (doneListEl.children.length !== 0);
}

// ---------- Init ----------
function init(){
  selectedISO = iso(new Date());
  dateInput.value = selectedISO;             // ✅ 초기값 세팅

  // 날짜 입력 직접 변경 시에도 state 동기화
  dateInput.addEventListener('change', () => {
    if (dateInput.value){
      selectedISO = dateInput.value;
      drawCalendar();
    }
  });

  wdEl.innerHTML = "";
  ["월","화","수","목","금","토","일"].forEach(w=>{
    const d = document.createElement("div"); d.textContent = w; wdEl.appendChild(d);
  });

  dateBtn.onclick = addOrUpdateTask;
  const onEnter = e => { if (e.key === "Enter") addOrUpdateTask(); };
  taskName.addEventListener("keydown", onEnter);
  memo.addEventListener("keydown", onEnter);
  subject.addEventListener("keydown", (e)=>{ if (e.key==="Enter") taskName.focus(); });

  prev.onclick = () => { cur.setMonth(cur.getMonth()-1); drawCalendar(); };
  next.onclick = () => { cur.setMonth(cur.getMonth()+1); drawCalendar(); };

  tabActiveBtn.onclick = () => setTab('active');
  tabDoneBtn.onclick   = () => setTab('done');

  tasks = loadTasks();
  renderAll();
}
init();
