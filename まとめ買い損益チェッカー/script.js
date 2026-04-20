'use strict';

const STORAGE_KEY = 'matomegai_history';

function fmt(n) {
  return n.toLocaleString('ja-JP') + '円';
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

function renderHistory() {
  const history = loadHistory();
  const section = document.getElementById('historySection');
  const list = document.getElementById('historyList');
  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  list.innerHTML = history.slice().reverse().map(h => `
    <li>
      <span>${h.date}｜単価${fmt(h.unitPrice)}×${h.lotSize}個 割引${h.discountRate}%</span>
      <span class="history-verdict ${h.type}">${h.label}</span>
    </li>
  `).join('');
}

function calculate() {
  const unitPrice = parseFloat(document.getElementById('unitPrice').value);
  const discountRate = parseFloat(document.getElementById('discountRate').value);
  const lotSize = parseFloat(document.getElementById('lotSize').value);
  const normalBuy = parseFloat(document.getElementById('normalBuy').value) || 1;
  const storageCost = parseFloat(document.getElementById('storageCost').value) || 0;
  const storageMonths = parseFloat(document.getElementById('storageMonths').value) || 0;

  if (!unitPrice || !discountRate || !lotSize) {
    alert('通常単価・割引率・まとめ買い個数は必ず入力してください。');
    return;
  }

  // 計算
  const discountedUnit = unitPrice * (1 - discountRate / 100);
  const bulkTotal = discountedUnit * lotSize;           // まとめ買い総額
  const normalTotal = unitPrice * lotSize;              // 通常購入での同数総額
  const saving = normalTotal - bulkTotal;               // 節約額
  const storageTotal = storageCost * storageMonths;     // 保管コスト合計
  const net = saving - storageTotal;                    // 差し引き損益

  // 表示
  document.getElementById('resBulkPrice').textContent = fmt(Math.round(bulkTotal));
  document.getElementById('resNormalPrice').textContent = fmt(Math.round(normalTotal));
  document.getElementById('resSaving').textContent = '+' + fmt(Math.round(saving));
  document.getElementById('resStorageTotal').textContent = '-' + fmt(Math.round(storageTotal));
  document.getElementById('resNet').textContent = (net >= 0 ? '+' : '') + fmt(Math.round(net));

  const verdictEl = document.getElementById('verdict');
  const netRow = document.getElementById('netRow');
  let verdictText, verdictClass, label, histType;

  if (net > 0) {
    verdictText = '✅ まとめ買いすべき！';
    verdictClass = 'profit';
    label = 'お得';
    histType = 'profit';
    document.getElementById('resultNote').textContent =
      `割引メリット（${fmt(Math.round(saving))}）が保管コスト（${fmt(Math.round(storageTotal))}）を上回り、${fmt(Math.round(net))}のプラスです。`;
  } else if (net < 0) {
    verdictText = '❌ 見送るべき';
    verdictClass = 'loss';
    label = '損';
    histType = 'loss';
    document.getElementById('resultNote').textContent =
      `保管コスト（${fmt(Math.round(storageTotal))}）が割引メリット（${fmt(Math.round(saving))}）を上回り、${fmt(Math.round(Math.abs(net)))}のマイナスです。`;
  } else {
    verdictText = '⚖️ 損得なし';
    verdictClass = 'break-even';
    label = 'トントン';
    histType = 'break-even';
    document.getElementById('resultNote').textContent = '割引メリットと保管コストがちょうど同じです。';
  }

  verdictEl.textContent = verdictText;
  verdictEl.className = 'verdict ' + verdictClass;
  netRow.className = 'highlight-net ' + verdictClass;

  document.getElementById('result').classList.remove('hidden');

  // 履歴保存
  const history = loadHistory();
  history.push({
    date: new Date().toLocaleDateString('ja-JP'),
    unitPrice: Math.round(unitPrice),
    discountRate,
    lotSize,
    net: Math.round(net),
    label,
    type: histType
  });
  if (history.length > 20) history.shift();
  saveHistory(history);
  renderHistory();
}

document.getElementById('calcBtn').addEventListener('click', calculate);

document.getElementById('clearBtn').addEventListener('click', () => {
  if (confirm('履歴を削除しますか？')) {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory();
  }
});

// 初期表示
renderHistory();
