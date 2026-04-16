const STORAGE_KEY = 'recipe_scaler_recipes';

let recipes = loadRecipes();
let currentRecipeId = null;

// 起動時にレシピ一覧を表示
renderRecipeList();

// ---- localStorage ----

function loadRecipes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveRecipes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

// ---- 材料行の追加/削除 ----

function addIngredientRow() {
  const row = document.createElement('div');
  row.className = 'ingredient-row';
  row.innerHTML = `
    <input type="text" class="ing-name" placeholder="材料名">
    <input type="number" class="ing-amount" min="0" step="0.1" placeholder="量">
    <input type="text" class="ing-unit" placeholder="単位">
    <button class="btn-remove-row" onclick="removeIngredientRow(this)">×</button>
  `;
  document.getElementById('ingredient-rows').appendChild(row);
}

function removeIngredientRow(btn) {
  const rows = document.querySelectorAll('.ingredient-row');
  if (rows.length <= 1) return; // 最低1行は残す
  btn.closest('.ingredient-row').remove();
}

// ---- レシピ保存 ----

function saveRecipe() {
  const name = document.getElementById('recipe-name').value.trim();
  const baseServings = parseFloat(document.getElementById('base-servings').value);

  if (!name) {
    alert('レシピ名を入力してください');
    return;
  }
  if (!baseServings || baseServings <= 0) {
    alert('基準人数を正しく入力してください');
    return;
  }

  const ingredientRows = document.querySelectorAll('.ingredient-row');
  const ingredients = [];
  for (const row of ingredientRows) {
    const ingName = row.querySelector('.ing-name').value.trim();
    const amount = parseFloat(row.querySelector('.ing-amount').value);
    const unit = row.querySelector('.ing-unit').value.trim();
    if (ingName && !isNaN(amount) && amount >= 0) {
      ingredients.push({ name: ingName, amount, unit });
    }
  }

  if (ingredients.length === 0) {
    alert('材料を1つ以上入力してください');
    return;
  }

  const recipe = {
    id: Date.now().toString(),
    name,
    baseServings,
    ingredients,
    createdAt: new Date().toISOString()
  };

  recipes.unshift(recipe);
  saveRecipes();
  renderRecipeList();
  resetForm();
  alert(`「${name}」を保存しました`);
}

function resetForm() {
  document.getElementById('recipe-name').value = '';
  document.getElementById('base-servings').value = '2';
  const rows = document.getElementById('ingredient-rows');
  rows.innerHTML = `
    <div class="ingredient-row">
      <input type="text" class="ing-name" placeholder="材料名（例：じゃがいも）">
      <input type="number" class="ing-amount" min="0" step="0.1" placeholder="量（例：300）">
      <input type="text" class="ing-unit" placeholder="単位（例：g）">
      <button class="btn-remove-row" onclick="removeIngredientRow(this)">×</button>
    </div>
  `;
}

// ---- 一覧表示 ----

function renderRecipeList() {
  const container = document.getElementById('recipe-list');
  if (recipes.length === 0) {
    container.innerHTML = '<p class="empty-msg">まだレシピがありません</p>';
    return;
  }

  container.innerHTML = recipes.map(r => `
    <div class="recipe-card">
      <div class="recipe-header">
        <span class="recipe-title">${escapeHtml(r.name)}</span>
        <span class="recipe-servings">基準 ${r.baseServings} 人分</span>
      </div>
      <div style="font-size:0.85rem;color:#777;margin-bottom:4px;">
        材料 ${r.ingredients.length} 品目
      </div>
      <div class="recipe-actions">
        <button class="btn-calc" onclick="openModal('${r.id}')">人数換算</button>
        <button class="btn-delete" onclick="deleteRecipe('${r.id}')">削除</button>
      </div>
    </div>
  `).join('');
}

function deleteRecipe(id) {
  if (!confirm('このレシピを削除しますか？')) return;
  recipes = recipes.filter(r => r.id !== id);
  saveRecipes();
  renderRecipeList();
}

// ---- モーダル（換算） ----

function openModal(id) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;
  currentRecipeId = id;

  document.getElementById('modal-title').textContent = `🍽 ${recipe.name}`;
  document.getElementById('target-servings').value = recipe.baseServings;
  calcServings();

  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
  currentRecipeId = null;
}

function calcServings() {
  const recipe = recipes.find(r => r.id === currentRecipeId);
  if (!recipe) return;

  const target = parseFloat(document.getElementById('target-servings').value);
  const container = document.getElementById('calc-result');

  if (!target || target <= 0) {
    container.innerHTML = '<p style="color:#c62828;font-size:0.9rem;">人数を正しく入力してください</p>';
    return;
  }

  const ratio = target / recipe.baseServings;

  const rows = recipe.ingredients.map(ing => {
    const converted = formatAmount(ing.amount * ratio);
    return `
      <tr>
        <td>${escapeHtml(ing.name)}</td>
        <td class="amount-cell">${converted}</td>
        <td>${escapeHtml(ing.unit)}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <p style="font-size:0.85rem;color:#555;margin-bottom:8px;">
      基準 ${recipe.baseServings}人分 → <strong>${target}人分</strong>（×${formatAmount(ratio)}）
    </p>
    <table class="calc-table">
      <thead>
        <tr>
          <th>材料名</th>
          <th>分量</th>
          <th>単位</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ---- ユーティリティ ----

function formatAmount(num) {
  if (num === 0) return '0';
  // 小数点第1位まで表示（末尾の0は省略）
  return parseFloat(num.toFixed(1)).toString();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
