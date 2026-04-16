'use strict';

const STORAGE_KEY = 'furima_history';

let currentRate = 10;
let currentPlatform = 'メルカリ';

const salePriceEl = document.getElementById('salePrice');
const shippingEl = document.getElementById('shippingCost');
const customRateEl = document.getElementById('customRate');
const customRateGroup = document.getElementById('customRateGroup');
const rateDisplay = document.getElementById('rateDisplay');
const platformDisplay = document.getElementById('platformDisplay');
const customLabel = document.getElementById('customLabel');

const takeHomeEl = document.getElementById('takeHome');
const resSalePriceEl = document.getElementById('resSalePrice');
const resFeeEl = document.getElementById('resFee');
const resShippingEl = document.getElementById('resShipping');
const resTakeHomeEl = document.getElementById('resTakeHome');
const resRateLabelEl = document.getElementById('resRateLabel');

const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearHistory');
const historyList = document.getElementById('historyList');

// Platform buttons
document.querySelectorAll('.platform-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const rate = parseFloat(btn.dataset.rate);
    currentPlatform = btn.dataset.name;
    if (currentPlatform === 'カスタム') {
      customRateGroup.style.display = 'block';
      currentRate = parseFloat(customRateEl.value) || 0;
      customLabel.textContent = currentRate + '%';
    } else {
      customRateGroup.style.display = 'none';
      currentRate = rate;
    }
    updateRateDisplay();
    calculate();
  });
});

// Custom rate input
customRateEl.addEventListener('input', () => {
  currentRate = parseFloat(customRateEl.value) || 0;
  customLabel.textContent = currentRate + '%';
  updateRateDisplay();
  calculate();
});

// Calculation inputs
[salePriceEl, shippingEl].forEach(el => {
  el.addEventListener('input', calculate);
});

function updateRateDisplay() {
  rateDisplay.textContent = currentRate + '%';
  platformDisplay.textContent = currentPlatform;
  resRateLabelEl.textContent = currentRate + '%';
}

function fmt(n) {
  return '¥' + Math.round(n).toLocaleString();
}

function calculate() {
  const price = parseFloat(salePriceEl.value) || 0;
  const shipping = parseFloat(shippingEl.value) || 0;

  if (price <= 0) {
    takeHomeEl.textContent = '－';
    resSalePriceEl.textContent = '－';
    resFeeEl.textContent = '－';
    resShippingEl.textContent = '－';
    resTakeHomeEl.textContent = '－';
    saveBtn.disabled = true;
    return;
  }

  const fee = price * (currentRate / 100);
  const takeHome = price - fee - shipping;

  takeHomeEl.textContent = fmt(takeHome);
  resSalePriceEl.textContent = fmt(price);
  resFeeEl.textContent = '−' + fmt(fee);
  resShippingEl.textContent = '−' + fmt(shipping);
  resTakeHomeEl.textContent = fmt(takeHome);
  saveBtn.disabled = false;
}

// Save to history
saveBtn.addEventListener('click', () => {
  const price = parseFloat(salePriceEl.value) || 0;
  if (price <= 0) return;

  const shipping = parseFloat(shippingEl.value) || 0;
  const fee = price * (currentRate / 100);
  const takeHome = price - fee - shipping;
  const now = new Date();
  const dateStr = now.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const item = {
    platform: currentPlatform,
    rate: currentRate,
    price,
    shipping,
    fee,
    takeHome,
    date: dateStr
  };

  const history = loadHistory();
  history.unshift(item);
  if (history.length > 50) history.pop();
  saveHistory(history);
  renderHistory(history);
});

// Clear history
clearBtn.addEventListener('click', () => {
  if (!confirm('履歴を全件削除しますか？')) return;
  saveHistory([]);
  renderHistory([]);
});

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function renderHistory(history) {
  if (!history.length) {
    historyList.innerHTML = '<li class="empty-msg">履歴はまだありません</li>';
    return;
  }
  historyList.innerHTML = history.map(item => `
    <li class="history-item">
      <span class="hi-platform">${item.platform}</span>
      <span class="hi-takehome">${fmt(item.takeHome)}</span>
      <span class="hi-detail">出品¥${item.price.toLocaleString()} 手数料${item.rate}% 送料¥${item.shipping.toLocaleString()} | ${item.date}</span>
    </li>
  `).join('');
}

// Init
updateRateDisplay();
calculate();
saveBtn.disabled = true;
renderHistory(loadHistory());
