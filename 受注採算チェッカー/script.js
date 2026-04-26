const STORAGE_KEY = 'juchu_sangan_checker';

let projects = [];
let editingId = null;
let currentFilter = 'all';

function loadProjects() {
  const data = localStorage.getItem(STORAGE_KEY);
  projects = data ? JSON.parse(data) : [];
}

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function getRiskLevel(grossRate) {
  if (grossRate <= 0) return 'danger';
  if (grossRate < 10) return 'warning';
  return 'safe';
}

function getRiskLabel(level) {
  if (level === 'danger') return '赤字';
  if (level === 'warning') return '要注意';
  return '安全';
}

function formatMoney(num) {
  return num.toLocaleString('ja-JP') + '円';
}

function addOrUpdateProject() {
  const name = document.getElementById('projectName').value.trim();
  const sell = parseFloat(document.getElementById('sellPrice').value);
  const cost = parseFloat(document.getElementById('costPrice').value);
  const memo = document.getElementById('memo').value.trim();

  if (!name) {
    alert('案件名を入力してください');
    return;
  }
  if (isNaN(sell) || sell < 0) {
    alert('売価を正しく入力してください');
    return;
  }
  if (isNaN(cost) || cost < 0) {
    alert('原価を正しく入力してください');
    return;
  }

  const grossProfit = sell - cost;
  const grossRate = sell > 0 ? (grossProfit / sell) * 100 : -Infinity;
  const riskLevel = getRiskLevel(grossRate);

  if (editingId !== null) {
    const idx = projects.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      projects[idx] = { ...projects[idx], name, sell, cost, memo, grossProfit, grossRate, riskLevel };
    }
    editingId = null;
    document.getElementById('addBtn').textContent = '登録する';
    document.getElementById('cancelBtn').style.display = 'none';
  } else {
    const project = {
      id: Date.now(),
      name,
      sell,
      cost,
      memo,
      grossProfit,
      grossRate,
      riskLevel,
      createdAt: new Date().toLocaleDateString('ja-JP')
    };
    projects.push(project);
  }

  saveProjects();
  clearForm();
  render();
}

function clearForm() {
  document.getElementById('projectName').value = '';
  document.getElementById('sellPrice').value = '';
  document.getElementById('costPrice').value = '';
  document.getElementById('memo').value = '';
}

function cancelEdit() {
  editingId = null;
  clearForm();
  document.getElementById('addBtn').textContent = '登録する';
  document.getElementById('cancelBtn').style.display = 'none';
}

function editProject(id) {
  const p = projects.find(p => p.id === id);
  if (!p) return;

  editingId = id;
  document.getElementById('projectName').value = p.name;
  document.getElementById('sellPrice').value = p.sell;
  document.getElementById('costPrice').value = p.cost;
  document.getElementById('memo').value = p.memo || '';
  document.getElementById('addBtn').textContent = '更新する';
  document.getElementById('cancelBtn').style.display = 'block';

  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

function deleteProject(id) {
  if (!confirm('この案件を削除しますか？')) return;
  projects = projects.filter(p => p.id !== id);
  saveProjects();
  render();
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderList();
}

function renderSummary() {
  const total = projects.length;
  const danger = projects.filter(p => p.riskLevel === 'danger').length;
  const warning = projects.filter(p => p.riskLevel === 'warning').length;
  const safe = projects.filter(p => p.riskLevel === 'safe').length;

  document.getElementById('totalCount').textContent = total;
  document.getElementById('dangerCount').textContent = danger;
  document.getElementById('warningCount').textContent = warning;
  document.getElementById('safeCount').textContent = safe;

  const summarySection = document.getElementById('summarySection');
  const filterSection = document.getElementById('filterSection');

  if (total > 0) {
    summarySection.style.display = 'block';
    filterSection.style.display = 'block';
  } else {
    summarySection.style.display = 'none';
    filterSection.style.display = 'none';
  }
}

function renderList() {
  const list = document.getElementById('projectList');

  let filtered = projects;
  if (currentFilter !== 'all') {
    filtered = projects.filter(p => p.riskLevel === currentFilter);
  }

  // 赤字→要注意→安全の順にソート
  const order = { danger: 0, warning: 1, safe: 2 };
  filtered = [...filtered].sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-message">' +
      (projects.length === 0 ? '案件を登録してください' : 'この条件の案件はありません') +
      '</div>';
    return;
  }

  list.innerHTML = filtered.map(p => {
    const rateDisplay = p.sell > 0 ? p.grossRate.toFixed(1) + '%' : '-';
    const profitClass = p.grossProfit >= 0 ? 'profit' : 'loss';
    const rateClass = p.riskLevel;

    return `
      <div class="project-card ${p.riskLevel}">
        <div class="card-header">
          <span class="project-name">${escapeHtml(p.name)}</span>
          <span class="risk-badge ${p.riskLevel}">${getRiskLabel(p.riskLevel)}</span>
        </div>
        <div class="card-numbers">
          <div class="number-item">
            <span class="number-label">売価</span>
            <span class="number-value">${formatMoney(p.sell)}</span>
          </div>
          <div class="number-item">
            <span class="number-label">原価</span>
            <span class="number-value">${formatMoney(p.cost)}</span>
          </div>
          <div class="number-item">
            <span class="number-label">粗利率</span>
            <span class="number-value gross-rate ${rateClass}">${rateDisplay}</span>
          </div>
        </div>
        <div class="card-numbers">
          <div class="number-item" style="grid-column: 1 / -1; text-align: left;">
            <span class="number-label">粗利益</span>
            <span class="number-value ${profitClass}">${formatMoney(p.grossProfit)}</span>
          </div>
        </div>
        ${p.memo ? `<div class="card-memo">📝 ${escapeHtml(p.memo)}</div>` : ''}
        <div class="card-actions">
          <button class="btn-edit" onclick="editProject(${p.id})">編集</button>
          <button class="btn-delete" onclick="deleteProject(${p.id})">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function render() {
  renderSummary();
  renderList();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 初期化
loadProjects();
render();
