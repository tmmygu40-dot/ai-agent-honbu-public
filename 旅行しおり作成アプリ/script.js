const STORAGE_KEY = 'travel_itinerary';

// --- データ ---
let data = {
  info: { title: '', date: '', place: '', time: '', memo: '' },
  schedule: [],
  items: []
};

// --- ロード ---
function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) data = JSON.parse(saved);
  } catch (e) {}
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- 基本情報 ---
function bindInfoFields() {
  ['title', 'date', 'place', 'time', 'memo'].forEach(key => {
    const el = document.getElementById('trip-' + key);
    el.value = data.info[key] || '';
    el.addEventListener('input', () => {
      data.info[key] = el.value;
      saveData();
    });
  });
}

// --- 日程 ---
function renderSchedule() {
  const tbody = document.getElementById('schedule-body');
  const empty = document.getElementById('schedule-empty');
  tbody.innerHTML = '';

  if (data.schedule.length === 0) {
    empty.style.display = '';
    document.getElementById('schedule-table').style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  document.getElementById('schedule-table').style.display = '';

  data.schedule.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtml(row.day)}</td>
      <td>${escHtml(row.time)}</td>
      <td>${escHtml(row.place)}</td>
      <td>${escHtml(row.content)}</td>
      <td class="no-print"><button class="btn-delete" data-i="${i}">削除</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      data.schedule.splice(parseInt(btn.dataset.i), 1);
      saveData();
      renderSchedule();
    });
  });
}

function addSchedule() {
  const day = document.getElementById('sch-day').value.trim();
  const time = document.getElementById('sch-time').value.trim();
  const place = document.getElementById('sch-place').value.trim();
  const content = document.getElementById('sch-content').value.trim();

  if (!place && !content) return;

  data.schedule.push({ day, time, place, content });
  saveData();
  renderSchedule();

  document.getElementById('sch-day').value = '';
  document.getElementById('sch-time').value = '';
  document.getElementById('sch-place').value = '';
  document.getElementById('sch-content').value = '';
  document.getElementById('sch-place').focus();
}

// --- 持ち物 ---
function renderItems() {
  const ul = document.getElementById('items-list');
  const empty = document.getElementById('items-empty');
  ul.innerHTML = '';

  if (data.items.length === 0) {
    empty.style.display = '';
    return;
  }

  empty.style.display = 'none';

  data.items.forEach((item, i) => {
    const li = document.createElement('li');
    if (item.checked) li.classList.add('checked');

    li.innerHTML = `
      <input type="checkbox" ${item.checked ? 'checked' : ''} data-i="${i}">
      <span class="item-text">${escHtml(item.name)}</span>
      <button class="btn-delete" data-i="${i}">削除</button>
    `;

    li.querySelector('input[type="checkbox"]').addEventListener('change', function() {
      data.items[i].checked = this.checked;
      saveData();
      renderItems();
    });

    li.querySelector('.btn-delete').addEventListener('click', function() {
      data.items.splice(parseInt(this.dataset.i), 1);
      saveData();
      renderItems();
    });

    ul.appendChild(li);
  });
}

function addItem() {
  const name = document.getElementById('item-name').value.trim();
  if (!name) return;

  data.items.push({ name, checked: false });
  saveData();
  renderItems();

  document.getElementById('item-name').value = '';
  document.getElementById('item-name').focus();
}

// --- ユーティリティ ---
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- クリア ---
function clearAll() {
  if (!confirm('すべてのデータを削除します。よろしいですか？')) return;
  data = { info: { title: '', date: '', place: '', time: '', memo: '' }, schedule: [], items: [] };
  saveData();
  bindInfoFields();
  renderSchedule();
  renderItems();
}

// --- Enterキーで追加 ---
document.getElementById('sch-content').addEventListener('keydown', e => {
  if (e.key === 'Enter') addSchedule();
});

document.getElementById('item-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

// --- 初期化 ---
loadData();
bindInfoFields();
renderSchedule();
renderItems();
