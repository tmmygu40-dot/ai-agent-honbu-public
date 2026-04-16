const STORAGE_KEY = 'shinsa_records';

let records = [];

// --- データ操作 ---
function loadRecords() {
  try {
    records = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function addRecord(data) {
  records.push({ id: Date.now(), ...data });
  saveRecords();
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
}

// --- UI ---
function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
}

function getFilteredSorted() {
  const query = document.getElementById('search').value.trim().toLowerCase();
  const sort = document.getElementById('sort-order').value;

  let filtered = records.filter(r => {
    if (!query) return true;
    return (r.hospital || '').toLowerCase().includes(query) ||
           (r.content || '').toLowerCase().includes(query);
  });

  if (sort === 'date-desc') {
    filtered.sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  } else if (sort === 'date-asc') {
    filtered.sort((a, b) => a.visitDate.localeCompare(b.visitDate));
  } else if (sort === 'next-asc') {
    filtered.sort((a, b) => {
      const da = a.nextDate || '9999-99-99';
      const db = b.nextDate || '9999-99-99';
      return da.localeCompare(db);
    });
  }

  return filtered;
}

function renderUpcoming() {
  const upcomingSection = document.getElementById('upcoming-section');
  const upcomingList = document.getElementById('upcoming-list');

  const upcoming = records
    .filter(r => r.nextDate)
    .map(r => ({ ...r, days: daysUntil(r.nextDate) }))
    .filter(r => r.days !== null && r.days >= 0 && r.days <= 7)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0) {
    upcomingSection.style.display = 'none';
    return;
  }

  upcomingSection.style.display = 'block';
  upcomingList.innerHTML = upcoming.map(r => `
    <li class="upcoming-item">
      <span class="upcoming-hospital">${escape(r.hospital)}</span>
      <span class="upcoming-days">${r.days === 0 ? '今日' : r.days + '日後'} (${formatDate(r.nextDate)})</span>
    </li>
  `).join('');
}

function escape(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderList() {
  const list = document.getElementById('record-list');
  const countEl = document.getElementById('record-count');
  const filtered = getFilteredSorted();

  countEl.textContent = `${filtered.length} 件`;

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-message">記録が見つかりません</li>';
    return;
  }

  list.innerHTML = filtered.map(r => {
    const days = daysUntil(r.nextDate);
    const hasNext = r.nextDate !== '';
    return `
      <li class="record-item ${hasNext ? 'has-next' : ''}" data-id="${r.id}">
        <button class="btn-delete" data-id="${r.id}" title="削除">×</button>
        <div class="record-item-header">
          <span class="record-hospital">${escape(r.hospital)}</span>
          <span class="record-date">${formatDate(r.visitDate)}</span>
        </div>
        ${r.content ? `<div class="record-summary">${escape(r.content).replace(/\n/g,'<br>')}</div>` : ''}
        <div class="record-tags">
          ${r.medicine ? `<span class="tag tag-medicine">💊 処方薬あり</span>` : ''}
          ${hasNext ? `<span class="tag tag-next">📅 次回: ${formatDate(r.nextDate)}${days !== null ? ` (${days === 0 ? '今日' : days < 0 ? `${-days}日前` : `${days}日後`})` : ''}</span>` : ''}
        </div>
      </li>
    `;
  }).join('');

  // 各カードクリックで詳細表示
  list.querySelectorAll('.record-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.classList.contains('btn-delete')) return;
      const id = Number(el.dataset.id);
      const r = records.find(x => x.id === id);
      if (r) showModal(r);
    });
  });

  // 削除ボタン
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      if (confirm('この記録を削除しますか？')) {
        deleteRecord(id);
        renderAll();
      }
    });
  });
}

function renderAll() {
  renderUpcoming();
  renderList();
}

// --- モーダル ---
function showModal(r) {
  const modal = document.getElementById('modal');
  const body = document.getElementById('modal-body');
  const days = daysUntil(r.nextDate);

  body.innerHTML = `
    <div class="modal-hospital">${escape(r.hospital)}</div>
    <div class="modal-date">診察日：${formatDate(r.visitDate)}</div>
    ${r.content ? `
      <div class="modal-field">
        <div class="modal-field-label">診察内容</div>
        <div class="modal-field-value">${escape(r.content).replace(/\n/g,'<br>')}</div>
      </div>` : ''}
    ${r.medicine ? `
      <div class="modal-field">
        <div class="modal-field-label">処方薬</div>
        <div class="modal-field-value">${escape(r.medicine).replace(/\n/g,'<br>')}</div>
      </div>` : ''}
    ${r.memo ? `
      <div class="modal-field">
        <div class="modal-field-label">メモ</div>
        <div class="modal-field-value">${escape(r.memo).replace(/\n/g,'<br>')}</div>
      </div>` : ''}
    ${r.nextDate ? `
      <div class="modal-next">
        <span class="modal-next-label">📅 次回受診日：</span>
        ${formatDate(r.nextDate)}
        ${days !== null ? `（${days === 0 ? '今日' : days < 0 ? `${-days}日前` : `${days}日後`}）` : ''}
      </div>` : ''}
  `;

  modal.style.display = 'flex';
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) {
    document.getElementById('modal').style.display = 'none';
  }
});

// --- フォーム送信 ---
document.getElementById('record-form').addEventListener('submit', e => {
  e.preventDefault();
  const hospital = document.getElementById('hospital').value.trim();
  const visitDate = document.getElementById('visit-date').value;
  const content = document.getElementById('content').value.trim();
  const medicine = document.getElementById('medicine').value.trim();
  const nextDate = document.getElementById('next-date').value;
  const memo = document.getElementById('memo').value.trim();

  if (!hospital || !visitDate) return;

  addRecord({ hospital, visitDate, content, medicine, nextDate, memo });
  e.target.reset();
  renderAll();
});

// --- 検索・ソート ---
document.getElementById('search').addEventListener('input', renderList);
document.getElementById('sort-order').addEventListener('change', renderList);

// --- 初期化 ---
document.addEventListener('DOMContentLoaded', () => {
  // 今日の日付をデフォルト設定
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('visit-date').value = today;

  loadRecords();
  renderAll();
});
