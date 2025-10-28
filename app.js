// ===== 공통 데이터 (localStorage) =====
const KEY = 'ct_tasks_v1';
const load = () => JSON.parse(localStorage.getItem(KEY) || '[]');
const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

const todayISO = () => new Date().toISOString().slice(0,10);
const fmtLabel = (d) => new Intl.DateTimeFormat('ko', {year:'numeric', month:'long'}).format(d);

// ===== To-do UI =====
const todoForm = document.getElementById('todoForm');
const todoText = document.getElementById('todoText');
const todoDate = document.getElementById('todoDate');
const todoList = document.getElementById('todoList');
const emptyHint = document.getElementById('emptyHint');

todoDate.value = todayISO();

todoForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const text = todoText.value.trim();
  const date = todoDate.value;
  if(!text || !date) return;
  const items = load();
  items.push({ id: crypto.randomUUID(), text, date, done:false, createdAt: Date.now() });
  save(items);
  todoText.value = '';
  renderTodos();
  drawCalendar(); // 달력 즉시 반영
});

// 남은 할 일만 렌더링
function renderTodos(){
  const items = load().filter(it => !it.done).sort((a,b)=> a.date.localeCompare(b.date) || a.createdAt-b.createdAt);
  todoList.innerHTML = '';
  if(items.length === 0){
    emptyHint.hidden = false;
    return;
  }
  emptyHint.hidden = true;
  for(const it of items){
    const li = document.createElement('li');
    li.className = 'item';
    const chk = document.createElement('input');
    chk.type = 'checkbox'; chk.className='chk'; chk.checked = false;
    const txt = document.createElement('div');
    txt.className = 'txt'; txt.textContent = it.text;
    const date = document.createElement('div');
    date.className = 'date'; date.textContent = it.date;
    const del = document.createElement('button');
    del.className='del'; del.textContent='삭제';

    chk.onchange = () => { // 체크하면 todo에서는 제거되지만 기록은 유지(done=true)
      const all = load();
      const idx = all.findIndex(x=>x.id===it.id);
      if(idx>-1){ all[idx].done = true; save(all); renderTodos(); drawCalendar(); }
    };
    del.onclick = () => {
      const all = load().filter(x=>x.id!==it.id);
      save(all); renderTodos(); drawCalendar();
    };

    li.append(chk, txt, date, del);
    todoList.appendChild(li);
  }
}

// ===== 달력 UI =====
const wdWrap = document.getElementById('wd');
const grid = document.getElementById('grid');
const label = document.getElementById('calLabel');
const prevBtn = document.getElementById('prevMon');
const nextBtn = document.getElementById('nextMon');
const tooltip = document.getElementById('tooltip');
const calBox = document.getElementById('calBox');

['월','화','수','목','금','토','일'].forEach(w=>{
  const d=document.createElement('div'); d.textContent=w; wdWrap.appendChild(d);
});

let cur = new Date();
cur.setDate(1);

prevBtn.onclick = ()=>{ cur.setMonth(cur.getMonth()-1); drawCalendar(); };
nextBtn.onclick = ()=>{ cur.setMonth(cur.getMonth()+1); drawCalendar(); };

function drawCalendar(){
  grid.innerHTML='';
  label.textContent = fmtLabel(cur);
  const y = cur.getFullYear(), m = cur.getMonth();
  const start = (new Date(y,m,1).getDay()+6)%7; // 월=0
  const last = new Date(y,m+1,0).getDate();
  const prevLast = new Date(y,m,0).getDate();
  const todayStr = todayISO();

  // 앞쪽 이전달
  for(let i=0;i<start;i++){
    addCell(prevLast-start+1+i, new Date(y,m-1,prevLast-start+1+i), true);
  }
  // 이번달
  for(let d=1; d<=last; d++){
    addCell(d, new Date(y,m,d), false);
  }
  // 뒤쪽 다음달
  const total = start + last;
  const tail = (7 - (total%7)) % 7;
  for(let i=1;i<=tail;i++){
    addCell(i, new Date(y,m+1,i), true);
  }

  function addCell(num, dateObj, muted){
    const cell = document.createElement('div');
    cell.className = 'cell' + (muted?' muted':'');
    if(dateObj.toISOString().slice(0,10) === todayStr) cell.classList.add('today');
    cell.textContent = num;
    cell.dataset.date = dateObj.toISOString().slice(0,10);

    // Hover 툴팁: "할 일 텍스트만" 노출
    cell.addEventListener('mouseenter', (e)=>{
      const date = e.currentTarget.dataset.date;
      const tasks = load().filter(t=>t.date===date);
      if(tasks.length===0){ tooltip.hidden = true; return; }

      tooltip.innerHTML = ''; // 글자만 리스트
      const ul = document.createElement('ul'); ul.className='tooltip-list';
      tasks.forEach(t=>{
        const li = document.createElement('li');
        li.textContent = t.text; // ✔️ 텍스트만
        ul.appendChild(li);
      });
      tooltip.appendChild(ul);
      tooltip.hidden = false;

      // 위치 계산 (셀 바로 아래 살짝)
      const boxRect = calBox.getBoundingClientRect();
      const rect = e.currentTarget.getBoundingClientRect();
      const top = rect.bottom - boxRect.top + 6;
      let left = rect.left - boxRect.left;
      // 우측 넘침 방지
      const maxLeft = boxRect.width - 10 - 240; // tooltip 최대폭 고려
      if(left > maxLeft) left = maxLeft;
      tooltip.style.top = `${top}px`;
      tooltip.style.left = `${left}px`;
    });
    cell.addEventListener('mouseleave', ()=>{ tooltip.hidden = true; });

    grid.appendChild(cell);
  }
}

renderTodos();
drawCalendar();
