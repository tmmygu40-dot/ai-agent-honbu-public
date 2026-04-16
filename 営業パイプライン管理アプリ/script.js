const STORAGE_KEY = 'sales_pipeline_deals';

let deals = loadDeals();
let editingId = null;

function loadDeals() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveDeals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatAmount(val) {
  if (!val && val !== 0) return '—';
  return '¥' + Number(val).toLocaleString();
}

function renderSummary() {
  const active = deals.filter(d => d.stage !== '失注');
  const won = deals.filter(d => d.stage === '受注');
  document.getElementById('totalDeals').textContent = deals.length;
  const totalAmt = active.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const wonAmt = won.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  document.getElementById('totalAmount').textContent = '¥' + totalAmt.toLocaleString();
  document.getElementById('wonAmount').textContent = '¥' + wonAmt.toLocaleString();
}

function renderDeals() {
  const filter = document.getElementById('filterStage').value;
  const list = document.getElementById('dealsList');
  const emptyMsg = document.getElementById('emptyMsg');

  const filtered = filter === 'all' ? deals : deals.filter(d => d.stage === filter);

  if (filtered.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = 'block';
  } else {
    emptyMsg.style.display = 'none';
    list.innerHTML = filtered.map(deal => `
      <div class="deal-card stage-${deal.stage}" data-id="${deal.id}">
        <div class="deal-header">
          <span class="deal-client">${escHtml(deal.clientName)}</span>
          <div class="deal-actions">
            <button class="btn-edit" onclick="startEdit('${deal.id}')">編集</button>
            <button class="btn-delete" onclick="deleteDeal('${deal.id}')">削除</button>
          </div>
        </div>
        <div class="deal-meta">
          <span class="stage-badge badge-${deal.stage}">${deal.stage}</span>
          <span class="deal-amount">${formatAmount(deal.amount)}</span>
        </div>
        ${deal.nextAction ? `<div class="deal-next">▶ ${escHtml(deal.nextAction)}</div>` : ''}
        ${deal.actionDate ? `<div class="deal-date">📅 ${deal.actionDate}</div>` : ''}
      </div>
    `).join('');
  }

  renderSummary();
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function resetForm() {
  document.getElementById('dealForm').reset();
  document.getElementById('editId').value = '';
  document.getElementById('formTitle').textContent = '商談を登録する';
  document.getElementById('submitBtn').textContent = '登録する';
  document.getElementById('cancelBtn').style.display = 'none';
  editingId = null;
}

function startEdit(id) {
  const deal = deals.find(d => d.id === id);
  if (!deal) return;
  editingId = id;
  document.getElementById('editId').value = id;
  document.getElementById('clientName').value = deal.clientName;
  document.getElementById('stage').value = deal.stage;
  document.getElementById('amount').value = deal.amount || '';
  document.getElementById('nextAction').value = deal.nextAction || '';
  document.getElementById('actionDate').value = deal.actionDate || '';
  document.getElementById('formTitle').textContent = '商談を編集する';
  document.getElementById('submitBtn').textContent = '更新する';
  document.getElementById('cancelBtn').style.display = 'inline-block';
  document.getElementById('clientName').focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteDeal(id) {
  if (!confirm('この商談を削除しますか？')) return;
  deals = deals.filter(d => d.id !== id);
  saveDeals();
  renderDeals();
}

document.getElementById('dealForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const clientName = document.getElementById('clientName').value.trim();
  const stage = document.getElementById('stage').value;
  const amount = document.getElementById('amount').value;
  const nextAction = document.getElementById('nextAction').value.trim();
  const actionDate = document.getElementById('actionDate').value;

  if (!clientName) return;

  if (editingId) {
    const idx = deals.findIndex(d => d.id === editingId);
    if (idx !== -1) {
      deals[idx] = { ...deals[idx], clientName, stage, amount, nextAction, actionDate };
    }
  } else {
    deals.push({
      id: generateId(),
      clientName,
      stage,
      amount,
      nextAction,
      actionDate,
      createdAt: new Date().toISOString()
    });
  }

  saveDeals();
  resetForm();
  renderDeals();
});

document.getElementById('cancelBtn').addEventListener('click', resetForm);

document.getElementById('filterStage').addEventListener('change', renderDeals);

// 初期表示
renderDeals();
