let items = JSON.parse(localStorage.getItem('butsuryu_items') || '[]');

function save() {
  localStorage.setItem('butsuryu_items', JSON.stringify(items));
}

function calcRisk(stockDays, totalLeadTime) {
  if (stockDays >= totalLeadTime + 5) return 'safe';
  if (stockDays >= totalLeadTime) return 'caution';
  return 'danger';
}

function riskLabel(level) {
  if (level === 'safe') return '安全';
  if (level === 'caution') return '注意';
  return '危険';
}

function addItem() {
  const name = document.getElementById('itemName').value.trim();
  const stock = parseFloat(document.getElementById('stock').value);
  const daily = parseFloat(document.getElementById('dailyUsage').value);
  const normalLead = parseInt(document.getElementById('normalLead').value);
  const delayDays = parseInt(document.getElementById('delayDays').value);

  if (!name) { alert('品目名を入力してください'); return; }
  if (isNaN(stock) || stock < 0) { alert('在庫数を正しく入力してください'); return; }
  if (isNaN(daily) || daily <= 0) { alert('1日消費量を正しく入力してください'); return; }
  if (isNaN(normalLead) || normalLead <= 0) { alert('通常リードタイムを正しく入力してください'); return; }
  if (isNaN(delayDays) || delayDays < 0) { alert('延長日数を正しく入力してください'); return; }

  const stockDays = stock / daily;
  const totalLeadTime = normalLead + delayDays;
  const forwardOrder = delayDays * daily;
  const riskLevel = calcRisk(stockDays, totalLeadTime);

  items.unshift({
    id: Date.now(),
    name,
    stock,
    daily,
    normalLead,
    delayDays,
    stockDays: Math.floor(stockDays * 10) / 10,
    totalLeadTime,
    forwardOrder: Math.ceil(forwardOrder),
    riskLevel
  });

  save();
  clearForm();
  render();
}

function clearForm() {
  ['itemName', 'stock', 'dailyUsage', 'normalLead', 'delayDays'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function deleteItem(id) {
  items = items.filter(i => i.id !== id);
  save();
  render();
}

function render() {
  const list = document.getElementById('itemList');
  const summary = document.getElementById('summary');

  if (items.length === 0) {
    summary.style.display = 'none';
    return;
  }
  summary.style.display = 'block';

  list.innerHTML = items.map(item => {
    const shortfall = item.stockDays < item.totalLeadTime
      ? `<div class="item-advice">⚠️ 在庫が${item.totalLeadTime - item.stockDays.toFixed(1)}日分不足します。前倒し発注が必要です。</div>`
      : `<div class="item-advice">✅ 現在の在庫でリードタイム延長に対応できます。</div>`;

    const valueClass = item.riskLevel === 'danger' ? 'highlight-danger'
                     : item.riskLevel === 'caution' ? 'highlight-caution'
                     : 'highlight-safe';

    return `
      <div class="item-card ${item.riskLevel}">
        <div class="item-header">
          <span class="item-name">${item.name}</span>
          <span class="risk-badge ${item.riskLevel}">${riskLabel(item.riskLevel)}</span>
        </div>
        <div class="item-stats">
          <div class="stat">
            <div class="stat-label">現在在庫で持つ日数</div>
            <div class="stat-value ${valueClass}">${item.stockDays} 日</div>
          </div>
          <div class="stat">
            <div class="stat-label">必要リードタイム（通常+延長）</div>
            <div class="stat-value">${item.normalLead} + ${item.delayDays} = ${item.totalLeadTime} 日</div>
          </div>
          <div class="stat">
            <div class="stat-label">前倒し発注量</div>
            <div class="stat-value">${item.forwardOrder} 個</div>
          </div>
          <div class="stat">
            <div class="stat-label">1日消費量 / 在庫数</div>
            <div class="stat-value">${item.daily} / ${item.stock}</div>
          </div>
        </div>
        ${shortfall}
        <button class="btn-delete" onclick="deleteItem(${item.id})">削除</button>
      </div>
    `;
  }).join('');
}

render();
