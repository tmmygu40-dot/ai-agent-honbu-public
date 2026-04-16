'use strict';

const STORAGE_KEY = 'heya_props';

let props = loadProps();
let currentRating = 0;

// ===== 起動 =====
init();

function init() {
  setupStars();
  document.getElementById('addBtn').addEventListener('click', addProp);
  document.getElementById('clearBtn').addEventListener('click', clearAll);
  document.getElementById('sortKey').addEventListener('change', render);
  render();
}

// ===== データ =====
function loadProps() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveProps() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(props));
}

// ===== 星入力 =====
function setupStars() {
  const stars = document.querySelectorAll('.star');
  stars.forEach(star => {
    star.addEventListener('mouseover', () => highlightStars(+star.dataset.val));
    star.addEventListener('mouseleave', () => highlightStars(currentRating));
    star.addEventListener('click', () => {
      currentRating = +star.dataset.val;
      highlightStars(currentRating);
      document.getElementById('rating').value = currentRating;
    });
  });
}

function highlightStars(val) {
  document.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('active', +s.dataset.val <= val);
  });
}

// ===== 追加 =====
function addProp() {
  const name = document.getElementById('propName').value.trim();
  if (!name) {
    alert('物件名を入力してください。');
    document.getElementById('propName').focus();
    return;
  }

  const prop = {
    id: Date.now(),
    name,
    rent: toNum(document.getElementById('rent').value),
    area: toNum(document.getElementById('area').value),
    age: toNum(document.getElementById('age').value),
    walk: toNum(document.getElementById('walk').value),
    floor: document.getElementById('floor').value.trim(),
    layout: document.getElementById('layout').value.trim(),
    conditions: document.getElementById('conditions').value.trim(),
    rating: currentRating,
    addedAt: Date.now()
  };

  props.unshift(prop);
  saveProps();
  clearForm();
  render();
}

function toNum(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function clearForm() {
  ['propName','rent','area','age','walk','floor','layout','conditions'].forEach(id => {
    document.getElementById(id).value = '';
  });
  currentRating = 0;
  highlightStars(0);
  document.getElementById('rating').value = 0;
}

// ===== 削除 =====
function deleteProp(id) {
  if (!confirm('この物件を削除しますか？')) return;
  props = props.filter(p => p.id !== id);
  saveProps();
  render();
}

function clearAll() {
  if (!confirm('登録した全物件を削除しますか？')) return;
  props = [];
  saveProps();
  render();
}

// ===== 並び替え =====
function sortedProps() {
  const key = document.getElementById('sortKey').value;
  const copy = [...props];
  switch (key) {
    case 'rent':   return copy.sort((a,b) => (a.rent ?? Infinity) - (b.rent ?? Infinity));
    case 'area':   return copy.sort((a,b) => (b.area ?? -1) - (a.area ?? -1));
    case 'walk':   return copy.sort((a,b) => (a.walk ?? Infinity) - (b.walk ?? Infinity));
    case 'rating': return copy.sort((a,b) => b.rating - a.rating);
    default:       return copy.sort((a,b) => b.addedAt - a.addedAt);
  }
}

// ===== 描画 =====
function render() {
  const list = document.getElementById('propList');
  const emptyMsg = document.getElementById('emptyMsg');
  const sortSection = document.getElementById('sortSection');
  const clearBtn = document.getElementById('clearBtn');
  const count = document.getElementById('propCount');

  count.textContent = props.length + '件';

  if (props.length === 0) {
    list.innerHTML = '';
    emptyMsg.style.display = '';
    sortSection.style.display = 'none';
    clearBtn.style.display = 'none';
    return;
  }

  emptyMsg.style.display = 'none';
  sortSection.style.display = '';
  clearBtn.style.display = '';

  list.innerHTML = sortedProps().map(p => cardHTML(p)).join('');

  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteProp(+btn.dataset.id));
  });
}

function cardHTML(p) {
  const rentStr = p.rent !== null ? p.rent.toLocaleString() + '円' : '—';
  const areaStr = p.area !== null ? p.area + ' m²' : '—';
  const ageStr  = p.age  !== null ? '築' + p.age + '年' : '—';
  const walkStr = p.walk !== null ? '徒歩' + p.walk + '分' : '—';
  const stars   = p.rating > 0 ? '★'.repeat(p.rating) + '☆'.repeat(5 - p.rating) : '☆☆☆☆☆';

  const rows = [
    { label: '家賃', value: rentStr, cls: 'rent-val' },
    { label: '広さ', value: areaStr },
    { label: '築年数', value: ageStr },
    { label: '駅徒歩', value: walkStr },
    p.layout ? { label: '間取り', value: p.layout } : null,
    p.floor  ? { label: '階数',   value: p.floor  } : null,
  ].filter(Boolean);

  const bodyHTML = rows.map(r =>
    `<div class="card-item">
      <span class="label">${r.label}</span>
      <span class="value ${r.cls || ''}">${r.value}</span>
    </div>`
  ).join('');

  const condHTML = p.conditions
    ? `<div class="card-conditions">${escapeHTML(p.conditions)}</div>`
    : '';

  return `
    <div class="prop-card">
      <div class="card-header">
        <div class="card-name">${escapeHTML(p.name)}</div>
        <div class="card-stars" title="${p.rating}点">${stars}</div>
      </div>
      <div class="card-body">${bodyHTML}</div>
      ${condHTML}
      <div class="card-footer">
        <button class="btn-delete" data-id="${p.id}">削除</button>
      </div>
    </div>`;
}

function escapeHTML(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
