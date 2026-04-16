const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const STORAGE_KEY = '献立プランナー_v1';

let currentDay = 0;
let data = loadData();
let checkedIngredients = loadChecked();

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { menus: {} };
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function loadChecked() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY + '_checked');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return {};
}

function saveChecked() {
  try {
    localStorage.setItem(STORAGE_KEY + '_checked', JSON.stringify(checkedIngredients));
  } catch (e) {}
}

function initTabs() {
  const container = document.getElementById('dayTabs');
  DAYS.forEach((day, i) => {
    const btn = document.createElement('button');
    btn.className = 'day-tab' + (i === currentDay ? ' active' : '');
    btn.dataset.day = i;

    const count = (data.menus[i] || []).length;
    btn.innerHTML = day + '曜' + (count > 0 ? `<span class="badge">${count}</span>` : '');

    btn.addEventListener('click', () => {
      currentDay = i;
      updateTabActive();
      renderMenuList();
    });
    container.appendChild(btn);
  });
}

function updateTabActive() {
  document.querySelectorAll('.day-tab').forEach((btn, i) => {
    btn.classList.toggle('active', i === currentDay);
    const count = (data.menus[i] || []).length;
    btn.innerHTML = DAYS[i] + '曜' + (count > 0 ? `<span class="badge">${count}</span>` : '');
  });
}

function addDish() {
  const nameEl = document.getElementById('dishName');
  const ingEl = document.getElementById('ingredients');
  const name = nameEl.value.trim();
  const ingRaw = ingEl.value.trim();

  if (!name) {
    nameEl.focus();
    return;
  }

  const ingredients = ingRaw
    ? ingRaw.split(/[,、，\s]+/).map(s => s.trim()).filter(s => s)
    : [];

  if (!data.menus[currentDay]) data.menus[currentDay] = [];
  data.menus[currentDay].push({ name, ingredients, id: Date.now() });

  saveData();
  nameEl.value = '';
  ingEl.value = '';
  nameEl.focus();

  updateTabActive();
  renderMenuList();
  renderIngredientList();
}

function deleteDish(dayIndex, id) {
  if (!data.menus[dayIndex]) return;
  data.menus[dayIndex] = data.menus[dayIndex].filter(d => d.id !== id);
  saveData();
  updateTabActive();
  renderMenuList();
  renderIngredientList();
}

function renderMenuList() {
  const list = document.getElementById('menuList');
  const title = document.getElementById('menuTitle');
  title.textContent = DAYS[currentDay] + '曜日の献立';

  const dishes = data.menus[currentDay] || [];
  list.innerHTML = '';

  if (dishes.length === 0) {
    list.innerHTML = '<li class="empty-msg">献立が登録されていません</li>';
    return;
  }

  dishes.forEach(dish => {
    const li = document.createElement('li');
    li.className = 'menu-item';
    li.innerHTML = `
      <div class="menu-item-info">
        <div class="menu-item-name">${escHtml(dish.name)}</div>
        ${dish.ingredients.length > 0
          ? `<div class="menu-item-ingredients">食材：${dish.ingredients.map(escHtml).join('、')}</div>`
          : '<div class="menu-item-ingredients" style="color:#ccc">食材の登録なし</div>'
        }
      </div>
      <button class="delete-btn" title="削除">✕</button>
    `;
    li.querySelector('.delete-btn').addEventListener('click', () => deleteDish(currentDay, dish.id));
    list.appendChild(li);
  });
}

function renderIngredientList() {
  const list = document.getElementById('ingredientList');
  const countEl = document.getElementById('ingredientCount');
  list.innerHTML = '';

  const allIngredients = [];
  DAYS.forEach((day, i) => {
    const dishes = data.menus[i] || [];
    dishes.forEach(dish => {
      dish.ingredients.forEach(ing => {
        allIngredients.push({ name: ing, day: day + '曜', key: i + '_' + dish.id + '_' + ing });
      });
    });
  });

  if (allIngredients.length === 0) {
    list.innerHTML = '<li class="empty-msg">食材がありません</li>';
    countEl.textContent = '0件';
    return;
  }

  countEl.textContent = allIngredients.length + '件';

  allIngredients.forEach(item => {
    const checked = !!checkedIngredients[item.key];
    const li = document.createElement('li');
    li.className = 'ingredient-item' + (checked ? ' checked' : '');
    const id = 'ing_' + item.key.replace(/[^a-zA-Z0-9]/g, '_');
    li.innerHTML = `
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
      <label for="${id}">${escHtml(item.name)}</label>
      <span class="ingredient-day">${escHtml(item.day)}</span>
    `;
    li.querySelector('input').addEventListener('change', function () {
      checkedIngredients[item.key] = this.checked;
      saveChecked();
      li.classList.toggle('checked', this.checked);
    });
    list.appendChild(li);
  });
}

function copyIngredients() {
  const items = document.querySelectorAll('.ingredient-item:not(.checked) label');
  if (items.length === 0) {
    alert('未チェックの食材がありません');
    return;
  }
  const text = Array.from(items).map(el => el.textContent).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'コピー済み';
    setTimeout(() => { btn.textContent = 'コピー'; }, 1500);
  }).catch(() => {
    prompt('以下をコピーしてください：', text);
  });
}

function clearChecked() {
  const checkedKeys = Object.keys(checkedIngredients).filter(k => checkedIngredients[k]);
  if (checkedKeys.length === 0) {
    alert('チェック済みの食材がありません');
    return;
  }
  checkedKeys.forEach(k => delete checkedIngredients[k]);
  saveChecked();
  renderIngredientList();
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Enter キーで追加
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  renderMenuList();
  renderIngredientList();

  document.getElementById('dishName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('ingredients').focus();
  });
  document.getElementById('ingredients').addEventListener('keydown', e => {
    if (e.key === 'Enter') addDish();
  });
});
