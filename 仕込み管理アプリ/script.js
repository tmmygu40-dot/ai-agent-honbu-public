// データ構造:
// foods = { [id]: { id, name, unit, records: [{date, prep, sold}] } }

const STORAGE_KEY = 'shikomi_foods';

let foods = {};

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { foods = JSON.parse(raw); } catch { foods = {}; }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(foods));
}

function calcNextPrep(records) {
  if (records.length === 0) return null;
  const recent = records.slice(-3);
  const avg = recent.reduce((sum, r) => sum + r.sold, 0) / recent.length;
  return Math.ceil(avg * 1.1);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function render() {
  const list = document.getElementById('foodList');
  const count = document.getElementById('itemCount');
  const ids = Object.keys(foods);
  count.textContent = `${ids.length}件`;

  if (ids.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ記録がありません</p>';
    return;
  }

  list.innerHTML = ids.map(id => {
    const food = foods[id];
    const records = food.records || [];
    const latest = records[records.length - 1];
    const nextPrep = calcNextPrep(records);

    const prepVal = latest ? latest.prep : '-';
    const soldVal = latest ? latest.sold : '-';
    const nextVal = nextPrep !== null ? `${nextPrep}` : '-';
    const unit = food.unit || '';

    const historyText = records.length > 1
      ? `直近 ${Math.min(records.length, 3)} 日の平均販売: ${(records.slice(-3).reduce((s, r) => s + r.sold, 0) / Math.min(records.length, 3)).toFixed(1)} ${unit}`
      : '';

    return `
      <div class="food-card" data-id="${id}">
        <div class="food-card-header">
          <span class="food-card-name">${escHtml(food.name)}</span>
          <span class="food-card-date">${latest ? formatDate(latest.date) : '未記録'}</span>
        </div>
        <div class="food-card-stats">
          <div class="stat-box">
            <span class="stat-label">仕込み量</span>
            <span class="stat-value">${prepVal}<small style="font-size:0.65rem"> ${unit}</small></span>
          </div>
          <div class="stat-box">
            <span class="stat-label">売れた量</span>
            <span class="stat-value">${soldVal}<small style="font-size:0.65rem"> ${unit}</small></span>
          </div>
          <div class="stat-box highlight">
            <span class="stat-label">明日の目安</span>
            <span class="stat-value">${nextVal}<small style="font-size:0.65rem"> ${unit}</small></span>
          </div>
        </div>
        ${historyText ? `<p class="food-card-history">${escHtml(historyText)}</p>` : ''}
        <div class="food-card-actions">
          <button class="btn-sm btn-add-record" onclick="openAddRecord('${id}')">+ 今日の実績を追加</button>
          <button class="btn-sm btn-delete" onclick="deleteFood('${id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function addFood() {
  const name = document.getElementById('foodName').value.trim();
  const prep = parseFloat(document.getElementById('prepAmount').value);
  const sold = parseFloat(document.getElementById('soldAmount').value);
  const unit = document.getElementById('unit').value.trim();

  if (!name) { alert('食材名を入力してください'); return; }
  if (isNaN(prep) || prep < 0) { alert('仕込み量を正しく入力してください'); return; }
  if (isNaN(sold) || sold < 0) { alert('売れた量を正しく入力してください'); return; }

  // 同じ食材名がすでに存在するか探す
  const existing = Object.values(foods).find(f => f.name === name);
  if (existing) {
    existing.records.push({ date: todayStr(), prep, sold });
    if (unit) existing.unit = unit;
  } else {
    const id = genId();
    foods[id] = { id, name, unit, records: [{ date: todayStr(), prep, sold }] };
  }

  saveData();
  render();

  document.getElementById('foodName').value = '';
  document.getElementById('prepAmount').value = '';
  document.getElementById('soldAmount').value = '';
  document.getElementById('unit').value = '';
}

function openAddRecord(id) {
  const food = foods[id];
  if (!food) return;

  const prepStr = prompt(`【${food.name}】\n今日の仕込み量 (${food.unit || '単位'})`);
  if (prepStr === null) return;
  const prep = parseFloat(prepStr);
  if (isNaN(prep) || prep < 0) { alert('正しい数値を入力してください'); return; }

  const soldStr = prompt(`【${food.name}】\n今日の売れた量 (${food.unit || '単位'})`);
  if (soldStr === null) return;
  const sold = parseFloat(soldStr);
  if (isNaN(sold) || sold < 0) { alert('正しい数値を入力してください'); return; }

  food.records.push({ date: todayStr(), prep, sold });
  saveData();
  render();
}

function deleteFood(id) {
  const food = foods[id];
  if (!food) return;
  if (!confirm(`「${food.name}」の記録をすべて削除しますか？`)) return;
  delete foods[id];
  saveData();
  render();
}

document.getElementById('addBtn').addEventListener('click', addFood);

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') {
    addFood();
  }
});

loadData();
render();
