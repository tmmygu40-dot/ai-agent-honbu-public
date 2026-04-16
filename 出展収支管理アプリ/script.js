const STORAGE_KEY = 'exhibition_events';

let events = [];

function loadEvents() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      events = JSON.parse(saved);
    } catch {
      events = [];
    }
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function addEvent() {
  const name = document.getElementById('eventName').value.trim();
  const date = document.getElementById('eventDate').value;
  const sales = parseInt(document.getElementById('sales').value) || 0;
  const expenses = parseInt(document.getElementById('expenses').value) || 0;
  const visitors = parseInt(document.getElementById('visitors').value) || 0;
  const memo = document.getElementById('memo').value.trim();

  if (!name) {
    alert('イベント名を入力してください');
    document.getElementById('eventName').focus();
    return;
  }
  if (!date) {
    alert('開催日を入力してください');
    document.getElementById('eventDate').focus();
    return;
  }

  const event = {
    id: Date.now(),
    name,
    date,
    sales,
    expenses,
    visitors,
    memo
  };

  events.push(event);
  saveEvents();
  clearForm();
  renderList();
  updateSummary();
}

function clearForm() {
  document.getElementById('eventName').value = '';
  document.getElementById('eventDate').value = '';
  document.getElementById('sales').value = '';
  document.getElementById('expenses').value = '';
  document.getElementById('visitors').value = '';
  document.getElementById('memo').value = '';
}

function deleteEvent(id) {
  if (!confirm('このイベントを削除しますか？')) return;
  events = events.filter(e => e.id !== id);
  saveEvents();
  renderList();
  updateSummary();
}

function getRank(profit) {
  if (profit > 10000) return { label: '優良', cls: 'rank-excellent' };
  if (profit > 0) return { label: '黒字', cls: 'rank-good' };
  if (profit === 0) return { label: '収支ゼロ', cls: 'rank-break-even' };
  return { label: '赤字', cls: 'rank-loss' };
}

function formatNum(n) {
  return n.toLocaleString() + '円';
}

function getSortedEvents() {
  const sort = document.getElementById('sortSelect').value;
  const sorted = [...events];
  switch (sort) {
    case 'date-desc':
      return sorted.sort((a, b) => b.date.localeCompare(a.date));
    case 'date-asc':
      return sorted.sort((a, b) => a.date.localeCompare(b.date));
    case 'profit-desc':
      return sorted.sort((a, b) => (b.sales - b.expenses) - (a.sales - a.expenses));
    case 'profit-asc':
      return sorted.sort((a, b) => (a.sales - a.expenses) - (b.sales - b.expenses));
    default:
      return sorted;
  }
}

function renderList() {
  const listEl = document.getElementById('eventList');

  if (events.length === 0) {
    listEl.innerHTML = '<p class="empty-message">まだイベントが登録されていません。<br>上のフォームから登録してください。</p>';
    return;
  }

  const sorted = getSortedEvents();
  listEl.innerHTML = sorted.map(e => {
    const profit = e.sales - e.expenses;
    const profitClass = profit >= 0 ? 'profit-plus' : 'profit-minus';
    const perVisitor = e.visitors > 0 ? Math.round(profit / e.visitors) : null;
    const salesPerVisitor = e.visitors > 0 ? Math.round(e.sales / e.visitors) : null;
    const rank = getRank(profit);

    return `
      <div class="event-card">
        <div class="event-card-header">
          <div>
            <div class="event-name">${escapeHtml(e.name)}</div>
            <div class="event-date">${formatDate(e.date)}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="rank-badge ${rank.cls}">${rank.label}</span>
            <button class="btn-delete" onclick="deleteEvent(${e.id})" title="削除">✕</button>
          </div>
        </div>
        <div class="event-stats">
          <div class="stat-item">
            <div class="stat-label">売上</div>
            <div class="stat-value">${formatNum(e.sales)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">費用</div>
            <div class="stat-value">${formatNum(e.expenses)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">利益</div>
            <div class="stat-value ${profitClass}">${profit >= 0 ? '+' : ''}${formatNum(profit)}</div>
          </div>
        </div>
        <div class="event-extra">
          <div class="stat-item">
            <div class="stat-label">来客数</div>
            <div class="stat-value">${e.visitors > 0 ? e.visitors + '人' : '-'}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">客単価（売上÷来客）</div>
            <div class="stat-value">${salesPerVisitor !== null ? formatNum(salesPerVisitor) : '-'}</div>
          </div>
        </div>
        ${e.memo ? `<div class="event-memo">📝 ${escapeHtml(e.memo)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function updateSummary() {
  const section = document.getElementById('summarySection');
  if (events.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';

  const totalSales = events.reduce((s, e) => s + e.sales, 0);
  const totalExpenses = events.reduce((s, e) => s + e.expenses, 0);
  const totalProfit = totalSales - totalExpenses;

  document.getElementById('totalSales').textContent = formatNum(totalSales);
  document.getElementById('totalExpenses').textContent = formatNum(totalExpenses);
  document.getElementById('totalProfit').textContent = (totalProfit >= 0 ? '+' : '') + formatNum(totalProfit);
  document.getElementById('totalProfit').style.color = totalProfit >= 0 ? '#2e7d32' : '#c62828';
  document.getElementById('totalEvents').textContent = events.length + '回';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 初期化
loadEvents();
renderList();
updateSummary();
