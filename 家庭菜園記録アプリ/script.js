const STORAGE_KEY = 'kateisaien_crops';

let crops = [];

function loadCrops() {
  const data = localStorage.getItem(STORAGE_KEY);
  crops = data ? JSON.parse(data) : [];
}

function saveCrops() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(crops));
}

function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysDiff(dateStr) {
  const target = new Date(dateStr);
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diff = t - today();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function elapsed(dateStr) {
  return -daysDiff(dateStr);
}

function formatDate(dateStr) {
  if (!dateStr) return '未定';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

function renderCrops() {
  const list = document.getElementById('cropList');
  const count = document.getElementById('cropCount');
  count.textContent = crops.length;

  if (crops.length === 0) {
    list.innerHTML = '<p class="empty-msg">まだ作物が登録されていません</p>';
    return;
  }

  list.innerHTML = crops.map((crop, i) => {
    const elapsedDays = elapsed(crop.sowDate);
    const remaining = crop.harvestDate ? daysDiff(crop.harvestDate) : null;

    let cardClass = 'crop-card';
    let remainBadge = '';
    let harvestLabel = '';

    if (remaining !== null) {
      if (remaining < 0) {
        cardClass += ' harvest-over';
        harvestLabel = '<span class="harvest-label">🍅 収穫時期！</span><br>';
        remainBadge = `<span class="stat-badge danger">収穫 ${Math.abs(remaining)}日超過</span>`;
      } else if (remaining <= 7) {
        cardClass += ' harvest-ready';
        remainBadge = `<span class="stat-badge warn">収穫まで ${remaining}日</span>`;
      } else {
        remainBadge = `<span class="stat-badge">収穫まで ${remaining}日</span>`;
      }
    } else {
      remainBadge = '<span class="stat-badge">収穫日：未定</span>';
    }

    const memoHtml = crop.memo
      ? `<div class="crop-memo">📝 ${escapeHtml(crop.memo)}</div>`
      : '';

    return `
      <div class="${cardClass}">
        <button class="btn-delete" onclick="deleteCrop(${i})">削除</button>
        ${harvestLabel}
        <div class="crop-name">${escapeHtml(crop.name)}</div>
        <div class="crop-dates">
          <span>播種日：${formatDate(crop.sowDate)}</span>
          <span>収穫予定：${formatDate(crop.harvestDate)}</span>
        </div>
        <div class="crop-stats">
          <span class="stat-badge">播種から ${elapsedDays}日経過</span>
          ${remainBadge}
        </div>
        ${memoHtml}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function deleteCrop(index) {
  crops.splice(index, 1);
  saveCrops();
  renderCrops();
}

document.getElementById('addBtn').addEventListener('click', () => {
  const name = document.getElementById('cropName').value.trim();
  const sowDate = document.getElementById('sowDate').value;
  const harvestDate = document.getElementById('harvestDate').value;
  const memo = document.getElementById('memo').value.trim();

  if (!name) {
    alert('作物名を入力してください');
    return;
  }
  if (!sowDate) {
    alert('播種日を入力してください');
    return;
  }

  crops.unshift({
    id: Date.now(),
    name,
    sowDate,
    harvestDate: harvestDate || '',
    memo
  });

  saveCrops();
  renderCrops();

  document.getElementById('cropName').value = '';
  document.getElementById('sowDate').value = '';
  document.getElementById('harvestDate').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('cropName').focus();
});

// 毎分リアルタイム更新（日付またぎ対応）
setInterval(renderCrops, 60000);

loadCrops();
renderCrops();
