'use strict';

const STORAGE_KEY = 'neage_checker_v1';

function fmt(num) {
  return Math.round(num).toLocaleString('ja-JP') + '円';
}

function fmtNum(num) {
  return Math.round(num).toLocaleString('ja-JP') + '人';
}

function calcNewSales(sales, customers, priceUpPct, churnPct) {
  if (!sales || !customers || customers === 0) return null;
  const unitPrice = sales / customers;
  const newUnitPrice = unitPrice * (1 + priceUpPct / 100);
  const newCustomers = customers * (1 - churnPct / 100);
  const newSales = newUnitPrice * newCustomers;
  return { unitPrice, newUnitPrice, newCustomers, newSales };
}

function getInputs() {
  return {
    sales: parseFloat(document.getElementById('currentSales').value) || 0,
    customers: parseFloat(document.getElementById('currentCustomers').value) || 0,
    priceUpRate: parseFloat(document.getElementById('priceUpRate').value) || 0,
    churnRate: parseFloat(document.getElementById('churnRate').value) || 0,
  };
}

document.getElementById('calcBtn').addEventListener('click', () => {
  const { sales, customers, priceUpRate, churnRate } = getInputs();

  if (!sales || !customers) {
    alert('売上と客数を入力してください。');
    return;
  }

  const r = calcNewSales(sales, customers, priceUpRate, churnRate);

  document.getElementById('unitPrice').textContent = fmt(r.unitPrice);
  document.getElementById('newUnitPrice').textContent = fmt(r.newUnitPrice);
  document.getElementById('newCustomers').textContent = fmtNum(r.newCustomers);
  document.getElementById('newSales').textContent = fmt(r.newSales);

  const diff = r.newSales - sales;
  const diffRate = (diff / sales) * 100;

  const verdict = document.getElementById('verdict');
  const diffEl = document.getElementById('diff');

  if (diff > 0) {
    verdict.textContent = '▲ 売上増加！値上げ有利';
    verdict.className = 'verdict up';
  } else if (diff < 0) {
    verdict.textContent = '▼ 売上減少。値上げ注意';
    verdict.className = 'verdict down';
  } else {
    verdict.textContent = '→ 売上変わらず（トントン）';
    verdict.className = 'verdict even';
  }

  const sign = diff >= 0 ? '+' : '';
  diffEl.textContent = `増減額：${sign}${fmt(diff)}（${sign}${diffRate.toFixed(1)}%）`;

  document.getElementById('resultSection').style.display = 'block';

  // シナリオ生成
  buildScenario(sales, customers, churnRate, priceUpRate);
  document.getElementById('scenarioSection').style.display = 'block';
  document.getElementById('scenarioChurn').textContent = churnRate;
});

function buildScenario(sales, customers, churnRate, currentPriceUpRate) {
  const tbody = document.getElementById('scenarioBody');
  tbody.innerHTML = '';

  for (let rate = 1; rate <= 20; rate++) {
    const r = calcNewSales(sales, customers, rate, churnRate);
    const diff = r.newSales - sales;
    const diffRate = (diff / sales) * 100;
    const sign = diff >= 0 ? '+' : '';

    let badge, badgeClass;
    if (diff > 0) {
      badge = '増加';
      badgeClass = 'badge-up';
    } else if (diff < 0) {
      badge = '減少';
      badgeClass = 'badge-down';
    } else {
      badge = '±0';
      badgeClass = 'badge-even';
    }

    const tr = document.createElement('tr');
    if (rate === Math.round(currentPriceUpRate)) {
      tr.className = 'highlight-current';
    }
    tr.innerHTML = `
      <td>${rate}%</td>
      <td>${fmt(r.newSales)}</td>
      <td>${sign}${fmt(diff)}</td>
      <td>${sign}${diffRate.toFixed(1)}%</td>
      <td><span class="${badgeClass}">${badge}</span></td>
    `;
    tbody.appendChild(tr);
  }
}

document.getElementById('saveBtn').addEventListener('click', () => {
  const data = getInputs();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  alert('入力値を保存しました。');
});

function loadSaved() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const data = JSON.parse(saved);
    if (data.sales) document.getElementById('currentSales').value = data.sales;
    if (data.customers) document.getElementById('currentCustomers').value = data.customers;
    if (data.priceUpRate) document.getElementById('priceUpRate').value = data.priceUpRate;
    if (data.churnRate) document.getElementById('churnRate').value = data.churnRate;
  } catch (e) { /* ignore */ }
}

loadSaved();
