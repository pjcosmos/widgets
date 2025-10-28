const KEY="tasks_v2";
const load=()=>JSON.parse(localStorage.getItem(KEY)||"[]");
const save=v=>localStorage.setItem(KEY,JSON.stringify(v));

const subject=document.getElementById("subject");
const taskName=document.getElementById("taskName");
const memo=document.getElementById("memo");
const dateBtn=document.getElementById("dateBtn");
const dateInput=document.getElementById("todoDate");
const addBtn=document.getElementById("addBtn");
const todoList=document.getElementById("todoList");
const emptyHint=document.getElementById("emptyHint");

/* 날짜 버튼 눌렀을 때 date picker 열기 */
dateBtn.onclick=()=>dateInput.showPicker();

addBtn.onclick=()=>{
  if(!taskName.value.trim()) return;
  const list=load();
  list.push({
    id:crypto.randomUUID(),
    subject:subject.value,
    name:taskName.value,
    memo:memo.value,
    date:dateInput.value,
    done:false
  });
  save(list);
  taskName.value="";
  memo.value="";
  render();
};

function render(){
  const list=load().filter(t=>!t.done);
  todoList.innerHTML="";
  if(list.length===0){ emptyHint.style.display="block"; return; }
  emptyHint.style.display="none";
  list.forEach(t=>{
    const li=document.createElement("li");
    li.innerHTML = `<span class="text">${t.subject} · ${t.name}</span>
                    <button>✓</button>`;
    li.querySelector("button").onclick=()=>{
      const all=load();
      all.find(x=>x.id===t.id).done=true;
      save(all); render(); drawCalendar();
    };
    todoList.appendChild(li);
  });
}

render();
drawCalendar(); // 기존 함수 그대로 사용
