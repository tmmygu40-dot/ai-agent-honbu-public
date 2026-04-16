'use strict';

const STORAGE_KEY = 'denki_appliances';
const RATE_KEY = 'denki_rate';

let appliances = [];
let rate = 31;

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { appliances = JSON.parse(saved); } catch (e) { appliances = []; }
  }
  const savedRate = localStorage.getItem(RATE_KEY);
  if (savedRate) rate = parseFloat(savedRate) || 31;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appliances));
  localStorage.setItem(RATE_KEY, String(rate));
}

function calcMonthlyCost(wattage, hours) {
  // W ÷ 1000 × 時間 × 30日 × 単価
  return (wattage / 1000) * hours * 30 * rate;
}

function renderList() {
  const list = document.getElementById('applianceList');
  const emptyMsg = document.getElementById('emptyMsg');
  const totalCost = document.getElementById('totalCost');

  list.innerHTML = '';

  if (appliances.length === 0) {
    emptyMsg.style.display = 'block';
    totalCost.textContent = '0 円';
    return;
  }

  emptyMsg.style.display = 'none';

  let total = 0;
  appliances.forEach((item, index) => {
    const cost = calcMonthlyCost(item.wattage, item.hours);
    total += cost;

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-detail">${item.wattage}W × ${item.hours}時間/日</div>
      </div>
      <span class="item-cost">${Math.round(cost).toLocaleString()} 円/月</span>
      <button class="delete-btn" data-index="${index}">削除</button>
    `;
    list.appendChild(li);
  });

  totalCost.textContent = Math.round(total).toLocaleString() + ' 円';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addAppliance() {
  const nameEl = document.getElementById('applianceName');
  const wattEl = document.getElementById('wattage');
  const hoursEl = document.getElementById('hoursPerDay');

  const name = nameEl.value.trim();
  const wattage = parseFloat(wattEl.value);
  const hours = parseFloat(hoursEl.value);

  if (!name) { nameEl.focus(); return; }
  if (!wattage || wattage <= 0) { wattEl.focus(); return; }
  if (!hours || hours <= 0) { hoursEl.focus(); return; }

  appliances.push({ name, wattage, hours });
  saveData();
  renderList();

  nameEl.value = '';
  wattEl.value = '';
  hoursEl.value = '';
  nameEl.focus();
}

document.getElementById('addBtn').addEventListener('click', addAppliance);

document.getElementById('applianceName').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addAppliance();
});

document.getElementById('applianceList').addEventListener('click', function(e) {
  if (e.target.classList.contains('delete-btn')) {
    const index = parseInt(e.target.dataset.index, 10);
    appliances.splice(index, 1);
    saveData();
    renderList();
  }
});

document.getElementById('applyRate').addEventListener('click', function() {
  const val = parseFloat(document.getElementById('rate').value);
  if (val > 0) {
    rate = val;
    saveData();
    renderList();
  }
});

document.getElementById('rate').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('applyRate').click();
});

// 初期化
loadData();
document.getElementById('rate').value = rate;
renderList();
