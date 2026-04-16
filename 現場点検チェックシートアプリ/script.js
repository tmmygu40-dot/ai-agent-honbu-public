const STORAGE_KEY = 'inspection_checklist';

let items = [];

function loadFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      items = JSON.parse(saved);
    } catch {
      items = [];
    }
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function render() {
  const list = document.getElementById('checklist');
  const emptyMsg = document.getElementById('empty-msg');
  const progressText = document.getElementById('progress-text');

  list.innerHTML = '';

  if (items.length === 0) {
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
  }

  const checkedCount = items.filter(i => i.checked).length;
  progressText.textContent = `${checkedCount} / ${items.length} 完了`;

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'check-item' + (item.checked ? ' checked' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', () => toggleItem(index));

    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = item.text;
    label.addEventListener('click', () => toggleItem(index));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = '削除';
    deleteBtn.addEventListener('click', () => deleteItem(index));

    li.appendChild(checkbox);
    li.appendChild(label);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

function addItem() {
  const input = document.getElementById('item-input');
  const text = input.value.trim();
  if (!text) return;

  items.push({ text, checked: false });
  saveToStorage();
  render();
  input.value = '';
  input.focus();
}

function toggleItem(index) {
  items[index].checked = !items[index].checked;
  saveToStorage();
  render();
}

function deleteItem(index) {
  items.splice(index, 1);
  saveToStorage();
  render();
}

function resetAll() {
  if (items.length === 0) return;
  items = items.map(item => ({ ...item, checked: false }));
  saveToStorage();
  render();
}

function clearAll() {
  if (items.length === 0) return;
  if (!confirm('全項目を削除しますか？')) return;
  items = [];
  saveToStorage();
  render();
}

document.getElementById('item-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItem();
});

loadFromStorage();
render();
