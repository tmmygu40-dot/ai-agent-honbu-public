const STORAGE_KEY = 'saiji_schedule_v1';

let events = [];

function loadEvents() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    events = data ? JSON.parse(data) : [];
  } catch (e) {
    events = [];
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function addEvent() {
  const name = document.getElementById('eventName').value.trim();
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const staff = document.getElementById('staff').value.trim();
  const memo = document.getElementById('memo').value.trim();

  if (!name || !startDate || !endDate || !staff) {
    showToast('催事名・開始日・終了日・担当者は必須です', true);
    return;
  }

  if (startDate > endDate) {
    showToast('終了日は開始日以降を設定してください', true);
    return;
  }

  const event = {
    id: Date.now(),
    name,
    startDate,
    endDate,
    staff,
    memo
  };

  events.push(event);
  saveEvents();
  renderList();
  clearForm();
  showToast('催事を登録しました');
}

function deleteEvent(id) {
  events = events.filter(e => e.id !== id);
  saveEvents();
  renderList();
  showToast('削除しました');
}

function clearForm() {
  document.getElementById('eventName').value = '';
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('staff').value = '';
  document.getElementById('memo').value = '';
}

function getStatus(startDate, endDate) {
  const today = new Date().toISOString().slice(0, 10);
  if (endDate < today) return 'past';
  if (startDate <= today && today <= endDate) return 'ongoing';
  return 'upcoming';
}

function renderList() {
  const yearSel = document.getElementById('filterYear');
  const monthSel = document.getElementById('filterMonth');
  const year = parseInt(yearSel.value);
  const month = parseInt(monthSel.value);

  let filtered = events.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));

  if (month !== 0) {
    filtered = filtered.filter(e => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      const targetStart = new Date(year, month - 1, 1);
      const targetEnd = new Date(year, month, 0);
      return start <= targetEnd && end >= targetStart;
    });
  } else {
    filtered = filtered.filter(e => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      const targetStart = new Date(year, 0, 1);
      const targetEnd = new Date(year, 11, 31);
      return start <= targetEnd && end >= targetStart;
    });
  }

  const listEl = document.getElementById('eventList');
  const emptyEl = document.getElementById('emptyMessage');

  if (filtered.length === 0) {
    listEl.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  listEl.innerHTML = filtered.map(e => {
    const status = getStatus(e.startDate, e.endDate);
    const statusLabel = status === 'ongoing' ? '開催中' : status === 'upcoming' ? '予定' : '終了';
    const statusClass = 'status-' + status;
    const cardClass = 'event-card' + (status === 'ongoing' ? ' ongoing' : status === 'past' ? ' past' : '');

    const startFmt = formatDate(e.startDate);
    const endFmt = formatDate(e.endDate);
    const period = e.startDate === e.endDate ? startFmt : `${startFmt} ～ ${endFmt}`;

    return `
      <div class="${cardClass}">
        <div class="event-info">
          <span class="event-status ${statusClass}">${statusLabel}</span>
          <div class="event-name">${escapeHtml(e.name)}</div>
          <div class="event-period">📅 ${period}</div>
          <div class="event-staff">👤 ${escapeHtml(e.staff)}</div>
          ${e.memo ? `<div class="event-memo">📝 ${escapeHtml(e.memo)}</div>` : ''}
        </div>
        <button class="btn-delete" onclick="deleteEvent(${e.id})">削除</button>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, isError = false) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.background = isError ? '#ef4444' : '#1a56db';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function initYearFilter() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const sel = document.getElementById('filterYear');
  sel.innerHTML = '';
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y + '年';
    if (y === currentYear) opt.selected = true;
    sel.appendChild(opt);
  }

  const monthSel = document.getElementById('filterMonth');
  monthSel.value = now.getMonth() + 1;
}

// 初期化
loadEvents();
initYearFilter();
renderList();
