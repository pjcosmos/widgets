/* ===== Study Planner - Monotone Gray =====
   app.js (FULL REPLACEMENT)
   - 과목 텍스트 입력
   - 체크박스로 완료 표시 (달력 기록은 유지)
   - 날짜 아이콘 클릭 -> 선택된 날짜로 즉시 추가
   - 달력 날짜 클릭 -> 선택 날짜(selectedISO) 갱신 + 하이라이트
   - 툴팁: 셀 옆에 표시, 가장자리면 자동 반전
================================================ */

/* 오늘을 기본 선택 날짜로 */
let selectedISO = new Date().toISOString().slice(0,10);

/* ------- Local Storage ------- */
const KEY = "tasks_ui_gray_v2";
const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
const save = (v) => localStorage.setItem(KEY, JSON.stringify(v));

/* ------- Elements (Todo) ------- */
const subject  = document.getElementById("subject");
const taskName = document.getElementById("taskName");
const memo     = document.getElementById("memo");
const dateBtn  = document.getElementById("dateBtn");   // 아이콘 버튼 = 즉시 추가
const addBtn   = document.getElementById("addBtn");    // 숨김(안 씀)
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
    date: selectedISO,       // 현재 선택된 날짜
    done: false,
    createdAt: Date.now()
  });
  save(items);

  taskName.value = "";
  memo.value = "";

  renderTodos();
  drawCalendar();
};

/* Enter로도 바로 추가 (아이콘과 동일 동작) */
taskName.addEventListener("keydown", (e) => {
  if (e.key === "Enter") dateBtn.click();
});

/* 목록 렌더링 (완료 안 된 것만 표시) */
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
        all[idx].done = true;    // 리스트에서는 숨김, 달력 기록은 유지(byDate는 전체를 집계)
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

let cur = new Date(); cur.setDate(1);

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

  const iso = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
                      .toISOString().slice(0,10);

  // 날짜별 작업 묶기 (완료 포함 = 기록 유지)
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
    if (dISO === selectedISO)   cell.classList.add("selected");  // 현재 선택 날짜 하이라이트

    // 날짜 클릭 → 선택 날짜 갱신 + 하이라이트
    cell.addEventListener("click", () => {
      selectedISO = dISO;
      grid.querySelectorAll(".cell.selected").forEach(c => c.classList.remove("selected"));
      cell.classList.add("selected");
      cell.animate(
        [{transform:"scale(1)"},{transform:"scale(.96)"},{transform:"scale(1)"}],
        {duration:140}
      );
    });

    // 툴팁: 셀 옆(우측) 기본, 공간 부족 시 좌측
    cell.addEventListener("mouseenter", (e) => {
      const arr = byDate[dISO] || [];
      if (arr.length === 0) { tip.hidden = true; return; }

      tip.innerHTML = "";
      const ul = document.createElement("ul");
      arr.forEach(t => {
        const li = document.createElement("li");
        li.textContent = t.name;   // 글자만
        ul.appendChild(li);
      });
      tip.appendChild(ul);
      tip.hidden = false;

      const r = e.currentTarget.getBoundingClientRect();
      const p = grid.getBoundingClientRect();
      const tooltipWidth = 260;  // .tooltip max-width와 일치
      const gap = 10;

      // 기본은 오른쪽
      let left = r.right - p.left + gap;
      if (left + tooltipWidth > p.width) {
        // 오른쪽 공간 부족 → 왼쪽
        left = r.left - p.left - gap - tooltipWidth;
        if (left < 0) left = 4;   // 그래도 부족하면 최소 보정
      }

      // 수직 위치(셀 상단 정렬, 하단 넘침 방지)
      let top = r.top - p.top;
      const maxTop = p.height - 10;
      if (top > maxTop) top = maxTop;

      tip.style.left = `${left}px`;
      tip.style.top  = `${top}px`;
    });
    cell.addEventListener("mouseleave", () => { tip.hidden = true; });

    grid.appendChild(cell);
  };

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
