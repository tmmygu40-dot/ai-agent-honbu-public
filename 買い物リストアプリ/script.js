const STORAGE_KEY = 'shopping_list';

const itemInput = document.getElementById('itemInput');
const addBtn = document.getElementById('addBtn');
const itemList = document.getElementById('itemList');
const countLabel = document.getElementById('countLabel');
const clearCheckedBtn = document.getElementById('clearCheckedBtn');
const emptyMsg = document.getElementById('emptyMsg');

let items = load();

render();

addBtn.addEventListener('click', addItem);
itemInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItem();
});
clearCheckedBtn.addEventListener('click', clearChecked);

function addItem() {
  const text = itemInput.value.trim();
  if (!text) return;
  items.push({ id: Date.now(), text, checked: false });
  save();
  render();
  itemInput.value = '';
  itemInput.focus();
}

function toggleItem(id) {
  const item = items.find(i => i.id === id);
  if (item) item.checked = !item.checked;
  save();
  render();
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  save();
  render();
}

function clearChecked() {
  items = items.filter(i => !i.checked);
  save();
  render();
}

function render() {
  itemList.innerHTML = '';

  items.forEach(item => {
    const li = document.createElement('li');
    if (item.checked) li.classList.add('checked');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = item.checked;
    checkbox.addEventListener('change', () => toggleItem(item.id));

    const span = document.createElement('span');
    span.className = 'item-text';
    span.textContent = item.text;

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = '×';
    delBtn.setAttribute('aria-label', '削除');
    delBtn.addEventListener('click', () => deleteItem(item.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    itemList.appendChild(li);
  });

  countLabel.textContent = `${items.length}件`;
  emptyMsg.classList.toggle('show', items.length === 0);
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}
