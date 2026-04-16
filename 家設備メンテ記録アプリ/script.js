const STORAGE_KEY = 'home_equipment_v1';
let equipments = [];
let editingId = null;

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  equipments = raw ? JSON.parse(raw) : [];
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(equipments));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, day] = dateStr.split('-');
  return `${y}/${m}/${day}`;
}

function daysUntil(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function getStatus(days) {
  if (days < 0) return 'over';
  if (days <= 30) return 'warn';
  return 'ok';
}

function getStatusLabel(days) {
  if (days < 0) return `期限超過（${Math.abs(days)}日）`;
  if (days === 0) return '今日が目安日';
  if (days <= 30) return `あと ${days} 日`;
  return `あと ${days} 日`;
}

function getBadgeLabel(days) {
  if (days < 0) return '要対応';
  if (days <= 30) return 'まもなく';
  return '問題なし';
}

function submitForm() {
  const name = document.getElementById('name').value.trim();
  const lastDate = document.getElementById('last-date').value;
  const interval = parseInt(document.getElementById('interval').value, 10);
  const memo = document.getElementById('memo').value.trim();

  if (!name) { alert('設備名を入力してください'); return; }
  if (!lastDate) { alert('最終点検・交換日を入力してください'); return; }
  if (!interval || interval < 1) { alert('インターバル（月）を入力してください'); return; }

  if (editingId) {
    const idx = equipments.findIndex(e => e.id === editingId);
    if (idx >= 0) {
      equipments[idx] = { ...equipments[idx], name, lastDate, interval, memo };
    }
    editingId = null;
    document.getElementById('form-title').textContent = '設備を登録する';
    document.getElementById('submit-btn').textContent = '登録する';
    document.getElementById('cancel-btn').classList.add('hidden');
  } else {
    equipments.push({ id: generateId(), name, lastDate, interval, memo });
  }

  saveData();
  clearForm();
  render();
}

function clearForm() {
  document.getElementById('name').value = '';
  document.getElementById('last-date').value = '';
  document.getElementById('interval').value = '';
  document.getElementById('memo').value = '';
}

function cancelEdit() {
  editingId = null;
  clearForm();
  document.getElementById('form-title').textContent = '設備を登録する';
  document.getElementById('submit-btn').textContent = '登録する';
  document.getElementById('cancel-btn').classList.add('hidden');
}

function editEquipment(id) {
  const e = equipments.find(e => e.id === id);
  if (!e) return;
  editingId = id;
  document.getElementById('name').value = e.name;
  document.getElementById('last-date').value = e.lastDate;
  document.getElementById('interval').value = e.interval;
  document.getElementById('memo').value = e.memo || '';
  document.getElementById('form-title').textContent = '設備を編集する';
  document.getElementById('submit-btn').textContent = '更新する';
  document.getElementById('cancel-btn').classList.remove('hidden');
  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

function deleteEquipment(id) {
  if (!confirm('この設備を削除しますか？')) return;
  equipments = equipments.filter(e => e.id !== id);
  saveData();
  render();
}

function checkNow(id) {
  const idx = equipments.findIndex(e => e.id === id);
  if (idx < 0) return;
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  equipments[idx].lastDate = `${y}-${m}-${d}`;
  saveData();
  render();
}

function render() {
  const list = document.getElementById('equipment-list');
  const emptyMsg = document.getElementById('empty-msg');
  const countLabel = document.getElementById('count-label');

  // Sort: over first, then warn, then ok; within same status sort by days asc
  const sorted = [...equipments].sort((a, b) => {
    const nextA = addMonths(a.lastDate, a.interval);
    const nextB = addMonths(b.lastDate, b.interval);
    const dA = daysUntil(nextA);
    const dB = daysUntil(nextB);
    return dA - dB;
  });

  if (sorted.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    countLabel.textContent = '';
    return;
  }

  emptyMsg.style.display = 'none';
  countLabel.textContent = `${sorted.length} 件`;

  list.innerHTML = sorted.map(e => {
    const nextDate = addMonths(e.lastDate, e.interval);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    const days = daysUntil(nextDate);
    const status = getStatus(days);
    const statusLabel = getStatusLabel(days);
    const badgeLabel = getBadgeLabel(days);

    return `
    <div class="equip-card status-${status}">
      <div class="equip-name">${escHtml(e.name)}</div>
      <span class="equip-badge badge-${status}">${badgeLabel}</span>
      <div class="equip-info">
        <div class="equip-info-item">最終点検日：<span>${formatDate(e.lastDate)}</span></div>
        <div class="equip-info-item">インターバル：<span>${e.interval}ヶ月</span></div>
      </div>
      <div class="equip-next ${status}">次回目安：${formatDate(nextDateStr)}（${statusLabel}）</div>
      ${e.memo ? `<div class="equip-memo">メモ：${escHtml(e.memo)}</div>` : ''}
      <div class="equip-actions">
        <button class="btn-check" onclick="checkNow('${e.id}')">今日点検済にする</button>
        <button class="btn-edit" onclick="editEquipment('${e.id}')">編集</button>
        <button class="btn-delete" onclick="deleteEquipment('${e.id}')">削除</button>
      </div>
    </div>`;
  }).join('');
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

loadData();
render();
