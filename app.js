/* ===== Study Planner - Firebase Firestore Sync (FULL REPLACEMENT) =====
    - 기기/브라우저/노션 임베드 간 자동 동기화
    - 익명 로그인 + Firestore 컬렉션(users/{uid}/tasks)
    - 기존 UI/동작(달력 선택 → 아이콘 클릭으로 즉시 추가, 체크로 완료, 툴팁)은 그대로
======================================================================= */

/* ---------- Firebase refs ---------- */
const auth = firebase.auth();
const db = firebase.firestore();

/* ---------- State ---------- */
let uid = null;
let unsubscribe = null; // Firestore onSnapshot 해제용
let tasks = [];         // 메모리 미러 (필터/정렬/툴팁 구성을 빠르게)

/* 오늘을 기본 선택 날짜로 */
let selectedISO = new Date().toISOString().slice(0, 10);
let currentEditingId = null; // 수정 중인 task의 ID를 추적

/* ---------- DOM refs ---------- */
// Todo
const subject = document.getElementById("subject");
const taskName = document.getElementById("taskName");
const memo = document.getElementById("memo");
const dateBtn = document.getElementById("dateBtn");
const listEl = document.getElementById("todoList");
const hintEl = document.getElementById("emptyHint");
// Calendar
const wdEl = document.getElementById("wd");
const grid = document.getElementById("grid");
const label = document.getElementById("calLabel");
const prev = document.getElementById("prevMon");
const next = document.getElementById("nextMon");
const tip = document.getElementById("tooltip");

/* ---------- Utils ---------- */
const uuid = () =>
  (crypto.randomUUID && crypto.randomUUID()) ||
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

const iso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  .toISOString().slice(0, 10);

/* ---------- Auth & Live Snapshot ---------- */
async function ensureSignedIn() {
  try {
    const cred = await auth.signInAnonymously();
    uid = cred.user.uid;
    bindLiveQuery();
  } catch (error) {
    console.error("익명 로그인 실패:", error);
  }
}

function bindLiveQuery() {
  if (!uid) return;
  if (unsubscribe) unsubscribe();

  const ref = db.collection('users').doc(uid).collection('tasks');
  unsubscribe = ref.onSnapshot(snap => {
    const arr = [];
    snap.forEach(doc => arr.push(doc.data()));
    tasks = arr;
    renderTodos();
    drawCalendar();
  }, error => {
    console.error("Firestore 데이터 수신 오류:", error);
  });
}

/* ---------- CRUD (Create, Read, Update, Delete) ---------- */
async function addOrUpdateTask() {
  const name = taskName.value.trim();
  if (!name || !uid) return;

  const taskData = {
    subject: subject.value.trim(),
    name,
    memo: memo.value.trim(),
    date: selectedISO,
    done: false,
    createdAt: Date.now()
  };
  
  // ✅ 수정 모드인 경우
  if (currentEditingId) {
    const originalTask = tasks.find(t => t.id === currentEditingId);
    await db.collection('users').doc(uid).collection('tasks').doc(currentEditingId).update({
        ...originalTask, // 기존 데이터 유지
        subject: taskData.subject,
        name: taskData.name,
        memo: taskData.memo,
        date: taskData.date
    });
    currentEditingId = null;
  } else { // ✅ 추가 모드인 경우
    taskData.id = uuid();
    await db.collection('users').doc(uid).collection('tasks').doc(taskData.id).set(taskData);
  }

  // 입력 필드 초기화
  subject.value = "";
  taskName.value = "";
  memo.value = "";
  taskName.focus();
}

// ✅ toggleDone -> toggleTask로 이름 변경, isDone 상태를 직접 받음
async function toggleTask(id, isDone) {
  if (!uid) return;
  await db.collection('users').doc(uid).collection('tasks').doc(id).update({ done: isDone });
  // onSnapshot이 자동으로 UI를 갱신하므로 추가 렌더링 호출 필요 없음
}

async function deleteTask(id) {
  if (!uid) return;
  if (confirm("정말 삭제하시겠습니까?")) {
    await db.collection('users').doc(uid).collection('tasks').doc(id).delete();
  }
}

// ✅ 수정 상태로 전환하는 함수
function enterEditMode(task) {
    subject.value = task.subject || "";
    taskName.value = task.name || "";
    memo.value = task.memo || "";
    selectedISO = task.date; // 날짜도 수정 대상으로 변경
    currentEditingId = task.id;
    taskName.focus();
    drawCalendar(); // 선택된 날짜가 바뀌었으므로 달력 다시 그림
}


/* ---------- UI Event Listeners ---------- */
dateBtn.onclick = addOrUpdateTask;
taskName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addOrUpdateTask();
});
memo.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addOrUpdateTask();
});

/* ---------- Todo UI Rendering ---------- */
function renderTodos() {
  // ✅ 로컬 tasks 배열을 직접 사용, 날짜 -> 생성 시간 순으로 정렬
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
    chk.title = "완료";
    // ✅ onchange 이벤트에서 toggleTask 함수 호출
    chk.onchange = () => toggleTask(t.id, chk.checked);

    const text = document.createElement("span");
    text.className = "text";
    const subj = t.subject ? `[${t.subject}] ` : "";
    text.textContent = `${t.date ? t.date.slice(5).replace('-', '/') : ''} ${subj}${t.name}${t.memo ? " · " + t.memo : ""}`;

    // ✅ 수정 버튼
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "수정";
    editBtn.onclick = () => enterEditMode(t);

    // ✅ 삭제 버튼
    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.textContent = "삭제";
    // ✅ onclick 이벤트에서 deleteTask 함수 호출
    delBtn.onclick = () => deleteTask(t.id);

    li.append(chk, text, editBtn, delBtn);
    listEl.append(li);
  }
}

/* ---------- Calendar (Original code is mostly fine) ---------- */
["월", "화", "수", "목", "금", "토", "일"].forEach(w => {
  const d = document.createElement("div");
  d.textContent = w;
  wdEl.appendChild(d);
});

let cur = new Date(); cur.setDate(1);
prev.onclick = () => { cur.setMonth(cur.getMonth() - 1); drawCalendar(); };
next.onclick = () => { cur.setMonth(cur.getMonth() + 1); drawCalendar(); };

function drawCalendar() {
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat("ko", { year: "numeric", month: "long" }).format(cur);

  const y = cur.getFullYear(), m = cur.getMonth();
  const start = (new Date(y, m, 1).getDay() + 6) % 7; // 월=0
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
      drawCalendar(); // ✅ 달력 전체를 다시 그려서 선택 상태를 업데이트
    });

    cell.addEventListener("mouseenter", (e) => {
      const arr = byDate[dISO] || [];
      if (arr.length === 0) { tip.hidden = true; return; }

      tip.innerHTML = `<ul>${arr.map(t => `<li>${t.done ? '<s>' : ''}${t.name}${t.done ? '</s>' : ''}</li>`).join('')}</ul>`;
      tip.hidden = false;

      const gap = 8;
      const cellRect = e.currentTarget.getBoundingClientRect();
      const cardRect = grid.closest(".calendar").getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();

      let left = cellRect.left + cellRect.width / 2 - cardRect.left - tipRect.width / 2;
      let top = cellRect.bottom - cardRect.top + gap;

      const minL = 4, maxL = cardRect.width - tipRect.width - 4;
      left = Math.max(minL, Math.min(left, maxL));

      if (top + tipRect.height > cardRect.height - 4) {
        top = cellRect.top - cardRect.top - tipRect.height - gap;
      }
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    });
    cell.addEventListener("mouseleave", () => tip.hidden = true);
    grid.appendChild(cell);
  };

  for (let i = 0; i < start; i++) {
    const dnum = prevLast - start + 1 + i;
    addCell(dnum, new Date(y, m - 1, dnum), true);
  }
  for (let d = 1; d <= last; d++) addCell(d, new Date(y, m, d), false);
  const total = start + last;
  const tail = (7 - (total % 7)) % 7;
  for (let i = 1; i <= tail; i++) addCell(i, new Date(y, m + 1, i), true);
}

document.addEventListener("click", (ev) => {
  if (!grid.contains(ev.target)) {
    tip.hidden = true;
  }
}, { passive: true });

/* ---------- Boot ---------- */
ensureSignedIn();
