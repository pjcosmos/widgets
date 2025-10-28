/* ===== Study Planner - Monotone Gray =====
   app.js (FULL REPLACEMENT)
   - 과목 텍스트 입력
   - 체크박스로 완료 표시 (달력 기록은 유지)
   - 날짜 아이콘 클릭 -> 선택된 날짜로 즉시 추가
   - 달력 날짜 클릭 -> 선택 날짜(selectedISO) 갱신 + 하이라이트
   - 툴팁: "셀 아래 중앙"에 붙이고, 가장자리면 자동 반전
================================================ */

let selectedISO = new Date().toISOString().slice(0, 10);

/* ------- Local Storage ------- */
const KEY = "tasks_ui_gray_v2";
const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
const save = (v) => localStorage.setItem(KEY, JSON.stringify(v));

/* ------- Elements (Todo) ------- */
const subject  = document.getElementById("subject");
const taskName = document.getElementById("taskName");
const memo     = document.getElementById("memo");
const dateBtn  = document.getElementById("dateBtn");
const addBtn   = document.getElementById("addBtn"); // 숨김
const listEl   = document.getElementById("todoList");
const hintEl   = document.getElementById("emptyHint");

/* 아이콘 클릭 → 선택된 날짜로 즉시 추가 */
dateBtn.onclick = () => {
  const name = taskName.value.trim();
  if (!name) return;

  const items = load();
  items.push({
    id: crypto.randomUUID(),
    subject: subject.value.trim(),
    name,
    memo: memo.value.trim(),
    date: selectedISO,
    done: false,
    createdAt: Date.now()
  });
  save(items);

  taskName.value = "";
  memo.value = "";

  renderTodos();
  drawCalendar();
};

/* Enter로도 바로 추가 */
taskName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") dateBtn.click();
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

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "chk";
    chk.title = "완료";
    chk.onchange = () => {
      const all = load();
      const idx = all.findIndex(x => x.id === t.id);
      if (idx > -1) {
        all[idx].done = true; // 리스트에서만 숨김, 달력 기록은 유지
        save(all);
        renderTodos();
        drawCalendar();
      }
    };

    const text = document.createElement("span");
    text.className = "text";
    const subj = t.subject ? `[${t.subject}] ` : "";
    text.textContent = `${subj}${t.name}${t.memo ? " · " + t.memo : ""}`;

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "삭제";
    del.onclick = () => {
      save(load().filter(x => x.id !== t.id));
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
["월","화","수","목","금","토","일"].forEach(w => {
  const d = document.createElement("div");
  d.textContent = w;
  wdEl.appendChild(d);
});

let cur = new Date();
cur.setDate(1);

prev.onclick = () => { cur.setMonth(cur.getMonth() - 1); drawCalendar(); };
next.onclick = () => { cur.setMonth(cur.getMonth() + 1); drawCalendar(); };

/* 달력 렌더링 */
function drawCalendar() {
  grid.innerHTML = "";
  label.textContent = new Intl.DateTimeFormat("ko",{year:"numeric",month:"long"}).format(cur);

  const y = cur.getFullYear();
  const m = cur.getMonth();
  const start    = (new Date(y, m, 1).getDay() + 6) % 7;  // 월=0 기준
  const last     = new Date(y, m + 1, 0).getDate();
  const prevLast = new Date(y, m, 0).getDate();
  const todayISO = new Date().toISOString().slice(0,10);

  const iso = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);

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
    if (dISO === todayISO)      cell.classList.add("today");
    if (byDate[dISO]?.length)   cell.classList.add("hasTasks");
    if (dISO === selectedISO)   cell.classList.add("selected");

    // 날짜 선택
    cell.addEventListener("click", () => {
      selectedISO = dISO;
      grid.querySelectorAll(".cell.selected").forEach(c => c.classList.remove("selected"));
      cell.classList.add("selected");
      cell.animate(
        [{transform:"scale(1)"},{transform:"scale(.96)"},{transform:"scale(1)"}],
        {duration:140}
      );
    });

    // === 툴팁: "셀 아래 중앙" + 가장자리 자동 반전 ===
    cell.addEventListener("mouseenter", (e) => {
      const arr = byDate[dISO] || [];
      if (arr.length === 0) { tip.hidden = true; return; }

      // 내용 구성
      tip.innerHTML = "";
      const ul = document.createElement("ul");
      arr.forEach(t => {
        const li = document.createElement("li");
        li.textContent = t.name;
        ul.appendChild(li);
      });
      tip.appendChild(ul);
      tip.hidden = false;

      const gap = 8;
      const cellRect = e.currentTarget.getBoundingClientRect();
      const cardRect = grid.closest(".calendar").getBoundingClientRect();

      // 일단 배치해보고 사이즈 측정
      tip.style.left = "0px";
      tip.style.top  = "0px";
      const tipRect1 = tip.getBoundingClientRect();
      let tipW = tipRect1.width || 260;
      let tipH = tipRect1.height || 40;

      // 기본: 아래 중앙
      let left = (cellRect.left + cellRect.right)/2 - cardRect.left - tipW/2;
      let top  = cellRect.bottom - cardRect.top + gap;

      // 가로 클램프
      const minL = 4;
      const maxL = cardRect.width - tipW - 4;
      if (left < minL) left = minL;
      if (left > maxL) left = maxL;

      // 세로 넘치면 위로 반전
      if (top + tipH > cardRect.height - 4) {
        top = cellRect.top - cardRect.top - tipH - gap;
        if (top < 4) top = 4;
      }

      tip.style.left = `${left}px`;
      tip.style.top  = `${top}px`;
    });

    cell.addEventListener("mouseleave", () => {
      tip.hidden = true;
    });

    grid.appendChild(cell);
  }; // ←←← addCell 닫힘 (중요!)

  // 이전 달
  for (let i = 0; i < start; i++) {
    const dnum = prevLast - start + 1 + i;
    addCell(dnum, new Date(y, m - 1, dnum), true);
  }
  // 이번 달
  for (let d = 1; d <= last; d++) addCell(d, new Date(y, m, d), false);
  // 다음 달
  const total = start + last;
  const tail  = (7 - (total % 7)) % 7;
  for (let i = 1; i <= tail; i++) addCell(i, new Date(y, m + 1, i), true);
}

/* 초기화 */
renderTodos();
drawCalendar();
