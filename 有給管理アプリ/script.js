// データ管理
const STORAGE_GRANTS = 'yukyukanri_grants';
const STORAGE_USES = 'yukyukanri_uses';

function loadGrants() {
  return JSON.parse(localStorage.getItem(STORAGE_GRANTS) || '[]');
}

function saveGrants(data) {
  localStorage.setItem(STORAGE_GRANTS, JSON.stringify(data));
}

function loadUses() {
  return JSON.parse(localStorage.getItem(STORAGE_USES) || '[]');
}

function saveUses(data) {
  localStorage.setItem(STORAGE_USES, JSON.stringify(data));
}

// 日付ユーティリティ
function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target - now) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

// 付与ごとの残日数を計算
function calcRemain(grant) {
  const uses = loadUses().filter(u => u.grantId === grant.id);
  const used = uses.reduce((sum, u) => sum + parseFloat(u.days), 0);
  return Math.max(0, parseFloat(grant.days) - used);
}

// サマリーを描画
function renderSummary() {
  const grants = loadGrants();
  const container = document.getElementById('summary-cards');
  container.innerHTML = '';

  if (grants.length === 0) {
    container.innerHTML = '<p class="empty-msg">付与データがありません</p>';
    return;
  }

  // 全体の残日数
  const totalRemain = grants.reduce((sum, g) => {
    if (daysUntil(g.expire) < 0) return sum;
    return sum + calcRemain(g);
  }, 0);

  // 期限切れ間近（30日以内）
  const warnGrants = grants.filter(g => {
    const d = daysUntil(g.expire);
    return d >= 0 && d <= 30 && calcRemain(g) > 0;
  });

  // 期限切れ（残日数あり）
  const expiredGrants = grants.filter(g => {
    return daysUntil(g.expire) < 0 && calcRemain(g) > 0;
  });

  // 残日数カード
  const card1 = document.createElement('div');
  card1.className = 'summary-card';
  card1.innerHTML = `
    <div class="label">有効な残日数</div>
    <div class="value">${totalRemain}</div>
    <div class="sub">日</div>
  `;
  container.appendChild(card1);

  // 警告カード
  if (warnGrants.length > 0) {
    const warnDays = warnGrants.reduce((sum, g) => sum + calcRemain(g), 0);
    const minDays = Math.min(...warnGrants.map(g => daysUntil(g.expire)));
    const card2 = document.createElement('div');
    card2.className = 'summary-card warning';
    card2.innerHTML = `
      <div class="label">期限切れ間近</div>
      <div class="value">${warnDays}</div>
      <div class="sub">日（残り${minDays}日以内）</div>
    `;
    container.appendChild(card2);
  }

  // 期限切れカード
  if (expiredGrants.length > 0) {
    const expDays = expiredGrants.reduce((sum, g) => sum + calcRemain(g), 0);
    const card3 = document.createElement('div');
    card3.className = 'summary-card expired';
    card3.innerHTML = `
      <div class="label">期限切れ（消滅）</div>
      <div class="value">${expDays}</div>
      <div class="sub">日</div>
    `;
    container.appendChild(card3);
  }
}

// 付与一覧を描画
function renderGrantList() {
  const grants = loadGrants();
  const container = document.getElementById('grant-list');
  container.innerHTML = '';

  if (grants.length === 0) {
    container.innerHTML = '<p class="empty-msg">付与データがありません</p>';
    return;
  }

  // 新しい順
  [...grants].reverse().forEach(g => {
    const remain = calcRemain(g);
    const daysLeft = daysUntil(g.expire);
    let itemClass = 'list-item';
    let remainClass = 'item-remain';
    let badge = '';

    if (daysLeft < 0) {
      itemClass += ' expired-item';
      remainClass += ' expired';
      badge = '<span class="badge badge-expired">期限切れ</span>';
    } else if (daysLeft <= 30) {
      itemClass += ' warning-item';
      remainClass += ' warning';
      badge = `<span class="badge badge-warning">残${daysLeft}日</span>`;
    }

    const item = document.createElement('div');
    item.className = itemClass;
    item.innerHTML = `
      <div class="item-info">
        <div class="item-title">${escHtml(g.note || '付与')}${badge}</div>
        <div class="item-meta">
          付与日：${formatDate(g.date)}　付与：${g.days}日<br>
          有効期限：${formatDate(g.expire)}
        </div>
      </div>
      <div class="${remainClass}">${remain}日</div>
      <button class="btn-delete" data-id="${g.id}" title="削除">✕</button>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteGrant(btn.dataset.id);
    });
  });
}

// セレクトを更新
function renderGrantSelect() {
  const grants = loadGrants();
  const select = document.getElementById('use-grant-select');
  const current = select.value;
  select.innerHTML = '<option value="">選択してください</option>';

  const valid = grants.filter(g => daysUntil(g.expire) >= 0 && calcRemain(g) > 0);
  valid.forEach(g => {
    const remain = calcRemain(g);
    const option = document.createElement('option');
    option.value = g.id;
    option.textContent = `${g.note || '付与'} (残${remain}日／期限${formatDate(g.expire)})`;
    if (option.value === current) option.selected = true;
    select.appendChild(option);
  });
}

// 取得履歴を描画
function renderUseList() {
  const uses = loadUses();
  const grants = loadGrants();
  const container = document.getElementById('use-list');
  container.innerHTML = '';

  if (uses.length === 0) {
    container.innerHTML = '<p class="empty-msg">取得記録がありません</p>';
    return;
  }

  [...uses].reverse().forEach(u => {
    const grant = grants.find(g => g.id === u.grantId);
    const grantLabel = grant ? (grant.note || '付与') : '（削除済）';

    const item = document.createElement('div');
    item.className = 'list-item';
    item.innerHTML = `
      <div class="item-info">
        <div class="item-title">${escHtml(u.note || '有給取得')}</div>
        <div class="item-meta">
          取得日：${formatDate(u.date)}　取得：${u.days}日<br>
          対象：${escHtml(grantLabel)}
        </div>
      </div>
      <div class="item-remain">${u.days}日</div>
      <button class="btn-delete" data-id="${u.id}" title="削除">✕</button>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteUse(btn.dataset.id);
    });
  });
}

function deleteGrant(id) {
  const grants = loadGrants().filter(g => g.id !== id);
  saveGrants(grants);
  renderAll();
}

function deleteUse(id) {
  const uses = loadUses().filter(u => u.id !== id);
  saveUses(uses);
  renderAll();
}

function renderAll() {
  renderSummary();
  renderGrantList();
  renderGrantSelect();
  renderUseList();
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// 付与登録
document.getElementById('grant-form').addEventListener('submit', e => {
  e.preventDefault();
  const date = document.getElementById('grant-date').value;
  const days = parseFloat(document.getElementById('grant-days').value);
  const expire = document.getElementById('grant-expire').value;
  const note = document.getElementById('grant-note').value.trim();

  if (!date || !days || !expire) return;

  const grants = loadGrants();
  grants.push({ id: Date.now().toString(), date, days, expire, note });
  saveGrants(grants);

  e.target.reset();
  renderAll();
});

// 取得記録
document.getElementById('use-form').addEventListener('submit', e => {
  e.preventDefault();
  const grantId = document.getElementById('use-grant-select').value;
  const date = document.getElementById('use-date').value;
  const days = parseFloat(document.getElementById('use-days').value);
  const note = document.getElementById('use-note').value.trim();

  if (!grantId || !date || !days) return;

  const grants = loadGrants();
  const grant = grants.find(g => g.id === grantId);
  if (!grant) return;

  const remain = calcRemain(grant);
  if (days > remain) {
    alert(`取得日数（${days}日）が残日数（${remain}日）を超えています。`);
    return;
  }

  const uses = loadUses();
  uses.push({ id: Date.now().toString(), grantId, date, days, note });
  saveUses(uses);

  e.target.reset();
  renderAll();
});

// タブ切り替え
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// 初期化
renderAll();
