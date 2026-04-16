const STORAGE_KEY = 'heya_sagashi_properties';

let properties = [];
let formPriority = 0;

// データ読み込み
function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    properties = saved ? JSON.parse(saved) : [];
  } catch (e) {
    properties = [];
  }
}

// データ保存
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
}

// 星評価フォーム初期化
function initStarInput() {
  const stars = document.querySelectorAll('#starInput .star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.dataset.value);
      formPriority = val;
      document.getElementById('priority').value = val;
      updateFormStars(val);
    });
    star.addEventListener('mouseenter', () => {
      updateFormStars(parseInt(star.dataset.value));
    });
  });

  document.getElementById('starInput').addEventListener('mouseleave', () => {
    updateFormStars(formPriority);
  });
}

function updateFormStars(val) {
  const stars = document.querySelectorAll('#starInput .star');
  stars.forEach(star => {
    star.classList.toggle('active', parseInt(star.dataset.value) <= val);
  });
}

// 物件追加
function addProperty(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  if (!name) return;

  const rent = document.getElementById('rent').value;
  const size = document.getElementById('size').value;
  const station = document.getElementById('station').value.trim();
  const memo = document.getElementById('memo').value.trim();
  const priority = parseInt(document.getElementById('priority').value) || 0;

  const prop = {
    id: Date.now(),
    name,
    rent: rent ? parseInt(rent) : null,
    size: size ? parseFloat(size) : null,
    station,
    memo,
    priority,
    createdAt: Date.now()
  };

  properties.push(prop);
  save();
  render();

  // フォームリセット
  document.getElementById('propertyForm').reset();
  formPriority = 0;
  updateFormStars(0);
}

// 削除
function deleteProperty(id) {
  properties = properties.filter(p => p.id !== id);
  save();
  render();
}

// 優先度更新
function updatePriority(id, val) {
  const prop = properties.find(p => p.id === id);
  if (prop) {
    prop.priority = val;
    save();
    render();
  }
}

// ソート
function getSorted() {
  const sortBy = document.getElementById('sortSelect').value;
  const copy = [...properties];
  if (sortBy === 'priority') {
    return copy.sort((a, b) => b.priority - a.priority);
  } else if (sortBy === 'rent') {
    return copy.sort((a, b) => {
      if (a.rent === null) return 1;
      if (b.rent === null) return -1;
      return a.rent - b.rent;
    });
  } else if (sortBy === 'size') {
    return copy.sort((a, b) => {
      if (a.size === null) return 1;
      if (b.size === null) return -1;
      return b.size - a.size;
    });
  } else {
    return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

// 星表示HTML
function starsHtml(priority) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    html += `<span class="${i <= priority ? '' : 'empty'}">★</span>`;
  }
  return html;
}

// カード描画
function renderCard(prop) {
  const rentStr = prop.rent !== null ? prop.rent.toLocaleString() + '円' : '—';
  const sizeStr = prop.size !== null ? prop.size + '㎡' : '—';
  const stationStr = prop.station || '—';

  return `
    <div class="property-card" data-id="${prop.id}">
      <div class="card-header">
        <div class="card-name">${escHtml(prop.name)}</div>
        <div class="card-stars">${starsHtml(prop.priority)}</div>
      </div>
      <div class="card-details">
        <div class="detail-item">
          <span class="detail-label">家賃</span>
          <span class="detail-value rent">${rentStr}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">広さ</span>
          <span class="detail-value">${sizeStr}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">最寄り駅</span>
          <span class="detail-value">${escHtml(stationStr)}</span>
        </div>
      </div>
      ${prop.memo ? `<div class="card-memo">${escHtml(prop.memo)}</div>` : ''}
      <div class="priority-editor" data-id="${prop.id}">
        <span style="font-size:0.8rem;color:#888;margin-right:4px;">優先度：</span>
        ${[1,2,3,4,5].map(v =>
          `<span class="star ${v <= prop.priority ? 'active' : ''}" data-id="${prop.id}" data-value="${v}">★</span>`
        ).join('')}
      </div>
      <div class="card-actions">
        <button class="btn-delete" data-id="${prop.id}">削除</button>
      </div>
    </div>
  `;
}

// HTMLエスケープ
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 全体描画
function render() {
  const sorted = getSorted();
  const listEl = document.getElementById('propertyList');
  const countEl = document.getElementById('count');

  countEl.textContent = `(${properties.length}件)`;

  if (sorted.length === 0) {
    listEl.innerHTML = '<div class="empty-msg">まだ物件が登録されていません</div>';
    return;
  }

  listEl.innerHTML = sorted.map(renderCard).join('');

  // 星クリックイベント
  listEl.querySelectorAll('.priority-editor .star').forEach(star => {
    star.addEventListener('click', () => {
      updatePriority(parseInt(star.dataset.id), parseInt(star.dataset.value));
    });
    star.addEventListener('mouseenter', () => {
      const id = parseInt(star.dataset.id);
      const val = parseInt(star.dataset.value);
      const editor = listEl.querySelector(`.priority-editor[data-id="${id}"]`);
      editor.querySelectorAll('.star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.value) <= val);
      });
    });
    star.addEventListener('mouseleave', () => {
      const id = parseInt(star.dataset.id);
      const prop = properties.find(p => p.id === id);
      if (!prop) return;
      const editor = listEl.querySelector(`.priority-editor[data-id="${id}"]`);
      editor.querySelectorAll('.star').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.value) <= prop.priority);
      });
    });
  });

  // 削除イベント
  listEl.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('この物件を削除しますか？')) {
        deleteProperty(parseInt(btn.dataset.id));
      }
    });
  });
}

// 初期化
load();
initStarInput();
document.getElementById('propertyForm').addEventListener('submit', addProperty);
document.getElementById('sortSelect').addEventListener('change', render);
render();
