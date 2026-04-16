const STORAGE_KEY = 'lot_management_data';
const WARNING_DAYS = 30;

function loadLots() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLots(lots) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lots));
}

function getStatus(expiryDate) {
  if (!expiryDate) return 'ok';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffMs = expiry - today;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= WARNING_DAYS) return 'warning';
  return 'ok';
}

function getDaysLabel(expiryDate) {
  if (!expiryDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diffMs = expiry - today;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}日超過`;
  if (diffDays === 0) return '本日期限';
  return `残${diffDays}日`;
}

function addLot() {
  const lotNumber = document.getElementById('lotNumber').value.trim();
  const productName = document.getElementById('productName').value.trim();
  const manufactureDate = document.getElementById('manufactureDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  const quantity = document.getElementById('quantity').value;
  const memo = document.getElementById('memo').value.trim();

  if (!lotNumber) {
    alert('ロット番号を入力してください');
    return;
  }
  if (!expiryDate) {
    alert('期限日を入力してください');
    return;
  }

  const lots = loadLots();
  lots.push({
    id: Date.now(),
    lotNumber,
    productName,
    manufactureDate,
    expiryDate,
    quantity: quantity !== '' ? Number(quantity) : null,
    memo,
    createdAt: new Date().toISOString()
  });

  saveLots(lots);
  clearForm();
  renderList();
}

function clearForm() {
  document.getElementById('lotNumber').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('manufactureDate').value = '';
  document.getElementById('expiryDate').value = '';
  document.getElementById('quantity').value = '';
  document.getElementById('memo').value = '';
}

function deleteLot(id) {
  if (!confirm('このロットを削除しますか？')) return;
  const lots = loadLots().filter(l => l.id !== id);
  saveLots(lots);
  renderList();
}

function renderList() {
  const lots = loadLots();
  const showAlertOnly = document.getElementById('showExpiredOnly').checked;

  // Sort by expiryDate ascending
  const sorted = [...lots].sort((a, b) => {
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return a.expiryDate.localeCompare(b.expiryDate);
  });

  const filtered = showAlertOnly
    ? sorted.filter(l => getStatus(l.expiryDate) !== 'ok')
    : sorted;

  // Summary
  const expiredCount = lots.filter(l => getStatus(l.expiryDate) === 'expired').length;
  const warningCount = lots.filter(l => getStatus(l.expiryDate) === 'warning').length;
  const summaryEl = document.getElementById('summary');
  summaryEl.textContent = `全${lots.length}件　期限切れ：${expiredCount}件　期限間近（${WARNING_DAYS}日以内）：${warningCount}件`;

  const listEl = document.getElementById('lotList');

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">表示するロットがありません</p>';
    return;
  }

  listEl.innerHTML = filtered.map(lot => {
    const status = getStatus(lot.expiryDate);
    const daysLabel = getDaysLabel(lot.expiryDate);
    const badgeText = status === 'expired' ? '期限切れ' : status === 'warning' ? '期限間近' : '正常';
    const badgeClass = `badge--${status}`;
    const cardClass = `status--${status}`;

    const quantityText = lot.quantity !== null ? `数量：${lot.quantity}` : '';
    const mfgText = lot.manufactureDate ? `製造日：${lot.manufactureDate}` : '';
    const expiryText = lot.expiryDate ? `期限日：${lot.expiryDate}（${daysLabel}）` : '';

    return `
      <div class="lot-card ${cardClass}">
        <div class="lot-info">
          <div class="lot-top">
            <span class="lot-number">${escHtml(lot.lotNumber)}</span>
            ${lot.productName ? `<span class="product-name">${escHtml(lot.productName)}</span>` : ''}
            <span class="status-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="lot-details">
            ${expiryText ? `<span>${escHtml(expiryText)}</span>` : ''}
            ${mfgText ? `<span>${escHtml(mfgText)}</span>` : ''}
            ${quantityText ? `<span>${escHtml(quantityText)}</span>` : ''}
          </div>
          ${lot.memo ? `<div class="lot-memo">${escHtml(lot.memo)}</div>` : ''}
        </div>
        <button class="btn-delete" onclick="deleteLot(${lot.id})">削除</button>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Init
renderList();
