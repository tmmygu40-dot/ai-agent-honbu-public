const STORAGE_KEY = 'moodTracker_records';

const MOODS = {
  1: { emoji: '😢', label: '最悪' },
  2: { emoji: '😕', label: 'つらい' },
  3: { emoji: '😐', label: '普通' },
  4: { emoji: '🙂', label: '良い' },
  5: { emoji: '😄', label: '最高' },
};

let selectedMood = null;
let records = [];

// 日付フォーマット
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// localStorage
function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    records = raw ? JSON.parse(raw) : [];
  } catch {
    records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// UI初期化
function init() {
  document.getElementById('todayLabel').textContent = formatDate(getTodayStr());

  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMood = parseInt(btn.dataset.mood);
      document.getElementById('selectedEmoji').textContent = MOODS[selectedMood].emoji + ' ';
      document.getElementById('selectedLabel').textContent = MOODS[selectedMood].label;
    });
  });

  document.getElementById('saveBtn').addEventListener('click', saveRecord);

  document.getElementById('filterMonth').addEventListener('change', renderList);
  document.getElementById('clearFilter').addEventListener('click', () => {
    document.getElementById('filterMonth').value = '';
    renderList();
  });

  loadRecords();
  renderList();
}

function saveRecord() {
  if (!selectedMood) {
    showSaveMsg('気分を選んでください', '#e57373');
    return;
  }

  const today = getTodayStr();
  const note = document.getElementById('noteInput').value.trim();

  const record = {
    id: Date.now(),
    date: today,
    mood: selectedMood,
    note: note,
  };

  records.unshift(record);
  saveRecords();
  renderList();

  // リセット
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
  selectedMood = null;
  document.getElementById('selectedEmoji').textContent = '';
  document.getElementById('selectedLabel').textContent = '';
  document.getElementById('noteInput').value = '';
  showSaveMsg('記録しました！', '#5a9a5a');
}

function showSaveMsg(text, color) {
  const el = document.getElementById('saveMsg');
  el.textContent = text;
  el.style.color = color;
  setTimeout(() => { el.textContent = ''; }, 2500);
}

function deleteRecord(id) {
  records = records.filter(r => r.id !== id);
  saveRecords();
  renderList();
}

function renderList() {
  const list = document.getElementById('recordList');
  const emptyMsg = document.getElementById('emptyMsg');
  const filterMonth = document.getElementById('filterMonth').value; // "YYYY-MM" or ""

  const filtered = filterMonth
    ? records.filter(r => r.date.startsWith(filterMonth))
    : records;

  list.innerHTML = '';

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  filtered.forEach(record => {
    const mood = MOODS[record.mood];
    const li = document.createElement('li');
    li.className = 'record-item';
    li.dataset.mood = record.mood;
    li.innerHTML = `
      <span class="record-emoji">${mood.emoji}</span>
      <div class="record-content">
        <div class="record-date">${formatDate(record.date)}</div>
        <div class="record-label">${mood.label}</div>
        ${record.note ? `<div class="record-note">${escapeHtml(record.note)}</div>` : ''}
      </div>
      <button class="record-delete" data-id="${record.id}" title="削除">✕</button>
    `;
    li.querySelector('.record-delete').addEventListener('click', () => deleteRecord(record.id));
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', init);
