// ===== データ管理 =====
let ingredients = JSON.parse(localStorage.getItem('ingredients') || '[]');
let menus = JSON.parse(localStorage.getItem('menus') || '[]');

function saveIngredients() {
  localStorage.setItem('ingredients', JSON.stringify(ingredients));
}

function saveMenus() {
  localStorage.setItem('menus', JSON.stringify(menus));
}

// ===== タブ切り替え =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ===== 食材登録 =====
document.getElementById('ingredient-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('ing-name').value.trim();
  const unitPrice = parseFloat(document.getElementById('ing-unit-price').value);
  const unit = document.getElementById('ing-unit').value.trim();

  if (!name || isNaN(unitPrice) || !unit) return;

  ingredients.push({ id: Date.now(), name, unitPrice, unit });
  saveIngredients();
  renderIngredients();
  e.target.reset();
});

function renderIngredients() {
  const list = document.getElementById('ingredient-list');
  if (ingredients.length === 0) {
    list.innerHTML = '<p class="empty-msg">食材が登録されていません</p>';
    return;
  }

  list.innerHTML = ingredients.map(ing => `
    <div class="ingredient-card">
      <div class="ing-info">
        <div class="ing-name">${escHtml(ing.name)}</div>
        <div class="ing-detail">単価：${ing.unitPrice.toFixed(2)}円 / ${escHtml(ing.unit)}</div>
      </div>
      <button class="btn-delete" onclick="deleteIngredient(${ing.id})" title="削除">✕</button>
    </div>
  `).join('');
}

function deleteIngredient(id) {
  ingredients = ingredients.filter(i => i.id !== id);
  saveIngredients();
  renderIngredients();
  // メニューの食材参照を更新して再描画
  renderMenus();
}

// ===== メニュー登録 =====

// 食材行追加ボタン
document.getElementById('add-ingredient-row').addEventListener('click', () => {
  addIngredientRow();
});

function addIngredientRow(selectedId = '', amount = '') {
  const container = document.getElementById('menu-ingredients');
  const row = document.createElement('div');
  row.className = 'ingredient-row';

  const options = ingredients.map(ing =>
    `<option value="${ing.id}" ${ing.id == selectedId ? 'selected' : ''}>${escHtml(ing.name)}（${ing.unitPrice}円/${ing.unit}）</option>`
  ).join('');

  row.innerHTML = `
    <div class="form-row ing-select">
      <label>食材</label>
      <select class="ing-id-select">
        <option value="">-- 選択 --</option>
        ${options}
      </select>
    </div>
    <div class="form-row ing-amount">
      <label>使用量</label>
      <input type="number" class="ing-usage" placeholder="数量" min="0" step="0.01" value="${amount}">
    </div>
    <button type="button" class="ing-remove" onclick="this.parentElement.remove()">削除</button>
  `;
  container.appendChild(row);
}

document.getElementById('menu-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('menu-name').value.trim();
  const price = parseFloat(document.getElementById('menu-price').value);
  if (!name || isNaN(price)) return;

  const rows = document.querySelectorAll('#menu-ingredients .ingredient-row');
  const usedIngredients = [];
  rows.forEach(row => {
    const ingId = parseInt(row.querySelector('.ing-id-select').value);
    const usage = parseFloat(row.querySelector('.ing-usage').value);
    if (!isNaN(ingId) && !isNaN(usage) && usage > 0) {
      usedIngredients.push({ ingId, usage });
    }
  });

  if (usedIngredients.length === 0) {
    alert('食材を1つ以上追加してください。');
    return;
  }

  menus.push({ id: Date.now(), name, price, usedIngredients });
  saveMenus();
  renderMenus();
  e.target.reset();
  document.getElementById('menu-ingredients').innerHTML = '';
});

function calcMenuCost(menu) {
  return menu.usedIngredients.reduce((sum, item) => {
    const ing = ingredients.find(i => i.id === item.ingId);
    if (!ing) return sum;
    return sum + ing.unitPrice * item.usage;
  }, 0);
}

function renderMenus() {
  const list = document.getElementById('menu-list');
  if (menus.length === 0) {
    list.innerHTML = '<p class="empty-msg">メニューが登録されていません</p>';
    return;
  }

  list.innerHTML = menus.map(menu => {
    const cost = calcMenuCost(menu);
    const rate = menu.price > 0 ? (cost / menu.price) * 100 : 0;
    let badgeClass = 'ok';
    if (rate >= 40) badgeClass = 'danger';
    else if (rate >= 30) badgeClass = 'warning';

    const ingLines = menu.usedIngredients.map(item => {
      const ing = ingredients.find(i => i.id === item.ingId);
      if (!ing) return `<li>（削除済み食材） × ${item.usage}</li>`;
      return `<li>${escHtml(ing.name)} × ${item.usage}${escHtml(ing.unit)}（${(ing.unitPrice * item.usage).toFixed(2)}円）</li>`;
    }).join('');

    return `
      <div class="menu-card">
        <div class="menu-card-header">
          <div>
            <div class="menu-name">${escHtml(menu.name)}</div>
            <div class="menu-price">販売価格：${menu.price.toFixed(0)}円</div>
          </div>
          <span class="cost-rate-badge ${badgeClass}">${rate.toFixed(1)}%</span>
        </div>
        <ul class="menu-ing-list">${ingLines}</ul>
        <div class="menu-card-footer">
          <span>原価：${cost.toFixed(2)}円</span>
          <button class="btn-delete" onclick="deleteMenu(${menu.id})" title="削除">✕ 削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function deleteMenu(id) {
  menus = menus.filter(m => m.id !== id);
  saveMenus();
  renderMenus();
}

// ===== ユーティリティ =====
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== 初期描画 =====
renderIngredients();
renderMenus();
