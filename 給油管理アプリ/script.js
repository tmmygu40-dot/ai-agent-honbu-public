'use strict';

const STORAGE_KEY = 'fuelRecords';

let records = [];

// DOM elements
const dateEl = document.getElementById('date');
const distanceEl = document.getElementById('distance');
const fuelEl = document.getElementById('fuel');
const memoEl = document.getElementById('memo');
const addBtn = document.getElementById('addBtn');
const previewEl = document.getElementById('preview');
const previewValueEl = document.getElementById('preview-value');
const recordListEl = document.getElementById('recordList');
const totalCountEl = document.getElementById('totalCount');
const avgFuelEl = document.getElementById('avgFuel');
const totalDistanceEl = document.getElementById('totalDistance');

// Load from localStorage
function loadRecords() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    records = stored ? JSON.parse(stored) : [];
  } catch {
    records = [];
  }
}

// Save to localStorage
function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// Calculate fuel efficiency
function calcFuelEfficiency(distance, fuel) {
  if (!distance || !fuel || fuel === 0) return null;
  return (distance / fuel).toFixed(1);
}

// Update preview
function updatePreview() {
  const distance = parseFloat(distanceEl.value);
  const fuel = parseFloat(fuelEl.value);
  if (distance > 0 && fuel > 0) {
    const efficiency = calcFuelEfficiency(distance, fuel);
    previewValueEl.textContent = efficiency;
    previewEl.classList.remove('hidden');
  } else {
    previewEl.classList.add('hidden');
  }
}

// Render all records
function renderRecords() {
  if (records.length === 0) {
    recordListEl.innerHTML = '<p class="empty-msg">まだ記録がありません</p>';
    return;
  }

  recordListEl.innerHTML = records
    .slice()
    .reverse()
    .map((r, reversedIndex) => {
      const realIndex = records.length - 1 - reversedIndex;
      const dateStr = r.date ? `<div class="record-date">${r.date}</div>` : '';
      const memoStr = r.memo ? `<div class="record-memo">${escapeHtml(r.memo)}</div>` : '';
      return `
        <div class="record-item">
          <div class="record-info">
            ${dateStr}
            <div class="record-fuel">${r.efficiency} km/L <span>燃費</span></div>
            <div class="record-details">走行距離：${r.distance} km　／　給油量：${r.fuel} L</div>
            ${memoStr}
          </div>
          <button class="btn-delete" data-index="${realIndex}">削除</button>
        </div>
      `;
    })
    .join('');

  // Bind delete buttons
  recordListEl.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      records.splice(idx, 1);
      saveRecords();
      renderRecords();
      updateStats();
    });
  });
}

// Update stats
function updateStats() {
  totalCountEl.textContent = records.length;

  if (records.length === 0) {
    avgFuelEl.textContent = '-- km/L';
    totalDistanceEl.textContent = '-- km';
    return;
  }

  const totalDist = records.reduce((sum, r) => sum + parseFloat(r.distance), 0);
  const totalFuel = records.reduce((sum, r) => sum + parseFloat(r.fuel), 0);
  const avg = totalFuel > 0 ? (totalDist / totalFuel).toFixed(1) : '--';

  avgFuelEl.textContent = `${avg} km/L`;
  totalDistanceEl.textContent = `${totalDist.toFixed(0)} km`;
}

// Add record
function addRecord() {
  const distance = parseFloat(distanceEl.value);
  const fuel = parseFloat(fuelEl.value);

  if (!distance || distance <= 0) {
    alert('走行距離を入力してください');
    distanceEl.focus();
    return;
  }
  if (!fuel || fuel <= 0) {
    alert('給油量を入力してください');
    fuelEl.focus();
    return;
  }

  const efficiency = calcFuelEfficiency(distance, fuel);
  const record = {
    date: dateEl.value || '',
    distance: distance,
    fuel: fuel,
    efficiency: efficiency,
    memo: memoEl.value.trim(),
    createdAt: Date.now()
  };

  records.push(record);
  saveRecords();
  renderRecords();
  updateStats();

  // Clear inputs (keep date)
  distanceEl.value = '';
  fuelEl.value = '';
  memoEl.value = '';
  previewEl.classList.add('hidden');

  distanceEl.focus();
}

// Escape HTML
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Set today's date as default
function setDefaultDate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  dateEl.value = `${yyyy}-${mm}-${dd}`;
}

// Event listeners
distanceEl.addEventListener('input', updatePreview);
fuelEl.addEventListener('input', updatePreview);
addBtn.addEventListener('click', addRecord);

[distanceEl, fuelEl, memoEl].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') addRecord();
  });
});

// Init
loadRecords();
setDefaultDate();
renderRecords();
updateStats();
