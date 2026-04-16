const STORAGE_KEY = 'lend_records';

let records = [];
let showReturned = false;

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    records = saved ? JSON.parse(saved) : [];
  } catch {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(dateStr) {
  if (!dateStr) return '日付不明';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function renderList() {
  const list = document.getElementById('lend-list');
  const emptyMsg = document.getElementById('empty-msg');
  const activeCount = document.getElementById('active-count');

  list.innerHTML = '';

  const activeRecords = records.filter(r => !r.returned);
  activeCount.textContent = activeRecords.length;

  const toShow = showReturned ? records : activeRecords;

  if (toShow.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  toShow.slice().reverse().forEach(record => {
    const li = document.createElement('li');
    li.className = 'lend-item' + (record.returned ? ' returned' : '');

    const returnLabel = record.returned ? '貸出中に戻す' : '返却済み';
    const returnClass = record.returned ? 'btn-return undo' : 'btn-return';

    li.innerHTML = `
      <div class="lend-item-top">
        <div class="lend-info">
          <div class="item-name">${escapeHtml(record.itemName)}</div>
          <div class="lend-meta">
            ${escapeHtml(record.personName)} に ${formatDate(record.lendDate)} から貸し出し中
            ${record.returned ? '<br><span style="color:#2e7d32;font-weight:bold;">✓ 返却済み</span>' : ''}
          </div>
        </div>
        <div class="lend-actions">
          <button class="${returnClass}" data-id="${record.id}">${returnLabel}</button>
          <button class="btn-delete" data-id="${record.id}">削除</button>
        </div>
      </div>
    `;

    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addRecord() {
  const itemName = document.getElementById('item-name').value.trim();
  const personName = document.getElementById('person-name').value.trim();
  const lendDate = document.getElementById('lend-date').value;

  if (!itemName) {
    alert('品物名を入力してください');
    document.getElementById('item-name').focus();
    return;
  }
  if (!personName) {
    alert('貸した相手を入力してください');
    document.getElementById('person-name').focus();
    return;
  }

  const record = {
    id: Date.now().toString(),
    itemName,
    personName,
    lendDate: lendDate || new Date().toISOString().slice(0, 10),
    returned: false,
  };

  records.push(record);
  saveRecords();
  renderList();

  document.getElementById('item-name').value = '';
  document.getElementById('person-name').value = '';
  document.getElementById('lend-date').value = '';
  document.getElementById('item-name').focus();
}

document.getElementById('add-btn').addEventListener('click', addRecord);

document.getElementById('item-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('person-name').focus();
});
document.getElementById('person-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('lend-date').focus();
});
document.getElementById('lend-date').addEventListener('keydown', e => {
  if (e.key === 'Enter') addRecord();
});

document.getElementById('lend-list').addEventListener('click', e => {
  const id = e.target.dataset.id;
  if (!id) return;

  if (e.target.classList.contains('btn-return')) {
    const record = records.find(r => r.id === id);
    if (record) {
      record.returned = !record.returned;
      saveRecords();
      renderList();
    }
  } else if (e.target.classList.contains('btn-delete')) {
    if (confirm('この記録を削除しますか？')) {
      records = records.filter(r => r.id !== id);
      saveRecords();
      renderList();
    }
  }
});

document.getElementById('show-returned').addEventListener('change', e => {
  showReturned = e.target.checked;
  renderList();
});

// 初期化
loadRecords();

// 今日の日付をデフォルトにセット
const today = new Date().toISOString().slice(0, 10);
document.getElementById('lend-date').value = today;

renderList();
