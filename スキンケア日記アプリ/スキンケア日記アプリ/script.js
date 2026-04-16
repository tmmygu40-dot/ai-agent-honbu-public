const STORAGE_KEY = 'skincare_diary';

const dateInput = document.getElementById('date');
const memoInput = document.getElementById('memo');
const addBtn = document.getElementById('addBtn');
const recordList = document.getElementById('recordList');

// 今日の日付をデフォルトにセット
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
dateInput.value = `${yyyy}-${mm}-${dd}`;

// ローカルストレージから記録を読み込む
function loadRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// ローカルストレージに記録を保存する
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// チェックされた肌状態を取得する
function getCheckedConditions() {
  const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// チェックをリセットする
function resetCheckboxes() {
  const checkboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = false);
}

// 記録カードのHTMLを生成する
function createRecordCard(record) {
  const card = document.createElement('div');
  card.className = 'record-card';
  card.dataset.id = record.id;

  const dateEl = document.createElement('div');
  dateEl.className = 'record-date';
  dateEl.textContent = formatDate(record.date);

  const conditionsEl = document.createElement('div');
  conditionsEl.className = 'record-conditions';
  if (record.conditions.length > 0) {
    record.conditions.forEach(cond => {
      const tag = document.createElement('span');
      tag.className = 'condition-tag';
      tag.textContent = cond;
      conditionsEl.appendChild(tag);
    });
  } else {
    const tag = document.createElement('span');
    tag.className = 'condition-tag';
    tag.textContent = '記録なし';
    conditionsEl.appendChild(tag);
  }

  card.appendChild(dateEl);
  card.appendChild(conditionsEl);

  if (record.memo) {
    const memoEl = document.createElement('div');
    memoEl.className = 'record-memo';
    memoEl.textContent = record.memo;
    card.appendChild(memoEl);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '✕';
  deleteBtn.setAttribute('aria-label', '削除');
  deleteBtn.addEventListener('click', () => deleteRecord(record.id));
  card.appendChild(deleteBtn);

  return card;
}

// 日付を「YYYY年M月D日」に変換する
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

// 一覧を再描画する
function renderRecords() {
  const records = loadRecords();
  recordList.innerHTML = '';

  if (records.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-msg';
    empty.textContent = 'まだ記録がありません';
    recordList.appendChild(empty);
    return;
  }

  // 新しい順に表示
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  sorted.forEach(record => {
    recordList.appendChild(createRecordCard(record));
  });
}

// 記録を追加する
function addRecord() {
  const date = dateInput.value;
  if (!date) {
    alert('日付を入力してください');
    return;
  }

  const conditions = getCheckedConditions();
  const memo = memoInput.value.trim();

  const record = {
    id: Date.now().toString(),
    date,
    conditions,
    memo
  };

  const records = loadRecords();
  records.push(record);
  saveRecords(records);

  resetCheckboxes();
  memoInput.value = '';
  renderRecords();
}

// 記録を削除する
function deleteRecord(id) {
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderRecords();
}

addBtn.addEventListener('click', addRecord);

// 初期表示
renderRecords();
