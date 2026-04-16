const STORAGE_KEY = 'freelance_projects';

let projects = [];
let filterMonth = '';

function loadProjects() {
  const data = localStorage.getItem(STORAGE_KEY);
  projects = data ? JSON.parse(data) : [];
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function getDefaultMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function addProject() {
  const name = document.getElementById('projectName').value.trim();
  const date = document.getElementById('workDate').value;
  const hours = parseFloat(document.getElementById('workHours').value);
  const price = parseInt(document.getElementById('unitPrice').value, 10);

  if (!name) { alert('案件名を入力してください'); return; }
  if (!date) { alert('対象月を選択してください'); return; }
  if (isNaN(hours) || hours <= 0) { alert('作業時間を正しく入力してください'); return; }
  if (isNaN(price) || price <= 0) { alert('単価を正しく入力してください'); return; }

  const project = {
    id: Date.now(),
    name,
    date,
    hours,
    price,
    income: Math.round(hours * price)
  };

  projects.push(project);
  saveProjects();
  clearForm();
  render();
}

function clearForm() {
  document.getElementById('projectName').value = '';
  document.getElementById('workHours').value = '';
  document.getElementById('unitPrice').value = '';
}

function deleteProject(id) {
  projects = projects.filter(p => p.id !== id);
  saveProjects();
  render();
}

function getFilteredProjects() {
  if (!filterMonth) return projects;
  return projects.filter(p => p.date === filterMonth);
}

function render() {
  const filtered = getFilteredProjects();

  // サマリー更新
  const totalIncome = filtered.reduce((sum, p) => sum + p.income, 0);
  const totalHours = filtered.reduce((sum, p) => sum + p.hours, 0);
  document.getElementById('totalIncome').textContent = '¥' + totalIncome.toLocaleString();
  document.getElementById('totalHours').textContent = totalHours.toFixed(1) + 'h';
  document.getElementById('totalCount').textContent = filtered.length + '件';

  // リスト更新
  const list = document.getElementById('projectList');
  const emptyMsg = document.getElementById('emptyMsg');

  // 既存のプロジェクトアイテムを削除
  list.querySelectorAll('.project-item').forEach(el => el.remove());

  if (filtered.length === 0) {
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';

  // 新しい順で表示
  const sorted = [...filtered].sort((a, b) => b.id - a.id);

  sorted.forEach(p => {
    const li = document.createElement('li');
    li.className = 'project-item';

    const [year, month] = p.date.split('-');
    const dateLabel = `${year}年${parseInt(month)}月`;

    li.innerHTML = `
      <div class="project-info">
        <div class="project-name">${escapeHtml(p.name)}</div>
        <div class="project-meta">
          <span>${dateLabel}</span>
          <span>${p.hours}h × ¥${p.price.toLocaleString()}/h</span>
        </div>
      </div>
      <div class="project-income">¥${p.income.toLocaleString()}</div>
      <button class="delete-btn" title="削除" data-id="${p.id}">✕</button>
    `;

    list.appendChild(li);
  });

  list.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteProject(Number(btn.dataset.id)));
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();

  // デフォルト月をセット
  const defaultMonth = getDefaultMonth();
  document.getElementById('workDate').value = defaultMonth;
  document.getElementById('filterMonth').value = defaultMonth;
  filterMonth = defaultMonth;

  document.getElementById('addBtn').addEventListener('click', addProject);

  document.getElementById('filterMonth').addEventListener('change', (e) => {
    filterMonth = e.target.value;
    render();
  });

  document.getElementById('clearFilter').addEventListener('click', () => {
    filterMonth = '';
    document.getElementById('filterMonth').value = '';
    render();
  });

  render();
});
