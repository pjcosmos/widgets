// ===== Storage =====
const KEY = "tasks_ui_gray_v1";
const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
const save = v => localStorage.setItem(KEY, JSON.stringify(v));

// ===== Todo Elements =====
const subject  = document.getElementById("subject");
const taskName = document.getElementById("taskName");
const memo     = document.getElementById("memo");
const dateBtn  = document.getElementById("dateBtn");
const dateIn   = document.getElementById("todoDate");
const addBtn   = document.getElementById("addBtn");
const listEl   = document.getElementById("todoList");
const hintEl   = document.getElementById("emptyHint");

// init date = today
dateIn.value = new Date().toISOString().slice(0,10);
dateBtn.onclick = () => { if (dateIn.showPicker) dateIn.showPicker(); else dateIn.click(); };

addBtn.onclick = () => {
  const name = taskName.value.trim();
  if (!name) return;
  const items = load();
  items.push({
    id: crypto.randomUUID(),
    subject: subject.value,
    name,
    memo: memo.value.trim(),
    date: dateIn.value,            // YYYY-MM-DD
    done: false,
    createdAt: Date.now()
  });
  save(items);
  taskName.value = "";
  memo.value = "";
  renderTodos();
  drawCalendar();
};

function renderTodos(){
  const items = load()
    .filter(t => !t.done)
    .sort((a,b)=> (a.date||"").localeCompare(b.date) || a.createdAt-b.createdAt);

  listEl.innerHTML = "";
  if (items.length === 0){ hintEl.style.display="block"; return; }
  hintEl.style.display="none";

  for (const t of items){
    const li = document.createElement("li");

    const left = document.createElement("span");
    left.className = "text";
    left.textContent = `${t.subject} · ${t.name}${t.memo ? " · " + t.memo : ""}`;

    const act = document.createElement("div");
    act.className = "act";

    const doneBtn = document.createElement("button");
    doneBtn.textContent = "✓";
    doneBtn.title = "완료 처리";
    doneBtn.onclick = () => {
      const all = load();
      const idx = all.findIndex(x=>x.id===t.id);
      if (idx>-1){
        all[idx].done = true;         // 리스트에서는 사라지지만
        save(all);                    // 달력 기록은 유지(완료도 포함해 렌더)
        renderTodos();
        drawCalendar();
      }
    };

    const delBtn = document.createElement("button");
    delBtn.textContent = "삭제";
    delBtn.onclick = () => {
      save(load().filter(x=>x.id!==t.id));
      renderTodos();
      drawCalendar();
    };

    act.append(doneBtn, delBtn);
    li.append(left, act);
    listEl.append(li);
  }
}

// ===== Calendar =====
const wdEl   = document.getElementById("wd");
const grid   = document.getElementById("grid");
const label  = document.getElementById("calLabel");
const prev   = document.getElementById("prevMon");
const next   = document.getElementById("nextMon");
const tip    = document.getElementById("tooltip");

// 월~일 헤더
["월","화","수","목","금","토","일"].forEach(w=>{
  const d=document.createElement("div");
  d.textContent=w;
  wdEl.appendChild(d);
});

let cur = new Date();
cur.setDate(1);

prev.onclick = ()=>{ cur.setMonth(cur.getMonth()-1); drawCalendar(); };
next.onclick = ()=>{ cur.setMonth(cur.getMonth()+1); drawCalendar(); };

function drawCalendar(){
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat('ko',{year:'numeric',month:'long'}).format(cur);

  const y=cur.getFullYear(), m=cur.getMonth();
  const start = (new Date(y,m,1).getDay()+6)%7; // 월=0 보정
  const last  = new Date(y,m+1,0).getDate();
  const prevLast = new Date(y,m,0).getDate();
  const todayISO = new Date().toISOString().slice(0,10);

  const iso = d => new Date(d.getFullYear(),d.getMonth(),d.getDate()).toISOString().slice(0,10);

  // 완료 포함 전체 기록을 날짜별로 묶기
  const tasksByDate = {};
  for (const t of load()){
    if (!t.date) continue;
    (tasksByDate[t.date] ||= []).push(t);
  }

  const addCell = (n, d, muted) => {
    const cell = document.createElement("div");
    cell.className = "cell" + (muted ? " muted" : "");
    cell.textContent = String(n);
    const dISO = iso(d);
    if (dISO === todayISO) cell.classList.add("today");
    if ((tasksByDate[dISO]||[]).length) cell.classList.add("hasTasks");

    // hover tooltip
    cell.addEventListener("mouseenter", (e)=>{
      const arr = tasksByDate[dISO] || [];
      if (arr.length === 0){ tip.hidden = true; return; }
      tip.innerHTML = "";
      const ul=document.createElement("ul");
      arr.forEach(t=>{
        const li=document.createElement("li");
        li.textContent = t.name;   // 글자만
        ul.appendChild(li);
      });
      tip.appendChild(ul);
      tip.hidden = false;

      // 위치 계산 (그리드 기준)
      const r = e.currentTarget.getBoundingClientRect();
      const p = grid.getBoundingClientRect();
      const top = r.bottom - p.top + 6;
      let left = r.left - p.left;
      const maxLeft = p.width - 10 - 260;
      if (left > maxLeft) left = maxLeft;
      tip.style.top = `${top}px`;
      tip.style.left = `${left}px`;
    });
    cell.addEventListener("mouseleave", ()=> tip.hidden = true);

    grid.appendChild(cell);
  };

  // 이전달 채우기
  for (let i=0;i<start;i++) addCell(prevLast-start+1+i, new Date(y,m-1,prevLast-start+1+i), true);
  // 이번달
  for (let d=1; d<=last; d++) addCell(d, new Date(y,m,d), false);
  // 다음달 채우기
  const total = start + last;
  const tail = (7 - (total % 7)) % 7;
  for (let i=1;i<=tail;i++) addCell(i, new Date(y,m+1,i), true);
}

// boot
renderTodos();
drawCalendar();
