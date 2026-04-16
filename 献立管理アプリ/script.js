'use strict';

// --- データ管理 ---
const STORAGE_KEY = '献立管理_data';
const SHOPPING_KEY = '献立管理_shopping';

function loadMeals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveMeals(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadShopping() {
  try { return JSON.parse(localStorage.getItem(SHOPPING_KEY)) || []; }
  catch { return []; }
}

function saveShopping(list) {
  localStorage.setItem(SHOPPING_KEY, JSON.stringify(list));
}

// --- 状態 ---
let meals = loadMeals();       // { "2026-04-15_朝食": { name, ingredients, memo }, ... }
let shoppingItems = loadShopping(); // [{ id, text, group, checked }, ...]
let currentWeekStart = getWeekStart(new Date());
let editingKey = null;

const MEAL_TYPES = ['朝食', '昼食', '夕食'];
const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日'];

// --- ユーティリティ ---
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=日
  const diff = day === 0 ? -6 : 1 - day; // 月曜起点
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function mealKey(dateStr, mealType) {
  return `${dateStr}_${mealType}`;
}

function isToday(dateStr) {
  return dateStr === toDateStr(new Date());
}

// --- カレンダー描画 ---
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  grid.innerHTML = '';

  // 週の日付配列（月〜日）
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  // 週ラベル更新
  const from = dates[0];
  const to = dates[6];
  document.getElementById('weekLabel').textContent =
    `${from.getMonth()+1}/${from.getDate()} 〜 ${to.getMonth()+1}/${to.getDate()}`;

  // ヘッダー行（空白 + 月〜日）
  const emptyHeader = document.createElement('div');
  grid.appendChild(emptyHeader);

  dates.forEach((d, i) => {
    const el = document.createElement('div');
    el.className = 'cal-header' + (isToday(toDateStr(d)) ? ' today-header' : '');
    el.textContent = `${DAY_NAMES[i]}\n${d.getMonth()+1}/${d.getDate()}`;
    el.style.whiteSpace = 'pre';
    grid.appendChild(el);
  });

  // 食事タイプ行
  MEAL_TYPES.forEach(mealType => {
    // ラベル
    const label = document.createElement('div');
    label.className = 'cal-label';
    label.textContent = mealType;
    grid.appendChild(label);

    // 各曜日のセル
    dates.forEach(d => {
      const dateStr = toDateStr(d);
      const key = mealKey(dateStr, mealType);
      const meal = meals[key];

      const cell = document.createElement('div');
      cell.className = 'cal-cell' +
        (meal ? ' has-meal' : '') +
        (isToday(dateStr) ? ' today-cell' : '');
      cell.dataset.key = key;
      cell.dataset.dateStr = dateStr;
      cell.dataset.mealType = mealType;

      if (meal && meal.name) {
        const nameEl = document.createElement('div');
        nameEl.className = 'meal-name';
        nameEl.textContent = meal.name;
        cell.appendChild(nameEl);

        if (meal.ingredients) {
          const ingEl = document.createElement('div');
          ingEl.className = 'meal-ingredients';
          ingEl.textContent = meal.ingredients;
          cell.appendChild(ingEl);
        }
      } else {
        const icon = document.createElement('div');
        icon.className = 'add-icon';
        icon.textContent = '+';
        cell.appendChild(icon);
      }

      cell.addEventListener('click', () => openModal(key, dateStr, mealType));
      grid.appendChild(cell);
    });
  });
}

// --- モーダル ---
function openModal(key, dateStr, mealType) {
  editingKey = key;
  const meal = meals[key] || {};

  document.getElementById('modalTitle').textContent =
    `${dateStr.replace(/-/g,'/')} ${mealType}`;
  document.getElementById('mealName').value = meal.name || '';
  document.getElementById('mealIngredients').value = meal.ingredients || '';
  document.getElementById('mealMemo').value = meal.memo || '';

  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
  document.getElementById('mealName').focus();
}

function closeModal() {
  editingKey = null;
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('overlay').classList.add('hidden');
}

function saveMeal() {
  const name = document.getElementById('mealName').value.trim();
  const ingredients = document.getElementById('mealIngredients').value.trim();
  const memo = document.getElementById('mealMemo').value.trim();

  if (!name && !ingredients) {
    // 空なら削除
    delete meals[editingKey];
  } else {
    meals[editingKey] = { name, ingredients, memo };
  }
  saveMeals(meals);
  closeModal();
  renderCalendar();
  // 買い物リストを再生成（食材が変わった可能性）
  syncShoppingFromMeals();
  renderShopping();
}

function deleteMeal() {
  if (!editingKey) return;
  delete meals[editingKey];
  saveMeals(meals);
  closeModal();
  renderCalendar();
  syncShoppingFromMeals();
  renderShopping();
}

// --- 買い物リスト同期（献立から食材を取り込む） ---
function syncShoppingFromMeals() {
  // 既存の「献立由来」アイテムをいったん除外し、現在の献立から再生成
  const manual = shoppingItems.filter(i => i.group === '手動追加');

  const mealItems = [];
  for (const [key, meal] of Object.entries(meals)) {
    if (!meal.ingredients) continue;
    const [dateStr, mealType] = key.split('_');
    const group = `${dateStr} ${mealType}`;
    meal.ingredients.split(/[,，、]/).forEach(ing => {
      const text = ing.trim();
      if (!text) return;
      // 同じグループ・テキストが既存手動リストになければ追加
      const exists = manual.some(i => i.text === text && i.group === group);
      if (!exists) {
        mealItems.push({
          id: `${key}_${text}`,
          text,
          group,
          checked: false
        });
      }
    });
  }

  // 手動追加 + 献立由来でマージ（重複idは古いチェック状態を引き継ぐ）
  const prevMealItems = shoppingItems.filter(i => i.group !== '手動追加');
  const merged = mealItems.map(newItem => {
    const prev = prevMealItems.find(p => p.id === newItem.id);
    return prev ? { ...newItem, checked: prev.checked } : newItem;
  });

  shoppingItems = [...merged, ...manual];
  saveShopping(shoppingItems);
}

// --- 買い物リスト描画 ---
function renderShopping() {
  const container = document.getElementById('shoppingList');
  container.innerHTML = '';

  if (shoppingItems.length === 0) {
    container.innerHTML = '<div class="empty-shopping">買い物リストは空です。<br>献立に食材を登録すると自動で追加されます。</div>';
    return;
  }

  // グループ別に整理
  const groups = {};
  shoppingItems.forEach(item => {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  });

  // 「手動追加」を最後に
  const sortedGroups = Object.keys(groups).sort((a, b) => {
    if (a === '手動追加') return 1;
    if (b === '手動追加') return -1;
    return a.localeCompare(b);
  });

  sortedGroups.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'shopping-group';

    const title = document.createElement('div');
    title.className = 'shopping-group-title';
    title.textContent = group;
    groupEl.appendChild(title);

    groups[group].forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'shopping-item' + (item.checked ? ' checked' : '');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = item.checked;
      cb.id = `item-${item.id}`;
      cb.addEventListener('change', () => {
        item.checked = cb.checked;
        saveShopping(shoppingItems);
        renderShopping();
      });

      const lbl = document.createElement('label');
      lbl.htmlFor = cb.id;
      lbl.textContent = item.text;

      const delBtn = document.createElement('button');
      delBtn.className = 'del-btn';
      delBtn.textContent = '✕';
      delBtn.addEventListener('click', () => {
        shoppingItems = shoppingItems.filter(i => i.id !== item.id);
        saveShopping(shoppingItems);
        renderShopping();
      });

      itemEl.appendChild(cb);
      itemEl.appendChild(lbl);
      itemEl.appendChild(delBtn);
      groupEl.appendChild(itemEl);
    });

    container.appendChild(groupEl);
  });
}

// --- イベントリスナー ---
document.getElementById('prevWeek').addEventListener('click', () => {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  renderCalendar();
});

document.getElementById('nextWeek').addEventListener('click', () => {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  renderCalendar();
});

document.getElementById('todayBtn').addEventListener('click', () => {
  currentWeekStart = getWeekStart(new Date());
  renderCalendar();
});

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('overlay').addEventListener('click', closeModal);
document.getElementById('saveMeal').addEventListener('click', saveMeal);
document.getElementById('deleteMeal').addEventListener('click', deleteMeal);

// Enterキーで保存
document.getElementById('mealName').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveMeal();
});

// タブ切り替え
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'shopping') {
      syncShoppingFromMeals();
      renderShopping();
    }
  });
});

// 手動追加
document.getElementById('addItemBtn').addEventListener('click', addManualItem);
document.getElementById('newItem').addEventListener('keydown', e => {
  if (e.key === 'Enter') addManualItem();
});

function addManualItem() {
  const input = document.getElementById('newItem');
  const text = input.value.trim();
  if (!text) return;
  shoppingItems.push({
    id: `manual_${Date.now()}`,
    text,
    group: '手動追加',
    checked: false
  });
  saveShopping(shoppingItems);
  input.value = '';
  renderShopping();
}

// チェック済み削除
document.getElementById('clearChecked').addEventListener('click', () => {
  shoppingItems = shoppingItems.filter(i => !i.checked);
  saveShopping(shoppingItems);
  renderShopping();
});

// 買い物リストリセット
document.getElementById('resetShoppingBtn').addEventListener('click', () => {
  if (!confirm('買い物リストをリセットしますか？')) return;
  shoppingItems = [];
  saveShopping(shoppingItems);
  renderShopping();
});

// --- 初期化 ---
syncShoppingFromMeals();
renderCalendar();
renderShopping();
