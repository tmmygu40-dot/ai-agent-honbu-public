const STORAGE_KEY = 'tabi_shiori_data';

const categories = ['spots', 'food', 'shopping'];

let data = {
  tripName: '',
  items: {
    spots: [],
    food: [],
    shopping: []
  }
};

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      data = JSON.parse(saved);
    } catch (e) {
      data = { tripName: '', items: { spots: [], food: [], shopping: [] } };
    }
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function renderTripName() {
  const input = document.getElementById('tripName');
  if (data.tripName) {
    input.value = data.tripName;
    document.querySelector('h1').textContent = '✈ ' + data.tripName;
  }
}

function renderList(category) {
  const list = document.getElementById('list-' + category);
  const items = data.items[category];
  list.innerHTML = '';

  if (items.length === 0) {
    list.innerHTML = '<li class="empty-msg">まだ何もありません</li>';
    updateProgress();
    return;
  }

  items.forEach((item, index) => {
    const li = document.createElement('li');
    if (item.checked) li.classList.add('checked');

    const checkBtn = document.createElement('button');
    checkBtn.className = 'check-btn' + (item.checked ? ' checked' : '');
    checkBtn.textContent = item.checked ? '✓' : '';
    checkBtn.title = item.checked ? 'チェックを外す' : 'チェックする';
    checkBtn.addEventListener('click', () => toggleCheck(category, index));

    const textDiv = document.createElement('div');
    textDiv.className = 'item-text';

    const nameSpan = document.createElement('div');
    nameSpan.className = 'item-name';
    nameSpan.textContent = item.name;
    textDiv.appendChild(nameSpan);

    if (item.note) {
      const noteSpan = document.createElement('div');
      noteSpan.className = 'item-note';
      noteSpan.textContent = item.note;
      textDiv.appendChild(noteSpan);
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = '削除';
    deleteBtn.addEventListener('click', () => deleteItem(category, index));

    li.appendChild(checkBtn);
    li.appendChild(textDiv);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });

  updateProgress();
}

function renderAll() {
  renderTripName();
  categories.forEach(cat => renderList(cat));
}

function addItem(category) {
  const nameInput = document.getElementById('input-' + category);
  const noteInput = document.getElementById('note-' + category);
  const name = nameInput.value.trim();
  if (!name) return;

  data.items[category].push({
    name: name,
    note: noteInput.value.trim(),
    checked: false
  });
  saveData();
  nameInput.value = '';
  noteInput.value = '';
  nameInput.focus();
  renderList(category);
}

function toggleCheck(category, index) {
  data.items[category][index].checked = !data.items[category][index].checked;
  saveData();
  renderList(category);
}

function deleteItem(category, index) {
  data.items[category].splice(index, 1);
  saveData();
  renderList(category);
}

function updateProgress() {
  const area = document.getElementById('progressArea');
  let total = 0;
  let checked = 0;
  categories.forEach(cat => {
    total += data.items[cat].length;
    checked += data.items[cat].filter(i => i.checked).length;
  });
  if (total === 0) {
    area.textContent = '';
  } else {
    area.textContent = `チェック済み: ${checked} / ${total}件`;
  }
}

function clearChecked() {
  let removed = 0;
  categories.forEach(cat => {
    const before = data.items[cat].length;
    data.items[cat] = data.items[cat].filter(i => !i.checked);
    removed += before - data.items[cat].length;
  });
  if (removed === 0) return;
  saveData();
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  renderList(activeTab);
  updateProgress();
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// Add buttons
document.querySelectorAll('.add-btn').forEach(btn => {
  btn.addEventListener('click', () => addItem(btn.dataset.category));
});

// Enter key on inputs
categories.forEach(cat => {
  const nameInput = document.getElementById('input-' + cat);
  const noteInput = document.getElementById('note-' + cat);
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem(cat);
  });
  noteInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addItem(cat);
  });
});

// Trip name save
document.getElementById('saveTripName').addEventListener('click', () => {
  const val = document.getElementById('tripName').value.trim();
  data.tripName = val;
  saveData();
  if (val) {
    document.querySelector('h1').textContent = '✈ ' + val;
  } else {
    document.querySelector('h1').textContent = '✈ 旅のしおり';
  }
});

document.getElementById('tripName').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('saveTripName').click();
});

// Clear checked
document.getElementById('clearChecked').addEventListener('click', clearChecked);

// Init
loadData();
renderAll();
