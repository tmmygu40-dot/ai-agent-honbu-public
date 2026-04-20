const STORAGE_KEY = 'cost_pressure_app';

const fields = [
  'revenue', 'purchase', 'utility', 'freight', 'otherCost', 'targetMargin',
  'purchaseIncrease', 'utilityIncrease', 'freightIncrease'
];

function saveInputs() {
  const data = {};
  fields.forEach(id => {
    data[id] = document.getElementById(id).value;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadInputs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    fields.forEach(id => {
      if (data[id] !== undefined) {
        document.getElementById(id).value = data[id];
      }
    });
  } catch (e) {}
}

function val(id) {
  return parseFloat(document.getElementById(id).value) || 0;
}

function fmt(num) {
  return num.toLocaleString('ja-JP') + ' 円';
}

function fmtPct(num) {
  return num.toFixed(1) + ' %';
}

function calculate() {
  const revenue = val('revenue');
  const purchase = val('purchase');
  const utility = val('utility');
  const freight = val('freight');
  const otherCost = val('otherCost');
  const targetMargin = val('targetMargin');

  const purchaseIncrease = val('purchaseIncrease');
  const utilityIncrease = val('utilityIncrease');
  const freightIncrease = val('freightIncrease');

  if (revenue <= 0) {
    alert('売上を入力してください。');
    return;
  }

  // 現状計算
  const currentTotalCost = purchase + utility + freight + otherCost;
  const currentProfit = revenue - currentTotalCost;
  const currentMargin = revenue > 0 ? (currentProfit / revenue) * 100 : 0;

  // 増加後計算
  const totalIncrease = purchaseIncrease + utilityIncrease + freightIncrease;
  const newTotalCost = currentTotalCost + totalIncrease;
  const newProfit = revenue - newTotalCost;
  const newMargin = revenue > 0 ? (newProfit / revenue) * 100 : 0;

  // 値上げ必要額計算
  // 目標利益率を達成するには: (新売上 - 新総コスト) / 新売上 = targetMargin / 100
  // 新売上 * (1 - targetMargin/100) = 新総コスト
  // 新売上 = 新総コスト / (1 - targetMargin/100)
  let requiredRevenue = 0;
  let requiredPriceUp = 0;
  let priceUpRate = 0;

  if (targetMargin > 0 && targetMargin < 100) {
    requiredRevenue = newTotalCost / (1 - targetMargin / 100);
    requiredPriceUp = requiredRevenue - revenue;
    priceUpRate = revenue > 0 ? (requiredPriceUp / revenue) * 100 : 0;
  } else if (targetMargin === 0) {
    // 目標利益率0%：損益分岐点のみ確認
    requiredRevenue = newTotalCost;
    requiredPriceUp = requiredRevenue - revenue;
    priceUpRate = revenue > 0 ? (requiredPriceUp / revenue) * 100 : 0;
  }

  // 表示
  document.getElementById('currentTotalCost').textContent = fmt(currentTotalCost);
  document.getElementById('currentProfit').textContent = fmt(currentProfit);
  document.getElementById('currentProfit').className = 'value ' + (currentProfit >= 0 ? 'profit-positive' : 'profit-negative');
  document.getElementById('currentMargin').textContent = fmtPct(currentMargin);

  document.getElementById('totalIncrease').textContent = fmt(totalIncrease);
  document.getElementById('newTotalCost').textContent = fmt(newTotalCost);
  document.getElementById('newProfit').textContent = fmt(newProfit);
  document.getElementById('newProfit').className = 'value ' + (newProfit >= 0 ? 'profit-positive' : 'profit-negative');
  document.getElementById('newMargin').textContent = fmtPct(newMargin);

  if (targetMargin > 0 && targetMargin < 100) {
    document.getElementById('requiredPriceUp').textContent = requiredPriceUp > 0 ? fmt(Math.ceil(requiredPriceUp)) : '値上げ不要';
    document.getElementById('newRevenue').textContent = fmt(Math.ceil(requiredRevenue));
    document.getElementById('priceUpRate').textContent = requiredPriceUp > 0 ? fmtPct(priceUpRate) : '0.0 %';
  } else {
    document.getElementById('requiredPriceUp').textContent = '目標利益率を入力してください';
    document.getElementById('newRevenue').textContent = '-';
    document.getElementById('priceUpRate').textContent = '-';
  }

  // アラートメッセージ
  const alertBox = document.getElementById('alertBox');
  if (newProfit < 0) {
    alertBox.className = 'alert alert-info';
    alertBox.textContent = '⚠️ 現在の売上ではコスト増加後に赤字になります。値上げが必要です。';
    alertBox.style.display = 'block';
  } else if (newMargin < targetMargin && targetMargin > 0) {
    alertBox.className = 'alert alert-info';
    alertBox.textContent = `⚠️ 利益率が目標（${targetMargin}%）を下回ります（${fmtPct(newMargin)}）。値上げを検討してください。`;
    alertBox.style.display = 'block';
  } else if (requiredPriceUp <= 0 && targetMargin > 0) {
    alertBox.className = 'alert alert-success';
    alertBox.textContent = '✅ 現在の売上のまま目標利益率を達成できています。';
    alertBox.style.display = 'block';
  } else {
    alertBox.style.display = 'none';
  }

  document.getElementById('resultSection').style.display = 'block';
  document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'start' });

  saveInputs();
}

function resetAll() {
  fields.forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('resultSection').style.display = 'none';
  localStorage.removeItem(STORAGE_KEY);
}

document.getElementById('calcBtn').addEventListener('click', calculate);
document.getElementById('resetBtn').addEventListener('click', resetAll);

fields.forEach(id => {
  document.getElementById(id).addEventListener('change', saveInputs);
});

loadInputs();
