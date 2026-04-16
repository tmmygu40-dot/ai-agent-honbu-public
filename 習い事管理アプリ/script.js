const STORAGE_KEY = 'lesson_data';

let lessons = [];

function loadLessons() {
  const saved = localStorage.getItem(STORAGE_KEY);
  lessons = saved ? JSON.parse(saved) : [];
}

function saveLessons() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons));
}

function getSelectedDays() {
  const checked = document.querySelectorAll('.days-grid input[type="checkbox"]:checked');
  return Array.from(checked).map(cb => cb.value);
}

function clearForm() {
  document.getElementById('lessonName').value = '';
  document.getElementById('lessonFee').value = '';
  document.querySelectorAll('.days-grid input[type="checkbox"]').forEach(cb => cb.checked = false);
}

function formatFee(fee) {
  return '¥' + Number(fee).toLocaleString();
}

function updateTotal() {
  const total = lessons.reduce((sum, l) => sum + Number(l.fee), 0);
  document.getElementById('totalAmount').textContent = '¥' + total.toLocaleString();
}

function renderList() {
  const list = document.getElementById('lessonList');
  const emptyMsg = document.getElementById('emptyMsg');

  if (lessons.length === 0) {
    list.innerHTML = '<p class="empty-msg" id="emptyMsg">まだ登録されていません</p>';
    updateTotal();
    return;
  }

  list.innerHTML = lessons.map((lesson, index) => {
    const dayBadges = lesson.days.length > 0
      ? lesson.days.map(d => `<span class="day-badge">${d}</span>`).join('')
      : '<span style="color:#aaa;font-size:0.8rem">曜日未設定</span>';

    return `
      <div class="lesson-item">
        <div class="lesson-info">
          <div class="lesson-name">${escapeHtml(lesson.name)}</div>
          <div class="lesson-fee">${formatFee(lesson.fee)} / 月</div>
          <div class="lesson-days">${dayBadges}</div>
        </div>
        <button class="delete-btn" onclick="deleteLesson(${index})" title="削除">✕</button>
      </div>
    `;
  }).join('');

  updateTotal();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function addLesson() {
  const name = document.getElementById('lessonName').value.trim();
  const feeRaw = document.getElementById('lessonFee').value;
  const days = getSelectedDays();

  if (!name) {
    alert('習い事名を入力してください');
    return;
  }

  const fee = parseInt(feeRaw, 10);
  if (isNaN(fee) || fee < 0) {
    alert('月謝に正しい金額を入力してください');
    return;
  }

  lessons.push({ name, fee, days });
  saveLessons();
  renderList();
  clearForm();
}

function deleteLesson(index) {
  if (!confirm(`「${lessons[index].name}」を削除しますか？`)) return;
  lessons.splice(index, 1);
  saveLessons();
  renderList();
}

document.getElementById('addBtn').addEventListener('click', addLesson);

document.getElementById('lessonName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addLesson();
});

loadLessons();
renderList();
