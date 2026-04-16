const STORAGE_KEY = 'shift_staff_list';

let staffList = loadFromStorage();

const nameInput = document.getElementById('name');
const wageInput = document.getElementById('wage');
const hoursInput = document.getElementById('hours');
const addBtn = document.getElementById('addBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const staffListEl = document.getElementById('staffList');
const totalAmountEl = document.getElementById('totalAmount');
const staffCountEl = document.getElementById('staffCount');

addBtn.addEventListener('click', addStaff);
clearAllBtn.addEventListener('click', clearAll);

nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') wageInput.focus(); });
wageInput.addEventListener('keydown', e => { if (e.key === 'Enter') hoursInput.focus(); });
hoursInput.addEventListener('keydown', e => { if (e.key === 'Enter') addStaff(); });

function addStaff() {
  const name = nameInput.value.trim();
  const wage = parseFloat(wageInput.value);
  const hours = parseFloat(hoursInput.value);

  if (!name) { alert('スタッフ名を入力してください'); nameInput.focus(); return; }
  if (isNaN(wage) || wage < 0) { alert('時給を正しく入力してください'); wageInput.focus(); return; }
  if (isNaN(hours) || hours < 0) { alert('シフト時間を正しく入力してください'); hoursInput.focus(); return; }

  const staff = {
    id: Date.now(),
    name,
    wage,
    hours,
    cost: Math.round(wage * hours)
  };

  staffList.push(staff);
  saveToStorage();
  render();

  nameInput.value = '';
  wageInput.value = '';
  hoursInput.value = '';
  nameInput.focus();
}

function deleteStaff(id) {
  staffList = staffList.filter(s => s.id !== id);
  saveToStorage();
  render();
}

function clearAll() {
  if (staffList.length === 0) return;
  if (!confirm('全スタッフを削除しますか？')) return;
  staffList = [];
  saveToStorage();
  render();
}

function render() {
  const total = staffList.reduce((sum, s) => sum + s.cost, 0);
  totalAmountEl.textContent = '¥' + total.toLocaleString();
  staffCountEl.textContent = `スタッフ ${staffList.length} 名`;

  if (staffList.length === 0) {
    staffListEl.innerHTML = '<p class="empty-msg">スタッフが登録されていません</p>';
    return;
  }

  staffListEl.innerHTML = staffList.map(s => `
    <div class="staff-card">
      <div class="staff-info">
        <div class="staff-name">${escapeHtml(s.name)}</div>
        <div class="staff-detail">時給 ¥${s.wage.toLocaleString()} × ${s.hours}時間</div>
      </div>
      <div class="staff-cost">¥${s.cost.toLocaleString()}</div>
      <button class="delete-btn" data-id="${s.id}" title="削除">✕</button>
    </div>
  `).join('');

  staffListEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteStaff(Number(btn.dataset.id)));
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(staffList));
}

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

render();
