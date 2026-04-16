// テーブルデータ管理
// tables: { id, name, seatedAt (timestamp or null) }
let tables = [];
let timerInterval = null;

const STORAGE_KEY = 'seki_kaiten_tables';

// 初期化
function init() {
  loadFromStorage();
  render();
  startGlobalTimer();

  // Enterキーでテーブル追加
  document.getElementById('tableName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTable();
  });

  // 閾値変更時に再レンダリング
  document.getElementById('warnMinutes').addEventListener('change', render);
  document.getElementById('alertMinutes').addEventListener('change', render);
}

// テーブル追加
function addTable() {
  const input = document.getElementById('tableName');
  const name = input.value.trim();
  if (!name) {
    input.focus();
    return;
  }
  tables.push({ id: Date.now(), name, seatedAt: null });
  saveToStorage();
  render();
  input.value = '';
  input.focus();
}

// 着席開始
function seatTable(id) {
  const table = tables.find(t => t.id === id);
  if (table) {
    table.seatedAt = Date.now();
    saveToStorage();
    render();
  }
}

// 退席
function leaveTable(id) {
  const table = tables.find(t => t.id === id);
  if (table) {
    table.seatedAt = null;
    saveToStorage();
    render();
  }
}

// テーブル削除
function deleteTable(id) {
  tables = tables.filter(t => t.id !== id);
  saveToStorage();
  render();
}

// 経過時間を "H:MM:SS" 形式で返す
function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// カードのクラスを決定
function getCardClass(table, warnMs, alertMs) {
  if (!table.seatedAt) return 'vacant';
  const elapsed = Date.now() - table.seatedAt;
  if (elapsed >= alertMs) return 'alert';
  if (elapsed >= warnMs) return 'warning';
  return 'occupied';
}

// レンダリング
function render() {
  const warnMin = parseInt(document.getElementById('warnMinutes').value) || 30;
  const alertMin = parseInt(document.getElementById('alertMinutes').value) || 60;
  const warnMs = warnMin * 60 * 1000;
  const alertMs = alertMin * 60 * 1000;

  const grid = document.getElementById('tableGrid');
  grid.innerHTML = '';

  if (tables.length === 0) {
    grid.innerHTML = '<p class="empty-message">テーブルを追加してください</p>';
    updateSummary(warnMs, alertMs);
    return;
  }

  tables.forEach(table => {
    const cardClass = getCardClass(table, warnMs, alertMs);
    const isSeated = table.seatedAt !== null;
    const elapsed = isSeated ? Date.now() - table.seatedAt : 0;

    const card = document.createElement('div');
    card.className = `table-card ${cardClass}`;
    card.dataset.id = table.id;

    const statusText = isSeated ? '着席中' : '空席';

    card.innerHTML = `
      <button class="btn-delete" onclick="deleteTable(${table.id})" title="削除">✕</button>
      <div class="card-name">${escapeHtml(table.name)}</div>
      <div class="card-status">${statusText}</div>
      <div class="card-time">${isSeated ? formatElapsed(elapsed) : '--:--'}</div>
      ${isSeated
        ? `<button class="card-btn btn-leave" onclick="leaveTable(${table.id})">退席</button>`
        : `<button class="card-btn btn-seat" onclick="seatTable(${table.id})">着席</button>`
      }
    `;

    grid.appendChild(card);
  });

  updateSummary(warnMs, alertMs);
}

// サマリー更新
function updateSummary(warnMs, alertMs) {
  let vacant = 0, occupied = 0, warning = 0, alert = 0;
  const now = Date.now();
  tables.forEach(t => {
    if (!t.seatedAt) { vacant++; return; }
    const elapsed = now - t.seatedAt;
    if (elapsed >= alertMs) alert++;
    else if (elapsed >= warnMs) warning++;
    else occupied++;
  });
  document.getElementById('summaryText').textContent =
    `空席：${vacant}　着席中：${occupied}　警告：${warning}　超過：${alert}`;
}

// グローバルタイマー（1秒ごとに時刻部分だけ更新）
function startGlobalTimer() {
  timerInterval = setInterval(() => {
    const warnMin = parseInt(document.getElementById('warnMinutes').value) || 30;
    const alertMin = parseInt(document.getElementById('alertMinutes').value) || 60;
    const warnMs = warnMin * 60 * 1000;
    const alertMs = alertMin * 60 * 1000;
    const now = Date.now();

    document.querySelectorAll('.table-card').forEach(card => {
      const id = parseInt(card.dataset.id);
      const table = tables.find(t => t.id === id);
      if (!table || !table.seatedAt) return;

      const elapsed = now - table.seatedAt;
      card.querySelector('.card-time').textContent = formatElapsed(elapsed);

      // クラス更新
      const newClass = getCardClass(table, warnMs, alertMs);
      card.className = `table-card ${newClass}`;
    });

    updateSummary(warnMs, alertMs);
  }, 1000);
}

// XSS対策
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// localStorage
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tables));
}

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) tables = JSON.parse(data);
  } catch (e) {
    tables = [];
  }
}

init();
