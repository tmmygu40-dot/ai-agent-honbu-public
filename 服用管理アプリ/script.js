const MEDS_KEY = 'fukuyo_meds';
const CHECKED_KEY = 'fukuyo_checked';
const DATE_KEY = 'fukuyo_date';

let meds = [];
let checked = {};

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function loadData() {
  const savedMeds = localStorage.getItem(MEDS_KEY);
  meds = savedMeds ? JSON.parse(savedMeds) : [];

  const today = getTodayString();
  const savedDate = localStorage.getItem(DATE_KEY);

  if (savedDate !== today) {
    // 日付が変わったらチェックをリセット
    checked = {};
    localStorage.setItem(DATE_KEY, today);
    localStorage.setItem(CHECKED_KEY, JSON.stringify(checked));
  } else {
    const savedChecked = localStorage.getItem(CHECKED_KEY);
    checked = savedChecked ? JSON.parse(savedChecked) : {};
  }
}

function saveData() {
  localStorage.setItem(MEDS_KEY, JSON.stringify(meds));
  localStorage.setItem(CHECKED_KEY, JSON.stringify(checked));
  localStorage.setItem(DATE_KEY, getTodayString());
}

function renderAll() {
  const timings = ['朝', '昼', '夜', '就寝前'];
  timings.forEach(timing => {
    const list = document.querySelector(`.med-list[data-timing="${timing}"]`);
    const emptyMsg = list.nextElementSibling;
    list.innerHTML = '';

    const filtered = meds.filter(m => m.timing === timing);
    if (filtered.length === 0) {
      emptyMsg.style.display = 'block';
    } else {
      emptyMsg.style.display = 'none';
      filtered.forEach(med => {
        const li = createMedItem(med);
        list.appendChild(li);
      });
    }
  });
}

function createMedItem(med) {
  const li = document.createElement('li');
  li.className = 'med-item' + (checked[med.id] ? ' checked' : '');

  const checkBox = document.createElement('div');
  checkBox.className = 'check-box' + (checked[med.id] ? ' checked' : '');
  checkBox.addEventListener('click', () => toggleCheck(med.id));

  const nameSpan = document.createElement('span');
  nameSpan.className = 'med-name';
  nameSpan.textContent = med.name;

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '✕';
  deleteBtn.title = '削除';
  deleteBtn.addEventListener('click', () => deleteMed(med.id));

  li.appendChild(checkBox);
  li.appendChild(nameSpan);
  li.appendChild(deleteBtn);
  return li;
}

function toggleCheck(id) {
  checked[id] = !checked[id];
  saveData();
  renderAll();
}

function deleteMed(id) {
  meds = meds.filter(m => m.id !== id);
  delete checked[id];
  saveData();
  renderAll();
}

function addMed() {
  const nameInput = document.getElementById('med-name');
  const timingSelect = document.getElementById('med-timing');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }

  const med = {
    id: Date.now().toString(),
    name: name,
    timing: timingSelect.value
  };

  meds.push(med);
  saveData();
  renderAll();
  nameInput.value = '';
  nameInput.focus();
}

function resetTodayChecked() {
  if (!confirm('今日の服用チェックをすべてリセットしますか？')) return;
  checked = {};
  saveData();
  renderAll();
}

function updateTodayDate() {
  const d = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`;
  document.getElementById('today-date').textContent = dateStr;
}

// 初期化
loadData();
updateTodayDate();
renderAll();

document.getElementById('add-btn').addEventListener('click', addMed);
document.getElementById('med-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addMed();
});
document.getElementById('reset-today-btn').addEventListener('click', resetTodayChecked);
