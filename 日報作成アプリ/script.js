const STORAGE_KEY = 'daily_report_tasks';

let tasks = [];

// 今日の日付をデフォルトにセット
function initDate() {
  const dateInput = document.getElementById('reportDate');
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateInput.value = `${yyyy}-${mm}-${dd}`;
}

function loadTasks() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      tasks = JSON.parse(saved);
    } catch {
      tasks = [];
    }
  }
  renderTasks();
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask() {
  const nameInput = document.getElementById('taskName');
  const minutesInput = document.getElementById('taskMinutes');

  const name = nameInput.value.trim();
  const minutes = parseInt(minutesInput.value, 10);

  if (!name) {
    nameInput.focus();
    return;
  }
  if (!minutes || minutes < 1) {
    minutesInput.focus();
    return;
  }

  tasks.push({ id: Date.now(), name, minutes });
  saveTasks();
  renderTasks();

  nameInput.value = '';
  minutesInput.value = '';
  nameInput.focus();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderTasks();
}

function clearAll() {
  if (tasks.length === 0) return;
  if (!confirm('作業一覧を全て削除しますか？')) return;
  tasks = [];
  saveTasks();
  renderTasks();
  document.getElementById('reportOutput').value = '';
}

function renderTasks() {
  const list = document.getElementById('taskList');
  const totalSpan = document.getElementById('totalTime');

  list.innerHTML = '';

  if (tasks.length === 0) {
    list.innerHTML = '<li style="color:#aaa;font-size:0.9rem;justify-content:center;">作業がまだありません</li>';
    totalSpan.textContent = '';
    return;
  }

  let total = 0;
  tasks.forEach(task => {
    total += task.minutes;
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="task-info">${escapeHtml(task.name)}</span>
      <span class="task-time">${task.minutes}分</span>
      <button class="delete-btn" onclick="deleteTask(${task.id})" title="削除">✕</button>
    `;
    list.appendChild(li);
  });

  const hours = Math.floor(total / 60);
  const mins = total % 60;
  let timeStr = `合計: ${total}分`;
  if (hours > 0) {
    timeStr = `合計: ${hours}時間${mins > 0 ? mins + '分' : ''}（${total}分）`;
  }
  totalSpan.textContent = `（${timeStr}）`;
}

function generateReport() {
  if (tasks.length === 0) {
    alert('作業を追加してから日報を生成してください。');
    return;
  }

  const dateInput = document.getElementById('reportDate');
  const dateStr = dateInput.value
    ? formatDate(dateInput.value)
    : formatDate(new Date().toISOString().slice(0, 10));

  let total = 0;
  const lines = tasks.map(t => {
    total += t.minutes;
    return `・${t.name}（${t.minutes}分）`;
  });

  const hours = Math.floor(total / 60);
  const mins = total % 60;
  let totalStr = `${total}分`;
  if (hours > 0) {
    totalStr = `${hours}時間${mins > 0 ? mins + '分' : ''}`;
  }

  const report = [
    `【日報】${dateStr}`,
    '',
    '▼ 本日の作業内容',
    ...lines,
    '',
    `合計作業時間：${totalStr}`,
    '',
    '以上、よろしくお願いいたします。'
  ].join('\n');

  document.getElementById('reportOutput').value = report;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const yyyy = d.getFullYear();
  const mm = d.getMonth() + 1;
  const dd = d.getDate();
  const weeks = ['日', '月', '火', '水', '木', '金', '土'];
  const w = weeks[d.getDay()];
  return `${yyyy}年${mm}月${dd}日（${w}）`;
}

function copyReport() {
  const output = document.getElementById('reportOutput');
  const msg = document.getElementById('copyMsg');

  if (!output.value) {
    msg.textContent = '先に日報を生成してください';
    msg.style.color = '#e44';
    setTimeout(() => { msg.textContent = ''; }, 2000);
    return;
  }

  navigator.clipboard.writeText(output.value).then(() => {
    msg.textContent = 'コピーしました！';
    msg.style.color = '#2a9d4a';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  }).catch(() => {
    output.select();
    document.execCommand('copy');
    msg.textContent = 'コピーしました！';
    msg.style.color = '#2a9d4a';
    setTimeout(() => { msg.textContent = ''; }, 2000);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Enterキーで追加
document.addEventListener('DOMContentLoaded', () => {
  initDate();
  loadTasks();

  document.getElementById('taskName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('taskMinutes').focus();
  });

  document.getElementById('taskMinutes').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTask();
  });
});
