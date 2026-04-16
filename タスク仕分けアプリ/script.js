const STORAGE_KEY = 'task-matrix';

const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const clearAllBtn = document.getElementById('clearAllBtn');

const lists = {
  q1: document.getElementById('list-q1'),
  q2: document.getElementById('list-q2'),
  q3: document.getElementById('list-q3'),
  q4: document.getElementById('list-q4'),
};

let tasks = loadTasks();
renderAll();

addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

clearAllBtn.addEventListener('click', () => {
  if (!confirm('すべてのタスクを削除しますか？')) return;
  tasks = { q1: [], q2: [], q3: [], q4: [] };
  saveTasks();
  renderAll();
});

function getSelectedQuadrant() {
  const checked = document.querySelector('input[name="quadrant"]:checked');
  return checked ? checked.value : 'q1';
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  const q = getSelectedQuadrant();
  tasks[q].push({ id: Date.now(), text });
  saveTasks();
  renderAll();
  taskInput.value = '';
  taskInput.focus();
}

function deleteTask(q, id) {
  tasks[q] = tasks[q].filter(t => t.id !== id);
  saveTasks();
  renderAll();
}

function renderAll() {
  Object.keys(lists).forEach(q => renderList(q));
}

function renderList(q) {
  const ul = lists[q];
  ul.innerHTML = '';

  if (tasks[q].length === 0) {
    const msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = 'タスクなし';
    ul.appendChild(msg);
    return;
  }

  tasks[q].forEach(task => {
    const li = document.createElement('li');

    const span = document.createElement('span');
    span.textContent = task.text;

    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.title = '削除';
    btn.addEventListener('click', () => deleteTask(q, task.id));

    li.appendChild(span);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { q1: [], q2: [], q3: [], q4: [] };
    const data = JSON.parse(raw);
    return {
      q1: Array.isArray(data.q1) ? data.q1 : [],
      q2: Array.isArray(data.q2) ? data.q2 : [],
      q3: Array.isArray(data.q3) ? data.q3 : [],
      q4: Array.isArray(data.q4) ? data.q4 : [],
    };
  } catch {
    return { q1: [], q2: [], q3: [], q4: [] };
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
