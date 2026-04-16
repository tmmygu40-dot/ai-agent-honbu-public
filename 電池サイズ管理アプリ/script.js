const STORAGE_KEY = 'batteryDevices';

function loadDevices() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveDevices(devices) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
}

function addDevice() {
  const name = document.getElementById('deviceName').value.trim();
  const size = document.getElementById('batterySize').value;
  const count = parseInt(document.getElementById('batteryCount').value, 10);

  if (!name) {
    alert('機器名を入力してください');
    document.getElementById('deviceName').focus();
    return;
  }
  if (!size) {
    alert('電池サイズを選択してください');
    document.getElementById('batterySize').focus();
    return;
  }
  if (!count || count < 1) {
    alert('本数を1以上で入力してください');
    document.getElementById('batteryCount').focus();
    return;
  }

  const devices = loadDevices();
  devices.push({
    id: Date.now(),
    name,
    size,
    count,
    registeredAt: new Date().toLocaleDateString('ja-JP')
  });
  saveDevices(devices);

  document.getElementById('deviceName').value = '';
  document.getElementById('batterySize').value = '';
  document.getElementById('batteryCount').value = '1';
  document.getElementById('deviceName').focus();

  renderList();
}

function deleteDevice(id) {
  let devices = loadDevices();
  devices = devices.filter(d => d.id !== id);
  saveDevices(devices);
  renderList();
}

function renderList() {
  const filterSize = document.getElementById('filterSize').value;
  const list = document.getElementById('deviceList');
  const emptyMsg = document.getElementById('emptyMsg');
  const countBadge = document.getElementById('countBadge');

  let devices = loadDevices();
  if (filterSize) {
    devices = devices.filter(d => d.size === filterSize);
  }

  countBadge.textContent = devices.length;

  if (devices.length === 0) {
    list.innerHTML = '';
    emptyMsg.classList.add('visible');
    return;
  }

  emptyMsg.classList.remove('visible');
  list.innerHTML = devices.map(d => `
    <div class="device-card">
      <div class="device-info">
        <div class="device-name">${escapeHtml(d.name)}</div>
        <div class="device-meta">登録日：${d.registeredAt}</div>
      </div>
      <span class="battery-tag">${escapeHtml(d.size)} × ${d.count}本</span>
      <button class="delete-btn" onclick="deleteDevice(${d.id})" title="削除">×</button>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Enterキーで登録
document.addEventListener('DOMContentLoaded', () => {
  renderList();

  document.getElementById('deviceName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addDevice();
  });
});
