'use strict';

const STORAGE_KEY = 'consumable_items';

let items = [];
let currentFilter = 'all';

// ローカルストレージから読み込み
function loadItems() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    items = data ? JSON.parse(data) : [];
  } catch {
    items = [];
  }
}

// ローカルストレージへ保存
function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// 次回交換日を計算
function calcNextDate(lastChanged, cycleValue, cycleUnit) {
  const d = new Date(lastChanged);
  const v = parseInt(cycleValue, 10);
  switch (cycleUnit) {
    case 'day':   d.setDate(d.getDate() + v); break;
    case 'week':  d.setDate(d.getDate() + v * 7); break;
    case 'month': d.setMonth(d.getMonth() + v); break;
    case 'year':  d.setFullYear(d.getFullYear() + v); break;
  }
  return d.toISOString().split('T')[0];
}

// 残り日数を計算（今日との差）
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

// ステータスを判定
function getStatus(days) {
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'ok';
}

// サイクル単位の日本語ラベル
function unitLabel(unit) {
  return { day: '日', week: '週', month: 'ヶ月', year: '年' }[unit] || unit;
}

// ステータスバッジのラベル
function statusLabel(status) {
  return { overdue: '期限切れ', soon: 'まもなく', ok: '余裕あり' }[status];
}

// バッジのクラス名
function badgeClass(status) {
  return { overdue: 'badge-overdue', soon: 'badge-soon', ok: 'badge-ok' }[status];
}

// アイテム一覧を描画
function renderList() {
  const list = document.getElementById('itemList');

  const filtered = items.filter(item => {
    if (currentFilter === 'all') return true;
    const days = daysUntil(item.nextDate);
    return getStatus(days) === currentFilter;
  });

  // 次回交換日が近い順にソート
  filtered.sort((a, b) => new Date(a.nextDate) - new Date(b.nextDate));

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-msg">該当する消耗品はありません</p>';
    return;
  }

  list.innerHTML = filtered.map(item => {
    const days = daysUntil(item.nextDate);
    const status = getStatus(days);
    let daysText;
    if (days < 0) {
      daysText = `<span class="days-left negative">${Math.abs(days)}日超過</span>`;
    } else if (days === 0) {
      daysText = `<span class="days-left negative">今日が交換日</span>`;
    } else {
      const cls = days <= 7 ? 'days-left warning' : 'days-left';
      daysText = `<span class="${cls}">あと${days}日</span>`;
    }

    return `
      <div class="item-card status-${status}" data-id="${item.id}">
        <div class="item-header">
          <span class="item-name">${escapeHtml(item.name)}</span>
          <span class="status-badge ${badgeClass(status)}">${statusLabel(status)}</span>
        </div>
        <div class="item-dates">
          <span>最終交換：${item.lastChanged}</span>
          <span>次回交換：${item.nextDate}</span>
          <span>サイクル：${item.cycleValue}${unitLabel(item.cycleUnit)}ごと</span>
          ${daysText}
        </div>
        <div class="item-actions">
          <button class="btn btn-done" onclick="markDone('${item.id}')">交換済みにする</button>
          <button class="btn btn-delete" onclick="deleteItem('${item.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

// HTMLエスケープ
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 登録ボタン
document.getElementById('addBtn').addEventListener('click', () => {
  const name = document.getElementById('itemName').value.trim();
  const lastChanged = document.getElementById('lastChanged').value;
  const cycleValue = document.getElementById('cycleValue').value;
  const cycleUnit = document.getElementById('cycleUnit').value;

  if (!name) { alert('消耗品名を入力してください'); return; }
  if (!lastChanged) { alert('最終交換日を入力してください'); return; }
  if (!cycleValue || parseInt(cycleValue) < 1) { alert('交換サイクルを入力してください'); return; }

  const nextDate = calcNextDate(lastChanged, cycleValue, cycleUnit);

  const newItem = {
    id: Date.now().toString(),
    name,
    lastChanged,
    cycleValue: parseInt(cycleValue),
    cycleUnit,
    nextDate
  };

  items.push(newItem);
  saveItems();
  renderList();

  // フォームをリセット
  document.getElementById('itemName').value = '';
  document.getElementById('lastChanged').value = '';
  document.getElementById('cycleValue').value = '1';
  document.getElementById('cycleUnit').value = 'month';
});

// 交換済みにする
function markDone(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const today = new Date().toISOString().split('T')[0];
  item.lastChanged = today;
  item.nextDate = calcNextDate(today, item.cycleValue, item.cycleUnit);
  saveItems();
  renderList();
}

// 削除
function deleteItem(id) {
  if (!confirm('削除してよいですか？')) return;
  items = items.filter(i => i.id !== id);
  saveItems();
  renderList();
}

// フィルターボタン
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderList();
  });
});

// 今日の日付をデフォルトセット
document.getElementById('lastChanged').value = new Date().toISOString().split('T')[0];

// 初期化
loadItems();
renderList();
