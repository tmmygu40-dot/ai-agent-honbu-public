const STORAGE_KEY = 'shikaku_items';

let items = [];

function loadItems() {
  const saved = localStorage.getItem(STORAGE_KEY);
  items = saved ? JSON.parse(saved) : [];
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function addItem() {
  const name = document.getElementById('name').value.trim();
  const acquiredDate = document.getElementById('acquiredDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  const noExpiry = document.getElementById('noExpiry').checked;
  const memo = document.getElementById('memo').value.trim();

  if (!name) {
    alert('資格・免許名を入力してください。');
    return;
  }
  if (!noExpiry && !expiryDate) {
    alert('有効期限を入力するか「有効期限なし」をチェックしてください。');
    return;
  }

  const item = {
    id: Date.now(),
    name,
    acquiredDate,
    expiryDate: noExpiry ? null : expiryDate,
    memo
  };

  items.push(item);
  saveItems();
  renderList();
  clearForm();
}

function clearForm() {
  document.getElementById('name').value = '';
  document.getElementById('acquiredDate').value = '';
  document.getElementById('expiryDate').value = '';
  document.getElementById('noExpiry').checked = false;
  document.getElementById('memo').value = '';
  document.getElementById('expiryDate').disabled = false;
}

function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveItems();
  renderList();
}

function getStatus(expiryDate) {
  if (!expiryDate) return { status: 'no-expiry', label: '期限なし', daysLeft: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { status: 'expired', label: '失効済み', daysLeft: diff };
  if (diff <= 30) return { status: 'danger', label: '30日以内', daysLeft: diff };
  if (diff <= 90) return { status: 'warning', label: '90日以内', daysLeft: diff };
  return { status: 'ok', label: '有効', daysLeft: diff };
}

function formatDate(dateStr) {
  if (!dateStr) return '―';
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function renderList() {
  const listEl = document.getElementById('list');
  const emptyMsg = document.getElementById('empty-msg');
  const countEl = document.getElementById('count');

  // ソート：失効済み・期限近い順、期限なしは末尾
  const sorted = [...items].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate) - new Date(b.expiryDate);
  });

  countEl.textContent = `${items.length}件`;

  if (sorted.length === 0) {
    listEl.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';

  listEl.innerHTML = sorted.map(item => {
    const { status, label, daysLeft } = getStatus(item.expiryDate);

    let daysText = '';
    if (daysLeft === null) {
      daysText = '';
    } else if (daysLeft < 0) {
      daysText = `${Math.abs(daysLeft)}日前に失効`;
    } else if (daysLeft === 0) {
      daysText = '今日が期限';
    } else {
      daysText = `残り${daysLeft}日`;
    }

    return `
      <div class="item-card ${status}">
        <div class="item-info">
          <div class="item-name">${escapeHtml(item.name)}</div>
          <div class="item-dates">
            取得日：${formatDate(item.acquiredDate)}
            有効期限：${item.expiryDate ? formatDate(item.expiryDate) : '期限なし'}
          </div>
          ${item.memo ? `<div class="item-memo">${escapeHtml(item.memo)}</div>` : ''}
        </div>
        <div class="item-right">
          <span class="badge ${status}">${label}</span>
          ${daysText ? `<span class="days-left ${status}">${daysText}</span>` : ''}
          <button class="btn-delete" onclick="deleteItem(${item.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 「有効期限なし」チェックで期限入力を無効化
document.getElementById('noExpiry').addEventListener('change', function () {
  const expiryInput = document.getElementById('expiryDate');
  if (this.checked) {
    expiryInput.value = '';
    expiryInput.disabled = true;
  } else {
    expiryInput.disabled = false;
  }
});

// 初期化
loadItems();
renderList();
