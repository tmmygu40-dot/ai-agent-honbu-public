// 現在の計算結果を一時保持
let currentResult = null;

// 履歴を読み込んで表示
function loadHistory() {
  const history = getHistory();
  renderHistory(history);
}

function getHistory() {
  const data = localStorage.getItem('craftPriceHistory');
  return data ? JSON.parse(data) : [];
}

function saveToStorage(history) {
  localStorage.setItem('craftPriceHistory', JSON.stringify(history));
}

// 価格計算
function calculate() {
  const hourlyRate = parseFloat(document.getElementById('hourlyRate').value) || 0;
  const profitRate = parseFloat(document.getElementById('profitRate').value) || 0;
  const expenseRate = parseFloat(document.getElementById('expenseRate').value) || 0;
  const itemName = document.getElementById('itemName').value.trim() || '名称未設定';
  const materialCost = parseFloat(document.getElementById('materialCost').value) || 0;
  const workMinutes = parseFloat(document.getElementById('workMinutes').value) || 0;

  const laborCost = Math.round((workMinutes / 60) * hourlyRate);
  const expenseCost = Math.round(materialCost * (expenseRate / 100));
  const totalCost = materialCost + laborCost + expenseCost;
  const profit = Math.round(totalCost * (profitRate / 100));
  const sellingPrice = totalCost + profit;

  currentResult = {
    itemName,
    materialCost,
    workMinutes,
    laborCost,
    expenseCost,
    totalCost,
    profit,
    sellingPrice,
    hourlyRate,
    profitRate,
    expenseRate,
    date: new Date().toLocaleString('ja-JP')
  };

  // 結果を表示
  document.getElementById('resMaterial').textContent = `${materialCost.toLocaleString()}円`;
  document.getElementById('resExpense').textContent = `${expenseCost.toLocaleString()}円`;
  document.getElementById('resTime').textContent = workMinutes;
  document.getElementById('resLabor').textContent = `${laborCost.toLocaleString()}円`;
  document.getElementById('resCost').textContent = `${totalCost.toLocaleString()}円`;
  document.getElementById('resProfit').textContent = `${profit.toLocaleString()}円`;
  document.getElementById('resTotal').textContent = `${sellingPrice.toLocaleString()}円`;
  document.getElementById('expRateLbl').textContent = expenseRate;
  document.getElementById('profRateLbl').textContent = profitRate;

  document.getElementById('resultCard').style.display = 'block';
  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 履歴に保存
function saveHistory() {
  if (!currentResult) return;
  const history = getHistory();
  history.unshift(currentResult);
  saveToStorage(history);
  renderHistory(history);
  // 保存フィードバック
  const btn = document.querySelector('#resultCard .btn-secondary');
  btn.textContent = '保存しました！';
  setTimeout(() => { btn.textContent = '履歴に保存'; }, 1500);
}

// 履歴を描画
function renderHistory(history) {
  const list = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearBtn');

  if (history.length === 0) {
    list.innerHTML = '<p class="empty-msg">履歴はまだありません</p>';
    clearBtn.style.display = 'none';
    return;
  }

  clearBtn.style.display = 'block';
  list.innerHTML = history.map((item, index) => `
    <div class="history-item">
      <button class="del-btn" onclick="deleteHistory(${index})">✕</button>
      <div class="h-name">${escapeHtml(item.itemName)}</div>
      <div class="h-price">${item.sellingPrice.toLocaleString()}円</div>
      <div class="h-detail">
        材料費 ${item.materialCost.toLocaleString()}円　作業 ${item.workMinutes}分　時給 ${item.hourlyRate.toLocaleString()}円<br>
        利益率 ${item.profitRate}%　諸経費率 ${item.expenseRate}%
      </div>
      <div class="h-date">${item.date}</div>
    </div>
  `).join('');
}

// 個別削除
function deleteHistory(index) {
  const history = getHistory();
  history.splice(index, 1);
  saveToStorage(history);
  renderHistory(history);
}

// 全削除
function clearHistory() {
  if (!confirm('履歴をすべて削除しますか？')) return;
  localStorage.removeItem('craftPriceHistory');
  renderHistory([]);
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 初期化
loadHistory();
