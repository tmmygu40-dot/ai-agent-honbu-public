const STORAGE_KEY = 'manuals_v1';

let manuals = [];

function load() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    manuals = data ? JSON.parse(data) : [];
  } catch {
    manuals = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(manuals));
}

function addManual(title, stepsRaw) {
  const steps = stepsRaw
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (!title.trim() || steps.length === 0) return false;

  manuals.unshift({
    id: Date.now(),
    title: title.trim(),
    steps,
  });
  save();
  return true;
}

function deleteManual(id) {
  manuals = manuals.filter(m => m.id !== id);
  save();
}

function renderList(filter = '') {
  const list = document.getElementById('manualList');
  const countEl = document.getElementById('count');
  const q = filter.trim().toLowerCase();

  const filtered = q
    ? manuals.filter(m => m.title.toLowerCase().includes(q))
    : manuals;

  countEl.textContent = `${filtered.length} 件`;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state">登録されたマニュアルはありません</div>';
    return;
  }

  list.innerHTML = filtered.map(m => `
    <div class="manual-card" id="card-${m.id}">
      <div class="manual-header" onclick="toggleCard(${m.id})">
        <span class="manual-title">${escHtml(m.title)}</span>
        <div class="header-right">
          <span class="step-count">${m.steps.length} ステップ</span>
          <span class="toggle-icon">▼</span>
          <button class="delete-btn" onclick="handleDelete(event, ${m.id})">削除</button>
        </div>
      </div>
      <div class="manual-body">
        <ul class="steps-list">
          ${m.steps.map((s, i) => `
            <li>
              <span class="step-num">${i + 1}</span>
              <span class="step-text">${escHtml(s)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `).join('');
}

function toggleCard(id) {
  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.toggle('open');
}

function handleDelete(e, id) {
  e.stopPropagation();
  deleteManual(id);
  renderList(document.getElementById('searchInput').value);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// イベント設定
document.getElementById('addBtn').addEventListener('click', () => {
  const title = document.getElementById('title').value;
  const steps = document.getElementById('steps').value;

  if (!title.trim()) {
    alert('作業名を入力してください');
    return;
  }
  if (!steps.trim()) {
    alert('手順を1行以上入力してください');
    return;
  }

  const ok = addManual(title, steps);
  if (ok) {
    document.getElementById('title').value = '';
    document.getElementById('steps').value = '';
    renderList(document.getElementById('searchInput').value);
  }
});

document.getElementById('searchInput').addEventListener('input', e => {
  renderList(e.target.value);
});

// 起動
load();
renderList();
