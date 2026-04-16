// ===== DOM取得 =====
const issuerInput   = document.getElementById('issuer-name');
const saveIssuerBtn = document.getElementById('save-issuer-btn');
const recipientInput  = document.getElementById('recipient');
const amountInput     = document.getElementById('amount');
const descriptionInput= document.getElementById('description');
const issueDateInput  = document.getElementById('issue-date');
const taxTypeSelect   = document.getElementById('tax-type');
const previewBtn   = document.getElementById('preview-btn');
const clearBtn     = document.getElementById('clear-btn');
const printBtn     = document.getElementById('print-btn');
const printBtn2    = document.getElementById('print-btn2');
const historyList  = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// プレビュー要素
const previewNo          = document.getElementById('preview-no');
const previewDate        = document.getElementById('preview-date');
const previewRecipient   = document.getElementById('preview-recipient');
const previewAmount      = document.getElementById('preview-amount');
const previewTaxInfo     = document.getElementById('preview-tax-info');
const previewDescription = document.getElementById('preview-description');
const previewIssuer      = document.getElementById('preview-issuer');

// ===== 初期化 =====
const today = new Date().toISOString().split('T')[0];
issueDateInput.value = today;

// 発行者名の読み込み
const savedIssuer = localStorage.getItem('receipt_issuer') || '';
issuerInput.value = savedIssuer;

// 初期プレビュー
updatePreview();
renderHistory();

// ===== イベントリスナー =====
saveIssuerBtn.addEventListener('click', () => {
  localStorage.setItem('receipt_issuer', issuerInput.value.trim());
  saveIssuerBtn.textContent = '保存済';
  setTimeout(() => { saveIssuerBtn.textContent = '保存'; }, 1500);
  updatePreview();
});

previewBtn.addEventListener('click', () => {
  if (!validateForm()) return;
  updatePreview();
  saveToHistory();
});

clearBtn.addEventListener('click', clearForm);
printBtn.addEventListener('click', () => window.print());
printBtn2.addEventListener('click', () => window.print());
clearHistoryBtn.addEventListener('click', clearAllHistory);

// リアルタイムプレビュー（入力中も更新）
[recipientInput, amountInput, descriptionInput, issueDateInput, taxTypeSelect].forEach(el => {
  el.addEventListener('input', updatePreview);
});

// ===== プレビュー更新 =====
function updatePreview() {
  const recipient   = recipientInput.value.trim() || '　　　　　';
  const amount      = parseInt(amountInput.value) || 0;
  const description = descriptionInput.value.trim() || '　　　';
  const dateStr     = issueDateInput.value || today;
  const taxType     = taxTypeSelect.value;
  const issuer      = issuerInput.value.trim() || '　　　';

  // 日付
  const d = new Date(dateStr + 'T00:00:00');
  const dateLabel = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  previewDate.textContent = dateLabel;

  // 宛名
  previewRecipient.textContent = recipient;

  // 金額（カンマ区切り）
  previewAmount.textContent = amount.toLocaleString('ja-JP');

  // 税情報
  if (taxType === 'excluded') {
    const tax = Math.floor(amount * 0.1);
    const total = amount + tax;
    previewTaxInfo.textContent = `（税抜 ¥${amount.toLocaleString()} ／ 消費税10% ¥${tax.toLocaleString()} ／ 合計 ¥${total.toLocaleString()}）`;
    previewAmount.textContent = total.toLocaleString('ja-JP');
  } else if (taxType === 'included') {
    const taxIn = Math.floor(amount * 10 / 110);
    previewTaxInfo.textContent = `（うち消費税10%：¥${taxIn.toLocaleString()}）`;
  } else {
    previewTaxInfo.textContent = '';
  }

  // 摘要
  previewDescription.textContent = description;

  // 発行者
  previewIssuer.textContent = issuer;

  // 領収書番号（表示中は現在日時ベース）
  const now = new Date();
  const no = formatReceiptNo(now);
  previewNo.textContent = no;
}

// ===== 領収書番号生成 =====
function formatReceiptNo(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  const h = String(date.getHours()).padStart(2,'0');
  const mi= String(date.getMinutes()).padStart(2,'0');
  return `${y}${m}${d}-${h}${mi}`;
}

// ===== バリデーション =====
function validateForm() {
  if (!recipientInput.value.trim()) {
    alert('宛名を入力してください');
    recipientInput.focus();
    return false;
  }
  if (!amountInput.value || parseInt(amountInput.value) < 0) {
    alert('金額を入力してください');
    amountInput.focus();
    return false;
  }
  if (!descriptionInput.value.trim()) {
    alert('摘要を入力してください');
    descriptionInput.focus();
    return false;
  }
  return true;
}

// ===== フォームクリア =====
function clearForm() {
  recipientInput.value   = '';
  amountInput.value      = '';
  descriptionInput.value = '';
  issueDateInput.value   = today;
  taxTypeSelect.value    = 'included';
  updatePreview();
}

// ===== 発行履歴保存 =====
function saveToHistory() {
  const history = getHistory();
  const now = new Date();
  const entry = {
    no:          formatReceiptNo(now),
    date:        issueDateInput.value,
    recipient:   recipientInput.value.trim(),
    amount:      parseInt(amountInput.value) || 0,
    description: descriptionInput.value.trim(),
    taxType:     taxTypeSelect.value,
    issuer:      issuerInput.value.trim(),
    savedAt:     now.toISOString()
  };
  history.unshift(entry);
  localStorage.setItem('receipt_history', JSON.stringify(history));
  renderHistory();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('receipt_history')) || [];
  } catch {
    return [];
  }
}

// ===== 履歴描画 =====
function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-msg">発行履歴はありません</p>';
    return;
  }

  historyList.innerHTML = history.map((item, idx) => `
    <div class="history-item">
      <span class="h-no">No.${item.no}</span>
      <span class="h-date">${formatDateJP(item.date)}</span>
      <span class="h-recipient">${escapeHtml(item.recipient)}</span>
      <span class="h-amount">¥${item.amount.toLocaleString('ja-JP')}</span>
      <button class="h-delete" data-idx="${idx}">削除</button>
    </div>
  `).join('');

  historyList.querySelectorAll('.h-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteHistoryItem(parseInt(btn.dataset.idx)));
  });
}

function deleteHistoryItem(idx) {
  const history = getHistory();
  history.splice(idx, 1);
  localStorage.setItem('receipt_history', JSON.stringify(history));
  renderHistory();
}

function clearAllHistory() {
  if (!confirm('発行履歴をすべて削除しますか？')) return;
  localStorage.removeItem('receipt_history');
  renderHistory();
}

// ===== ユーティリティ =====
function formatDateJP(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
