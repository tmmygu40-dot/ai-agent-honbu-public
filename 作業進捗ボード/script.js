const STORAGE_KEY = 'sakugyo-board-tasks';

let tasks = [];

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  tasks = raw ? JSON.parse(raw) : [];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask() {
  const staffInput = document.getElementById('input-staff');
  const taskInput = document.getElementById('input-task');
  const staff = staffInput.value.trim();
  const task = taskInput.value.trim();

  if (!staff || !task) {
    alert('スタッフ名と担当業務を両方入力してください');
    return;
  }

  tasks.push({ id: Date.now(), staff, task, done: false });
  save();
  render();

  taskInput.value = '';
  taskInput.focus();
}

function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (t) {
    t.done = !t.done;
    save();
    render();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
}

function confirmReset() {
  if (tasks.length === 0) return;
  if (confirm('今日の全タスクをリセットしますか？')) {
    tasks = [];
    save();
    render();
  }
}

function render() {
  const list = document.getElementById('task-list');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  const total = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  progressBar.style.width = pct + '%';
  progressText.textContent = `${done} / ${total} 件完了（${pct}%）`;

  if (total === 0) {
    list.innerHTML = '<p class="empty-msg">タスクがまだありません<br>スタッフ名と業務を入力して追加してください</p>';
    return;
  }

  // スタッフ別にグループ化
  const groups = {};
  tasks.forEach(t => {
    if (!groups[t.staff]) groups[t.staff] = [];
    groups[t.staff].push(t);
  });

  let html = '';
  for (const staffName of Object.keys(groups)) {
    const staffTasks = groups[staffName];
    const staffDone = staffTasks.filter(t => t.done).length;
    const staffTotal = staffTasks.length;

    html += `<div class="staff-group">`;
    html += `<div class="staff-header">
      <span class="staff-name">${escape(staffName)}</span>
      <span class="staff-progress">${staffDone}/${staffTotal}</span>
    </div>`;

    staffTasks.forEach(t => {
      const doneClass = t.done ? 'done' : '';
      html += `<div class="task-item ${doneClass}">
        <div class="task-check ${doneClass}" onclick="toggleDone(${t.id})"></div>
        <span class="task-name">${escape(t.task)}</span>
        <button class="task-delete" onclick="deleteTask(${t.id})" title="削除">×</button>
      </div>`;
    });

    html += `</div>`;
  }

  list.innerHTML = html;
}

function escape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Enterキーで追加
document.addEventListener('DOMContentLoaded', () => {
  load();
  render();

  document.getElementById('input-staff').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('input-task').focus();
  });
  document.getElementById('input-task').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });
});
