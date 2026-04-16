const taskNameInput = document.getElementById('taskName');
const taskMinutesInput = document.getElementById('taskMinutes');
const addBtn = document.getElementById('addBtn');
const taskList = document.getElementById('taskList');
const totalTimeEl = document.getElementById('totalTime');
const endTimeEl = document.getElementById('endTime');
const startTimeInput = document.getElementById('startTime');
const clearBtn = document.getElementById('clearBtn');

let tasks = [];

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function loadFromStorage() {
  const saved = localStorage.getItem('kosuu_tasks');
  if (saved) {
    try { tasks = JSON.parse(saved); } catch { tasks = []; }
  }
  const savedStart = localStorage.getItem('kosuu_startTime');
  startTimeInput.value = savedStart || now();
}

function saveToStorage() {
  localStorage.setItem('kosuu_tasks', JSON.stringify(tasks));
  localStorage.setItem('kosuu_startTime', startTimeInput.value);
}

function formatMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${total}分（${h}時間${m}分）`;
}

function calcEndTime(startStr, totalMin) {
  if (!startStr) return '--:--';
  const [sh, sm] = startStr.split(':').map(Number);
  const totalMins = sh * 60 + sm + totalMin;
  const eh = Math.floor(totalMins / 60) % 24;
  const em = totalMins % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

function render() {
  taskList.innerHTML = '';
  let total = 0;

  tasks.forEach((task, i) => {
    total += task.minutes;
    const li = document.createElement('li');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'task-name';
    nameSpan.textContent = task.name;

    const minSpan = document.createElement('span');
    minSpan.className = 'task-minutes';
    minSpan.textContent = `${task.minutes}分`;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', '削除');
    delBtn.addEventListener('click', () => {
      tasks.splice(i, 1);
      saveToStorage();
      render();
    });

    li.appendChild(nameSpan);
    li.appendChild(minSpan);
    li.appendChild(delBtn);
    taskList.appendChild(li);
  });

  totalTimeEl.textContent = tasks.length > 0 ? formatMinutes(total) : '0分（0時間0分）';
  endTimeEl.textContent = tasks.length > 0 ? calcEndTime(startTimeInput.value, total) : '--:--';
}

function addTask() {
  const name = taskNameInput.value.trim();
  const minutes = parseInt(taskMinutesInput.value, 10);

  if (!name) {
    taskNameInput.focus();
    return;
  }
  if (!minutes || minutes < 1) {
    taskMinutesInput.focus();
    return;
  }

  tasks.push({ name, minutes });
  taskNameInput.value = '';
  taskMinutesInput.value = '';
  taskNameInput.focus();
  saveToStorage();
  render();
}

addBtn.addEventListener('click', addTask);

taskMinutesInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

taskNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') taskMinutesInput.focus();
});

startTimeInput.addEventListener('change', () => {
  saveToStorage();
  render();
});

clearBtn.addEventListener('click', () => {
  if (tasks.length === 0) return;
  if (confirm('リストをクリアしてよいですか？')) {
    tasks = [];
    saveToStorage();
    render();
  }
});

loadFromStorage();
render();
