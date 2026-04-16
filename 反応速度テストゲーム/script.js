const STORAGE_KEY = 'reaction_records';
const MAX_RECORDS = 20;

let state = 'idle'; // idle | waiting | go
let waitTimer = null;
let startTime = null;
let records = [];

const tapArea = document.getElementById('tap-area');
const tapMessage = document.getElementById('tap-message');
const resultArea = document.getElementById('result-area');
const lastTimeEl = document.getElementById('last-time');
const bestTimeEl = document.getElementById('best-time');
const avgTimeEl = document.getElementById('avg-time');
const countEl = document.getElementById('count');
const historyList = document.getElementById('history-list');
const clearBtn = document.getElementById('clear-btn');

function loadRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    records = data ? JSON.parse(data) : [];
  } catch (e) {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function updateStats() {
  if (records.length === 0) {
    bestTimeEl.textContent = '--';
    avgTimeEl.textContent = '--';
    countEl.textContent = '0';
    return;
  }
  const times = records.map(r => r.time);
  const best = Math.min(...times);
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  bestTimeEl.textContent = best + ' ms';
  avgTimeEl.textContent = avg + ' ms';
  countEl.textContent = records.length;
}

function renderHistory() {
  if (records.length === 0) {
    historyList.innerHTML = '<li class="empty-msg">まだ記録がありません</li>';
    return;
  }
  const best = Math.min(...records.map(r => r.time));
  historyList.innerHTML = records.map((r, i) => {
    const badge = r.time === best ? '<span class="best-badge">★ベスト</span>' : '';
    return `<li>
      <span class="history-rank">${i + 1}</span>
      <span class="history-time">${r.time} ms${badge}</span>
      <span class="history-date">${r.date}</span>
    </li>`;
  }).join('');
}

function setAreaState(s, msg) {
  tapArea.className = 'tap-area ' + s;
  tapMessage.textContent = msg;
}

function startWaiting() {
  state = 'waiting';
  setAreaState('ready', '待て...');
  resultArea.classList.add('hidden');

  const delay = 1000 + Math.random() * 3000; // 1〜4秒
  waitTimer = setTimeout(() => {
    state = 'go';
    setAreaState('go', 'タップ！');
    startTime = performance.now();
  }, delay);
}

function handleTap() {
  if (state === 'idle') {
    startWaiting();
    return;
  }

  if (state === 'waiting') {
    // 早押しペナルティ
    clearTimeout(waitTimer);
    state = 'idle';
    setAreaState('penalty', '早すぎます！\nもう一度タップ');
    resultArea.classList.add('hidden');
    return;
  }

  if (state === 'go') {
    const elapsed = Math.round(performance.now() - startTime);
    state = 'idle';

    // 記録追加
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    records.unshift({ time: elapsed, date: dateStr });
    if (records.length > MAX_RECORDS) records = records.slice(0, MAX_RECORDS);
    saveRecords();

    // 結果表示
    resultArea.classList.remove('hidden');
    lastTimeEl.textContent = elapsed + ' ms';
    setAreaState('waiting', 'もう一度タップ');

    updateStats();
    renderHistory();
  }
}

tapArea.addEventListener('click', handleTap);
tapArea.addEventListener('touchend', (e) => {
  e.preventDefault();
  handleTap();
}, { passive: false });

clearBtn.addEventListener('click', () => {
  if (records.length === 0) return;
  if (!confirm('記録をすべて削除しますか？')) return;
  records = [];
  saveRecords();
  updateStats();
  renderHistory();
  resultArea.classList.add('hidden');
  state = 'idle';
  setAreaState('waiting', 'タップして開始');
});

// 初期化
loadRecords();
updateStats();
renderHistory();
setAreaState('waiting', 'タップして開始');
