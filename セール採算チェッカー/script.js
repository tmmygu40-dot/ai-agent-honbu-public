'use strict';

const costEl         = document.getElementById('cost');
const normalPriceEl  = document.getElementById('normal-price');
const targetMarginEl = document.getElementById('target-margin');
const discountRateEl = document.getElementById('discount-rate');

const salePriceEl    = document.getElementById('sale-price');
const minPriceEl     = document.getElementById('min-price');
const profitEl       = document.getElementById('profit');
const marginEl       = document.getElementById('margin');
const normalProfitEl = document.getElementById('normal-profit');
const verdictEl      = document.getElementById('verdict');
const verdictTextEl  = document.getElementById('verdict-text');
const historyListEl  = document.getElementById('history-list');
const clearHistoryEl = document.getElementById('clear-history');

const STORAGE_KEY = 'sale-checker-history';

// 計算
function calculate() {
  const cost         = parseFloat(costEl.value);
  const normalPrice  = parseFloat(normalPriceEl.value);
  const targetMargin = parseFloat(targetMarginEl.value);
  const discountRate = parseFloat(discountRateEl.value);

  const hasCost         = !isNaN(cost) && cost > 0;
  const hasNormalPrice  = !isNaN(normalPrice) && normalPrice > 0;
  const hasTargetMargin = !isNaN(targetMargin) && targetMargin >= 0;
  const hasDiscount     = !isNaN(discountRate) && discountRate >= 0;

  if (!hasCost) {
    resetResults();
    return;
  }

  // 通常売価が入力されている場合：通常時の利益
  if (hasNormalPrice) {
    const normalProfit = normalPrice - cost;
    normalProfitEl.textContent = fmt(normalProfit) + '円';
  } else {
    normalProfitEl.textContent = '—';
  }

  // セール価格の計算
  let salePrice = null;
  if (hasNormalPrice && hasDiscount) {
    salePrice = normalPrice * (1 - discountRate / 100);
    salePriceEl.textContent = fmt(salePrice) + '円';
  } else {
    salePriceEl.textContent = '—';
  }

  // 最低販売価格：原価÷(1 - 目標粗利率/100)
  let minPrice = null;
  if (hasTargetMargin && targetMargin < 100) {
    minPrice = cost / (1 - targetMargin / 100);
    minPriceEl.textContent = fmt(minPrice) + '円';
  } else if (hasTargetMargin && targetMargin === 0) {
    minPrice = cost;
    minPriceEl.textContent = fmt(minPrice) + '円（原価）';
  } else {
    minPriceEl.textContent = '—';
  }

  // セール価格に基づく利益・粗利率
  if (salePrice !== null) {
    const profit = salePrice - cost;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
    profitEl.textContent = fmt(profit) + '円';
    marginEl.textContent = margin.toFixed(1) + '%';

    // 判定
    setVerdict(salePrice, minPrice, profit, margin);

    // 自動履歴保存（3秒後に保存してチャタリング防止）
    scheduleHistorySave({ cost, normalPrice, discountRate, targetMargin, salePrice, profit, margin });
  } else {
    profitEl.textContent = '—';
    marginEl.textContent = '—';
    setVerdict(null, minPrice, null, null);
  }
}

function setVerdict(salePrice, minPrice, profit, margin) {
  verdictEl.className = 'verdict-box';

  if (salePrice === null || profit === null) {
    verdictTextEl.textContent = '数値を入力してください';
    return;
  }

  if (minPrice !== null) {
    if (salePrice >= minPrice) {
      verdictEl.classList.add('ok');
      verdictTextEl.textContent = '✅ 採算OK：目標粗利率を確保できます';
    } else {
      verdictEl.classList.add('danger');
      verdictTextEl.textContent = '❌ 採算NG：最低価格（' + fmt(minPrice) + '円）を下回っています';
    }
  } else if (profit < 0) {
    verdictEl.classList.add('danger');
    verdictTextEl.textContent = '❌ 赤字：仕入れ原価を下回っています';
  } else if (profit === 0) {
    verdictEl.classList.add('warning');
    verdictTextEl.textContent = '⚠️ トントン：利益はゼロです';
  } else {
    verdictEl.classList.add('ok');
    verdictTextEl.textContent = '✅ 黒字：利益が出ます';
  }
}

function resetResults() {
  salePriceEl.textContent    = '—';
  minPriceEl.textContent     = '—';
  profitEl.textContent       = '—';
  marginEl.textContent       = '—';
  normalProfitEl.textContent = '—';
  verdictEl.className        = 'verdict-box';
  verdictTextEl.textContent  = '数値を入力してください';
}

function fmt(num) {
  return Math.round(num).toLocaleString('ja-JP');
}

// 履歴保存（チャタリング防止）
let saveTimer = null;
function scheduleHistorySave(data) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveHistory(data), 1500);
}

function saveHistory(data) {
  const history = loadHistory();
  const entry = {
    date: new Date().toLocaleString('ja-JP'),
    cost: data.cost,
    normalPrice: data.normalPrice,
    discountRate: data.discountRate,
    targetMargin: data.targetMargin,
    salePrice: data.salePrice,
    profit: data.profit,
    margin: data.margin
  };
  history.unshift(entry);
  if (history.length > 20) history.length = 20;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory(history);
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory(history) {
  if (!history || history.length === 0) {
    historyListEl.innerHTML = '<li class="no-history">履歴はありません</li>';
    return;
  }
  historyListEl.innerHTML = history.map(h => {
    const profitClass = h.profit >= 0 ? 'h-ok' : 'h-ng';
    const profitSign  = h.profit >= 0 ? '+' : '';
    return `
      <li class="history-item">
        <div class="h-top">
          <span>原価${fmt(h.cost)}円 → セール${fmt(h.salePrice)}円（割引${h.discountRate}%）</span>
          <span class="h-date">${h.date}</span>
        </div>
        <span class="${profitClass}">利益 ${profitSign}${fmt(h.profit)}円 / 粗利率 ${h.margin.toFixed(1)}%</span>
      </li>`;
  }).join('');
}

// 履歴削除
clearHistoryEl.addEventListener('click', () => {
  if (confirm('履歴を全件削除しますか？')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory([]);
  }
});

// イベント
[costEl, normalPriceEl, targetMarginEl, discountRateEl].forEach(el => {
  el.addEventListener('input', calculate);
});

// 初期化
renderHistory(loadHistory());
