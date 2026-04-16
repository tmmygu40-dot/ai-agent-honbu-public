'use strict';

const STORAGE_KEY = 'shohiyaku_medicines';
const WARNING_DAYS = 7;
const URGENT_DAYS = 3;

let medicines = loadMedicines();

function loadMedicines() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveMedicines() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(medicines));
}

function calcRemainingDays(remaining, dailyDose, dosePerTime) {
  const perDay = dailyDose * dosePerTime;
  if (perDay <= 0) return 0;
  return Math.floor(remaining / perDay);
}

function calcVisitDate(remainingDays) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const visitDate = new Date(today);
  visitDate.setDate(today.getDate() + Math.max(remainingDays - 3, 0));
  return visitDate;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const w = days[date.getDay()];
  return `${y}/${m}/${d}（${w}）`;
}

function getStatusInfo(remainingDays) {
  if (remainingDays <= URGENT_DAYS) {
    return { level: 'urgent', label: '要受診', daysClass: 'days-urgent' };
  } else if (remainingDays <= WARNING_DAYS) {
    return { level: 'warning', label: '受診推奨', daysClass: 'days-warning' };
  }
  return { level: 'ok', label: '余裕あり', daysClass: 'days-left' };
}

function addMedicine() {
  const nameEl = document.getElementById('medicine-name');
  const remainingEl = document.getElementById('remaining-count');
  const dailyEl = document.getElementById('daily-dose');
  const perTimeEl = document.getElementById('dose-per-time');

  const name = nameEl.value.trim();
  const remaining = parseInt(remainingEl.value, 10);
  const dailyDose = parseInt(dailyEl.value, 10);
  const dosePerTime = parseInt(perTimeEl.value, 10) || 1;

  if (!name) {
    nameEl.focus();
    alert('薬の名前を入力してください');
    return;
  }
  if (isNaN(remaining) || remaining < 0) {
    remainingEl.focus();
    alert('残数を0以上の数字で入力してください');
    return;
  }
  if (isNaN(dailyDose) || dailyDose < 1) {
    dailyEl.focus();
    alert('1日の服用回数を1以上の数字で入力してください');
    return;
  }

  const medicine = {
    id: Date.now(),
    name,
    remaining,
    dailyDose,
    dosePerTime,
    registeredAt: new Date().toISOString()
  };

  medicines.push(medicine);
  saveMedicines();
  renderList();

  nameEl.value = '';
  remainingEl.value = '';
  dailyEl.value = '';
  perTimeEl.value = '1';
  nameEl.focus();
}

function deleteMedicine(id) {
  medicines = medicines.filter(m => m.id !== id);
  saveMedicines();
  renderList();
}

function updateRemaining(id, newRemaining) {
  const med = medicines.find(m => m.id === id);
  if (!med) return;
  if (isNaN(newRemaining) || newRemaining < 0) {
    alert('残数を0以上の数字で入力してください');
    return;
  }
  med.remaining = newRemaining;
  saveMedicines();
  renderList();
}

function renderList() {
  const listEl = document.getElementById('medicine-list');
  const emptyEl = document.getElementById('empty-message');
  const countEl = document.getElementById('medicine-count');

  countEl.textContent = medicines.length;

  if (medicines.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';

  const sorted = [...medicines].sort((a, b) => {
    const daysA = calcRemainingDays(a.remaining, a.dailyDose, a.dosePerTime);
    const daysB = calcRemainingDays(b.remaining, b.dailyDose, b.dosePerTime);
    return daysA - daysB;
  });

  listEl.innerHTML = sorted.map(med => {
    const days = calcRemainingDays(med.remaining, med.dailyDose, med.dosePerTime);
    const visitDate = calcVisitDate(days);
    const status = getStatusInfo(days);
    const perDayTotal = med.dailyDose * med.dosePerTime;

    return `
      <div class="medicine-card ${status.level}" data-id="${med.id}">
        <button class="delete-btn" onclick="deleteMedicine(${med.id})" title="削除">×</button>
        <div class="medicine-name">${escapeHtml(med.name)}</div>
        <div class="medicine-info">
          <div class="info-item">
            <span class="info-label">残数</span>
            <span class="info-value">${med.remaining} 錠/包</span>
          </div>
          <div class="info-item">
            <span class="info-label">1日の消費</span>
            <span class="info-value">${perDayTotal} 錠/包</span>
          </div>
          <div class="info-item">
            <span class="info-label">残り日数</span>
            <span class="info-value ${status.daysClass}">${days} 日</span>
          </div>
          <div class="info-item">
            <span class="info-label">受診推奨日</span>
            <span class="info-value">${days <= URGENT_DAYS ? '今すぐ' : formatDate(visitDate)}</span>
          </div>
        </div>
        <span class="status-badge status-${status.level}">${status.label}</span>
        <div class="update-section">
          <label>残数を更新：</label>
          <input type="number" id="update-${med.id}" value="${med.remaining}" min="0" max="9999">
          <button class="btn-update" onclick="updateFromInput(${med.id})">更新</button>
        </div>
      </div>
    `;
  }).join('');
}

function updateFromInput(id) {
  const input = document.getElementById(`update-${id}`);
  const val = parseInt(input.value, 10);
  updateRemaining(id, val);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.getElementById('add-btn').addEventListener('click', addMedicine);

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.closest('.form-section')) {
    addMedicine();
  }
});

renderList();
