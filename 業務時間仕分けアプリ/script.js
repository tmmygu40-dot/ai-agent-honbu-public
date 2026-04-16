const STORAGE_KEY = 'gyomu-jikan-data';

let categories = []; // { id, name, seconds }
let runningId = null;
let intervalId = null;
let tickStart = null;

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      categories = parsed.categories || [];
      // 保存時に計測中だったものは停止扱いで読み込む
    }
  } catch (e) {
    categories = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories }));
}

function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function startTimer(id) {
  if (runningId === id) return;

  // 既に動いていれば停止
  if (runningId !== null) {
    stopTimer();
  }

  runningId = id;
  tickStart = Date.now();

  intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - tickStart) / 1000);
    const cat = categories.find(c => c.id === runningId);
    if (!cat) return;
    cat._liveSeconds = cat.seconds + elapsed;
    renderCategories();
    renderSummary();
  }, 1000);

  renderCategories();
}

function stopTimer() {
  if (runningId === null) return;

  clearInterval(intervalId);
  intervalId = null;

  const elapsed = Math.floor((Date.now() - tickStart) / 1000);
  const cat = categories.find(c => c.id === runningId);
  if (cat) {
    cat.seconds += elapsed;
    delete cat._liveSeconds;
  }

  runningId = null;
  tickStart = null;

  saveData();
  renderCategories();
  renderSummary();
}

function getLiveSeconds(cat) {
  if (cat.id === runningId && tickStart !== null) {
    return cat.seconds + Math.floor((Date.now() - tickStart) / 1000);
  }
  return cat._liveSeconds !== undefined ? cat._liveSeconds : cat.seconds;
}

function addCategory(name) {
  categories.push({ id: generateId(), name, seconds: 0 });
  saveData();
  renderCategories();
  renderSummary();
}

function deleteCategory(id) {
  if (runningId === id) stopTimer();
  categories = categories.filter(c => c.id !== id);
  saveData();
  renderCategories();
  renderSummary();
}

function renderCategories() {
  const list = document.getElementById('categories-list');

  if (categories.length === 0) {
    list.innerHTML = '<p class="empty-msg">作業種別を追加してください</p>';
    return;
  }

  list.innerHTML = categories.map(cat => {
    const live = getLiveSeconds(cat);
    const isRunning = cat.id === runningId;
    return `
      <div class="category-item${isRunning ? ' running' : ''}" data-id="${cat.id}">
        <span class="category-name">${escapeHtml(cat.name)}</span>
        <span class="category-time">${formatTime(live)}</span>
        <button class="timer-btn ${isRunning ? 'stop' : 'start'}" data-id="${cat.id}">
          ${isRunning ? '停止' : '開始'}
        </button>
        <button class="delete-btn" data-del="${cat.id}" title="削除">×</button>
      </div>
    `;
  }).join('');
}

function renderSummary() {
  const summaryList = document.getElementById('summary-list');
  const totalDisplay = document.getElementById('total-display');

  const items = categories.map(cat => ({
    name: cat.name,
    seconds: getLiveSeconds(cat),
  })).filter(item => item.seconds > 0);

  const total = items.reduce((sum, item) => sum + item.seconds, 0);

  if (items.length === 0) {
    summaryList.innerHTML = '<p class="empty-msg">まだ計測データがありません</p>';
    totalDisplay.textContent = '';
    return;
  }

  summaryList.innerHTML = items
    .sort((a, b) => b.seconds - a.seconds)
    .map(item => {
      const pct = total > 0 ? Math.round(item.seconds / total * 100) : 0;
      return `
        <div class="summary-item">
          <span class="summary-name">${escapeHtml(item.name)}</span>
          <div class="summary-bar-wrap">
            <div class="summary-bar" style="width:${pct}%"></div>
          </div>
          <span class="summary-time">${formatTime(item.seconds)}</span>
          <span class="summary-pct">${pct}%</span>
        </div>
      `;
    }).join('');

  totalDisplay.textContent = `合計：${formatTime(total)}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// イベント：種別追加
document.getElementById('add-form').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('category-input');
  const name = input.value.trim();
  if (!name) return;
  addCategory(name);
  input.value = '';
  input.focus();
});

// イベント：タイマー操作・削除（委譲）
document.getElementById('categories-list').addEventListener('click', e => {
  const btn = e.target.closest('.timer-btn');
  const delBtn = e.target.closest('.delete-btn');

  if (btn) {
    const id = btn.dataset.id;
    if (id === runningId) {
      stopTimer();
    } else {
      startTimer(id);
    }
  }

  if (delBtn) {
    const id = delBtn.dataset.del;
    if (confirm('この種別を削除しますか？計測データも消えます。')) {
      deleteCategory(id);
    }
  }
});

// イベント：リセット
document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('今日の計測データをすべてリセットしますか？')) return;
  if (runningId !== null) {
    clearInterval(intervalId);
    intervalId = null;
    runningId = null;
    tickStart = null;
  }
  categories.forEach(cat => {
    cat.seconds = 0;
    delete cat._liveSeconds;
  });
  saveData();
  renderCategories();
  renderSummary();
});

// 初期化
loadData();
renderCategories();
renderSummary();
