const STORAGE_KEY = 'plantCareApp_plants';

let plants = [];

function loadPlants() {
  const saved = localStorage.getItem(STORAGE_KEY);
  plants = saved ? JSON.parse(saved) : [];
}

function savePlants() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayDiff(a, b) {
  // b - a（日数）
  const msA = new Date(a).getTime();
  const msB = new Date(b).getTime();
  return Math.round((msB - msA) / 86400000);
}

function addPlant() {
  const nameEl = document.getElementById('plantName');
  const freqEl = document.getElementById('plantFreq');
  const name = nameEl.value.trim();
  const freq = parseInt(freqEl.value, 10);

  if (!name) { alert('植物の名前を入力してください'); return; }
  if (!freq || freq < 1) { alert('水やり頻度を1以上の整数で入力してください'); return; }

  const plant = {
    id: Date.now(),
    name,
    freq,
    lastWatered: todayStr()
  };

  plants.push(plant);
  savePlants();
  nameEl.value = '';
  freqEl.value = '';
  renderList();
}

function waterPlant(id) {
  const plant = plants.find(p => p.id === id);
  if (!plant) return;
  plant.lastWatered = todayStr();
  savePlants();
  renderList();
}

function deletePlant(id) {
  plants = plants.filter(p => p.id !== id);
  savePlants();
  renderList();
}

function renderList() {
  const today = todayStr();

  // 次回水やり日を計算してソート（近い順）
  const sorted = plants.map(p => {
    const nextDate = addDays(p.lastWatered, p.freq);
    const daysLeft = dayDiff(today, nextDate); // 正→未来、負→過去
    return { ...p, nextDate, daysLeft };
  }).sort((a, b) => a.daysLeft - b.daysLeft);

  const listEl = document.getElementById('plantList');
  const emptyEl = document.getElementById('emptyMsg');

  listEl.innerHTML = '';

  if (sorted.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  sorted.forEach(p => {
    const card = document.createElement('div');
    card.className = 'plant-card ' + getCardClass(p.daysLeft);

    const lastWateredLabel = `最終水やり：${p.lastWatered}`;
    const nextLabel = `次回目安：${p.nextDate}`;
    const statusText = getStatusText(p.daysLeft);
    const statusClass = getStatusClass(p.daysLeft);
    const icon = getIcon(p.daysLeft);

    card.innerHTML = `
      <div class="plant-icon">${icon}</div>
      <div class="plant-info">
        <div class="plant-name">${escHtml(p.name)}</div>
        <div class="plant-meta">${lastWateredLabel}　${nextLabel}</div>
        <div class="plant-status ${statusClass}">${statusText}</div>
      </div>
      <div class="plant-actions">
        <button class="btn-water" onclick="waterPlant(${p.id})">💧 水やり</button>
        <button class="btn-delete" onclick="deletePlant(${p.id})">削除</button>
      </div>
    `;

    listEl.appendChild(card);
  });
}

function getCardClass(daysLeft) {
  if (daysLeft < 0) return 'urgent';
  if (daysLeft === 0) return 'today';
  return 'ok';
}

function getStatusText(daysLeft) {
  if (daysLeft < 0) return `⚠️ ${Math.abs(daysLeft)}日 超過！水やりが必要です`;
  if (daysLeft === 0) return '🔔 今日水やりしてください';
  return `あと ${daysLeft}日`;
}

function getStatusClass(daysLeft) {
  if (daysLeft < 0) return 'status-urgent';
  if (daysLeft === 0) return 'status-today';
  return 'status-ok';
}

function getIcon(daysLeft) {
  if (daysLeft < 0) return '🥀';
  if (daysLeft === 0) return '🌱';
  return '🪴';
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 起動時
loadPlants();
renderList();
