const STORAGE_KEY = 'nebiriki_history';

function calculate() {
  const cost = parseFloat(document.getElementById('costPrice').value);
  const margin = parseFloat(document.getElementById('targetMargin').value);
  const current = parseFloat(document.getElementById('currentPrice').value);
  const name = document.getElementById('itemName').value.trim();

  if (isNaN(cost) || cost <= 0) {
    alert('仕入れ値を正しく入力してください');
    return;
  }
  if (isNaN(margin) || margin < 0 || margin >= 100) {
    alert('目標粗利率は0〜99%で入力してください');
    return;
  }

  // 最低販売価格 = 仕入れ値 ÷ (1 - 粗利率/100)
  const minPrice = cost / (1 - margin / 100);
  const minPriceRounded = Math.ceil(minPrice);

  // 結果表示
  const resultCard = document.getElementById('resultCard');
  resultCard.style.display = 'block';
  document.getElementById('minPrice').textContent = minPriceRounded.toLocaleString() + ' 円';

  const diffSection = document.getElementById('diffSection');
  const priceDiffEl = document.getElementById('priceDiff');
  if (!isNaN(current) && current > 0) {
    const diff = current - minPriceRounded;
    diffSection.style.display = 'block';
    priceDiffEl.className = 'result-diff ' + (diff >= 0 ? 'up' : 'down');
    if (diff >= 0) {
      priceDiffEl.textContent = '▼ ' + Math.abs(diff).toLocaleString() + ' 円まで値引き可能';
    } else {
      priceDiffEl.textContent = '⚠ 現在価格が最低価格を ' + Math.abs(diff).toLocaleString() + ' 円下回っています';
    }
  } else {
    diffSection.style.display = 'none';
  }

  document.getElementById('resultNote').textContent =
    '仕入れ値 ' + cost.toLocaleString() + ' 円 ／ 目標粗利率 ' + margin + '%';

  // 履歴に保存
  const history = loadHistory();
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString('ja-JP'),
    name: name || '品名未入力',
    cost: cost,
    margin: margin,
    minPrice: minPriceRounded,
    currentPrice: (!isNaN(current) && current > 0) ? current : null
  };
  history.unshift(entry);
  // 最大50件
  if (history.length > 50) history.pop();
  saveHistory(history);
  renderHistory(history);
}

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

function clearHistory() {
  if (!confirm('履歴を全て削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory([]);
}

function renderHistory(history) {
  const list = document.getElementById('historyList');
  if (!history.length) {
    list.innerHTML = '<p class="empty-msg">まだ履歴がありません</p>';
    return;
  }
  list.innerHTML = history.map(h => {
    const diffHtml = h.currentPrice != null
      ? (() => {
          const d = h.currentPrice - h.minPrice;
          if (d >= 0) {
            return `<span style="color:#080">▼ ${Math.abs(d).toLocaleString()}円まで値引き可</span>`;
          } else {
            return `<span style="color:#d00">⚠ 最低価格を${Math.abs(d).toLocaleString()}円下回り</span>`;
          }
        })()
      : '';
    const currentHtml = h.currentPrice != null
      ? ` ／ 現在 ${h.currentPrice.toLocaleString()}円` : '';
    return `
      <div class="history-item">
        <div class="h-main">
          <span class="h-name">${escHtml(h.name)}</span>
          <span class="h-min">${h.minPrice.toLocaleString()} 円</span>
        </div>
        <div class="h-detail">
          ${h.date} ／ 仕入 ${h.cost.toLocaleString()}円 ／ 粗利率 ${h.margin}%${currentHtml}
          ${diffHtml ? ' ／ ' + diffHtml : ''}
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 初期表示
renderHistory(loadHistory());

// Enterキーで計算
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') calculate();
});
