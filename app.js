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

  // ✅ 날짜는 항상 달력 선택값(selectedISO) 사용
  const chosenDate = selectedISO;

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

// ✅ 수정 진입: 달력에서 날짜만 골라서 저장하게
function enterEditMode(t){
  setTab('active');

  subject.value  = t.subject || "";
  taskName.value = t.name || "";
  memo.value     = t.memo || "";

  // 캘린더에 해당 날짜를 선택 표시
  selectedISO       = t.date || selectedISO;
  currentEditingId  = t.id;

  // 입력칸으로 포커스, 캘린더 갱신
  taskName.focus();
  drawCalendar();

  // (선택) 상단에 살짝 힌트 주고 싶다면:
  // console.info('수정 모드: 달력에서 날짜를 클릭하면 그 날짜로 저장됩니다.');
}

// ---------- Render ----------
const renderAll = () => { renderActiveList(); renderDoneList(); drawCalendar(); updateTabView(); };

function sortByDateThenCreated(a,b){
  return (a.date || "").localeCompare(b.date || "") || a.createdAt - b.createdAt;
}

function renderActiveList(){
  const items = tasks.filter(t => !t.done).sort(sortByDateThenCreated);
  listEl.innerHTML = "";
  hintEl.hidden = items.length !== 0;

  if (items.length === 0) return;

  const todayISO = iso(new Date());
  let dividerInserted = false;

  items.forEach((t, index) => {
    const isFuture = t.date > todayISO;

    // ✅ 미래 날짜 리스트에서 처음 등장할 때 Divider 삽입
    if (isFuture && !dividerInserted) {
      const sep = document.createElement("div");
      sep.className = "today-separator";
      sep.innerHTML = `<span>앞으로 할 일</span>`;
      listEl.appendChild(sep);
      dividerInserted = true;
    }

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
    li.querySelector(".del-btn").onclick = (e) => { e.stopPropagation(); askDeleteConfirm(li.querySelector(".del-btn"), t.id); };

    listEl.appendChild(li);
  });
}


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

// Calendar: 클릭하면 항상 selectedISO 갱신(편집 중이면 그 날짜로 저장됨)
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
      // ✅ 달력 클릭 = 날짜 설정
      selectedISO = dISO;
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
  activeTab = tab;
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
