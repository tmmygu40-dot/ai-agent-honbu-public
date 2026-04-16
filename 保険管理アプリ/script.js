const STORAGE_KEY = 'insurance_list';

function loadInsurances() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveInsurances(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function addInsurance() {
  const company = document.getElementById('company').value.trim();
  const type = document.getElementById('type').value.trim();
  const premium = document.getElementById('premium').value.trim();
  const premiumUnit = document.getElementById('premiumUnit').value;
  const renewDate = document.getElementById('renewDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!company || !type || !premium || !renewDate) {
    alert('保険会社名・種類・保険料・更新日は必須です');
    return;
  }

  const insurance = {
    id: Date.now(),
    company,
    type,
    premium: Number(premium),
    premiumUnit,
    renewDate,
    memo
  };

  const list = loadInsurances();
  list.push(insurance);
  saveInsurances(list);

  clearForm();
  render();
}

function deleteInsurance(id) {
  const list = loadInsurances().filter(i => i.id !== id);
  saveInsurances(list);
  render();
}

function clearForm() {
  document.getElementById('company').value = '';
  document.getElementById('type').value = '';
  document.getElementById('premium').value = '';
  document.getElementById('premiumUnit').value = '月額';
  document.getElementById('renewDate').value = '';
  document.getElementById('memo').value = '';
}

function getDaysUntilRenew(renewDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const renew = new Date(renewDate);
  return Math.floor((renew - today) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatPremium(amount, unit) {
  return `¥${amount.toLocaleString()}（${unit}）`;
}

function calcMonthlyTotal(list) {
  return list.reduce((sum, i) => {
    const monthly = i.premiumUnit === '年額' ? Math.round(i.premium / 12) : i.premium;
    return sum + monthly;
  }, 0);
}

function render() {
  const list = loadInsurances();
  const listEl = document.getElementById('insuranceList');

  // サマリー更新
  document.getElementById('totalCount').textContent = `${list.length}件`;
  document.getElementById('monthlyTotal').textContent = `¥${calcMonthlyTotal(list).toLocaleString()}`;

  const alertItems = list.filter(i => getDaysUntilRenew(i.renewDate) <= 30);
  const alertCount = document.getElementById('alertCount');
  alertCount.textContent = `${alertItems.length}件`;

  if (list.length === 0) {
    listEl.innerHTML = '<p class="empty-message">まだ保険が登録されていません</p>';
    return;
  }

  // 更新日が近い順にソート
  const sorted = [...list].sort((a, b) => new Date(a.renewDate) - new Date(b.renewDate));

  listEl.innerHTML = sorted.map(ins => {
    const days = getDaysUntilRenew(ins.renewDate);
    let cardClass = 'insurance-card';
    let badge = '';

    if (days < 0) {
      cardClass += ' danger';
      badge = `<span class="renew-badge expired">失効済み（${Math.abs(days)}日経過）</span>`;
    } else if (days <= 30) {
      cardClass += ' warning';
      badge = `<span class="renew-badge soon">更新まで${days}日</span>`;
    }

    const memoHtml = ins.memo
      ? `<div class="card-memo">📝 ${escapeHtml(ins.memo)}</div>`
      : '';

    return `
      <div class="${cardClass}">
        <button class="btn-delete" onclick="deleteInsurance(${ins.id})" title="削除">✕</button>
        <div class="card-header">
          <span class="card-title">${escapeHtml(ins.company)}</span>
          <span class="card-type">${escapeHtml(ins.type)}</span>
        </div>
        <div class="card-body">
          <div class="item">
            <span class="item-label">保険料</span>
            <span class="item-value">${formatPremium(ins.premium, ins.premiumUnit)}</span>
          </div>
          <div class="item">
            <span class="item-label">更新日</span>
            <span class="item-value">${formatDate(ins.renewDate)}${badge}</span>
          </div>
        </div>
        ${memoHtml}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 初期表示
render();
