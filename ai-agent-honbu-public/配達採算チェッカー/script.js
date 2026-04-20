const STORAGE_KEY = 'delivery_customers';
const THRESHOLD_KEY = 'delivery_threshold';

let customers = [];
let threshold = 20;
let currentFilter = 'all';

// 初期化
window.addEventListener('DOMContentLoaded', () => {
  customers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  threshold = parseFloat(localStorage.getItem(THRESHOLD_KEY) || '20');
  document.getElementById('thresholdInput').value = threshold;

  document.getElementById('thresholdInput').addEventListener('change', (e) => {
    threshold = parseFloat(e.target.value) || 20;
    localStorage.setItem(THRESHOLD_KEY, threshold);
    renderList();
  });

  renderList();
});

function addCustomer() {
  const name = document.getElementById('customerName').value.trim();
  const distance = parseFloat(document.getElementById('distance').value);
  const frequency = parseFloat(document.getElementById('frequency').value);
  const fuelPrice = parseFloat(document.getElementById('fuelPrice').value);
  const fuelEff = parseFloat(document.getElementById('fuelEfficiency').value);
  const sales = parseFloat(document.getElementById('monthlySales').value);

  if (!name) { alert('顧客名を入力してください'); return; }
  if (isNaN(distance) || distance <= 0) { alert('片道距離を正しく入力してください'); return; }
  if (isNaN(frequency) || frequency <= 0) { alert('配達回数を正しく入力してください'); return; }
  if (isNaN(fuelPrice) || fuelPrice <= 0) { alert('燃料単価を正しく入力してください'); return; }
  if (isNaN(fuelEff) || fuelEff <= 0) { alert('燃費を正しく入力してください'); return; }
  if (isNaN(sales) || sales < 0) { alert('月間売上を正しく入力してください'); return; }

  const customer = {
    id: Date.now(),
    name,
    distance,
    frequency,
    fuelPrice,
    fuelEff,
    sales
  };

  customers.push(customer);
  saveCustomers();
  clearForm();
  renderList();
}

function deleteCustomer(id) {
  customers = customers.filter(c => c.id !== id);
  saveCustomers();
  renderList();
}

function calcCost(c) {
  // 月間配達コスト = 片道距離 × 2(往復) × 月回数 ÷ 燃費 × 燃料単価
  return (c.distance * 2 * c.frequency) / c.fuelEff * c.fuelPrice;
}

function calcRate(cost, sales) {
  if (sales === 0) return Infinity;
  return (cost / sales) * 100;
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

function renderList() {
  const container = document.getElementById('customerList');
  const summaryCard = document.getElementById('summaryCard');

  let filtered = customers.map(c => {
    const cost = calcCost(c);
    const rate = calcRate(cost, c.sales);
    const isNG = rate > threshold;
    return { ...c, cost, rate, isNG };
  });

  if (currentFilter === 'ng') filtered = filtered.filter(c => c.isNG);
  if (currentFilter === 'ok') filtered = filtered.filter(c => !c.isNG);

  if (customers.length === 0) {
    container.innerHTML = '<p class="empty-msg">顧客がまだ登録されていません</p>';
    summaryCard.style.display = 'none';
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">該当する顧客はいません</p>';
  } else {
    container.innerHTML = filtered.map(c => renderCard(c)).join('');
  }

  // 集計
  const allCalc = customers.map(c => {
    const cost = calcCost(c);
    const rate = calcRate(cost, c.sales);
    return { cost, rate, isNG: rate > threshold, sales: c.sales };
  });
  document.getElementById('totalCount').textContent = customers.length;
  document.getElementById('ngCount').textContent = allCalc.filter(c => c.isNG).length;
  document.getElementById('totalCost').textContent = Math.round(allCalc.reduce((s, c) => s + c.cost, 0)).toLocaleString();
  document.getElementById('totalSales').textContent = allCalc.reduce((s, c) => s + c.sales, 0).toLocaleString();
  summaryCard.style.display = 'block';
}

function renderCard(c) {
  const barWidth = Math.min(c.rate, 100).toFixed(1);
  const rateDisplay = isFinite(c.rate) ? c.rate.toFixed(1) : '∞';
  const cardClass = c.isNG ? 'danger' : '';
  const statusClass = c.isNG ? 'status-ng' : 'status-ok';
  const statusText = c.isNG ? '採算割れ' : '採算OK';
  const costClass = c.isNG ? 'danger' : 'ok';
  const barClass = c.isNG ? 'ng' : 'ok';

  return `
    <div class="customer-card ${cardClass}">
      <button class="btn-delete" onclick="deleteCustomer(${c.id})">✕</button>
      <div class="customer-header">
        <span class="customer-name">${escapeHtml(c.name)}</span>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="customer-details">
        <div class="detail-item">
          <span class="detail-label">片道距離</span>
          <span class="detail-value">${c.distance} km</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">月間配達回数</span>
          <span class="detail-value">${c.frequency} 回</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">燃料単価</span>
          <span class="detail-value">${c.fuelPrice} 円/L</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">燃費</span>
          <span class="detail-value">${c.fuelEff} km/L</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">月間売上</span>
          <span class="detail-value">${c.sales.toLocaleString()} 円</span>
        </div>
      </div>
      <div class="cost-summary">
        <div class="cost-item">
          <span class="cost-label">月間配達コスト</span>
          <span class="cost-value ${costClass}">${Math.round(c.cost).toLocaleString()} 円</span>
        </div>
        <div class="cost-item">
          <span class="cost-label">コスト率</span>
          <span class="cost-value ${costClass}">${rateDisplay}%</span>
        </div>
        <div class="cost-rate-bar">
          <span class="cost-label">コスト率バー（上限${threshold}%）</span>
          <div class="bar-track">
            <div class="bar-fill ${barClass}" style="width:${barWidth}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function saveCustomers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

function clearForm() {
  ['customerName', 'distance', 'frequency', 'fuelPrice', 'fuelEfficiency', 'monthlySales']
    .forEach(id => document.getElementById(id).value = '');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
