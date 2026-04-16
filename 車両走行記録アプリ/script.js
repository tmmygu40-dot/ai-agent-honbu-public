const STORAGE_KEY = 'vehicle_records';

// 記録を読み込む
function loadRecords() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// 記録を保存する
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// 今日の日付をyyyy-mm-dd形式で返す
function todayStr() {
  return new Date().toLocaleDateString('sv-SE');
}

// 今月をyyyy-mm形式で返す
function thisMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// 日付をyyyy年mm月dd日に整形
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

// 記録を一覧表示
function renderList(filter) {
  const records = loadRecords();
  const list = document.getElementById('recordList');
  const filterLabel = document.getElementById('listFilterLabel');

  let displayed = records;
  if (filter) {
    displayed = records.filter(r => r.date.startsWith(filter));
    const [y, m] = filter.split('-');
    filterLabel.textContent = `（${y}年${m}月）`;
  } else {
    filterLabel.textContent = '';
  }

  if (displayed.length === 0) {
    list.innerHTML = '<p class="empty-msg">記録がありません</p>';
    return;
  }

  // 新しい順に並べる
  const sorted = [...displayed].sort((a, b) => b.date.localeCompare(a.date));

  list.innerHTML = sorted.map(r => `
    <div class="record-item">
      <div class="record-date">${formatDate(r.date)}</div>
      <div class="record-main">
        <div class="record-purpose">${escapeHtml(r.purpose)}</div>
        <div class="record-distance">${r.distance} km</div>
      </div>
      <button class="btn-delete" data-id="${r.id}" title="削除">×</button>
    </div>
  `).join('');

  // 削除ボタン
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteRecord(btn.dataset.id, filter);
    });
  });
}

// 月別集計
function calcSummary(monthStr) {
  const records = loadRecords();
  const filtered = records.filter(r => r.date.startsWith(monthStr));
  const total = filtered.reduce((sum, r) => sum + parseFloat(r.distance), 0);
  return { total: Math.round(total * 10) / 10, count: filtered.length };
}

// HTMLエスケープ
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 記録を追加
function addRecord() {
  const date = document.getElementById('useDate').value;
  const distance = document.getElementById('distance').value;
  const purpose = document.getElementById('purpose').value.trim();

  if (!date) { alert('使用日を入力してください'); return; }
  if (!distance || parseFloat(distance) <= 0) { alert('走行距離を入力してください'); return; }
  if (!purpose) { alert('目的を入力してください'); return; }

  const records = loadRecords();
  records.push({
    id: Date.now().toString(),
    date,
    distance: parseFloat(distance),
    purpose
  });
  saveRecords(records);

  // フォームリセット
  document.getElementById('useDate').value = todayStr();
  document.getElementById('distance').value = '';
  document.getElementById('purpose').value = '';

  // 現在の月フィルターを取得して再描画
  const currentFilter = document.getElementById('monthFilter').value;
  renderList(currentFilter || null);
  updateSummary(currentFilter || thisMonthStr());
}

// 集計表示を更新
function updateSummary(monthStr) {
  const { total, count } = calcSummary(monthStr);
  const [y, m] = monthStr.split('-');
  document.getElementById('totalDistance').textContent = count > 0 ? total : '－';
  document.getElementById('recordCount').textContent = count > 0 ? `${y}年${m}月 ${count}件の記録` : `${y}年${m}月 記録なし`;
}

// 削除
function deleteRecord(id, filter) {
  if (!confirm('この記録を削除しますか？')) return;
  const records = loadRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderList(filter || null);
  const currentFilter = document.getElementById('monthFilter').value;
  updateSummary(currentFilter || thisMonthStr());
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // 今日の日付をデフォルトに
  document.getElementById('useDate').value = todayStr();
  // 今月をデフォルトに
  document.getElementById('monthFilter').value = thisMonthStr();

  renderList(null);
  updateSummary(thisMonthStr());

  document.getElementById('addBtn').addEventListener('click', addRecord);

  document.getElementById('filterBtn').addEventListener('click', () => {
    const month = document.getElementById('monthFilter').value;
    if (!month) { alert('月を選択してください'); return; }
    renderList(month);
    updateSummary(month);
  });
});
