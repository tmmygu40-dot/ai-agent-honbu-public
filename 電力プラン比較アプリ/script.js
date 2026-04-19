const STORAGE_KEY = 'denryoku_plans';

let plans = loadPlans();

function loadPlans() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function savePlans() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

function renderPlans() {
  const list = document.getElementById('plansList');
  if (plans.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだプランが登録されていません</p>';
    return;
  }

  list.innerHTML = plans.map((plan, i) => `
    <div class="plan-item">
      <div class="plan-info">
        <div class="plan-name">${escHtml(plan.name)}</div>
        <div class="plan-detail">基本料金 ${plan.basicFee.toFixed(2)}円 ／ 単価 ${plan.unitPrice.toFixed(2)}円/kWh</div>
      </div>
      <button class="btn-delete" onclick="deletePlan(${i})">削除</button>
    </div>
  `).join('');
}

function deletePlan(index) {
  plans.splice(index, 1);
  savePlans();
  renderPlans();
  clearResults();
}

function addPlan() {
  const name = document.getElementById('planName').value.trim();
  const basicFee = parseFloat(document.getElementById('basicFee').value);
  const unitPrice = parseFloat(document.getElementById('unitPrice').value);

  if (!name) {
    alert('プラン名を入力してください');
    return;
  }
  if (isNaN(basicFee) || basicFee < 0) {
    alert('基本料金を正しく入力してください');
    return;
  }
  if (isNaN(unitPrice) || unitPrice < 0) {
    alert('単価を正しく入力してください');
    return;
  }

  plans.push({ name, basicFee, unitPrice });
  savePlans();
  renderPlans();

  document.getElementById('planName').value = '';
  document.getElementById('basicFee').value = '';
  document.getElementById('unitPrice').value = '';
  clearResults();
}

function calculate() {
  const usageInput = document.getElementById('usage').value;
  const usage = parseFloat(usageInput);

  if (isNaN(usage) || usage < 0) {
    alert('月間使用量を正しく入力してください');
    return;
  }
  if (plans.length === 0) {
    alert('プランを1件以上登録してください');
    return;
  }

  const results = plans.map(plan => ({
    name: plan.name,
    total: plan.basicFee + plan.unitPrice * usage,
    basicFee: plan.basicFee,
    unitPrice: plan.unitPrice,
  }));

  results.sort((a, b) => a.total - b.total);
  const minTotal = results[0].total;

  const tbody = results.map((r, i) => {
    const isBest = r.total === minTotal;
    return `
      <tr class="${isBest ? 'best' : ''}">
        <td>${escHtml(r.name)}${isBest ? '<span class="best-badge">最安</span>' : ''}</td>
        <td>${r.basicFee.toFixed(2)}円</td>
        <td>${r.unitPrice.toFixed(2)}円</td>
        <td class="amount">${Math.round(r.total).toLocaleString()}円</td>
      </tr>
    `;
  }).join('');

  const table = `
    <table class="result-table">
      <thead>
        <tr>
          <th>プラン名</th>
          <th>基本料金</th>
          <th>単価</th>
          <th>月額合計</th>
        </tr>
      </thead>
      <tbody>${tbody}</tbody>
    </table>
    <p style="font-size:0.8rem;color:#999;margin-top:8px;">使用量：${usage}kWh ／ 月額合計 = 基本料金 + 単価 × 使用量</p>
  `;

  const section = document.getElementById('resultsSection');
  document.getElementById('resultsTable').innerHTML = table;
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearResults() {
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('resultsTable').innerHTML = '';
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.getElementById('addPlanBtn').addEventListener('click', addPlan);
document.getElementById('calcBtn').addEventListener('click', calculate);

document.getElementById('usage').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') calculate();
});

renderPlans();
