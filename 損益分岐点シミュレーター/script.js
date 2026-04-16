const STORAGE_KEY = 'bep_sim_data';

// 起動時にlocalStorageから復元
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    document.getElementById('fixedCost').value = data.fixedCost ?? '';
    document.getElementById('variableCost').value = data.variableCost ?? '';
    document.getElementById('price').value = data.price ?? '';
    if (data.fixedCost && data.variableCost && data.price) {
      calculate();
    }
  }
});

function calculate() {
  const fixedCost = parseFloat(document.getElementById('fixedCost').value);
  const variableCost = parseFloat(document.getElementById('variableCost').value);
  const price = parseFloat(document.getElementById('price').value);

  if (isNaN(fixedCost) || isNaN(variableCost) || isNaN(price)) {
    alert('すべての項目に数値を入力してください。');
    return;
  }
  if (price <= variableCost) {
    alert('販売価格は変動費より高くする必要があります。\n（販売価格 > 変動費）');
    return;
  }
  if (fixedCost < 0 || variableCost < 0 || price < 0) {
    alert('負の値は入力できません。');
    return;
  }

  // 保存
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ fixedCost, variableCost, price }));

  const unitMargin = price - variableCost;
  const bepQty = Math.ceil(fixedCost / unitMargin);
  const bepSales = bepQty * price;

  // 結果表示
  document.getElementById('bepQty').textContent = bepQty.toLocaleString();
  document.getElementById('unitMargin').textContent = formatYen(unitMargin);
  document.getElementById('bepSales').textContent = formatYen(bepSales);
  document.getElementById('resultCard').style.display = 'block';

  // グラフ・テーブル生成
  renderChart(fixedCost, variableCost, price, unitMargin, bepQty);
  renderTable(fixedCost, variableCost, price, bepQty);

  document.getElementById('chartSection').style.display = 'block';
  document.getElementById('tableSection').style.display = 'block';
}

function renderChart(fixedCost, variableCost, price, unitMargin, bepQty) {
  const container = document.getElementById('chartBars');
  container.innerHTML = '';

  // 表示するポイント：BEPの前後を含む8点
  const points = getChartPoints(bepQty);
  const profits = points.map(q => q * price - (fixedCost + q * variableCost));
  const maxAbs = Math.max(...profits.map(Math.abs), 1);

  const BAR_HEIGHT = 110; // px

  points.forEach((qty, i) => {
    const profit = profits[i];
    const ratio = Math.abs(profit) / maxAbs;
    const barH = Math.max(Math.round(ratio * BAR_HEIGHT), 4);

    const isBep = (qty === bepQty);
    const barClass = isBep ? 'zero' : (profit < 0 ? 'loss' : 'profit');

    const col = document.createElement('div');
    col.className = 'chart-col';
    col.innerHTML = `
      <div class="bar-label">${formatYenShort(profit)}</div>
      <div class="bar-wrap">
        <div class="bar ${barClass}" style="height:${barH}px"></div>
      </div>
      <div class="bar-qty">${qty.toLocaleString()}個</div>
    `;
    container.appendChild(col);
  });
}

function getChartPoints(bepQty) {
  // BEP前後の点を8つ選ぶ
  const step = Math.max(1, Math.ceil(bepQty / 4));
  const points = [];
  for (let i = -3; i <= 4; i++) {
    const q = bepQty + i * step;
    if (q >= 0) points.push(q);
  }
  // 重複除去・ソート
  return [...new Set(points)].sort((a, b) => a - b).slice(0, 8);
}

function renderTable(fixedCost, variableCost, price, bepQty) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  const step = Math.max(1, Math.ceil(bepQty / 5));
  const rows = [];
  for (let i = -4; i <= 5; i++) {
    const q = bepQty + i * step;
    if (q >= 0) rows.push(q);
  }
  const uniqueRows = [...new Set(rows)].sort((a, b) => a - b);

  uniqueRows.forEach(qty => {
    const sales = qty * price;
    const totalCost = fixedCost + qty * variableCost;
    const profit = sales - totalCost;
    const isBep = (qty === bepQty);

    const tr = document.createElement('tr');
    if (isBep) tr.className = 'bep-row';

    const profitClass = profit < 0 ? 'loss-val' : 'profit-val';
    const profitPrefix = profit >= 0 ? '+' : '';

    tr.innerHTML = `
      <td>${qty.toLocaleString()}個${isBep ? ' ★' : ''}</td>
      <td>${formatYen(sales)}</td>
      <td>${formatYen(totalCost)}</td>
      <td class="${profitClass}">${profitPrefix}${formatYen(profit)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function formatYen(value) {
  return '¥' + Math.round(value).toLocaleString();
}

function formatYenShort(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '+';
  if (abs >= 10000) {
    return sign + (abs / 10000).toFixed(1) + '万';
  }
  return sign + abs.toLocaleString();
}
