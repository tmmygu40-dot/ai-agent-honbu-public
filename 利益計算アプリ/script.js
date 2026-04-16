const costInput = document.getElementById('cost');
const priceInput = document.getElementById('price');
const grossProfitEl = document.getElementById('gross-profit');
const profitRateEl = document.getElementById('profit-rate');
const saveBtn = document.getElementById('save-btn');
const clearBtn = document.getElementById('clear-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const historyList = document.getElementById('history-list');
const noHistoryEl = document.getElementById('no-history');

const STORAGE_KEY = 'profit_calc_history';
const MAX_HISTORY = 20;

let currentResult = null;

function calculate() {
  const cost = parseFloat(costInput.value);
  const price = parseFloat(priceInput.value);

  if (isNaN(cost) || isNaN(price) || costInput.value === '' || priceInput.value === '') {
    grossProfitEl.textContent = '—';
    grossProfitEl.className = 'result-value';
    profitRateEl.textContent = '—';
    profitRateEl.className = 'result-value';
    saveBtn.disabled = true;
    currentResult = null;
    return;
  }

  const gross = price - cost;
  const rate = price !== 0 ? (gross / price) * 100 : 0;

  grossProfitEl.textContent = formatCurrency(gross);
  profitRateEl.textContent = rate.toFixed(2) + '%';

  const cls = gross >= 0 ? 'positive' : 'negative';
  grossProfitEl.className = 'result-value ' + cls;
  profitRateEl.className = 'result-value ' + cls;

  saveBtn.disabled = false;
  currentResult = { cost, price, gross, rate };
}

function formatCurrency(val) {
  return (val >= 0 ? '+' : '') + Math.round(val).toLocaleString() + '円';
}

function saveToHistory() {
  if (!currentResult) return;

  const history = loadHistory();
  const entry = {
    id: Date.now(),
    cost: currentResult.cost,
    price: currentResult.price,
    gross: currentResult.gross,
    rate: currentResult.rate,
    date: new Date().toLocaleDateString('ja-JP')
  };

  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.pop();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function deleteEntry(id) {
  const history = loadHistory().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    noHistoryEl.style.display = 'block';
    return;
  }

  noHistoryEl.style.display = 'none';

  history.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const rateClass = entry.gross >= 0 ? 'positive' : 'negative';

    li.innerHTML = `
      <div class="hi-main">
        <div class="hi-label">${entry.date}　原価 ${entry.cost.toLocaleString()}円 → 売値 ${entry.price.toLocaleString()}円</div>
        <div class="hi-values">
          <span>粗利益 ${formatCurrency(entry.gross)}</span>
        </div>
      </div>
      <span class="hi-rate ${rateClass}">${entry.rate.toFixed(2)}%</span>
      <button class="del-btn" data-id="${entry.id}" title="削除">✕</button>
    `;

    li.querySelector('.del-btn').addEventListener('click', () => deleteEntry(entry.id));
    historyList.appendChild(li);
  });
}

function clearInputs() {
  costInput.value = '';
  priceInput.value = '';
  calculate();
}

costInput.addEventListener('input', calculate);
priceInput.addEventListener('input', calculate);
saveBtn.addEventListener('click', saveToHistory);
clearBtn.addEventListener('click', clearInputs);
clearHistoryBtn.addEventListener('click', () => {
  if (confirm('履歴を全削除しますか？')) clearHistory();
});

renderHistory();
