'use strict';

const STORAGE_KEY = 'yoyaku_data';

let reservations = [];

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    reservations = raw ? JSON.parse(raw) : [];
  } catch (e) {
    reservations = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 同日同時刻の予約IDリストを返す
function findDuplicateIds(date, time, excludeId) {
  return reservations
    .filter(r => r.id !== excludeId && r.date === date && r.time === time)
    .map(r => r.id);
}

function isDuplicate(reservation) {
  return reservations.some(
    r => r.id !== reservation.id && r.date === reservation.date && r.time === reservation.time
  );
}

function sortReservations() {
  reservations.sort((a, b) => {
    const da = a.date + 'T' + a.time;
    const db = b.date + 'T' + b.time;
    return da < db ? -1 : da > db ? 1 : 0;
  });
}

function formatDatetime(date, time) {
  const d = new Date(date + 'T' + time);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}（${dow}） ${hh}:${min}`;
}

function renderList() {
  const list = document.getElementById('reservation-list');
  const noData = document.getElementById('no-data');
  const countEl = document.getElementById('count');

  list.innerHTML = '';
  countEl.textContent = reservations.length > 0 ? `（${reservations.length}件）` : '';

  if (reservations.length === 0) {
    noData.style.display = '';
    return;
  }
  noData.style.display = 'none';

  reservations.forEach(r => {
    const dup = isDuplicate(r);
    const li = document.createElement('li');
    li.className = 'reservation-item' + (dup ? ' duplicate' : '');

    const badge = dup ? `<span class="duplicate-badge">⚠ ダブルブッキング</span>` : '';
    const memoHtml = r.memo
      ? `<div class="item-memo">${escapeHtml(r.memo)}</div>`
      : '';

    li.innerHTML = `
      ${badge}
      <div class="item-datetime">${formatDatetime(r.date, r.time)}</div>
      <div class="item-name">${escapeHtml(r.name)}</div>
      ${memoHtml}
      <button class="delete-btn" data-id="${r.id}" aria-label="削除">×</button>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
}

function clearError() {
  document.getElementById('error-msg').textContent = '';
}

function addReservation() {
  const name = document.getElementById('name').value.trim();
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const memo = document.getElementById('memo').value.trim();

  if (!name) { showError('お名前を入力してください。'); return; }
  if (!date) { showError('日付を選択してください。'); return; }
  if (!time) { showError('時刻を選択してください。'); return; }
  clearError();

  const newReservation = {
    id: generateId(),
    name,
    date,
    time,
    memo,
    createdAt: Date.now()
  };

  const dupIds = findDuplicateIds(date, time, null);

  reservations.push(newReservation);
  sortReservations();
  saveData();
  renderList();

  // 入力欄をリセット
  document.getElementById('name').value = '';
  document.getElementById('memo').value = '';
  // 日時は残す（連続入力しやすいように）

  if (dupIds.length > 0) {
    showError('⚠ 同じ日時に既存の予約があります。ダブルブッキングになっています。');
  }
}

function deleteReservation(id) {
  reservations = reservations.filter(r => r.id !== id);
  saveData();
  renderList();
  clearError();
}

// イベント
document.getElementById('add-btn').addEventListener('click', addReservation);

document.getElementById('reservation-list').addEventListener('click', function(e) {
  const btn = e.target.closest('.delete-btn');
  if (btn) {
    deleteReservation(btn.dataset.id);
  }
});

// フォームでEnterキーでも追加
document.getElementById('name').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') addReservation();
});

// 初期化
loadData();
sortReservations();
renderList();
