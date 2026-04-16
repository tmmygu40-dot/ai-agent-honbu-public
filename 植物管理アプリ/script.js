'use strict';

const STORAGE_KEY = 'plant_manager_data';

let plants = [];
let editingId = null;
let currentFilter = 'all';

// --- ユーティリティ ---

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '未記録';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function daysDiff(dateStr) {
  if (!dateStr) return null;
  const now = new Date(today() + 'T00:00:00');
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}

function nextDate(lastDate, interval) {
  if (!lastDate) return null;
  const d = new Date(lastDate + 'T00:00:00');
  d.setDate(d.getDate() + interval);
  return d.toISOString().slice(0, 10);
}

function getStatus(dateStr, interval) {
  const next = nextDate(dateStr, interval);
  if (!next) return { label: '未記録', cls: 'badge-urgent', diff: null, nextDate: null };
  const diff = daysDiff(next);
  if (diff < 0) return { label: `${Math.abs(diff)}日超過`, cls: 'badge-urgent', diff, nextDate: next };
  if (diff === 0) return { label: '今日！', cls: 'badge-urgent', diff, nextDate: next };
  if (diff <= 2) return { label: `あと${diff}日`, cls: 'badge-soon', diff, nextDate: next };
  return { label: `あと${diff}日`, cls: 'badge-ok', diff, nextDate: next };
}

function isUrgent(plant) {
  const w = getStatus(plant.lastWater, plant.waterInterval);
  const f = getStatus(plant.lastFertilizer, plant.fertilizerInterval);
  return (w.diff !== null && w.diff <= 0) || (f.diff !== null && f.diff <= 0);
}

function isSoon(plant) {
  const w = getStatus(plant.lastWater, plant.waterInterval);
  const f = getStatus(plant.lastFertilizer, plant.fertilizerInterval);
  return (w.diff !== null && w.diff <= 2) || (f.diff !== null && f.diff <= 2);
}

// --- ストレージ ---

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
}

function load() {
  const data = localStorage.getItem(STORAGE_KEY);
  plants = data ? JSON.parse(data) : [];
}

// --- レンダリング ---

function renderList() {
  const list = document.getElementById('plant-list');
  const emptyMsg = document.getElementById('empty-msg');

  let filtered = plants;
  if (currentFilter === 'urgent') {
    filtered = plants.filter(p => isUrgent(p));
  } else if (currentFilter === 'water') {
    filtered = plants.filter(p => {
      const w = getStatus(p.lastWater, p.waterInterval);
      return w.diff !== null && w.diff <= 3;
    });
  } else if (currentFilter === 'fertilizer') {
    filtered = plants.filter(p => {
      const f = getStatus(p.lastFertilizer, p.fertilizerInterval);
      return f.diff !== null && f.diff <= 7;
    });
  }

  // 既存カードを削除
  list.querySelectorAll('.plant-card').forEach(el => el.remove());

  if (filtered.length === 0) {
    emptyMsg.style.display = '';
    return;
  }
  emptyMsg.style.display = 'none';

  // 要ケア順にソート
  const sorted = [...filtered].sort((a, b) => {
    const urgA = isUrgent(a) ? 0 : isSoon(a) ? 1 : 2;
    const urgB = isUrgent(b) ? 0 : isSoon(b) ? 1 : 2;
    return urgA - urgB;
  });

  sorted.forEach(plant => {
    const card = createCard(plant);
    list.appendChild(card);
  });
}

function createCard(plant) {
  const wStatus = getStatus(plant.lastWater, plant.waterInterval);
  const fStatus = getStatus(plant.lastFertilizer, plant.fertilizerInterval);

  const urgent = isUrgent(plant);
  const soon = !urgent && isSoon(plant);

  const card = document.createElement('div');
  card.className = 'plant-card' + (urgent ? ' urgent' : soon ? ' soon' : '');
  card.dataset.id = plant.id;

  const nextWaterText = wStatus.nextDate
    ? `次回: ${formatDate(wStatus.nextDate)}`
    : '次回: 未定';
  const nextFertilizerText = fStatus.nextDate
    ? `次回: ${formatDate(fStatus.nextDate)}`
    : '次回: 未定';

  const wNextCls = wStatus.cls === 'badge-urgent' ? 'next-urgent'
    : wStatus.cls === 'badge-soon' ? 'next-soon' : 'next-ok';
  const fNextCls = fStatus.cls === 'badge-urgent' ? 'next-urgent'
    : fStatus.cls === 'badge-soon' ? 'next-soon' : 'next-ok';

  card.innerHTML = `
    <div class="plant-header">
      <div>
        <div class="plant-name">🌿 ${escHtml(plant.name)}</div>
        ${plant.type ? `<div class="plant-type">${escHtml(plant.type)}</div>` : ''}
      </div>
      <div class="status-badges">
        <span class="badge ${wStatus.cls}">💧 ${wStatus.label}</span>
        <span class="badge ${fStatus.cls}">🌱 ${fStatus.label}</span>
      </div>
    </div>
    <div class="plant-details">
      <div class="detail-item">
        <div class="detail-label">💧 最終水やり</div>
        <div class="detail-value">${formatDate(plant.lastWater)}</div>
        <div class="detail-next ${wNextCls}">${nextWaterText}（${plant.waterInterval}日ごと）</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">🌱 最終肥料</div>
        <div class="detail-value">${formatDate(plant.lastFertilizer)}</div>
        <div class="detail-next ${fNextCls}">${nextFertilizerText}（${plant.fertilizerInterval}日ごと）</div>
      </div>
    </div>
  `;

  card.addEventListener('click', () => openModal(plant.id));
  return card;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- モーダル ---

function openModal(id) {
  editingId = id;
  const plant = plants.find(p => p.id === id);
  if (!plant) return;

  document.getElementById('modal-plant-name').textContent = `🌿 ${plant.name}`;
  document.getElementById('edit-water').value = plant.lastWater || '';
  document.getElementById('edit-fertilizer').value = plant.lastFertilizer || '';
  document.getElementById('edit-water-interval').value = plant.waterInterval;
  document.getElementById('edit-fertilizer-interval').value = plant.fertilizerInterval;

  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  editingId = null;
}

// --- イベント ---

document.getElementById('add-btn').addEventListener('click', () => {
  const name = document.getElementById('plant-name').value.trim();
  if (!name) {
    alert('植物の名前を入力してください。');
    return;
  }

  const plant = {
    id: Date.now().toString(),
    name,
    type: document.getElementById('plant-type').value.trim(),
    waterInterval: parseInt(document.getElementById('water-interval').value) || 3,
    fertilizerInterval: parseInt(document.getElementById('fertilizer-interval').value) || 30,
    lastWater: document.getElementById('last-water').value || today(),
    lastFertilizer: document.getElementById('last-fertilizer').value || today(),
  };

  plants.push(plant);
  save();
  renderList();

  // フォームリセット
  document.getElementById('plant-name').value = '';
  document.getElementById('plant-type').value = '';
  document.getElementById('water-interval').value = '3';
  document.getElementById('fertilizer-interval').value = '30';
  document.getElementById('last-water').value = '';
  document.getElementById('last-fertilizer').value = '';
});

document.getElementById('record-water-btn').addEventListener('click', () => {
  const plant = plants.find(p => p.id === editingId);
  if (!plant) return;
  plant.lastWater = today();
  save();
  renderList();
  document.getElementById('edit-water').value = plant.lastWater;
});

document.getElementById('record-fertilizer-btn').addEventListener('click', () => {
  const plant = plants.find(p => p.id === editingId);
  if (!plant) return;
  plant.lastFertilizer = today();
  save();
  renderList();
  document.getElementById('edit-fertilizer').value = plant.lastFertilizer;
});

document.getElementById('save-edit-btn').addEventListener('click', () => {
  const plant = plants.find(p => p.id === editingId);
  if (!plant) return;

  plant.lastWater = document.getElementById('edit-water').value || plant.lastWater;
  plant.lastFertilizer = document.getElementById('edit-fertilizer').value || plant.lastFertilizer;
  plant.waterInterval = parseInt(document.getElementById('edit-water-interval').value) || plant.waterInterval;
  plant.fertilizerInterval = parseInt(document.getElementById('edit-fertilizer-interval').value) || plant.fertilizerInterval;

  save();
  renderList();
  closeModal();
});

document.getElementById('delete-btn').addEventListener('click', () => {
  if (!confirm('この植物を削除しますか？')) return;
  plants = plants.filter(p => p.id !== editingId);
  save();
  renderList();
  closeModal();
});

document.getElementById('close-modal-btn').addEventListener('click', closeModal);

document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal')) closeModal();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderList();
  });
});

// --- 初期化 ---
load();
// 今日の日付をデフォルト設定
document.getElementById('last-water').value = today();
document.getElementById('last-fertilizer').value = today();
renderList();
