const STORAGE_KEY = 'carMaintItems';
const MILEAGE_KEY = 'carCurrentMileage';

let items = [];
let currentMileage = 0;

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  items = stored ? JSON.parse(stored) : [];
  const storedMileage = localStorage.getItem(MILEAGE_KEY);
  currentMileage = storedMileage ? parseInt(storedMileage, 10) : 0;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  localStorage.setItem(MILEAGE_KEY, String(currentMileage));
}

function addMonths(dateStr, months) {
  if (!dateStr || !months) return null;
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + parseInt(months, 10));
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function getStatus(item) {
  const today = new Date().toISOString().slice(0, 10);
  let kmOver = false, kmWarn = false, dateOver = false, dateWarn = false;

  if (item.nextMileage && currentMileage) {
    const diff = item.nextMileage - currentMileage;
    if (diff <= 0) kmOver = true;
    else if (diff <= 500) kmWarn = true;
  }

  if (item.nextDate) {
    const daysLeft = Math.floor((new Date(item.nextDate) - new Date(today)) / 86400000);
    if (daysLeft <= 0) dateOver = true;
    else if (daysLeft <= 14) dateWarn = true;
  }

  if (kmOver || dateOver) return 'danger';
  if (kmWarn || dateWarn) return 'warning';
  return 'ok';
}

function getStatusLabel(status) {
  if (status === 'danger') return '要交換';
  if (status === 'warning') return 'もうすぐ';
  return '正常';
}

function renderList() {
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');

  if (items.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  list.innerHTML = items.map((item, idx) => {
    const status = getStatus(item);
    const label = getStatusLabel(status);
    const kmOver = item.nextMileage && currentMileage && item.nextMileage <= currentMileage;
    const dateOver = item.nextDate && item.nextDate <= new Date().toISOString().slice(0, 10);

    return `
      <div class="item-card ${status !== 'ok' ? status : ''}">
        <div class="item-header">
          <span class="item-name">${escapeHtml(item.partName)}</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="status-badge ${status !== 'ok' ? status : ''}">${label}</span>
            <button class="delete-btn" data-idx="${idx}">削除</button>
          </div>
        </div>
        <div class="item-details">
          <span>
            <span class="label">前回交換距離</span>
            <span class="value">${item.lastMileage ? item.lastMileage.toLocaleString() + ' km' : '—'}</span>
          </span>
          <span>
            <span class="label">次回交換距離</span>
            <span class="value ${kmOver ? 'over' : ''}">${item.nextMileage ? item.nextMileage.toLocaleString() + ' km' : '—'}</span>
          </span>
          <span>
            <span class="label">前回交換日</span>
            <span class="value">${formatDate(item.lastDate)}</span>
          </span>
          <span>
            <span class="label">次回交換日</span>
            <span class="value ${dateOver ? 'over' : ''}">${formatDate(item.nextDate)}</span>
          </span>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      items.splice(idx, 1);
      saveData();
      renderList();
    });
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.getElementById('saveMileageBtn').addEventListener('click', () => {
  const val = parseInt(document.getElementById('currentMileage').value, 10);
  if (isNaN(val) || val < 0) {
    alert('正しい走行距離を入力してください');
    return;
  }
  currentMileage = val;
  saveData();
  renderList();
});

document.getElementById('addBtn').addEventListener('click', () => {
  const partName = document.getElementById('partName').value.trim();
  const lastMileage = parseInt(document.getElementById('lastMileage').value, 10);
  const cycleMileage = parseInt(document.getElementById('cycleMileage').value, 10);
  const lastDate = document.getElementById('lastDate').value;
  const cycleMonths = parseInt(document.getElementById('cycleMonths').value, 10);

  if (!partName) {
    alert('部品名を入力してください');
    return;
  }

  const nextMileage = (!isNaN(lastMileage) && !isNaN(cycleMileage)) ? lastMileage + cycleMileage : null;
  const nextDate = (lastDate && !isNaN(cycleMonths)) ? addMonths(lastDate, cycleMonths) : null;

  items.push({
    partName,
    lastMileage: isNaN(lastMileage) ? null : lastMileage,
    cycleMileage: isNaN(cycleMileage) ? null : cycleMileage,
    nextMileage,
    lastDate: lastDate || null,
    cycleMonths: isNaN(cycleMonths) ? null : cycleMonths,
    nextDate
  });

  saveData();
  renderList();

  document.getElementById('partName').value = '';
  document.getElementById('lastMileage').value = '';
  document.getElementById('cycleMileage').value = '';
  document.getElementById('lastDate').value = '';
  document.getElementById('cycleMonths').value = '';
});

// 初期化
loadData();
if (currentMileage) {
  document.getElementById('currentMileage').value = currentMileage;
}
renderList();
