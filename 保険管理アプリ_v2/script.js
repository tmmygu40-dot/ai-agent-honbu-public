const STORAGE_KEY = 'insurances_v2';

let insurances = [];

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    insurances = saved ? JSON.parse(saved) : [];
  } catch (e) {
    insurances = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(insurances));
}

function formatNumber(num) {
  if (!num && num !== 0) return '—';
  return Number(num).toLocaleString('ja-JP') + '円';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

function getRenewalStatus(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renewal = new Date(dateStr);
  const diffDays = Math.ceil((renewal - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { type: 'overdue', days: Math.abs(diffDays) };
  if (diffDays <= 90) return { type: 'soon', days: diffDays };
  return null;
}

function renderSummary() {
  const count = insurances.length;
  const totalMonthly = insurances.reduce((sum, ins) => sum + (Number(ins.monthlyPremium) || 0), 0);
  document.getElementById('totalCount').textContent = count + '件';
  document.getElementById('totalMonthly').textContent = totalMonthly.toLocaleString('ja-JP') + '円';
  document.getElementById('totalYearly').textContent = (totalMonthly * 12).toLocaleString('ja-JP') + '円';
}

function renderList(filter = '') {
  const list = document.getElementById('insuranceList');
  const query = filter.trim().toLowerCase();
  const filtered = query
    ? insurances.filter(ins =>
        ins.insuranceName.toLowerCase().includes(query) ||
        ins.holderName.toLowerCase().includes(query)
      )
    : insurances;

  if (filtered.length === 0) {
    list.innerHTML = '<p class="empty-message">' +
      (query ? '検索結果がありません' : 'まだ保険が登録されていません') +
      '</p>';
    return;
  }

  list.innerHTML = filtered.map(ins => {
    const status = getRenewalStatus(ins.renewalDate);
    let cardClass = 'insurance-card';
    let alertHtml = '';
    if (status) {
      if (status.type === 'overdue') {
        cardClass += ' renewal-overdue';
        alertHtml = `<span class="renewal-alert overdue">更新日を${status.days}日過ぎています</span>`;
      } else {
        cardClass += ' renewal-soon';
        alertHtml = `<span class="renewal-alert soon">更新まで${status.days}日</span>`;
      }
    }

    return `
      <div class="${cardClass}">
        <div class="card-header">
          <div>
            <div class="card-title">${escapeHtml(ins.insuranceName)}</div>
            ${alertHtml}
          </div>
          ${ins.insuranceType ? `<span class="card-type-badge">${escapeHtml(ins.insuranceType)}</span>` : ''}
        </div>
        <div class="card-body">
          <div class="card-item">
            <span class="card-item-label">加入者</span>
            <span class="card-item-value">${escapeHtml(ins.holderName)}</span>
          </div>
          <div class="card-item">
            <span class="card-item-label">月払い額</span>
            <span class="card-item-value">${formatNumber(ins.monthlyPremium)}</span>
          </div>
          <div class="card-item">
            <span class="card-item-label">保障額</span>
            <span class="card-item-value">${formatNumber(ins.coverage)}</span>
          </div>
          <div class="card-item">
            <span class="card-item-label">更新日</span>
            <span class="card-item-value">${formatDate(ins.renewalDate)}</span>
          </div>
        </div>
        ${ins.memo ? `<div class="card-memo">📝 ${escapeHtml(ins.memo)}</div>` : ''}
        <div class="card-footer">
          <button class="btn-delete" onclick="deleteInsurance('${ins.id}')">削除</button>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function deleteInsurance(id) {
  if (!confirm('この保険を削除しますか？')) return;
  insurances = insurances.filter(ins => ins.id !== id);
  saveData();
  renderSummary();
  renderList(document.getElementById('searchInput').value);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

document.getElementById('insuranceForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const ins = {
    id: generateId(),
    insuranceName: document.getElementById('insuranceName').value.trim(),
    holderName: document.getElementById('holderName').value.trim(),
    coverage: document.getElementById('coverage').value,
    monthlyPremium: document.getElementById('monthlyPremium').value,
    renewalDate: document.getElementById('renewalDate').value,
    insuranceType: document.getElementById('insuranceType').value,
    memo: document.getElementById('memo').value.trim(),
    createdAt: new Date().toISOString()
  };

  insurances.push(ins);
  saveData();
  renderSummary();
  renderList(document.getElementById('searchInput').value);
  this.reset();

  // 登録完了フィードバック
  const btn = this.querySelector('.btn-primary');
  btn.textContent = '登録しました！';
  btn.style.background = '#388e3c';
  setTimeout(() => {
    btn.textContent = '登録する';
    btn.style.background = '';
  }, 1500);
});

document.getElementById('searchInput').addEventListener('input', function () {
  renderList(this.value);
});

// 初期化
loadData();
renderSummary();
renderList();
