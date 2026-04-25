const STORAGE_KEY = 'kakakusenryaku_v1';

const ids = {
  costPrice: document.getElementById('costPrice'),
  sellPrice: document.getElementById('sellPrice'),
  quantity: document.getElementById('quantity'),
  priceUpRate: document.getElementById('priceUpRate'),
  volumeDownRate: document.getElementById('volumeDownRate'),
  calcBtn: document.getElementById('calcBtn'),
  results: document.getElementById('results'),
  recommendation: document.getElementById('recommendation'),
};

function fmt(n) {
  return Math.round(n).toLocaleString('ja-JP') + '円';
}

function fmtPct(n) {
  return n.toFixed(1) + '%';
}

function fmtDiff(n) {
  const sign = n >= 0 ? '+' : '';
  return sign + Math.round(n).toLocaleString('ja-JP') + '円';
}

function calcScenario(costPrice, sellPrice, quantity) {
  const profit1 = sellPrice - costPrice;
  const profit = profit1 * quantity;
  const margin = sellPrice > 0 ? (profit1 / sellPrice) * 100 : 0;
  return { profit1, profit, margin };
}

function setCell(id, value, className) {
  const el = document.getElementById(id);
  el.textContent = value;
  if (className) {
    el.className = className;
  }
}

function calculate() {
  const costPrice = parseFloat(ids.costPrice.value);
  const sellPrice = parseFloat(ids.sellPrice.value);
  const quantity = parseFloat(ids.quantity.value);
  const priceUpRate = parseFloat(ids.priceUpRate.value) || 10;
  const volumeDownRate = parseFloat(ids.volumeDownRate.value) || 10;

  if (isNaN(costPrice) || isNaN(sellPrice) || isNaN(quantity) ||
      costPrice < 0 || sellPrice <= 0 || quantity < 0) {
    alert('仕入れ値・販売価格・販売数量を正しく入力してください。');
    return;
  }

  // 据え置きシナリオ
  const keep = calcScenario(costPrice, sellPrice, quantity);

  // 値上げシナリオ（価格を上げる、数量は同じ）
  const upSellPrice = sellPrice * (1 + priceUpRate / 100);
  const up = calcScenario(costPrice, upSellPrice, quantity);

  // 量削減シナリオ（価格は同じ、仕入れ原価が削減率分下がる）
  const downCostPrice = costPrice * (1 - volumeDownRate / 100);
  const down = calcScenario(downCostPrice, sellPrice, quantity);

  // 据え置き
  setCell('keepSellPrice', fmt(sellPrice));
  setCell('keepQty', quantity.toLocaleString('ja-JP') + '個');
  setCell('keepProfit1', fmt(keep.profit1));
  setCell('keepProfit', fmt(keep.profit));
  setCell('keepMargin', fmtPct(keep.margin));

  // 値上げ
  const upDescText = `販売価格を${priceUpRate}%アップ`;
  document.getElementById('upDesc').textContent = upDescText;
  setCell('upSellPrice', fmt(upSellPrice));
  setCell('upQty', quantity.toLocaleString('ja-JP') + '個');
  setCell('upProfit1', fmt(up.profit1));
  setCell('upProfit', fmt(up.profit));
  setCell('upMargin', fmtPct(up.margin));
  const upDiff = up.profit - keep.profit;
  const upDiffEl = document.getElementById('upDiff');
  upDiffEl.textContent = fmtDiff(upDiff);
  upDiffEl.className = upDiff >= 0 ? 'diff-positive' : 'diff-negative';

  // 量削減
  const downDescText = `原価を${volumeDownRate}%削減（価格据え置き）`;
  document.getElementById('downDesc').textContent = downDescText;
  setCell('downSellPrice', fmt(sellPrice));
  setCell('downQty', quantity.toLocaleString('ja-JP') + '個');
  setCell('downProfit1', fmt(down.profit1));
  setCell('downProfit', fmt(down.profit));
  setCell('downMargin', fmtPct(down.margin));
  const downDiff = down.profit - keep.profit;
  const downDiffEl = document.getElementById('downDiff');
  downDiffEl.textContent = fmtDiff(downDiff);
  downDiffEl.className = downDiff >= 0 ? 'diff-positive' : 'diff-negative';

  // おすすめ
  const profits = [
    { name: '据え置き', profit: keep.profit },
    { name: `値上げ（${priceUpRate}%）`, profit: up.profit },
    { name: `量削減（${volumeDownRate}%）`, profit: down.profit },
  ];
  profits.sort((a, b) => b.profit - a.profit);
  const best = profits[0];
  ids.recommendation.innerHTML =
    `<strong>最も利益が高いシナリオ：${best.name}（月間 ${fmt(best.profit)}）</strong><br>` +
    profits.map(p => `${p.name}：${fmt(p.profit)}`).join('　／　');

  ids.results.classList.remove('hidden');
  ids.results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  saveToStorage();
}

function saveToStorage() {
  const data = {
    costPrice: ids.costPrice.value,
    sellPrice: ids.sellPrice.value,
    quantity: ids.quantity.value,
    priceUpRate: ids.priceUpRate.value,
    volumeDownRate: ids.volumeDownRate.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data) return;
    if (data.costPrice) ids.costPrice.value = data.costPrice;
    if (data.sellPrice) ids.sellPrice.value = data.sellPrice;
    if (data.quantity) ids.quantity.value = data.quantity;
    if (data.priceUpRate) ids.priceUpRate.value = data.priceUpRate;
    if (data.volumeDownRate) ids.volumeDownRate.value = data.volumeDownRate;
  } catch (e) {
    // ignore
  }
}

ids.calcBtn.addEventListener('click', calculate);

[ids.costPrice, ids.sellPrice, ids.quantity, ids.priceUpRate, ids.volumeDownRate].forEach(el => {
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') calculate();
  });
});

loadFromStorage();
