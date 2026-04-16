'use strict';

// ─── データ管理 ───────────────────────────────────────────
const STORAGE_KEY_MENUS  = 'menu_manager_menus';
const STORAGE_KEY_ORDERS = 'menu_manager_orders';

function loadMenus() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_MENUS)) || [];
  } catch { return []; }
}

function saveMenus(menus) {
  localStorage.setItem(STORAGE_KEY_MENUS, JSON.stringify(menus));
}

function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_ORDERS)) || {};
  } catch { return {}; }
}

function saveOrders(orders) {
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
}

// ─── タブ切り替え ─────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

    if (btn.dataset.tab === 'input') refreshOrderForm();
    if (btn.dataset.tab === 'ranking') refreshRanking();
  });
});

// ─── メニュー管理タブ ─────────────────────────────────────
const menuNameInput = document.getElementById('menu-name-input');
const addMenuBtn    = document.getElementById('add-menu-btn');
const menuList      = document.getElementById('menu-list');

function renderMenuList() {
  const menus = loadMenus();
  menuList.innerHTML = '';
  if (menus.length === 0) {
    menuList.innerHTML = '<li class="empty-msg">メニューがまだ登録されていません</li>';
    return;
  }
  menus.forEach((name, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="item-name">${escHtml(name)}</span>
      <button class="btn-delete" data-idx="${idx}" title="削除">✕</button>
    `;
    menuList.appendChild(li);
  });
}

addMenuBtn.addEventListener('click', () => {
  const name = menuNameInput.value.trim();
  if (!name) return;
  const menus = loadMenus();
  if (menus.includes(name)) {
    showToast('同じ名前のメニューが既にあります');
    return;
  }
  menus.push(name);
  saveMenus(menus);
  menuNameInput.value = '';
  renderMenuList();
  showToast('メニューを追加しました');
});

menuNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addMenuBtn.click();
});

menuList.addEventListener('click', e => {
  if (!e.target.classList.contains('btn-delete')) return;
  const idx = parseInt(e.target.dataset.idx);
  const menus = loadMenus();
  const removed = menus.splice(idx, 1)[0];
  saveMenus(menus);
  renderMenuList();
  showToast(`「${removed}」を削除しました`);
});

// ─── 注文数入力タブ ───────────────────────────────────────
const dateInput      = document.getElementById('date-input');
const loadDateBtn    = document.getElementById('load-date-btn');
const orderForm      = document.getElementById('order-form');
const saveOrdersBtn  = document.getElementById('save-orders-btn');
const saveRow        = document.getElementById('save-row');

// 今日の日付をデフォルト設定
dateInput.value = todayStr();

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function refreshOrderForm() {
  const date = dateInput.value;
  renderOrderForm(date);
}

loadDateBtn.addEventListener('click', () => {
  const date = dateInput.value;
  if (!date) { showToast('日付を選択してください'); return; }
  renderOrderForm(date);
});

function renderOrderForm(date) {
  const menus = loadMenus();
  orderForm.innerHTML = '';
  saveRow.style.display = 'none';

  if (menus.length === 0) {
    orderForm.innerHTML = '<p class="empty-msg">先に「メニュー管理」タブでメニューを登録してください</p>';
    return;
  }

  const orders = loadOrders();
  const dayData = orders[date] || {};

  menus.forEach(name => {
    const row = document.createElement('div');
    row.className = 'order-row';
    const count = dayData[name] !== undefined ? dayData[name] : 0;
    row.innerHTML = `
      <span class="order-menu-name">${escHtml(name)}</span>
      <input type="number" class="order-input" data-menu="${escHtml(name)}"
             min="0" max="9999" value="${count}" placeholder="0">
    `;
    orderForm.appendChild(row);
  });

  saveRow.style.display = '';
}

saveOrdersBtn.addEventListener('click', () => {
  const date = dateInput.value;
  if (!date) { showToast('日付を選択してください'); return; }

  const orders = loadOrders();
  const dayData = {};
  document.querySelectorAll('.order-input').forEach(input => {
    const menuName = input.dataset.menu;
    const val = parseInt(input.value) || 0;
    dayData[menuName] = val;
  });
  orders[date] = dayData;
  saveOrders(orders);
  showToast('保存しました');
});

// ─── ランキングタブ ───────────────────────────────────────
const fromDate  = document.getElementById('from-date');
const toDate    = document.getElementById('to-date');
const filterBtn = document.getElementById('filter-btn');
const topRanking    = document.getElementById('top-ranking');
const bottomRanking = document.getElementById('bottom-ranking');

// デフォルト：過去30日
(function initDateRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  toDate.value = to.toISOString().slice(0, 10);
  fromDate.value = from.toISOString().slice(0, 10);
})();

filterBtn.addEventListener('click', refreshRanking);

function refreshRanking() {
  const orders = loadOrders();
  const from = fromDate.value;
  const to   = toDate.value;

  // 集計
  const totals = {};
  Object.entries(orders).forEach(([date, dayData]) => {
    if (from && date < from) return;
    if (to   && date > to)   return;
    Object.entries(dayData).forEach(([menu, count]) => {
      totals[menu] = (totals[menu] || 0) + (parseInt(count) || 0);
    });
  });

  // 登録済みメニューで存在しないものも0として含める
  loadMenus().forEach(name => {
    if (totals[name] === undefined) totals[name] = 0;
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    topRanking.innerHTML    = '<li class="no-data-msg">データがありません</li>';
    bottomRanking.innerHTML = '<li class="no-data-msg">データがありません</li>';
    return;
  }

  // 上位
  renderRankingList(topRanking, sorted, false);
  // 下位（昇順）
  renderRankingList(bottomRanking, [...sorted].reverse(), true);
}

function renderRankingList(listEl, items, isWorst) {
  listEl.innerHTML = '';
  const max = Math.min(items.length, 10);
  for (let i = 0; i < max; i++) {
    const [name, count] = items[i];
    const li = document.createElement('li');
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    li.innerHTML = `
      <span class="rank-num ${rankClass}">${i + 1}</span>
      <span class="rank-name">${escHtml(name)}</span>
      <span class="rank-count">${count.toLocaleString()} 件</span>
    `;
    listEl.appendChild(li);
  }
}

// ─── ユーティリティ ───────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer = null;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ─── 初期化 ───────────────────────────────────────────────
renderMenuList();
