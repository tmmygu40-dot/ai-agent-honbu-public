const STORAGE_KEY = 'withholding_history';

function calcWithholding(amount) {
  // 所得税 + 復興特別所得税（10.21% / 20.42%）
  // 100万円以下：金額 × 10.21%
  // 100万円超 ：(金額 - 1,000,000) × 20.42% + 102,100
  const threshold = 1000000;
  let tax;
  if (amount <= threshold) {
    tax = Math.floor(amount * 0.1021);
  } else {
    tax = Math.floor((amount - threshold) * 0.2042 + 102100);
  }
  return tax;
}

function formatYen(n) {
  return n.toLocaleString('ja-JP') + ' 円';
}

function calcAndDisplay() {
  const raw = parseFloat(document.getElementById('amount').value);
  if (isNaN(raw) || raw <= 0) {
    alert('支払金額を正しく入力してください');
    return;
  }

  const taxType = document.querySelector('input[name="taxType"]:checked').value;
  let base = Math.floor(raw); // 源泉計算の対象額
  let consumptionTax = 0;

  if (taxType === 'incl') {
    // 税込みの場合、消費税部分は源泉徴収の対象外（本体部分のみ）
    base = Math.floor(raw / 1.1);
    consumptionTax = raw - base;
  }

  const withholding = calcWithholding(base);
  const net = Math.floor(raw) - withholding;

  // 表示
  document.getElementById('resAmount').textContent = formatYen(Math.floor(raw));

  const taxRow = document.getElementById('taxRow');
  if (taxType === 'incl') {
    taxRow.style.display = 'flex';
    document.getElementById('resTax').textContent = formatYen(consumptionTax);
  } else {
    taxRow.style.display = 'none';
  }

  document.getElementById('resWithholding').textContent = formatYen(withholding);
  document.getElementById('resNet').textContent = formatYen(net);

  const noteBase = taxType === 'incl' ? `本体 ${formatYen(base)} に対して計算` : `${formatYen(base)} に対して計算`;
  const rate = base <= 1000000 ? '10.21%' : '超過部分 20.42%';
  document.getElementById('calcNote').textContent = `${noteBase}（${rate}）`;

  document.getElementById('resultCard').style.display = 'block';

  saveHistory({ raw, base, consumptionTax, withholding, net, taxType });
}

function saveHistory(entry) {
  const history = loadHistory();
  const item = {
    id: Date.now(),
    date: new Date().toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    amount: entry.raw,
    base: entry.base,
    withholding: entry.withholding,
    net: entry.net,
    taxType: entry.taxType
  };
  history.unshift(item);
  if (history.length > 30) history.pop();
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

function renderHistory() {
  const list = document.getElementById('historyList');
  const history = loadHistory();

  if (history.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ履歴がありません</p>';
    return;
  }

  list.innerHTML = history.map(item => {
    const taxLabel = item.taxType === 'incl' ? '税込' : '税抜';
    return `
      <div class="history-item">
        <div class="history-info">
          <div class="h-date">${item.date}</div>
          <div>支払 ${item.amount.toLocaleString()} 円（${taxLabel}）</div>
          <div>源泉 ${item.withholding.toLocaleString()} 円</div>
        </div>
        <div class="history-net">
          <div class="net-label">差引支給</div>
          <div class="net-val">${item.net.toLocaleString()} 円</div>
        </div>
      </div>
    `;
  }).join('');
}

function copyResult() {
  const amount = document.getElementById('resAmount').textContent;
  const withholding = document.getElementById('resWithholding').textContent;
  const net = document.getElementById('resNet').textContent;
  const taxRow = document.getElementById('taxRow');
  let text = `【源泉徴収計算結果】\n支払金額：${amount}`;
  if (taxRow.style.display !== 'none') {
    text += `\n消費税：${document.getElementById('resTax').textContent}`;
  }
  text += `\n源泉徴収額：${withholding}\n差引支給額：${net}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copyBtn');
      btn.textContent = 'コピーしました！';
      setTimeout(() => { btn.textContent = '結果をコピー'; }, 2000);
    });
  } else {
    alert(text);
  }
}

document.getElementById('calcBtn').addEventListener('click', calcAndDisplay);
document.getElementById('copyBtn').addEventListener('click', copyResult);
document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('履歴をすべて消去しますか？')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  }
});

// Enterキーで計算
document.getElementById('amount').addEventListener('keydown', e => {
  if (e.key === 'Enter') calcAndDisplay();
});

// 初期表示
renderHistory();
