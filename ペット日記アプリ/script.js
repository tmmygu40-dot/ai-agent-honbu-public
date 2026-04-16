const STORAGE_KEY = 'pet_diary_records';

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

function renderList() {
  const records = loadRecords();
  const list = document.getElementById('record-list');
  const empty = document.getElementById('empty-message');

  list.innerHTML = '';

  if (records.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));

  sorted.forEach((rec) => {
    const li = document.createElement('li');
    li.className = 'record-item';

    li.innerHTML = `
      <div class="record-date">${formatDate(rec.date)}</div>
      <div class="record-details">
        <div class="record-detail">
          <span class="detail-label">体重：</span>
          <span class="detail-value">${rec.weight ? rec.weight + ' kg' : '—'}</span>
        </div>
        <div class="record-detail">
          <span class="detail-label">散歩：</span>
          <span class="detail-value">${rec.walk || '—'}</span>
        </div>
        <div class="record-detail" style="grid-column: 1 / -1;">
          <span class="detail-label">食事：</span>
          <span class="detail-value">${rec.meal || '—'}</span>
        </div>
      </div>
      ${rec.note ? `<div class="record-note">📝 ${rec.note}</div>` : ''}
      <button class="btn-delete" data-id="${rec.id}" title="削除">✕</button>
    `;

    list.appendChild(li);
  });

  list.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      deleteRecord(btn.dataset.id);
    });
  });
}

function deleteRecord(id) {
  const records = loadRecords().filter((r) => r.id !== id);
  saveRecords(records);
  renderList();
}

document.getElementById('record-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const date = document.getElementById('date').value;
  const weight = document.getElementById('weight').value;
  const meal = document.getElementById('meal').value.trim();
  const walk = document.getElementById('walk').value;
  const note = document.getElementById('note').value.trim();

  if (!date) {
    alert('日付を入力してください。');
    return;
  }

  const record = {
    id: Date.now().toString(),
    date,
    weight,
    meal,
    walk,
    note,
  };

  const records = loadRecords();
  records.push(record);
  saveRecords(records);

  e.target.reset();
  document.getElementById('date').value = new Date().toISOString().slice(0, 10);
  renderList();
});

// 初期表示：今日の日付をセット
document.getElementById('date').value = new Date().toISOString().slice(0, 10);
renderList();
