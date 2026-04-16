'use strict';

const STORAGE_KEY = 'shokuhin_v2';

let items = [];

// 今日の日付（YYYY-MM-DD）
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// 残り日数を計算
function calcDays(dateStr) {
  const today = new Date(todayStr());
  const target = new Date(dateStr);
  const diff = Math.floor((target - today) / (1000 * 60 * 60 * 24));
  return diff;
}

// ステータス判定
function getStatus(days) {
  if (days < 0)  return { cls: 'expired', badge: '🔴', label: '期限切れ',    cardCls: 'expired' };
  if (days === 0) return { cls: 'danger',  badge: '🔴', label: '今日まで',    cardCls: 'danger'  };
  if (days <= 2)  return { cls: 'danger',  badge: '🟠', label: `あと${days}日`, cardCls: 'danger' };
  if (days <= 5)  return { cls: 'warning', badge: '🟡', label: `あと${days}日`, cardCls: 'warning' };
  return           { cls: 'safe',    badge: '🟢', label: `あと${days}日`, cardCls: '' };
}

// 表示用日付
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

// 保存
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// 読み込み
function load() {
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    items = [];
  }
}

// レンダリング
function render() {
  const list = document.getElementById('itemList');
  const emptyMsg = document.getElementById('emptyMsg');
  const summary = document.getElementById('summary');

  // 期限順（早い順）にソート
  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date));

  list.innerHTML = '';

  if (sorted.length === 0) {
    emptyMsg.classList.add('show');
    summary.textContent = '';
    return;
  }

  emptyMsg.classList.remove('show');

  const expiredCount = sorted.filter(i => calcDays(i.date) < 0).length;
  const dangerCount  = sorted.filter(i => { const d = calcDays(i.date); return d >= 0 && d <= 2; }).length;
  let summaryParts = [`全${sorted.length}品`];
  if (expiredCount > 0) summaryParts.push(`期限切れ ${expiredCount}品`);
  if (dangerCount > 0)  summaryParts.push(`要注意 ${dangerCount}品`);
  summary.textContent = summaryParts.join('　');

  sorted.forEach(item => {
    const days = calcDays(item.date);
    const status = getStatus(days);

    const li = document.createElement('li');
    li.className = `item-card ${status.cardCls}`;
    li.dataset.id = item.id;

    li.innerHTML = `
      <span class="item-badge">${status.badge}</span>
      <div class="item-info">
        <div class="item-name">${escHtml(item.name)}</div>
        <div class="item-date">賞味期限：${formatDate(item.date)}</div>
      </div>
      <span class="item-days status-${status.cls}">${status.label}</span>
      <button class="delete-btn" data-id="${item.id}" title="削除">✕</button>
    `;

    list.appendChild(li);
  });
}

// XSS対策
function escHtml(str) {
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 追加
function addItem() {
  const nameEl = document.getElementById('itemName');
  const dateEl = document.getElementById('itemDate');

  const name = nameEl.value.trim();
  const date = dateEl.value;

  if (!name) { nameEl.focus(); return; }
  if (!date) { dateEl.focus(); return; }

  items.push({ id: Date.now(), name, date });
  save();
  render();

  nameEl.value = '';
  dateEl.value = '';
  nameEl.focus();
}

// 削除
function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  save();
  render();
}

// イベント設定
document.getElementById('addBtn').addEventListener('click', addItem);

document.getElementById('itemName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('itemDate').focus();
});

document.getElementById('itemDate').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

document.getElementById('itemList').addEventListener('click', e => {
  const btn = e.target.closest('.delete-btn');
  if (btn) deleteItem(Number(btn.dataset.id));
});

// 初期化
(function init() {
  // 日付のデフォルトを今日に設定
  document.getElementById('itemDate').value = todayStr();
  load();
  render();
})();
