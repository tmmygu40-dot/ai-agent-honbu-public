const STORAGE_KEY = 'handmade_cost_records';

let lastCalcResult = null;

function calculate() {
  const itemName = document.getElementById('itemName').value.trim() || '無題の作品';
  const materialCost = parseFloat(document.getElementById('materialCost').value) || 0;
  const workMinutes = parseFloat(document.getElementById('workHours').value) || 0;
  const hourlyWage = parseFloat(document.getElementById('hourlyWage').value) || 1000;
  const profitRate = parseFloat(document.getElementById('profitRate').value) || 100;

  const laborCost = Math.round((workMinutes / 60) * hourlyWage);
  const totalCost = materialCost + laborCost;
  const sellingPrice = Math.round(totalCost * (1 + profitRate / 100));
  const profit = sellingPrice - totalCost;

  lastCalcResult = {
    itemName,
    materialCost,
    workMinutes,
    hourlyWage,
    profitRate,
    laborCost,
    totalCost,
    sellingPrice,
    profit,
    date: new Date().toLocaleDateString('ja-JP')
  };

  document.getElementById('laborCost').textContent = formatYen(laborCost);
  document.getElementById('totalCost').textContent = formatYen(totalCost);
  document.getElementById('sellingPrice').textContent = formatYen(sellingPrice);
  document.getElementById('profit').textContent = formatYen(profit);

  document.getElementById('result').style.display = 'block';
  document.getElementById('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveRecord() {
  if (!lastCalcResult) return;

  const records = loadRecords();
  records.unshift({ ...lastCalcResult, id: Date.now() });
  saveRecords(records);
  renderHistory();

  const btn = document.querySelector('.btn-save');
  btn.textContent = '保存しました！';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = '履歴に保存';
    btn.disabled = false;
  }, 1500);
}

function deleteRecord(id) {
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderHistory();
}

function renderHistory() {
  const records = loadRecords();
  const list = document.getElementById('historyList');
  const countEl = document.getElementById('historyCount');

  countEl.textContent = `${records.length}件`;

  if (records.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ履歴がありません</p>';
    return;
  }

  list.innerHTML = records.map(r => `
    <div class="history-card">
      <div class="history-card-header">
        <span class="history-card-name">${escapeHtml(r.itemName)}</span>
        <span class="history-card-date">${r.date}</span>
      </div>
      <div class="history-card-grid">
        <div class="history-card-item">
          <span class="history-card-item-label">材料費</span>
          <span class="history-card-item-value">${formatYen(r.materialCost)}</span>
        </div>
        <div class="history-card-item">
          <span class="history-card-item-label">人件費</span>
          <span class="history-card-item-value">${formatYen(r.laborCost)}</span>
        </div>
        <div class="history-card-item">
          <span class="history-card-item-label">制作時間</span>
          <span class="history-card-item-value">${r.workMinutes}分</span>
        </div>
        <div class="history-card-item">
          <span class="history-card-item-label">利益率</span>
          <span class="history-card-item-value">${r.profitRate}%</span>
        </div>
      </div>
      <div class="history-price-row">
        <span class="history-price-label">販売価格</span>
        <span class="history-price-value">${formatYen(r.sellingPrice)}</span>
        <span class="history-price-label">利益 ${formatYen(r.profit)}</span>
      </div>
      <button class="btn-delete" onclick="deleteRecord(${r.id})">削除</button>
    </div>
  `).join('');
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatYen(amount) {
  return '¥' + amount.toLocaleString('ja-JP');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// エンターキーで計算
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') calculate();
});

// 初期化
renderHistory();
