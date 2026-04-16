const STORAGE_KEY = 'kaji_tasks';

// 頻度ラベル
const FREQ_LABELS = {
  '1': '毎日',
  '7': '週1',
  '4': '週2（3〜4日ごと）',
  '14': '月2（2週ごと）',
  '30': '月1'
};

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// 今日のタスク判定
// freq は日数（1,4,7,14,30）
function isDueToday(task) {
  if (!task.lastDone) return true; // 未実施は常に対象
  const last = new Date(task.lastDone);
  const today = new Date(getTodayStr());
  const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  return diffDays >= Number(task.freq);
}

function formatLastDone(lastDone) {
  if (!lastDone) return '未実施';
  const d = new Date(lastDone);
  return `${d.getMonth()+1}/${d.getDate()} 実施`;
}

function renderTodayList(tasks) {
  const list = document.getElementById('today-list');
  const today = getTodayStr();
  const dueTasks = tasks.filter(t => isDueToday(t));

  if (dueTasks.length === 0) {
    list.innerHTML = '<li class="empty-msg">今日やることはありません！</li>';
    return;
  }

  list.innerHTML = dueTasks.map(t => {
    const isDone = t.doneToday === today;
    return `
      <li class="task-item${isDone ? ' done' : ''}" data-id="${t.id}">
        <button class="check-btn${isDone ? ' checked' : ''}" data-id="${t.id}" aria-label="完了">✓</button>
        <span class="task-name">${escHtml(t.place)}</span>
        <span class="task-freq">${FREQ_LABELS[t.freq] || t.freq+'日ごと'}</span>
      </li>
    `;
  }).join('');
}

function renderTaskList(tasks) {
  const list = document.getElementById('task-list');
  if (tasks.length === 0) {
    list.innerHTML = '<li class="empty-msg">まだ登録されていません</li>';
    return;
  }
  list.innerHTML = tasks.map(t => `
    <li class="reg-item" data-id="${t.id}">
      <div class="reg-info">
        <span class="reg-name">${escHtml(t.place)}</span>
        <span class="reg-detail">${FREQ_LABELS[t.freq] || t.freq+'日ごと'} ／ ${formatLastDone(t.lastDone)}</span>
      </div>
      <button class="del-btn" data-id="${t.id}">削除</button>
    </li>
  `).join('');
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function render() {
  const tasks = loadTasks();
  renderTodayList(tasks);
  renderTaskList(tasks);
}

// 今日の日付表示
document.getElementById('today-label').textContent = (() => {
  const d = new Date();
  const w = ['日','月','火','水','木','金','土'][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${w}）`;
})();

// 登録フォーム
document.getElementById('register-form').addEventListener('submit', e => {
  e.preventDefault();
  const place = document.getElementById('place-input').value.trim();
  const freq = document.getElementById('freq-select').value;
  if (!place) return;

  const tasks = loadTasks();
  tasks.push({
    id: Date.now().toString(),
    place,
    freq,
    lastDone: null,
    doneToday: null
  });
  saveTasks(tasks);
  document.getElementById('place-input').value = '';
  render();
});

// 今日のリスト：完了チェック
document.getElementById('today-list').addEventListener('click', e => {
  const btn = e.target.closest('.check-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  const today = getTodayStr();
  const tasks = loadTasks();
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (task.doneToday === today) {
    // チェック解除（今日の実施を取り消す）
    task.lastDone = null;
    task.doneToday = null;
  } else {
    task.lastDone = today;
    task.doneToday = today;
  }
  saveTasks(tasks);
  render();
});

// 登録一覧：削除
document.getElementById('task-list').addEventListener('click', e => {
  const btn = e.target.closest('.del-btn');
  if (!btn) return;
  const id = btn.dataset.id;
  let tasks = loadTasks();
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);
  render();
});

// 初期描画
render();
