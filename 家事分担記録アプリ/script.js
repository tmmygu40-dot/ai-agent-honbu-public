const TASKS = [
  { id: 'cook',    label: '料理',     icon: '🍳' },
  { id: 'dishes',  label: '洗い物',   icon: '🍽️' },
  { id: 'laundry', label: '洗濯',     icon: '👕' },
  { id: 'clean',   label: '掃除',     icon: '🧹' },
  { id: 'shop',    label: '買い物',   icon: '🛒' },
  { id: 'trash',   label: 'ゴミ出し', icon: '🗑️' },
  { id: 'bath',    label: 'お風呂',   icon: '🛁' },
  { id: 'iron',    label: 'アイロン', icon: '👔' },
  { id: 'vacuum',  label: '掃除機',   icon: '🌀' },
  { id: 'toilet',  label: 'トイレ',   icon: '🚽' },
  { id: 'kids',    label: '育児',     icon: '👶' },
  { id: 'other',   label: 'その他',   icon: '✅' },
];

const STORAGE_KEY = 'kajibuntan_records';
const NAMES_KEY   = 'kajibuntan_names';

let currentAssignee = 1;
let currentPeriod   = 'today';
let records = [];

// 担当者名
function getNames() {
  return {
    p1: document.getElementById('partner1Name').value || 'パートナー1',
    p2: document.getElementById('partner2Name').value || 'パートナー2',
  };
}

// 初期化
function init() {
  loadData();
  renderTaskGrid();
  bindEvents();
  updateAssigneeButtons();
  updateSummary();
  renderLog();
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  records = saved ? JSON.parse(saved) : [];

  const names = localStorage.getItem(NAMES_KEY);
  if (names) {
    const n = JSON.parse(names);
    document.getElementById('partner1Name').value = n.p1 || 'パートナー1';
    document.getElementById('partner2Name').value = n.p2 || 'パートナー2';
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function saveNames() {
  localStorage.setItem(NAMES_KEY, JSON.stringify(getNames()));
}

// タスクグリッド描画
function renderTaskGrid() {
  const grid = document.getElementById('taskGrid');
  grid.innerHTML = '';
  TASKS.forEach(task => {
    const btn = document.createElement('button');
    btn.className = 'task-btn';
    btn.innerHTML = `<span class="task-icon">${task.icon}</span>${task.label}`;
    btn.addEventListener('click', () => recordTask(task));
    grid.appendChild(btn);
  });
}

// 担当者ボタン更新
function updateAssigneeButtons() {
  const names = getNames();
  document.getElementById('btnAssignee1').textContent = names.p1;
  document.getElementById('btnAssignee2').textContent = names.p2;

  document.querySelectorAll('.assignee-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.assignee) === currentAssignee);
  });
}

// 記録追加
function recordTask(task) {
  const now = new Date();
  records.push({
    taskId:    task.id,
    taskLabel: task.label,
    taskIcon:  task.icon,
    assignee:  currentAssignee,
    ts:        now.getTime(),
  });
  saveData();
  updateSummary();
  renderLog();

  // タスクボタンの一時フィードバック
  const buttons = document.querySelectorAll('.task-btn');
  buttons.forEach(btn => {
    if (btn.textContent.includes(task.label)) {
      btn.style.transform = 'scale(0.93)';
      setTimeout(() => { btn.style.transform = ''; }, 150);
    }
  });
}

// 集計期間のフィルタ
function filterByPeriod(recs, period) {
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return recs.filter(r => {
    const d = new Date(r.ts);
    if (period === 'today') {
      return d >= today;
    } else if (period === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return d >= weekStart;
    } else {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return d >= monthStart;
    }
  });
}

// 集計更新
function updateSummary() {
  const names    = getNames();
  const filtered = filterByPeriod(records, currentPeriod);
  const c1 = filtered.filter(r => r.assignee === 1).length;
  const c2 = filtered.filter(r => r.assignee === 2).length;
  const total = c1 + c2;

  const pct1 = total === 0 ? 50 : Math.round(c1 / total * 100);
  const pct2 = 100 - pct1;

  const barP1 = document.getElementById('barP1');
  const barP2 = document.getElementById('barP2');
  barP1.style.width = pct1 + '%';
  barP2.style.width = pct2 + '%';
  barP1.textContent = pct1 + '%';
  barP2.textContent = pct2 + '%';
  if (pct1 < 12) barP1.textContent = '';
  if (pct2 < 12) barP2.textContent = '';

  document.getElementById('labelP1').textContent = names.p1;
  document.getElementById('labelP2').textContent = names.p2;

  document.getElementById('countNameP1').textContent = names.p1;
  document.getElementById('countNameP2').textContent = names.p2;
  document.getElementById('countNumP1').textContent = c1 + '件';
  document.getElementById('countNumP2').textContent = c2 + '件';
}

// ログ描画（今日の分のみ表示）
function renderLog() {
  const names    = getNames();
  const logList  = document.getElementById('logList');
  const todayRec = filterByPeriod(records, 'today').slice().reverse();

  if (todayRec.length === 0) {
    logList.innerHTML = '<li class="empty-msg">まだ記録がありません</li>';
    return;
  }

  logList.innerHTML = '';
  todayRec.forEach(r => {
    const li = document.createElement('li');
    const name = r.assignee === 1 ? names.p1 : names.p2;
    const cls  = r.assignee === 1 ? 'p1' : 'p2';
    const time = new Date(r.ts);
    const hm   = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`;

    li.innerHTML = `
      <span class="log-badge ${cls}">${name}</span>
      <span>${r.taskIcon} ${r.taskLabel}</span>
      <span class="log-time">${hm}</span>
    `;
    logList.appendChild(li);
  });
}

// イベントバインド
function bindEvents() {
  // 担当者選択
  document.querySelectorAll('.assignee-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentAssignee = Number(btn.dataset.assignee);
      updateAssigneeButtons();
    });
  });

  // 期間タブ
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateSummary();
    });
  });

  // 担当者名変更
  document.getElementById('partner1Name').addEventListener('input', () => {
    saveNames();
    updateAssigneeButtons();
    updateSummary();
    renderLog();
  });
  document.getElementById('partner2Name').addEventListener('input', () => {
    saveNames();
    updateAssigneeButtons();
    updateSummary();
    renderLog();
  });

  // 今日の記録を消す
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (!confirm('今日の記録を全て削除しますか？')) return;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    records = records.filter(r => r.ts < todayStart);
    saveData();
    updateSummary();
    renderLog();
  });
}

document.addEventListener('DOMContentLoaded', init);
