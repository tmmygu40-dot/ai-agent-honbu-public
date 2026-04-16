const STORAGE_KEY = 'nutrition_app_data';

let currentDate = toDateStr(new Date());
let allData = loadData();

function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const today = toDateStr(new Date());
  const label = dateStr === today ? '（今日）' : '';
  return `${y}年${m}月${d}日${label}`;
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
}

function getMeals() {
  return allData[currentDate] || [];
}

function render() {
  document.getElementById('currentDate').textContent = formatDateDisplay(currentDate);

  const meals = getMeals();
  const list = document.getElementById('mealList');
  const emptyMsg = document.getElementById('emptyMsg');

  let totalP = 0, totalF = 0, totalC = 0;
  meals.forEach(m => {
    totalP += m.protein;
    totalF += m.fat;
    totalC += m.carbs;
  });

  document.getElementById('totalProtein').textContent = round(totalP);
  document.getElementById('totalFat').textContent = round(totalF);
  document.getElementById('totalCarbs').textContent = round(totalC);

  list.innerHTML = '';
  if (meals.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  meals.forEach((meal, idx) => {
    const li = document.createElement('li');
    li.className = 'meal-item';
    li.innerHTML = `
      <div class="meal-info">
        <div class="meal-name">${escHtml(meal.name)}</div>
        <div class="meal-nutrients">
          <span class="nutrient-tag p">P ${meal.protein}g</span>
          <span class="nutrient-tag f">F ${meal.fat}g</span>
          <span class="nutrient-tag c">C ${meal.carbs}g</span>
        </div>
      </div>
      <button class="delete-btn" data-idx="${idx}" title="削除">✕</button>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.idx, 10);
      allData[currentDate].splice(i, 1);
      if (allData[currentDate].length === 0) delete allData[currentDate];
      saveData();
      render();
    });
  });
}

function round(val) {
  return Math.round(val * 10) / 10;
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.getElementById('addBtn').addEventListener('click', () => {
  const name = document.getElementById('mealName').value.trim();
  const protein = parseFloat(document.getElementById('protein').value) || 0;
  const fat = parseFloat(document.getElementById('fat').value) || 0;
  const carbs = parseFloat(document.getElementById('carbs').value) || 0;

  if (!name) {
    alert('食事名を入力してください');
    return;
  }

  if (!allData[currentDate]) allData[currentDate] = [];
  allData[currentDate].push({ name, protein, fat, carbs });
  saveData();

  document.getElementById('mealName').value = '';
  document.getElementById('protein').value = '';
  document.getElementById('fat').value = '';
  document.getElementById('carbs').value = '';

  render();
});

document.getElementById('prevDay').addEventListener('click', () => {
  const d = new Date(currentDate);
  d.setDate(d.getDate() - 1);
  currentDate = toDateStr(d);
  render();
});

document.getElementById('nextDay').addEventListener('click', () => {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + 1);
  currentDate = toDateStr(d);
  render();
});

document.getElementById('mealName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('protein').focus();
});

render();
