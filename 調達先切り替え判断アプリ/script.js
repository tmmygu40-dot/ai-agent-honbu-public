const STORAGE_KEY = 'choutatsusaki-history';

function getVal(id) {
  const v = parseFloat(document.getElementById(id).value);
  return isNaN(v) ? 0 : v;
}

function fmt(num) {
  return num.toLocaleString('ja-JP', { maximumFractionDigits: 0 }) + ' 円';
}

function fmtUnit(num) {
  return num.toLocaleString('ja-JP', { maximumFractionDigits: 1 }) + ' 円';
}

function calculate() {
  const dPrice    = getVal('d-price');
  const dQty      = getVal('d-qty') || 1;
  const dShipping = getVal('d-shipping');
  const dOther    = getVal('d-other');

  const iPrice    = getVal('i-price');
  const iQty      = getVal('i-qty') || 1;
  const iShipping = getVal('i-shipping');
  const iTariff   = getVal('i-tariff');
  const iOther    = getVal('i-other');

  const dTotal = dPrice * dQty + dShipping + dOther;
  const iTotal = iPrice * iQty + iShipping + iTariff + iOther;

  const dUnit = dTotal / dQty;
  const iUnit = iTotal / iQty;

  document.getElementById('d-total').textContent = fmt(dTotal);
  document.getElementById('d-unit-cost').textContent = '1個あたり: ' + fmtUnit(dUnit);
  document.getElementById('i-total').textContent = fmt(iTotal);
  document.getElementById('i-unit-cost').textContent = '1個あたり: ' + fmtUnit(iUnit);

  const verdict = document.getElementById('verdict');
  const diffInfo = document.getElementById('diff-info');
  let verdictText = '';
  let verdictClass = '';
  let diffText = '';

  if (dTotal === 0 && iTotal === 0) {
    verdict.textContent = '値を入力してください';
    verdict.className = 'verdict tie';
    diffInfo.textContent = '';
  } else if (Math.abs(dTotal - iTotal) < 1) {
    verdictText = '⚖️ 国産品・輸入品は同コストです';
    verdictClass = 'tie';
    diffText = '差額はほぼ0円です';
  } else if (dTotal < iTotal) {
    const diff = iTotal - dTotal;
    const pct = ((diff / iTotal) * 100).toFixed(1);
    verdictText = '✅ 国産品の方が割安です';
    verdictClass = 'domestic';
    diffText = `輸入品より ${fmt(diff)} 安い（${pct}% 割安）`;
  } else {
    const diff = dTotal - iTotal;
    const pct = ((diff / dTotal) * 100).toFixed(1);
    verdictText = '✅ 輸入品の方が割安です';
    verdictClass = 'import';
    diffText = `国産品より ${fmt(diff)} 安い（${pct}% 割安）`;
  }

  verdict.textContent = verdictText;
  verdict.className = 'verdict ' + verdictClass;
  diffInfo.textContent = diffText;

  document.getElementById('result').classList.remove('hidden');

  // 履歴保存
  if (dTotal > 0 || iTotal > 0) {
    saveHistory({
      date: new Date().toLocaleString('ja-JP'),
      verdict: verdictText,
      diff: diffText,
      dTotal: fmt(dTotal),
      iTotal: fmt(iTotal)
    });
  }
}

function saveHistory(entry) {
  const list = loadHistory();
  list.unshift(entry);
  if (list.length > 20) list.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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
  const list = loadHistory();
  const container = document.getElementById('history-list');
  if (list.length === 0) {
    container.innerHTML = '<p class="empty-msg">まだ比較履歴はありません</p>';
    return;
  }
  container.innerHTML = list.map(item => `
    <div class="history-item">
      <div class="hist-date">${item.date}</div>
      <div class="hist-verdict">${item.verdict}</div>
      <div class="hist-detail">国産: ${item.dTotal} ／ 輸入: ${item.iTotal}${item.diff ? '　' + item.diff : ''}</div>
    </div>
  `).join('');
}

function clearHistory() {
  if (!confirm('履歴をすべて削除しますか？')) return;
  localStorage.removeItem(STORAGE_KEY);
  renderHistory();
}

// 初期化
renderHistory();
