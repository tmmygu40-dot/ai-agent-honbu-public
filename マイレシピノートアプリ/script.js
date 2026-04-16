const STORAGE_KEY = 'myRecipeNote_recipes';

let recipes = [];
let searchQuery = '';

// ---- データ管理 ----

function loadRecipes() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    recipes = data ? JSON.parse(data) : [];
  } catch {
    recipes = [];
  }
}

function saveRecipes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

// ---- レシピ追加 ----

function addRecipe(name, ingredients, steps, memo) {
  const recipe = {
    id: Date.now(),
    name: name.trim(),
    ingredients: ingredients.trim(),
    steps: steps.trim(),
    memo: memo.trim(),
    createdAt: new Date().toISOString()
  };
  recipes.unshift(recipe);
  saveRecipes();
  return recipe;
}

// ---- レシピ削除 ----

function deleteRecipe(id) {
  recipes = recipes.filter(r => r.id !== id);
  saveRecipes();
}

// ---- 検索 ----

function getFilteredRecipes() {
  if (!searchQuery) return recipes;
  const q = searchQuery.toLowerCase();
  return recipes.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.ingredients.toLowerCase().includes(q) ||
    r.memo.toLowerCase().includes(q)
  );
}

// ---- ハイライト ----

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return escaped.replace(regex, '<mark class="recipe-card-highlight">$1</mark>');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- 描画 ----

function renderRecipes() {
  const list = document.getElementById('recipeList');
  const countEl = document.getElementById('recipeCount');
  const searchCountEl = document.getElementById('searchCount');
  const filtered = getFilteredRecipes();

  countEl.textContent = `${recipes.length}件`;

  if (searchQuery) {
    searchCountEl.textContent = `「${searchQuery}」を含むレシピ：${filtered.length}件`;
  } else {
    searchCountEl.textContent = '';
  }

  if (filtered.length === 0) {
    if (recipes.length === 0) {
      list.innerHTML = '<p class="empty-msg">レシピがまだ登録されていません。<br>上のフォームから登録してください。</p>';
    } else {
      list.innerHTML = '<p class="empty-msg">「' + escapeHtml(searchQuery) + '」を含む食材のレシピが見つかりませんでした。</p>';
    }
    return;
  }

  list.innerHTML = filtered.map(r => {
    const ingredientsPreview = r.ingredients.length > 60
      ? r.ingredients.slice(0, 60) + '…'
      : r.ingredients;
    return `
      <div class="recipe-card" data-id="${r.id}">
        <div class="recipe-card-body">
          <div class="recipe-card-title">${highlight(r.name, searchQuery)}</div>
          <div class="recipe-card-preview">${highlight(ingredientsPreview, searchQuery)}</div>
        </div>
        <div class="recipe-card-actions">
          <button class="btn-delete" data-id="${r.id}">削除</button>
        </div>
      </div>
    `;
  }).join('');

  // カードクリック → 詳細モーダル
  list.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('btn-delete')) return;
      const id = Number(card.dataset.id);
      openModal(id);
    });
  });

  // 削除ボタン
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const recipe = recipes.find(r => r.id === id);
      if (!recipe) return;
      if (confirm(`「${recipe.name}」を削除しますか？`)) {
        deleteRecipe(id);
        renderRecipes();
      }
    });
  });
}

// ---- モーダル ----

function openModal(id) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;

  document.getElementById('modalTitle').textContent = recipe.name;
  document.getElementById('modalIngredients').textContent = recipe.ingredients;
  document.getElementById('modalSteps').textContent = recipe.steps;

  const memoWrap = document.getElementById('modalMemoWrap');
  const modalMemo = document.getElementById('modalMemo');
  if (recipe.memo) {
    modalMemo.textContent = recipe.memo;
    memoWrap.style.display = '';
  } else {
    memoWrap.style.display = 'none';
  }

  document.getElementById('modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// ---- フォーム送信 ----

function handleSave() {
  const name = document.getElementById('recipeName').value;
  const ingredients = document.getElementById('recipeIngredients').value;
  const steps = document.getElementById('recipeSteps').value;
  const memo = document.getElementById('recipeMemo').value;

  if (!name.trim()) {
    alert('料理名を入力してください。');
    document.getElementById('recipeName').focus();
    return;
  }
  if (!ingredients.trim()) {
    alert('材料を入力してください。');
    document.getElementById('recipeIngredients').focus();
    return;
  }
  if (!steps.trim()) {
    alert('作り方を入力してください。');
    document.getElementById('recipeSteps').focus();
    return;
  }

  addRecipe(name, ingredients, steps, memo);

  document.getElementById('recipeName').value = '';
  document.getElementById('recipeIngredients').value = '';
  document.getElementById('recipeSteps').value = '';
  document.getElementById('recipeMemo').value = '';

  renderRecipes();
  document.querySelector('.list-section').scrollIntoView({ behavior: 'smooth' });
}

// ---- 初期化 ----

document.addEventListener('DOMContentLoaded', () => {
  loadRecipes();
  renderRecipes();

  document.getElementById('saveBtn').addEventListener('click', handleSave);

  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderRecipes();
  });

  document.getElementById('clearSearch').addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    searchQuery = '';
    renderRecipes();
  });

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', closeModal);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});
