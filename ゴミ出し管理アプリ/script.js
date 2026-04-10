const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

let trashList = [];

function loadData() {
  const saved = localStorage.getItem('trashList');
  if (saved) {
    trashList = JSON.parse(saved);
  }
}

function saveData() {
  localStorage.setItem('trashList', JSON.stringify(trashList));
}

function addTrash() {
  const nameInput = document.getElementById('trash-name');
  const name = nameInput.value.trim();

  if (!name) {
    alert('ゴミの種類を入力してください');
    return;
  }

  const checkboxes = document.querySelectorAll('.days-grid input[type="checkbox"]');
  const selectedDays = [];
  checkboxes.forEach(cb => {
    if (cb.checked) selectedDays.push(Number(cb.value));
  });

  if (selectedDays.length === 0) {
    alert('収集曜日を1つ以上選んでください');
    return;
  }

  trashList.push({ id: Date.now(), name, days: selectedDays });
  saveData();

  nameInput.value = '';
  checkboxes.forEach(cb => cb.checked = false);

  render();
}

function deleteTrash(id) {
  trashList = trashList.filter(t => t.id !== id);
  saveData();
  render();
}

function render() {
  renderToday();
  renderList();
}

function renderToday() {
  const todayIndex = new Date().getDay();
  const todayName = DAY_NAMES[todayIndex];
  document.getElementById('today-heading').textContent = `今日（${todayName}曜日）のゴミ`;

  const todayItems = trashList.filter(t => t.days.includes(todayIndex));
  const container = document.getElementById('today-trash');

  if (todayItems.length === 0) {
    container.innerHTML = '<p class="today-none">今日捨てるゴミはありません</p>';
  } else {
    container.innerHTML = todayItems
      .map(t => `<span class="today-item">${escapeHtml(t.name)}</span>`)
      .join('');
  }
}

function renderList() {
  const container = document.getElementById('trash-list');

  if (trashList.length === 0) {
    container.innerHTML = '<p class="empty-msg">登録されたゴミはありません</p>';
    return;
  }

  container.innerHTML = trashList.map(t => {
    const dayStr = t.days.sort((a, b) => a - b).map(d => DAY_NAMES[d] + '曜').join('・');
    return `
      <div class="trash-card">
        <div class="trash-info">
          <div class="name">${escapeHtml(t.name)}</div>
          <div class="days">${dayStr}</div>
        </div>
        <button class="delete-btn" onclick="deleteTrash(${t.id})">削除</button>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

loadData();
render();
