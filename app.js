/* ===== Study Planner - Firebase Firestore Sync (FULL REPLACEMENT) =====
   - 기기/브라우저/노션 임베드 간 자동 동기화
   - 익명 로그인 + Firestore 컬렉션(users/{uid}/tasks)
   - 기존 UI/동작(달력 선택 → 아이콘 클릭으로 즉시 추가, 체크로 완료, 툴팁)은 그대로
======================================================================= */

/* ---------- Firebase refs ---------- */
const auth = firebase.auth();
const db   = firebase.firestore();

// 오프라인 캐시(선택): 안정성 ↑  (원하면 주석 해제)
// db.enablePersistence().catch(()=>{}); 

/* ---------- State ---------- */
let uid = null;
let unsubscribe = null;  // Firestore onSnapshot 해제용
let tasks = [];          // 메모리 미러 (필터/정렬/툴팁 구성을 빠르게)

/* 오늘을 기본 선택 날짜로 */
let selectedISO = new Date().toISOString().slice(0, 10);

/* ---------- DOM refs ---------- */
// Todo
const subject  = document.getElementById("subject");
const taskName = document.getElementById("taskName");
const memo     = document.getElementById("memo");
const dateBtn  = document.getElementById("dateBtn");
const addBtn   = document.getElementById("addBtn"); // 숨김용(안씀)
const listEl   = document.getElementById("todoList");
const hintEl   = document.getElementById("emptyHint");
// Calendar
const wdEl  = document.getElementById("wd");
const grid  = document.getElementById("grid");
const label = document.getElementById("calLabel");
const prev  = document.getElementById("prevMon");
const next  = document.getElementById("nextMon");
const tip   = document.getElementById("tooltip");

/* ---------- Utils ---------- */
const uuid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });

const iso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
                  .toISOString().slice(0,10);

/* ---------- Auth & Live Snapshot ---------- */
async function ensureSignedIn() {
  const cred = await auth.signInAnonymously();
  uid = cred.user.uid;
  bindLiveQuery();
}

function bindLiveQuery() {
  if (!uid) return;
  // 기존 구독 있으면 해제
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }

  const ref = db.collection('users').doc(uid).collection('tasks');
  unsubscribe = ref.onSnapshot(snap => {
    const arr = [];
    snap.forEach(doc => arr.push(doc.data()));
    // createdAt 오름차순, 날짜 → createdAt 정렬
    tasks = arr.sort((a,b) =>
      (a.date||"").localeCompare(b.date||"") || (a.createdAt||0)-(b.createdAt||0)
    );
    renderTodos();
    drawCalendar();
  });
}

/* ---------- CRUD ---------- */
async function addTaskQuick() {
  const name = taskName.value.trim();
  if (!name || !uid) return;

  const t = {
    id: uuid(),
    subject: subject.value.trim(),
    name,
    memo: memo.value.trim(),
    date: selectedISO,  // 현재 선택 날짜
    done: false,
    createdAt: Date.now()
  };
  await db.collection('users').doc(uid).collection('tasks').doc(t.id).set(t);

  taskName.value = "";
  memo.value = "";
}

async function toggleDone(id) {
  if (!uid) return;
  await db.collection('users').doc(uid).collection('tasks').doc(id).update({ done: true });
}

async function deleteTask(id) {
  if (!uid) return;
  await db.collection('users').doc(uid).collection('tasks').doc(id).delete();
}

/* ---------- Todo UI ---------- */
dateBtn.onclick = addTaskQuick;
taskName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTaskQuick();
});

/* 목록 렌더링 (미완료만) */
function renderTodos() {
  const items = load()
    .filter(t => !t.done)
    .sort((a, b) => (a.date || "").localeCompare(b.date || "") || a.createdAt - b.createdAt);

  listEl.innerHTML = "";
  if (items.length === 0) {
    hintEl.style.display = "block";
    return;
  }
  hintEl.style.display = "none";

  for (const t of items) {
    const li = document.createElement("li");

    // 완료 체크박스
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "chk";
    chk.title = "완료";
    chk.onchange = () => {
      const all = load();
      const idx = all.findIndex(x => x.id === t.id);
      if (idx > -1) {
        all[idx].done = true;
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

    // ⬅️ 수정 버튼 추가
    const edit = document.createElement("button");
    edit.className = "del";  // 같은 스타일 사용
    edit.style.color = "#444"; // 삭제와 구분
    edit.textContent = "수정";

    edit.onclick = () => {
      // 입력창에 값 복원
      subject.value = t.subject || "";
      taskName.value = t.name || "";
      memo.value = t.memo || "";
      selectedISO = t.date || selectedISO;

      // 기존 항목 삭제한 뒤 다시 저장 → 수정 효과
      save(load().filter(x => x.id !== t.id));
      renderTodos();
      drawCalendar();
    };

    // 삭제 버튼
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "삭제";
    del.onclick = () => {
      save(load().filter(x => x.id !== t.id));
      renderTodos();
      drawCalendar();
    };

    li.append(chk, text, edit, del);
    listEl.append(li);
  }
}


/* ---------- Calendar ---------- */
["월","화","수","목","금","토","일"].forEach(w=>{
  const d=document.createElement("div");
  d.textContent = w;
  wdEl.appendChild(d);
});

let cur = new Date(); cur.setDate(1);
prev.onclick = ()=>{ cur.setMonth(cur.getMonth()-1); drawCalendar(); };
next.onclick = ()=>{ cur.setMonth(cur.getMonth()+1); drawCalendar(); };

function drawCalendar(){
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat("ko",{year:"numeric",month:"long"}).format(cur);

  const y=cur.getFullYear(), m=cur.getMonth();
  const start    = (new Date(y,m,1).getDay()+6)%7; // 월=0
  const last     = new Date(y,m+1,0).getDate();
  const prevLast = new Date(y,m,0).getDate();
  const todayISO = new Date().toISOString().slice(0,10);

  // 날짜별 그룹(완료 포함: 기록 유지)
  const byDate = {};
  for (const t of tasks) {
    if (!t.date) continue;
    (byDate[t.date] ||= []).push(t);
  }

  const addCell = (n, d, muted)=>{
    const cell = document.createElement("div");
    cell.className = "cell" + (muted ? " muted" : "");
    cell.textContent = String(n);

    const dISO = iso(d);
    if (dISO === todayISO)    cell.classList.add("today");
    if (byDate[dISO]?.length) cell.classList.add("hasTasks");
    if (dISO === selectedISO) cell.classList.add("selected");

    // 날짜 선택
    cell.addEventListener("click", ()=>{
      selectedISO = dISO;
      grid.querySelectorAll(".cell.selected").forEach(c=>c.classList.remove("selected"));
      cell.classList.add("selected");
      cell.animate(
        [{transform:"scale(1)"},{transform:"scale(.96)"},{transform:"scale(1)"}],
        {duration:140}
      );
    });

    // 툴팁: 셀 아래 중앙 (가장자리 자동 반전)
    cell.addEventListener("mouseenter", (e)=>{
      const arr = byDate[dISO] || [];
      if (arr.length === 0){ tip.hidden = true; return; }

      tip.innerHTML = "";
      const ul = document.createElement("ul");
      arr.forEach(t=>{
        const li=document.createElement("li");
        li.textContent = t.name;
        ul.appendChild(li);
      });
      tip.appendChild(ul);
      tip.hidden = false;

      const gap = 8;
      const cellRect = e.currentTarget.getBoundingClientRect();
      const cardRect = grid.closest(".calendar").getBoundingClientRect();

      // 배치 후 사이즈 측정
      tip.style.left = "0px";
      tip.style.top  = "0px";
      const tipRect1 = tip.getBoundingClientRect();
      let tipW = tipRect1.width || 260;
      let tipH = tipRect1.height || 40;

      // 기본: 아래 중앙
      let left = (cellRect.left + cellRect.right)/2 - cardRect.left - tipW/2;
      let top  = cellRect.bottom - cardRect.top + gap;

      // 가로 클램프
      const minL = 4, maxL = cardRect.width - tipW - 4;
      if (left < minL) left = minL;
      if (left > maxL) left = maxL;

      // 세로 넘치면 위 반전
      if (top + tipH > cardRect.height - 4) {
        top = cellRect.top - cardRect.top - tipH - gap;
        if (top < 4) top = 4;
      }

      tip.style.left = `${left}px`;
      tip.style.top  = `${top}px`;
    });
    cell.addEventListener("mouseleave", ()=> tip.hidden = true);

    grid.appendChild(cell);
  };

  // 앞/본/뒤 달 채우기
  for (let i=0;i<start;i++){
    const dnum = prevLast - start + 1 + i;
    addCell(dnum, new Date(y,m-1,dnum), true);
  }
  for (let d=1; d<=last; d++) addCell(d, new Date(y,m,d), false);
  const total = start + last;
  const tail  = (7 - (total % 7)) % 7;
  for (let i=1;i<=tail;i++) addCell(i, new Date(y,m+1,i), true);
}

// 그리드 바깥 클릭 시 툴팁 닫기
document.addEventListener("click", (ev)=>{
  if (!grid.contains(ev.target)) {
    tip.hidden = true;
    tip.removeAttribute('data-for');
  }
}, {passive:true});

/* ---------- Boot ---------- */
ensureSignedIn();
