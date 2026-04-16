const DEFAULT_ITEMS = [
  { id: 'default-1', label: '玄関の鍵', custom: false },
  { id: 'default-2', label: 'ガスの元栓', custom: false },
  { id: 'default-3', label: '電気（照明）', custom: false },
  { id: 'default-4', label: '窓の鍵', custom: false },
  { id: 'default-5', label: '水道（蛇口）', custom: false },
];

const STORAGE_KEY = 'odekake-checker';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(items, checked) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, checked }));
}

let state = { items: [], checked: {} };

function init() {
  const saved = loadState();
  if (saved) {
    state.items = saved.items;
    state.checked = saved.checked || {};
  } else {
    state.items = DEFAULT_ITEMS.map(i => ({ ...i }));
    state.checked = {};
  }
  render();
}

function render() {
  const list = document.getElementById('check-list');
  list.innerHTML = '';

  state.items.forEach(item => {
    const isChecked = !!state.checked[item.id];
    const li = document.createElement('li');
    li.className = 'check-item' + (isChecked ? ' checked' : '');
    li.dataset.id = item.id;

    const icon = document.createElement('span');
    icon.className = 'check-icon';
    icon.textContent = isChecked ? '✓' : '';

    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = item.label;

    li.appendChild(icon);
    li.appendChild(label);

    if (item.custom) {
      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = '×';
      delBtn.setAttribute('aria-label', '削除');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteItem(item.id);
      });
      li.appendChild(delBtn);
    }

    li.addEventListener('click', () => toggleCheck(item.id));
    list.appendChild(li);
  });

  updateBanner();
}

function toggleCheck(id) {
  state.checked[id] = !state.checked[id];
  saveState(state.items, state.checked);
  render();
}

function updateBanner() {
  const banner = document.getElementById('all-done-banner');
  const allDone = state.items.length > 0 && state.items.every(i => state.checked[i.id]);
  if (allDone) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function resetChecks() {
  state.checked = {};
  saveState(state.items, state.checked);
  render();
}

function addItem(label) {
  const trimmed = label.trim();
  if (!trimmed) return;
  const id = 'custom-' + Date.now();
  state.items.push({ id, label: trimmed, custom: true });
  saveState(state.items, state.checked);
  render();
}

function deleteItem(id) {
  state.items = state.items.filter(i => i.id !== id);
  delete state.checked[id];
  saveState(state.items, state.checked);
  render();
}

// イベント設定
document.getElementById('reset-btn').addEventListener('click', resetChecks);

document.getElementById('add-btn').addEventListener('click', () => {
  const input = document.getElementById('new-item-input');
  addItem(input.value);
  input.value = '';
  input.focus();
});

document.getElementById('new-item-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const input = document.getElementById('new-item-input');
    addItem(input.value);
    input.value = '';
  }
});

init();
