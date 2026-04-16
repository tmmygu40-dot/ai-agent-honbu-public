// データ構造: { rooms: [ { id, name, measures: [ {id, name, width, height, depth, note} ] } ] }
const STORAGE_KEY = 'saison_memo_data';

let data = { rooms: [] };

// --- 初期化 ---
function load() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { data = JSON.parse(saved); } catch(e) { data = { rooms: [] }; }
  }
  renderAll();
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// --- 部屋 ---
function addRoom() {
  const input = document.getElementById('roomNameInput');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }

  data.rooms.push({ id: genId(), name, measures: [] });
  save();
  input.value = '';
  renderAll();
}

function deleteRoom(roomId) {
  if (!confirm('この部屋と採寸データをすべて削除しますか？')) return;
  data.rooms = data.rooms.filter(r => r.id !== roomId);
  save();
  renderAll();
}

// --- 採寸データ ---
let currentRoomId = null;

function openAddMeasure(roomId) {
  currentRoomId = roomId;
  const room = data.rooms.find(r => r.id === roomId);
  document.getElementById('modalRoomTitle').textContent = `採寸を追加：${room.name}`;
  ['mName','mWidth','mHeight','mDepth','mNote'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('measureModal').classList.remove('hidden');
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById('mName').focus();
}

function closeModal() {
  document.getElementById('measureModal').classList.add('hidden');
  document.getElementById('modalOverlay').classList.add('hidden');
  currentRoomId = null;
}

function saveMeasure() {
  const name = document.getElementById('mName').value.trim();
  if (!name) { document.getElementById('mName').focus(); return; }

  const width = document.getElementById('mWidth').value;
  const height = document.getElementById('mHeight').value;
  const depth = document.getElementById('mDepth').value;
  const note = document.getElementById('mNote').value.trim();

  const room = data.rooms.find(r => r.id === currentRoomId);
  if (!room) return;

  room.measures.push({
    id: genId(),
    name,
    width: width ? parseFloat(width) : null,
    height: height ? parseFloat(height) : null,
    depth: depth ? parseFloat(depth) : null,
    note
  });

  save();
  closeModal();
  renderAll();
}

function deleteMeasure(roomId, measureId) {
  const room = data.rooms.find(r => r.id === roomId);
  if (!room) return;
  room.measures = room.measures.filter(m => m.id !== measureId);
  save();
  renderAll();
}

// --- 描画 ---
function formatDim(val) {
  if (val === null || val === undefined || val === '') return '—';
  return val + ' cm';
}

function renderAll() {
  const container = document.getElementById('roomList');
  if (data.rooms.length === 0) {
    container.innerHTML = '<p class="no-room-msg">部屋がまだありません<br>上の入力欄から部屋を追加してください</p>';
    return;
  }

  container.innerHTML = data.rooms.map(room => {
    const measuresHtml = room.measures.length === 0
      ? '<p class="empty-msg">採寸データがありません。「+ 採寸追加」で登録してください。</p>'
      : `<table class="measure-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>幅</th>
              <th>高さ</th>
              <th>奥行き</th>
              <th>メモ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${room.measures.map(m => `
              <tr>
                <td><strong>${escHtml(m.name)}</strong></td>
                <td>${formatDim(m.width)}</td>
                <td>${formatDim(m.height)}</td>
                <td>${formatDim(m.depth)}</td>
                <td>${escHtml(m.note || '')}</td>
                <td><button class="btn-del-measure" onclick="deleteMeasure('${room.id}','${m.id}')" title="削除">🗑</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;

    return `
      <div class="room-card">
        <div class="room-header">
          <span class="room-name">🏠 ${escHtml(room.name)}</span>
          <div class="room-actions">
            <button class="btn-add-measure" onclick="openAddMeasure('${room.id}')">＋ 採寸追加</button>
            <button class="btn-delete-room" onclick="deleteRoom('${room.id}')">削除</button>
          </div>
        </div>
        <div class="measure-table-wrap">${measuresHtml}</div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// Enterキーで部屋追加
document.getElementById('roomNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addRoom();
});

// Enterキーで採寸保存（モーダル内）
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// 起動
load();
