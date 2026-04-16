const STORAGE_KEY = 'keihiSeisanV2';

const CATEGORY_COLORS = {
  '交通費': '#3b82f6',
  '食費':   '#f59e0b',
  '消耗品': '#10b981',
  '通信費': '#8b5cf6',
  'その他': '#64748b',
};

// --- データ管理 ---
function loadReceipts() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveReceipts(receipts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
}

// --- 初期表示 ---
function init() {
  // 当月をデフォルト選択
  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  document.getElementById('monthSelect').value = ym;
  document.getElementById('date').value = today.toISOString().slice(0, 10);

  renderList(ym);
  document.getElementById('listMonth').textContent = formatYM(ym);

  document.getElementById('addBtn').addEventListener('click', addReceipt);
  document.getElementById('showReportBtn').addEventListener('click', showReport);
}

// --- 登録 ---
function addReceipt() {
  const date = document.getElementById('date').value;
  const amount = parseInt(document.getElementById('amount').value, 10);
  const category = document.getElementById('category').value;
  const memo = document.getElementById('memo').value.trim();

  if (!date) { alert('日付を入力してください'); return; }
  if (!amount || amount <= 0) { alert('金額を正しく入力してください'); return; }

  const receipts = loadReceipts();
  receipts.push({ id: Date.now(), date, amount, category, memo });
  saveReceipts(receipts);

  // フォームリセット
  document.getElementById('amount').value = '';
  document.getElementById('memo').value = '';

  // 選択中の月と一致すれば一覧更新
  const selectedYM = document.getElementById('monthSelect').value;
  const dateYM = date.slice(0, 7);
  if (!selectedYM || selectedYM === dateYM) {
    const ym = selectedYM || dateYM;
    renderList(ym);
    document.getElementById('listMonth').textContent = formatYM(ym);
  }

  // 精算書が表示中なら更新
  if (document.getElementById('reportSection').style.display !== 'none') {
    showReport();
  }
}

// --- 削除 ---
function deleteReceipt(id) {
  const receipts = loadReceipts().filter(r => r.id !== id);
  saveReceipts(receipts);
  const ym = document.getElementById('monthSelect').value;
  renderList(ym);
  if (document.getElementById('reportSection').style.display !== 'none') {
    showReport();
  }
}

// --- 月別一覧 ---
function renderList(ym) {
  const receipts = loadReceipts().filter(r => r.date.startsWith(ym));
  receipts.sort((a, b) => a.date.localeCompare(b.date));

  const container = document.getElementById('receiptList');
  if (receipts.length === 0) {
    container.innerHTML = '<p class="empty-msg">この月の領収書はありません</p>';
    return;
  }

  container.innerHTML = receipts.map(r => `
    <div class="receipt-item">
      <div class="receipt-info">
        <div class="receipt-date">${formatDate(r.date)}</div>
        <div class="receipt-main">
          <span class="receipt-category">${r.category}</span>
          ${r.memo ? `<span class="receipt-memo">${escHtml(r.memo)}</span>` : ''}
        </div>
      </div>
      <span class="receipt-amount">¥${r.amount.toLocaleString()}</span>
      <button class="delete-btn" onclick="deleteReceipt(${r.id})" title="削除">×</button>
    </div>
  `).join('');
}

// --- 精算書表示 ---
function showReport() {
  const ym = document.getElementById('monthSelect').value;
  if (!ym) { alert('月を選択してください'); return; }

  const receipts = loadReceipts().filter(r => r.date.startsWith(ym));
  receipts.sort((a, b) => a.date.localeCompare(b.date));

  renderList(ym);
  document.getElementById('listMonth').textContent = formatYM(ym);

  const total = receipts.reduce((s, r) => s + r.amount, 0);
  document.getElementById('totalAmount').textContent = '¥' + total.toLocaleString();
  document.getElementById('reportMonth').textContent = formatYM(ym);

  // 項目別集計
  const byCategory = {};
  receipts.forEach(r => {
    byCategory[r.category] = (byCategory[r.category] || 0) + r.amount;
  });

  const categories = Object.keys(CATEGORY_COLORS);
  const breakdownEl = document.getElementById('categoryBreakdown');

  if (Object.keys(byCategory).length === 0) {
    breakdownEl.innerHTML = '<p class="empty-msg">データがありません</p>';
  } else {
    breakdownEl.innerHTML = categories
      .filter(cat => byCategory[cat])
      .map(cat => `
        <div class="breakdown-row">
          <div class="breakdown-label">
            <div class="cat-dot" style="background:${CATEGORY_COLORS[cat]}"></div>
            <span>${cat}</span>
          </div>
          <span class="breakdown-amount">¥${byCategory[cat].toLocaleString()}</span>
        </div>
      `).join('');
  }

  // 明細
  const detailEl = document.getElementById('reportDetail');
  if (receipts.length === 0) {
    detailEl.innerHTML = '<p class="empty-msg">明細がありません</p>';
  } else {
    detailEl.innerHTML = receipts.map(r => `
      <div class="report-item">
        <div class="report-item-left">
          <span class="report-item-date">${formatDate(r.date)}</span>
          <span class="report-item-cat">${r.category}${r.memo ? ' / ' + escHtml(r.memo) : ''}</span>
        </div>
        <span class="report-item-amount">¥${r.amount.toLocaleString()}</span>
      </div>
    `).join('');
  }

  document.getElementById('reportSection').style.display = 'block';
  document.getElementById('reportSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- ユーティリティ ---
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function formatYM(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m)}月`;
}

function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

document.addEventListener('DOMContentLoaded', init);
