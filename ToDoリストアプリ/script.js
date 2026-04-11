'use strict';

const STORAGE_KEY = 'todo_list_app';

let tasks = [];
let currentFilter = 'all';

// --- ストレージ ---
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function load() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    tasks = data ? JSON.parse(data) : [];
  } catch {
    tasks = [];
  }
}

// --- タスク操作 ---
function addTask(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  tasks.push({ id: Date.now(), text: trimmed, done: false });
  save();
  render();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    save();
    render();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
}

function clearDone() {
  tasks = tasks.filter(t => !t.done);
  save();
  render();
}

// --- 表示 ---
function getFiltered() {
  if (currentFilter === 'active') return tasks.filter(t => !t.done);
  if (currentFilter === 'done')   return tasks.filter(t => t.done);
  return tasks;
}

function render() {
  const list = document.getElementById('taskList');
  const filtered = getFiltered();

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-msg">タスクがありません</li>';
  } else {
    list.innerHTML = filtered.map(task => `
      <li class="${task.done ? 'done' : ''}" data-id="${task.id}">
        <button class="check-btn" data-action="check" aria-label="完了切り替え">
          ${task.done ? '✓' : ''}
        </button>
        <span class="task-text">${escapeHtml(task.text)}</span>
        <button class="delete-btn" data-action="delete" aria-label="削除">✕</button>
      </li>
    `).join('');
  }

  const remaining = tasks.filter(t => !t.done).length;
  document.getElementById('remaining').textContent = `未完了：${remaining}件`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- イベント ---
document.getElementById('addBtn').addEventListener('click', () => {
  const input = document.getElementById('taskInput');
  addTask(input.value);
  input.value = '';
  input.focus();
});

document.getElementById('taskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const input = e.currentTarget;
    addTask(input.value);
    input.value = '';
  }
});

document.getElementById('taskList').addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const li = btn.closest('li[data-id]');
  if (!li) return;
  const id = Number(li.dataset.id);
  if (btn.dataset.action === 'check') toggleTask(id);
  if (btn.dataset.action === 'delete') deleteTask(id);
});

document.getElementById('clearDoneBtn').addEventListener('click', clearDone);

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

// --- 初期化 ---
load();
render();
