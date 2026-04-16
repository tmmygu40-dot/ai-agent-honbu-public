const STORAGE_KEY = 'dilution_history';

function formatVolume(ml) {
  if (ml >= 1000) {
    return ml.toFixed(1) + ' mL (' + (ml / 1000).toFixed(2) + ' L)';
  }
  return ml.toFixed(1) + ' mL';
}

function calculate() {
  const stockAmount = parseFloat(document.getElementById('stockAmount').value);
  const stockConc = parseFloat(document.getElementById('stockConc').value);
  const targetConc = parseFloat(document.getElementById('targetConc').value);

  // 既存エラー表示を消す
  const existing = document.getElementById('errorMsg');
  if (existing) existing.remove();

  // バリデーション
  if (isNaN(stockAmount) || isNaN(stockConc) || isNaN(targetConc)) {
    showError('すべての値を入力してください');
    return;
  }
  if (stockAmount <= 0) {
    showError('原液量は0より大きい値を入力してください');
    return;
  }
  if (stockConc <= 0 || stockConc > 100) {
    showError('原液濃度は0〜100%の範囲で入力してください');
    return;
  }
  if (targetConc <= 0 || targetConc > 100) {
    showError('希望濃度は0〜100%の範囲で入力してください');
    return;
  }
  if (targetConc > stockConc) {
    showError('希望濃度は原液濃度より低くしてください（薄めることしかできません）');
    return;
  }

  // 計算: 原液量 × 原液濃度 = 完成液量 × 希望濃度
  // 完成液量 = 原液量 × 原液濃度 / 希望濃度
  // 加える水量 = 完成液量 - 原液量
  const totalVolume = stockAmount * stockConc / targetConc;
  const waterVolume = totalVolume - stockAmount;

  document.getElementById('waterResult').textContent = formatVolume(waterVolume);
  document.getElementById('totalResult').textContent = formatVolume(totalVolume);

  let note = `原液 ${stockAmount} mL (濃度 ${stockConc}%) に水を加えて ${targetConc}% に希釈`;
  document.getElementById('resultNote').textContent = note;

  document.getElementById('resultCard').style.display = 'block';

  // 保存ボタン用データをDOMに保持
  document.getElementById('resultCard').dataset.stock = stockAmount;
  document.getElementById('resultCard').dataset.stockConc = stockConc;
  document.getElementById('resultCard').dataset.targetConc = targetConc;
  document.getElementById('resultCard').dataset.water = waterVolume.toFixed(1);
  document.getElementById('resultCard').dataset.total = totalVolume.toFixed(1);
}

function showError(msg) {
  const btn = document.getElementById('calcBtn');
  const div = document.createElement('div');
  div.id = 'errorMsg';
  div.className = 'error-msg';
  div.textContent = msg;
  btn.parentNode.insertBefore(div, btn.nextSibling);
}

function saveHistory() {
  const card = document.getElementById('resultCard');
  const stock = card.dataset.stock;
  const stockConc = card.dataset.stockConc;
  const targetConc = card.dataset.targetConc;
  const water = card.dataset.water;
  const total = card.dataset.total;

  const history = loadHistory();
  const now = new Date();
  const dateStr = now.toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  history.unshift({
    date: dateStr,
    stock: stock,
    stockConc: stockConc,
    targetConc: targetConc,
    water: water,
    total: total
  });

  // 最大20件保持
  if (history.length > 20) history.pop();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  renderHistory();

  const btn = document.querySelector('.save-btn');
  btn.textContent = '保存しました！';
  setTimeout(() => { btn.textContent = '履歴に保存'; }, 1500);
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = loadHistory();
  const list = document.getElementById('historyList');
  list.innerHTML = '';

  if (history.length === 0) {
    list.innerHTML = '<li class="empty-msg">履歴はありません</li>';
    return;
  }

  history.forEach(item => {
    const li = document.createElement('li');
    li.textContent =
      `[${item.date}] 原液 ${item.stock}mL (${item.stockConc}%) → ${item.targetConc}% ／ 加える水: ${item.water}mL ／ 完成: ${item.total}mL`;
    list.appendChild(li);
  });
}

function clearHistory() {
  if (!confirm('履歴をすべて削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

// 初期表示
renderHistory();
