const STORAGE_KEY = 'rooms_data';
const STATUS_ORDER = ['未清掃', '清掃中', '完了'];

let rooms = [];
let currentFilter = 'all';

function loadRooms() {
  const saved = localStorage.getItem(STORAGE_KEY);
  rooms = saved ? JSON.parse(saved) : [];
}

function saveRooms() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

function addRoom() {
  const numInput = document.getElementById('roomNumber');
  const memoInput = document.getElementById('roomMemo');
  const num = numInput.value.trim();
  const memo = memoInput.value.trim();

  if (!num) {
    numInput.focus();
    return;
  }

  // 重複チェック
  if (rooms.some(r => r.number === num)) {
    alert(`部屋番号「${num}」はすでに登録されています`);
    numInput.focus();
    return;
  }

  rooms.push({ id: Date.now(), number: num, memo: memo, status: '未清掃' });
  saveRooms();
  numInput.value = '';
  memoInput.value = '';
  numInput.focus();
  renderRooms();
}

function cycleStatus(id) {
  const room = rooms.find(r => r.id === id);
  if (!room) return;
  const idx = STATUS_ORDER.indexOf(room.status);
  room.status = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
  saveRooms();
  renderRooms();
}

function deleteRoom(id, event) {
  event.stopPropagation();
  const room = rooms.find(r => r.id === id);
  if (!room) return;
  if (!confirm(`部屋「${room.number}」を削除しますか？`)) return;
  rooms = rooms.filter(r => r.id !== id);
  saveRooms();
  renderRooms();
}

function filterRooms(status, btn) {
  currentFilter = status;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderRooms();
}

function updateSummary() {
  const counts = { '未清掃': 0, '清掃中': 0, '完了': 0 };
  rooms.forEach(r => counts[r.status]++);
  document.getElementById('summary').textContent =
    `未清掃: ${counts['未清掃']} / 清掃中: ${counts['清掃中']} / 完了: ${counts['完了']}`;
}

function renderRooms() {
  const list = document.getElementById('roomsList');
  const emptyMsg = document.getElementById('emptyMsg');

  const filtered = currentFilter === 'all'
    ? rooms
    : rooms.filter(r => r.status === currentFilter);

  updateSummary();

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    emptyMsg.textContent = rooms.length === 0
      ? '部屋が登録されていません'
      : `「${currentFilter}」の部屋はありません`;
    return;
  }

  emptyMsg.style.display = 'none';
  list.innerHTML = filtered.map(room => `
    <div class="room-card ${room.status}" onclick="cycleStatus(${room.id})">
      <button class="delete-btn" onclick="deleteRoom(${room.id}, event)" title="削除">✕</button>
      <div class="room-number">${escapeHtml(room.number)}</div>
      <div class="room-memo">${escapeHtml(room.memo) || '　'}</div>
      <div class="status-badge">${room.status}</div><br>
      <span class="tap-hint">タップで切り替え</span>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Enterキーで追加
document.getElementById('roomNumber').addEventListener('keydown', e => {
  if (e.key === 'Enter') addRoom();
});
document.getElementById('roomMemo').addEventListener('keydown', e => {
  if (e.key === 'Enter') addRoom();
});

// 初期表示
loadRooms();
renderRooms();
