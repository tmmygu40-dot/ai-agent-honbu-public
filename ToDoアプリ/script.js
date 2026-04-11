const STORAGE_KEY = 'todo_tasks';

let tasks = [];
let currentFilter = 'all';

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    tasks = saved ? JSON.parse(saved) : [];
  } catch (e) {
    tasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  tasks.push({ id: Date.now(), text: trimmed, done: false });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    saveTasks();
    render();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function clearDone() {
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  render();
}

function getFilteredTasks() {
  if (currentFilter === 'active') return tasks.filter(t => !t.done);
  if (currentFilter === 'done') return tasks.filter(t => t.done);
  return tasks;
}

function render() {
  const list = document.getElementById('taskList');
  const filtered = getFilteredTasks();

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-msg">タスクはありません</li>';
  } else {
    list.innerHTML = filtered.map(task => `
      <li class="${task.done ? 'done' : ''}" data-id="${task.id}">
        <div class="task-check" data-action="toggle"></div>
        <span class="task-text">${escapeHtml(task.text)}</span>
        <button class="delete-btn" data-action="delete" title="削除">×</button>
      </li>
    `).join('');
  }

  const remaining = tasks.filter(t => !t.done).length;
  document.getElementById('remainCount').textContent = `${remaining}件の未完了タスク`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// イベント：追加ボタン
document.getElementById('addBtn').addEventListener('click', () => {
  const input = document.getElementById('taskInput');
  addTask(input.value);
  input.value = '';
  input.focus();
});

// イベント：Enterキーで追加
document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const input = document.getElementById('taskInput');
    addTask(input.value);
    input.value = '';
  }
});

// イベント：リスト内のチェック・削除（イベント委譲）
document.getElementById('taskList').addEventListener('click', e => {
  const li = e.target.closest('li[data-id]');
  if (!li) return;
  const id = Number(li.dataset.id);
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'toggle') toggleTask(id);
  if (action === 'delete') deleteTask(id);
});

// イベント：フィルターボタン
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// イベント：完了済みを一括削除
document.getElementById('clearDoneBtn').addEventListener('click', clearDone);

// 初期化
loadTasks();
render();
