/* ===== Study Planner - Monotone Gray =====
   app.js (FULL REPLACEMENT)
   - 과목 텍스트 입력
   - 체크박스로 완료 표시 (달력 기록은 유지)
   - 날짜 아이콘 클릭 -> showPicker()
   - 달력 날짜 클릭 -> 입력 날짜로 설정
   - 툴팁: 셀 옆에 표시, 가장자리면 자동 반전
================================================ */

/* ------- Local Storage ------- */
const KEY = "tasks_ui_gray_v2";
const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
const save = (v) => localStorage.setItem(KEY, JSON.stringify(v));

/* ------- Elements (Todo) ------- */
const subject  = document.getElementById("subject");
const taskName = document.getElementById("taskName");
const memo     = document.getElementById("memo");
const dateBtn  = document.getElementById("dateBtn");
const dateIn   = document.getElementById("todoDate");
const addBtn   = document.getElementById("addBtn");
const listEl   = document.getElementById("todoList");
const hintEl   = document.getElementById("emptyHint");

/* 날짜 기본값 = 오늘 */
dateIn.value = new Date().toISOString().slice(0, 10);

/* 날짜 아이콘 클릭 -> 데이트피커 열기 (지원 시) */
// 날짜 버튼 → 오늘 날짜로 즉시 추가
// 날짜 버튼 → 오늘 날짜로 즉시 추가
dateBtn.onclick = () => {
  const name = taskName.value.trim();
  if (!name) return;

  const items = load();
  items.push({
    id: crypto.randomUUID(),
    subject: subject.value.trim(),
    name,
    memo: memo.value.trim(),
    date: new Date().toISOString().slice(0,10), // 오늘 날짜 자동 적용
    done: false,
    createdAt: Date.now()
  });
  save(items);

  taskName.value = "";
  memo.value = "";

  renderTodos();
  drawCalendar();
};


/* 항목 추가 */
function addItem() {
  const name = taskName.value.trim();
  if (!name) return;

  const items = load();
  items.push({
    id: crypto.randomUUID(),
    subject: subject.value.trim(),
    name,
    memo: memo.value.trim(),
    date: dateIn.value,     // YYYY-MM-DD
    done: false,
    createdAt: Date.now(),
  });
  save(items);

  // 입력 초기화
  taskName.value = "";
  memo.value = "";

  renderTodos();
  drawCalendar();
}
addBtn.onclick = addItem;
taskName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addItem();
});

/* 목록 렌더링 */
function renderTodos() {
  const items = load()
    .filter((t) => !t.done)
    .sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") || a.createdAt - b.createdAt
    );

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
      const idx = all.findIndex((x) => x.id === t.id);
      if (idx > -1) {
        all[idx].done = true; // 리스트에서만 숨김, 달력 기록은 유지
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

    // 삭제 버튼
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "삭제";
    del.onclick = () => {
      save(load().filter((x) => x.id !== t.id));
      renderTodos();
      drawCalendar();
    };

    li.append(chk, text, del);
    listEl.append(li);
  }
}

/* ------- Elements (Calendar) ------- */
const wdEl  = document.getElementById("wd");
const grid  = document.getElementById("grid");
const label = document.getElementById("calLabel");
const prev  = document.getElementById("prevMon");
const next  = document.getElementById("nextMon");
const tip   = document.getElementById("tooltip");

/* 요일 헤더 (월~일) */
["월", "화", "수", "목", "금", "토", "일"].forEach((w) => {
  const d = document.createElement("div");
  d.textContent = w;
  wdEl.appendChild(d);
});

let cur = new Date();
cur.setDate(1);

prev.onclick = () => {
  cur.setMonth(cur.getMonth() - 1);
  drawCalendar();
};
next.onclick = () => {
  cur.setMonth(cur.getMonth() + 1);
  drawCalendar();
};

/* 달력 렌더링 */
function drawCalendar() {
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat("ko", {
    year: "numeric",
    month: "long",
  }).format(cur);

  const y = cur.getFullYear();
  const m = cur.getMonth();
  const start = (new Date(y, m, 1).getDay() + 6) % 7; // 월=0 기준
  const last = new Date(y, m + 1, 0).getDate();
  const prevLast = new Date(y, m, 0).getDate();
  const todayISO = new Date().toISOString().slice(0, 10);
  const iso = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate())
      .toISOString()
      .slice(0, 10);

  // 날짜별 작업 묶기 (완료 포함)
  const byDate = {};
  for (const t of load()) {
    if (!t.date) continue;
    (byDate[t.date] ||= []).push(t);
  }

  const addCell = (n, d, muted) => {
    const cell = document.createElement("div");
    cell.className = "cell" + (muted ? " muted" : "");
    cell.textContent = String(n);

    const dISO = iso(d);
    if (dISO === todayISO) cell.classList.add("today");
    if ((byDate[dISO] || []).length) cell.classList.add("hasTasks");

    // 날짜 클릭 -> 입력 날짜 설정
    cell.addEventListener("click", () => {
      dateIn.value = dISO;
      if (typeof dateIn.showPicker === "function") dateIn.showPicker();
      cell.animate(
        [{ transform: "scale(1)" }, { transform: "scale(.96)" }, { transform: "scale(1)" }],
        { duration: 140 }
      );
    });

    // 툴팁: 셀 옆(우측)에 붙이되, 경계면 자동 반전
    cell.addEventListener("mouseenter", (e) => {
      const arr = byDate[dISO] || [];
      if (arr.length === 0) {
        tip.hidden = true;
        return;
      }
      tip.innerHTML = "";
      const ul = document.createElement("ul");
      arr.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = t.name; // 텍스트만
        ul.appendChild(li);
      });
      tip.appendChild(ul);
      tip.hidden = false;

      // 위치 계산 (그리드 기준 좌표)
      const r = e.currentTarget.getBoundingClientRect();
      const p = grid.getBoundingClientRect();

      const tooltipWidth = 260; // .tooltip max-width와 맞춤
      const gap = 10;

      // 기본: 오른쪽
      let left = r.right - p.left + gap;
      // 오른쪽 공간 부족하면 왼쪽
      if (left + tooltipWidth > p.width) {
        left = r.left - p.left - gap - tooltipWidth;
        if (left < 0) left = 4; // 그래도 부족하면 최소 보정
      }
      // 수직 정렬: 셀 상단 정렬 (너무 아래로 안 내려가게)
      let top = r.top - p.top;
      const maxTop = p.height - 10; // 하단 여유
      if (top > maxTop) top = maxTop;

      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    });
    cell.addEventListener("mouseleave", () => (tip.hidden = true));

    grid.appendChild(cell);
  };

  // 이전 달
  for (let i = 0; i < start; i++)
    addCell(prevLast - start + 1 + i, new Date(y, m - 1, prevLast - start + 1 + i), true);
  // 이번 달
  for (let d = 1; d <= last; d++) addCell(d, new Date(y, m, d), false);
  // 다음 달
  const total = start + last;
  const tail = (7 - (total % 7)) % 7;
  for (let i = 1; i <= tail; i++) addCell(i, new Date(y, m + 1, i), true);
}

/* 초기화 */
renderTodos();
drawCalendar();
