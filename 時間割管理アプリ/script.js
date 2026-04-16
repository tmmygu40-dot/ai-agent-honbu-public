const DAYS = ['月', '火', '水', '木', '金'];
const PERIODS = [1, 2, 3, 4, 5, 6];
const STORAGE_KEY = 'timetable_data';

// データ構造: { "月_1": "数学", "火_3": "英語", ... }
let timetable = {};

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  timetable = saved ? JSON.parse(saved) : {};
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(timetable));
}

function buildTable() {
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = '';

  PERIODS.forEach(period => {
    const tr = document.createElement('tr');

    // 時限ラベル
    const tdLabel = document.createElement('td');
    tdLabel.className = 'period-label';
    tdLabel.textContent = period + '限';
    tr.appendChild(tdLabel);

    // 各曜日のセル
    DAYS.forEach(day => {
      const td = document.createElement('td');
      const key = `${day}_${period}`;
      const value = timetable[key] || '';

      const btn = document.createElement('button');
      btn.className = 'cell-btn' + (value ? ' has-content' : ' empty');
      btn.textContent = value || '＋';
      btn.setAttribute('data-key', key);
      btn.setAttribute('data-day', day);
      btn.setAttribute('data-period', period);
      btn.addEventListener('click', openModal);

      td.appendChild(btn);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// モーダル関連
let currentKey = '';

function openModal(e) {
  const btn = e.currentTarget;
  currentKey = btn.getAttribute('data-key');
  const day = btn.getAttribute('data-day');
  const period = btn.getAttribute('data-period');

  document.getElementById('modal-title').textContent = `${day}曜日 ${period}限`;
  document.getElementById('modal-input').value = timetable[currentKey] || '';

  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('modal-input').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
  currentKey = '';
}

function saveCell() {
  const val = document.getElementById('modal-input').value.trim();
  if (val) {
    timetable[currentKey] = val;
  } else {
    delete timetable[currentKey];
  }
  saveData();
  buildTable();
  closeModal();
}

function clearCell() {
  delete timetable[currentKey];
  saveData();
  buildTable();
  closeModal();
}

// イベント登録
document.getElementById('btn-save').addEventListener('click', saveCell);
document.getElementById('btn-clear').addEventListener('click', clearCell);
document.getElementById('btn-cancel').addEventListener('click', closeModal);
document.getElementById('overlay').addEventListener('click', closeModal);

document.getElementById('modal-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveCell();
  if (e.key === 'Escape') closeModal();
});

// 初期化
loadData();
buildTable();
