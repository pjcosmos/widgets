// ===== Storage =====
const KEY = "tasks_ui_gray_v2";
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

// date button -> popover toggle (Notion에서도 확실히 작동)
dateBtn.onclick = () => {
  dateIn.classList.toggle("show");
  if (dateIn.classList.contains("show")) dateIn.focus();
};
dateIn.addEventListener("change", ()=> dateIn.classList.remove("show"));
document.addEventListener("click", (e)=>{
  if (!e.target.closest(".date-wrap")) dateIn.classList.remove("show");
});

function addItem(){
  const name = taskName.value.trim();
  if (!name) return;
  const items = load();
  items.push({
    id: crypto.randomUUID(),
    subject: subject.value.trim(),
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
}
addBtn.onclick = addItem;
taskName.addEventListener("keydown", e=>{ if(e.key==="Enter") addItem(); });

// ===== Todo rendering =====
function renderTodos(){
  const items = load()
    .filter(t => !t.done)
    .sort((a,b)=> (a.date||"").localeCompare(b.date) || a.createdAt-b.createdAt);

  listEl.innerHTML = "";
  if (items.length === 0){ hintEl.style.display="block"; return; }
  hintEl.style.display="none";

  for (const t of items){
    const li = document.createElement("li");

    // 체크박스
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "chk";
    chk.title = "완료";
    chk.onchange = () => {
      const all = load();
      const idx = all.findIndex(x=>x.id===t.id);
      if (idx>-1){
        all[idx].done = true;   // 리스트에서는 제거, 달력에는 기록 유지
        save(all);
        renderTodos();
        drawCalendar();
      }
    };

    // 텍스트
    const text = document.createElement("span");
    text.className = "text";
    const subj = t.subject ? `[${t.subject}] ` : "";
    text.textContent = `${subj}${t.name}${t.memo ? " · " + t.memo : ""}`;

    // 삭제
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "삭제";
    del.onclick = () => {
      save(load().filter(x=>x.id!==t.id));
      renderTodos();
      drawCalendar();
    };

    li.append(chk, text, del);
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

// 요일 헤더
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

    // 날짜 클릭 → 입력 날짜 설정
    cell.addEventListener("click", ()=>{
      dateIn.value = dISO;
      // 눌렀다는 피드백: 잠깐 진하게
      cell.animate([{transform:"scale(1)"},{transform:"scale(.96)"},{transform:"scale(1)"}],{duration:140});
    });

    // hover tooltip (셀 옆)
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

      // 위치: 셀 오른쪽, 경계 넘치면 왼쪽
      const r = e.currentTarget.getBoundingClientRect();
      const p = grid.getBoundingClientRect();
      const preferredLeft = r.right - p.left + 10;
      const leftRoom = p.width - (preferredLeft + 260 + 10);
      const left = leftRoom >= 0
        ? preferredLeft
        : (r.left - p.left - 10 - 260 < 0 ? 4 : r.left - p.left - 10 - 260);
      const top = r.top - p.top;
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
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
