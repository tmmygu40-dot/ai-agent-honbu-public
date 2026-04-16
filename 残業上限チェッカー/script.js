const MONTHLY_LIMIT = 45;
const YEARLY_LIMIT  = 360;
const WARN_REMAIN   = 10;

let staffList = [];

function load() {
  const saved = localStorage.getItem('zangyoStaff');
  if (saved) {
    try { staffList = JSON.parse(saved); } catch(e) { staffList = []; }
  }
}

function save() {
  localStorage.setItem('zangyoStaff', JSON.stringify(staffList));
}

function getStatus(used, limit) {
  const remain = limit - used;
  if (used >= limit) return { level: 'over',  remain };
  if (remain <= WARN_REMAIN) return { level: 'warn', remain };
  return { level: 'ok', remain };
}

function barClass(level) {
  if (level === 'over') return 'bar-over';
  if (level === 'warn') return 'bar-warn';
  return 'bar-ok';
}

function badgeClass(level) {
  if (level === 'over') return 'badge-over';
  if (level === 'warn') return 'badge-warn';
  return 'badge-ok';
}

function badgeText(level) {
  if (level === 'over') return '超過';
  if (level === 'warn') return '注意';
  return 'OK';
}

function barWidth(used, limit) {
  const pct = Math.min(used / limit * 100, 100);
  return pct.toFixed(1);
}

function remainText(status, label) {
  if (status.level === 'over') {
    return `<span class="remaining over">${label}上限を ${Math.abs(status.remain).toFixed(1)}h 超過しています</span>`;
  }
  const cls = status.level === 'warn' ? 'warn' : '';
  return `<span class="remaining ${cls}">あと ${status.remain.toFixed(1)}h</span>`;
}

function renderList() {
  const container = document.getElementById('staffList');
  const emptyMsg  = document.getElementById('emptyMsg');

  if (staffList.length === 0) {
    container.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }
  emptyMsg.style.display = 'none';

  container.innerHTML = staffList.map((s, i) => {
    const ms = getStatus(s.monthly, MONTHLY_LIMIT);
    const ys = getStatus(s.yearly,  YEARLY_LIMIT);

    return `
      <div class="staff-card">
        <button class="delete-btn" onclick="deleteStaff(${i})" title="削除">✕</button>
        <div class="staff-name">${escape(s.name)}</div>
        <div class="meters">
          <div class="meter-row">
            <div class="meter-label">
              <span>月間残業 ${s.monthly}h / ${MONTHLY_LIMIT}h
                <span class="status-badge ${badgeClass(ms.level)}">${badgeText(ms.level)}</span>
              </span>
              ${remainText(ms, '月')}
            </div>
            <div class="meter-bar-bg">
              <div class="meter-bar ${barClass(ms.level)}" style="width:${barWidth(s.monthly, MONTHLY_LIMIT)}%"></div>
            </div>
          </div>
          <div class="meter-row">
            <div class="meter-label">
              <span>年間残業 ${s.yearly}h / ${YEARLY_LIMIT}h
                <span class="status-badge ${badgeClass(ys.level)}">${badgeText(ys.level)}</span>
              </span>
              ${remainText(ys, '年')}
            </div>
            <div class="meter-bar-bg">
              <div class="meter-bar ${barClass(ys.level)}" style="width:${barWidth(s.yearly, YEARLY_LIMIT)}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function escape(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function addStaff() {
  const name    = document.getElementById('staffName').value.trim();
  const monthly = parseFloat(document.getElementById('monthlyHours').value);
  const yearly  = parseFloat(document.getElementById('yearlyHours').value);

  if (!name) { alert('スタッフ名を入力してください'); return; }
  if (isNaN(monthly) || monthly < 0) { alert('今月の残業時間を正しく入力してください'); return; }
  if (isNaN(yearly) || yearly < 0)   { alert('今年の累計残業時間を正しく入力してください'); return; }
  if (yearly < monthly) { alert('年間累計は今月の残業時間以上にしてください'); return; }

  staffList.push({ name, monthly, yearly });
  save();
  renderList();

  document.getElementById('staffName').value    = '';
  document.getElementById('monthlyHours').value = '';
  document.getElementById('yearlyHours').value  = '';
  document.getElementById('staffName').focus();
}

function deleteStaff(i) {
  if (!confirm(`「${staffList[i].name}」を削除しますか？`)) return;
  staffList.splice(i, 1);
  save();
  renderList();
}

document.getElementById('addBtn').addEventListener('click', addStaff);

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.activeElement.tagName === 'INPUT') addStaff();
});

load();
renderList();
