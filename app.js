// ========= DATA =========
const KEY = 'study_tasks_v1';
const load = () => JSON.parse(localStorage.getItem(KEY) || '[]');
const save = (v) => localStorage.setItem(KEY, JSON.stringify(v));
const todayISO = () => new Date().toISOString().slice(0,10);

// ========= ELEMENTS =========
const subject   = document.getElementById('subject');
const taskName  = document.getElementById('taskName');
const memo      = document.getElementById('memo');
const dateBtn   = document.getElementById('dateBtn');
const dateInput = document.getElementById('todoDate');
const addBtn    = document.getElementById('addBtn');
const listEl    = document.getElementById('todoList');
const emptyHint = document.getElementById('emptyHint');

// 초기 날짜 = 오늘
dateInput.value = todayISO();

// 달력 요소
const wdEl    = document.getElementById('wd');
const gridEl  = document.getElementById('grid');
const labelEl = document.getElementById('calLabel');
const prevBtn = document.getElementById('prevMon');
const nextBtn = document.getElementById('nextMon');
const tooltip = document.getElementById('tooltip');
const calBox  = document.getElementById('calBox');

// ========= INPUT UX =========
// 달력 아이콘 하나로 date picker 열기
dateBtn.onclick = () => {
  if (dateInput.showPicker) dateInput.showPicker(); // 크롬/엣지/사파리 지원
  else dateInput.click(); // fallback
};

// 추가
addBtn.onclick = () => {
  const name = taskName.value.trim();
  if (!name) return;

  const tasks = load();
  tasks.push({
    id: crypto.randomUUID(),
    subject: subject.value,
    name,
    memo: memo.value.trim(),
    date: dateInput.value || todayISO(),
    done: false,
    createdAt: Date.now()
  });
  save(tasks);

  taskName.value = '';
  memo.value = '';
  renderTodos();
  drawCalendar();
};

// ========= TODO RENDER =========
function renderTodos(){
  const tasks = load().filter(t => !t.done)
    .sort((a,b)=> (a.date||'').localeCompare(b.date||'') || a.createdAt - b.createdAt);

  listEl.innerHTML = '';
  if (tasks.length === 0){ emptyHint.style.display='block'; return; }
  emptyHint.style.display='none';

  for(const t of tasks){
    const li = document.createElement('li');

    const left = document.createElement('div');
    left.innerHTML = `<strong>${t.subject}</strong> · ${t.name}` +
      (t.memo ? `<span class="meta">· ${t.memo}</span>` : '');

    const right = document.createElement('div');
    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn';
    doneBtn.textContent = '✓';
    doneBtn.title = '완료';
    doneBtn.onclick = () => {
      const all = load();
      const idx = all.findIndex(x=>x.id===t.id);
      if (idx>-1){
        all[idx].done = true; // 리스트에서는 사라지지만
        save(all);            // 달력에는 기록 유지
        renderTodos();
        drawCalendar();
      }
    };

    const delBtn = document.createElement('button');
    delBtn.className = 'btn del';
    delBtn.textContent = '삭제';
    delBtn.onclick = () => {
      const all = load().filter(x=>x.id!==t.id);
      save(all); renderTodos(); drawCalendar();
    };

    right.append(doneBtn, delBtn);
    li.append(left, right);
    listEl.appendChild(li);
  }
}

// ========= CALENDAR RENDER =========
['월','화','수','목','금','토','일'].forEach(w=>{
  const d=document.createElement('div'); d.textContent=w; wdEl.appendChild(d);
});

let cur = new Date();
cur.setDate(1);

prevBtn.onclick = ()=>
