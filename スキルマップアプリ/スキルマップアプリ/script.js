let staff = [];
let skills = [];
let checkMap = {}; // checkMap[staffId][skillId] = true/false

function loadData() {
  staff = JSON.parse(localStorage.getItem('sm_staff') || '[]');
  skills = JSON.parse(localStorage.getItem('sm_skills') || '[]');
  checkMap = JSON.parse(localStorage.getItem('sm_checkMap') || '{}');
}

function saveData() {
  localStorage.setItem('sm_staff', JSON.stringify(staff));
  localStorage.setItem('sm_skills', JSON.stringify(skills));
  localStorage.setItem('sm_checkMap', JSON.stringify(checkMap));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function addStaff() {
  const input = document.getElementById('staffInput');
  const name = input.value.trim();
  if (!name) return;
  if (staff.some(s => s.name === name)) {
    alert('同じ名前のスタッフが既に存在します');
    return;
  }
  const id = generateId();
  staff.push({ id, name });
  if (!checkMap[id]) checkMap[id] = {};
  input.value = '';
  saveData();
  render();
}

function deleteStaff(id) {
  staff = staff.filter(s => s.id !== id);
  delete checkMap[id];
  saveData();
  render();
}

function addSkill() {
  const input = document.getElementById('skillInput');
  const name = input.value.trim();
  if (!name) return;
  if (skills.some(s => s.name === name)) {
    alert('同じ名前のスキルが既に存在します');
    return;
  }
  const id = generateId();
  skills.push({ id, name });
  input.value = '';
  saveData();
  render();
}

function deleteSkill(id) {
  skills = skills.filter(s => s.id !== id);
  staff.forEach(st => {
    if (checkMap[st.id]) delete checkMap[st.id][id];
  });
  saveData();
  render();
}

function toggleCheck(staffId, skillId) {
  if (!checkMap[staffId]) checkMap[staffId] = {};
  checkMap[staffId][skillId] = !checkMap[staffId][skillId];
  saveData();
  renderMap();
}

function renderTags(containerId, items, deleteFunc) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.innerHTML = `${item.name}<button class="del-btn" onclick="${deleteFunc}('${item.id}')" title="削除">×</button>`;
    container.appendChild(tag);
  });
}

function renderMap() {
  const headerRow = document.getElementById('headerRow');
  const mapBody = document.getElementById('mapBody');
  const summaryBar = document.getElementById('summaryBar');

  headerRow.innerHTML = '';
  mapBody.innerHTML = '';
  summaryBar.innerHTML = '';

  if (staff.length === 0 || skills.length === 0) {
    mapBody.innerHTML = `<tr><td colspan="${skills.length + 1}" class="empty-msg">スタッフとスキルを登録するとマップが表示されます</td></tr>`;
    if (staff.length === 0 && skills.length === 0) {
      headerRow.innerHTML = '<th>スタッフ / スキル</th>';
    }
    return;
  }

  // Header
  const thStaff = document.createElement('th');
  thStaff.textContent = 'スタッフ / スキル';
  headerRow.appendChild(thStaff);
  skills.forEach(sk => {
    const th = document.createElement('th');
    th.textContent = sk.name;
    headerRow.appendChild(th);
  });

  // Body
  staff.forEach(st => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = st.name;
    tr.appendChild(tdName);

    let doneCount = 0;
    skills.forEach(sk => {
      const td = document.createElement('td');
      const checked = checkMap[st.id] && checkMap[st.id][sk.id];
      td.className = 'check-cell' + (checked ? ' done' : '');
      td.textContent = checked ? '✓' : '－';
      td.title = checked ? '習得済み（クリックで解除）' : '未習得（クリックで習得済みに）';
      td.onclick = () => toggleCheck(st.id, sk.id);
      if (checked) doneCount++;
      tr.appendChild(td);
    });
    mapBody.appendChild(tr);

    // Summary per staff
    const pct = skills.length > 0 ? Math.round(doneCount / skills.length * 100) : 0;
    const item = document.createElement('div');
    item.className = 'summary-item';
    item.innerHTML = `${st.name}：<span>${doneCount}/${skills.length}</span>（${pct}%）`;
    summaryBar.appendChild(item);
  });
}

function render() {
  renderTags('staffList', staff, 'deleteStaff');
  renderTags('skillList', skills, 'deleteSkill');
  renderMap();
}

// Enter key support
document.getElementById('staffInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addStaff();
});
document.getElementById('skillInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addSkill();
});

loadData();
render();
