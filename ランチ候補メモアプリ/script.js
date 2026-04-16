const STORAGE_KEY = 'lunch_shops';

let shops = [];
let filtered = null; // null = フィルター未適用

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    shops = raw ? JSON.parse(raw) : [];
  } catch {
    shops = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shops));
}

function addShop() {
  const name = document.getElementById('name').value.trim();
  const genre = document.getElementById('genre').value;
  const budget = parseInt(document.getElementById('budget').value, 10);
  const minPeople = parseInt(document.getElementById('minPeople').value, 10) || 1;
  const maxPeople = parseInt(document.getElementById('maxPeople').value, 10) || 1;
  const memo = document.getElementById('memo').value.trim();

  if (!name) {
    alert('店名を入力してください');
    return;
  }
  if (!genre) {
    alert('ジャンルを選択してください');
    return;
  }

  const shop = {
    id: Date.now(),
    name,
    genre,
    budget: isNaN(budget) ? null : budget,
    minPeople,
    maxPeople: Math.max(minPeople, maxPeople),
    memo
  };

  shops.push(shop);
  save();
  clearForm();
  filtered = null;
  clearFilterUI();
  render();
}

function clearForm() {
  document.getElementById('name').value = '';
  document.getElementById('genre').value = '';
  document.getElementById('budget').value = '';
  document.getElementById('minPeople').value = '1';
  document.getElementById('maxPeople').value = '4';
  document.getElementById('memo').value = '';
}

function deleteShop(id) {
  shops = shops.filter(s => s.id !== id);
  save();
  if (filtered !== null) {
    filtered = filtered.filter(s => s.id !== id);
  }
  render();
}

function applyFilter() {
  const genre = document.getElementById('filterGenre').value;
  const budgetMax = parseInt(document.getElementById('filterBudget').value, 10);
  const people = parseInt(document.getElementById('filterPeople').value, 10);

  filtered = shops.filter(shop => {
    if (genre && shop.genre !== genre) return false;
    if (!isNaN(budgetMax) && shop.budget !== null && shop.budget > budgetMax) return false;
    if (!isNaN(people) && people > 0) {
      if (people < shop.minPeople || people > shop.maxPeople) return false;
    }
    return true;
  });

  render();
}

function clearFilter() {
  filtered = null;
  clearFilterUI();
  render();
}

function clearFilterUI() {
  document.getElementById('filterGenre').value = '';
  document.getElementById('filterBudget').value = '';
  document.getElementById('filterPeople').value = '';
}

function render() {
  const list = document.getElementById('shopList');
  const countLabel = document.getElementById('countLabel');
  const target = filtered !== null ? filtered : shops;

  countLabel.textContent = target.length + '件';

  if (target.length === 0) {
    list.innerHTML = '<p class="empty-msg">' +
      (filtered !== null ? '条件に合うお店がありません' : '登録されているお店がありません') +
      '</p>';
    return;
  }

  list.innerHTML = target.map(shop => {
    const budgetText = shop.budget !== null ? shop.budget.toLocaleString() + '円' : '未設定';
    const peopleText = shop.minPeople === shop.maxPeople
      ? shop.minPeople + '人'
      : shop.minPeople + '〜' + shop.maxPeople + '人';

    return `
      <div class="shop-card">
        <div class="shop-card-top">
          <span class="shop-name">${escHtml(shop.name)}</span>
          <button class="btn-delete" onclick="deleteShop(${shop.id})" title="削除">✕</button>
        </div>
        <div class="shop-tags">
          <span class="tag tag-genre">${escHtml(shop.genre)}</span>
          <span class="tag tag-budget">💴 ${budgetText}</span>
          <span class="tag tag-people">👥 ${peopleText}</span>
        </div>
        ${shop.memo ? `<p class="shop-memo">📝 ${escHtml(shop.memo)}</p>` : ''}
      </div>
    `;
  }).join('');
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.getElementById('addBtn').addEventListener('click', addShop);
document.getElementById('filterBtn').addEventListener('click', applyFilter);
document.getElementById('clearFilterBtn').addEventListener('click', clearFilter);

load();
render();
