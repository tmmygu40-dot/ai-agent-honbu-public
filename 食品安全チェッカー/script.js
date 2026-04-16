// 安全時間の定義（ミリ秒）
const SAFE_DURATION = {
  room: 2 * 60 * 60 * 1000,   // 常温：2時間
  cold: 72 * 60 * 60 * 1000   // 冷蔵：72時間
};

const STORAGE_KEY = 'food_safety_checker';

let foods = [];
let timerInterval = null;

function loadFoods() {
  const data = localStorage.getItem(STORAGE_KEY);
  foods = data ? JSON.parse(data) : [];
}

function saveFoods() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
}

function formatDateTime(ts) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

function formatRemaining(ms) {
  if (ms <= 0) return '期限切れ';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) {
    return `残り ${h}時間 ${m}分`;
  }
  return `残り ${m}分`;
}

function getStatus(remaining, total) {
  if (remaining <= 0) return 'expired';
  const ratio = remaining / total;
  if (ratio > 0.5) return 'safe';
  if (ratio > 0.2) return 'warning';
  return 'danger';
}

function renderList() {
  const list = document.getElementById('food-list');
  const countEl = document.getElementById('count');

  if (foods.length === 0) {
    list.innerHTML = '<p class="empty-msg">登録されている料理はありません</p>';
    countEl.textContent = '';
    return;
  }

  countEl.textContent = `（${foods.length}件）`;

  const now = Date.now();

  // 残り時間でソート（期限切れは末尾）
  const sorted = [...foods].sort((a, b) => {
    const remA = (a.madeAt + SAFE_DURATION[a.storage]) - now;
    const remB = (b.madeAt + SAFE_DURATION[b.storage]) - now;
    return remA - remB;
  });

  list.innerHTML = sorted.map(food => {
    const limit = food.madeAt + SAFE_DURATION[food.storage];
    const remaining = limit - now;
    const total = SAFE_DURATION[food.storage];
    const status = getStatus(remaining, total);
    const progressPct = Math.max(0, Math.min(100, (remaining / total) * 100));
    const badgeClass = food.storage === 'room' ? 'badge-room' : 'badge-cold';
    const badgeText = food.storage === 'room' ? '常温' : '冷蔵';

    return `
      <div class="food-item ${status}" data-id="${food.id}">
        <div class="food-item-header">
          <div class="food-name">${escapeHtml(food.name)}</div>
          <span class="food-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="food-meta">作成：${formatDateTime(food.madeAt)}&nbsp;&nbsp;期限：${formatDateTime(limit)}</div>
        <div class="time-remaining ${status}">
          <span class="label">残り時間</span>
          ${formatRemaining(remaining)}
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${status}" style="width:${progressPct}%"></div>
        </div>
        <div class="item-actions">
          <button class="btn-delete" onclick="deleteFood('${food.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addFood() {
  const nameEl = document.getElementById('food-name');
  const madeAtEl = document.getElementById('made-at');
  const storageVal = document.querySelector('input[name="storage"]:checked').value;

  const name = nameEl.value.trim();
  if (!name) {
    alert('料理名を入力してください');
    nameEl.focus();
    return;
  }
  if (!madeAtEl.value) {
    alert('作った時刻を入力してください');
    madeAtEl.focus();
    return;
  }

  const madeAt = new Date(madeAtEl.value).getTime();

  const food = {
    id: Date.now().toString(),
    name,
    madeAt,
    storage: storageVal
  };

  foods.push(food);
  saveFoods();
  renderList();

  nameEl.value = '';
  setDefaultDateTime();
  nameEl.focus();
}

function deleteFood(id) {
  foods = foods.filter(f => f.id !== id);
  saveFoods();
  renderList();
}

function clearExpired() {
  const now = Date.now();
  const before = foods.length;
  foods = foods.filter(f => (f.madeAt + SAFE_DURATION[f.storage]) > now);
  const removed = before - foods.length;
  if (removed === 0) {
    alert('期限切れの料理はありません');
    return;
  }
  saveFoods();
  renderList();
  alert(`${removed}件の期限切れ料理を削除しました`);
}

function setDefaultDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const local = new Date(now - offset);
  document.getElementById('made-at').value = local.toISOString().slice(0, 16);
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(renderList, 30000); // 30秒ごとに更新
}

document.getElementById('add-btn').addEventListener('click', addFood);
document.getElementById('food-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addFood();
});
document.getElementById('clear-expired-btn').addEventListener('click', clearExpired);

// 初期化
loadFoods();
setDefaultDateTime();
renderList();
startTimer();
