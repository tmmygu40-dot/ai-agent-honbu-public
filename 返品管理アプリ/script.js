const STORAGE_KEY = 'returnManagementData';

let records = [];
let editId = null;

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  records = saved ? JSON.parse(saved) : [];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function formatMoney(n) {
  return '¥' + Number(n).toLocaleString();
}

function render() {
  const filterStatus = document.getElementById('filterStatus').value;
  const filtered = filterStatus ? records.filter(r => r.status === filterStatus) : records;

  // 集計
  const totalCount = records.length;
  const totalRefund = records.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  document.getElementById('totalCount').innerHTML = totalCount + '<span class="unit">件</span>';
  document.getElementById('totalRefund').textContent = formatMoney(totalRefund);

  // 理由別件数
  const reasonMap = {};
  records.forEach(r => {
    reasonMap[r.reason] = (reasonMap[r.reason] || 0) + 1;
  });
  const reasonEl = document.getElementById('reasonSummary');
  if (Object.keys(reasonMap).length === 0) {
    reasonEl.innerHTML = '<span style="color:#aaa;font-size:0.85rem;">データなし</span>';
  } else {
    reasonEl.innerHTML = Object.entries(reasonMap)
      .map(([reason, count]) => `<div class="reason-badge">${reason}<span>${count}件</span></div>`)
      .join('');
  }

  // 一覧
  const listEl = document.getElementById('returnList');
  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-msg">受付記録がありません</p>';
    return;
  }

  listEl.innerHTML = filtered.slice().reverse().map(r => `
    <div class="return-item" data-id="${r.id}">
      <div class="return-item-header">
        <div class="return-product">${escapeHtml(r.productName)}</div>
        <div class="return-date">${formatDate(r.createdAt)}</div>
      </div>
      <div class="return-meta">
        <span class="tag">${escapeHtml(r.reason)}</span>
        <span class="tag status-${r.status}">${r.status}</span>
        ${r.refundAmount > 0 ? `<span class="return-refund">${formatMoney(r.refundAmount)}</span>` : ''}
      </div>
      ${r.note ? `<div class="return-note">📝 ${escapeHtml(r.note)}</div>` : ''}
      <div class="return-actions">
        <button class="btn-edit" onclick="openEdit('${r.id}')">編集</button>
        <button class="btn-delete" onclick="deleteRecord('${r.id}')">削除</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function openEdit(id) {
  editId = id;
  const r = records.find(r => r.id === id);
  if (!r) return;
  document.getElementById('editStatus').value = r.status;
  document.getElementById('editRefund').value = r.refundAmount || 0;
  document.getElementById('editModal').classList.remove('hidden');
}

function closeEdit() {
  editId = null;
  document.getElementById('editModal').classList.add('hidden');
}

function deleteRecord(id) {
  if (!confirm('この記録を削除しますか？')) return;
  records = records.filter(r => r.id !== id);
  saveData();
  render();
}

// フォーム送信
document.getElementById('returnForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const productName = document.getElementById('productName').value.trim();
  const reason = document.getElementById('reason').value;
  const status = document.getElementById('status').value;
  const refundAmount = Number(document.getElementById('refundAmount').value) || 0;
  const note = document.getElementById('note').value.trim();

  if (!productName || !reason) return;

  const record = {
    id: Date.now().toString(),
    productName,
    reason,
    status,
    refundAmount,
    note,
    createdAt: new Date().toISOString()
  };

  records.push(record);
  saveData();
  render();

  // フォームリセット
  this.reset();
  document.getElementById('refundAmount').value = 0;
  document.getElementById('status').value = '受付中';
});

// 編集保存
document.getElementById('editSave').addEventListener('click', function() {
  const r = records.find(r => r.id === editId);
  if (!r) return;
  r.status = document.getElementById('editStatus').value;
  r.refundAmount = Number(document.getElementById('editRefund').value) || 0;
  saveData();
  render();
  closeEdit();
});

document.getElementById('editCancel').addEventListener('click', closeEdit);

// モーダル外クリックで閉じる
document.getElementById('editModal').addEventListener('click', function(e) {
  if (e.target === this) closeEdit();
});

// フィルター
document.getElementById('filterStatus').addEventListener('change', render);

// 初期化
loadData();
render();
