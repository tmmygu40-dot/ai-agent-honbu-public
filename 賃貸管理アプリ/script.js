const STORAGE_KEY = 'rental_rooms';

let rooms = [];
let filterUnpaid = false;
let filterRenewal = false;

function loadRooms() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    rooms = data ? JSON.parse(data) : [];
  } catch (e) {
    rooms = [];
  }
}

function saveRooms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

function getRenewalStatus(dateStr) {
  if (!dateStr) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(dateStr);
  renewal.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 30) return 'soon';
  return 'ok';
}

function formatDate(dateStr) {
  if (!dateStr) return '未設定';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function formatRent(value) {
  return '¥' + Number(value).toLocaleString();
}

function updateSummary() {
  const totalRooms = rooms.length;
  const totalRent = rooms.reduce((sum, r) => sum + Number(r.rent || 0), 0);
  const unpaidCount = rooms.filter(r => !r.paid).length;
  const renewalSoon = rooms.filter(r => {
    const s = getRenewalStatus(r.renewalDate);
    return s === 'soon' || s === 'expired';
  }).length;

  document.getElementById('totalRooms').textContent = totalRooms;
  document.getElementById('totalRent').textContent = formatRent(totalRent);
  document.getElementById('unpaidCount').textContent = unpaidCount;
  document.getElementById('renewalSoon').textContent = renewalSoon;

  const show = totalRooms > 0;
  document.getElementById('summarySection').style.display = show ? 'block' : 'none';
  document.getElementById('filterSection').style.display = show ? 'flex' : 'none';
}

function renderRooms() {
  updateSummary();
  const list = document.getElementById('roomList');

  let filtered = rooms.filter(r => {
    if (filterUnpaid && r.paid) return false;
    if (filterRenewal) {
      const s = getRenewalStatus(r.renewalDate);
      if (s !== 'soon' && s !== 'expired') return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">' +
      (rooms.length === 0 ? 'まだ部屋が登録されていません' : '該当する部屋はありません') +
      '</p>';
    return;
  }

  list.innerHTML = filtered.map(room => {
    const status = getRenewalStatus(room.renewalDate);
    let cardClass = 'room-card';
    if (status === 'soon') cardClass += ' renewal-soon';
    if (status === 'expired') cardClass += ' renewal-expired';
    if (!room.paid) cardClass += ' unpaid';

    let renewalBadge = '';
    if (status === 'expired') {
      renewalBadge = '<span class="badge badge-expired">更新期限切れ</span>';
    } else if (status === 'soon') {
      renewalBadge = '<span class="badge badge-renewal">更新まもなく</span>';
    }

    const paidBadge = room.paid
      ? '<span class="badge badge-paid">支払済</span>'
      : '<span class="badge badge-unpaid">未払い</span>';

    return `
      <div class="${cardClass}" data-id="${room.id}">
        <div class="room-header">
          <div>
            <span class="room-number">${escHtml(room.roomNumber)}号室</span>
            <span style="margin-left:10px;" class="room-tenant">${escHtml(room.tenantName)}</span>
          </div>
          <div class="room-detail">
            <span class="detail-label">家賃</span>
            <strong>${formatRent(room.rent)}</strong>
          </div>
        </div>
        <div class="room-details">
          <div class="room-detail">
            <span class="detail-label">契約更新日</span>
            <span>${formatDate(room.renewalDate)}</span>
          </div>
        </div>
        <div class="room-actions">
          ${paidBadge}
          ${renewalBadge}
          <button class="btn-toggle-paid" onclick="togglePaid('${room.id}')">
            ${room.paid ? '未払いに戻す' : '支払済にする'}
          </button>
          <button class="btn-delete" onclick="deleteRoom('${room.id}')">削除</button>
        </div>
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

function addRoom() {
  const roomNumber = document.getElementById('roomNumber').value.trim();
  const tenantName = document.getElementById('tenantName').value.trim();
  const rent = document.getElementById('rent').value.trim();
  const renewalDate = document.getElementById('renewalDate').value;

  if (!roomNumber || !tenantName) {
    alert('部屋番号と入居者名は必須です');
    return;
  }

  const room = {
    id: Date.now().toString(),
    roomNumber,
    tenantName,
    rent: rent || '0',
    renewalDate,
    paid: false
  };

  rooms.push(room);
  saveRooms();
  renderRooms();

  document.getElementById('roomNumber').value = '';
  document.getElementById('tenantName').value = '';
  document.getElementById('rent').value = '';
  document.getElementById('renewalDate').value = '';
  document.getElementById('roomNumber').focus();
}

function deleteRoom(id) {
  if (!confirm('この部屋を削除しますか？')) return;
  rooms = rooms.filter(r => r.id !== id);
  saveRooms();
  renderRooms();
}

function togglePaid(id) {
  const room = rooms.find(r => r.id === id);
  if (!room) return;
  room.paid = !room.paid;
  saveRooms();
  renderRooms();
}

document.getElementById('addBtn').addEventListener('click', addRoom);

document.getElementById('filterUnpaid').addEventListener('change', function() {
  filterUnpaid = this.checked;
  renderRooms();
});

document.getElementById('filterRenewal').addEventListener('change', function() {
  filterRenewal = this.checked;
  renderRooms();
});

// Enterキーで登録
['roomNumber','tenantName','rent','renewalDate'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addRoom();
  });
});

loadRooms();
renderRooms();
