const KEY="tasks_ui3";
const load=()=>JSON.parse(localStorage.getItem(KEY)||"[]");
const save=a=>localStorage.setItem(KEY,JSON.stringify(a));

const subject=document.getElementById("subject");
const taskName=document.getElementById("taskName");
const memo=document.getElementById("memo");
const dateBtn=document.getElementById("dateBtn");
const dateInput=document.getElementById("todoDate");
const addBtn=document.getElementById("addBtn");
const todoList=document.getElementById("todoList");
const emptyHint=document.getElementById("emptyHint");

dateBtn.onclick=()=>dateInput.showPicker();

addBtn.onclick=()=>{
  if(!taskName.value.trim()) return;
  let list=load();
  list.push({
    id:crypto.randomUUID(),
    subject:subject.value,
    name:taskName.value,
    memo:memo.value,
    date:dateInput.value,
    done:false
  });
  save(list);
  taskName.value=""; memo.value="";
  render(); drawCalendar();
};

function render(){
  let list=load().filter(x=>!x.done);
  todoList.innerHTML="";
  if(list.length===0){ emptyHint.style.display="block"; return; }
  emptyHint.style.display="none";
  list.forEach(t=>{
    const li=document.createElement("li");
    li.innerHTML=`<span>${t.subject} · ${t.name}${t.memo?` · ${t.memo}`:""}</span><button>✓</button>`;
    li.querySelector("button").onclick=()=>{
      let all=load();
      all.find(x=>x.id===t.id).done=true;
      save(all); render(); drawCalendar();
    };
    todoList.appendChild(li);
  });
}

render();
drawCalendar(); // 기존 달력 함수 그대로 사용
