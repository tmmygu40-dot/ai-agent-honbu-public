const STORAGE_KEY = 'faq_memo_data';

function loadFAQs() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFAQs(faqs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(faqs));
}

function addFAQ() {
  const question = document.getElementById('questionInput').value.trim();
  const answer = document.getElementById('answerInput').value.trim();

  if (!question || !answer) {
    alert('質問と回答を両方入力してください。');
    return;
  }

  const faqs = loadFAQs();
  faqs.unshift({ id: Date.now(), question, answer });
  saveFAQs(faqs);

  document.getElementById('questionInput').value = '';
  document.getElementById('answerInput').value = '';
  renderList();
}

function deleteFAQ(id) {
  const faqs = loadFAQs().filter(f => f.id !== id);
  saveFAQs(faqs);
  renderList();
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightText(text, keyword) {
  if (!keyword) return escapeHTML(text);
  const escaped = escapeHTML(text);
  const escapedKeyword = escapeHTML(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(new RegExp(escapedKeyword, 'gi'), match => `<span class="highlight">${match}</span>`);
}

function renderList() {
  const keyword = document.getElementById('searchInput').value.trim();
  const faqs = loadFAQs();
  const container = document.getElementById('faqList');

  const filtered = keyword
    ? faqs.filter(f =>
        f.question.toLowerCase().includes(keyword.toLowerCase()) ||
        f.answer.toLowerCase().includes(keyword.toLowerCase())
      )
    : faqs;

  if (filtered.length === 0) {
    container.innerHTML = `<p class="empty-msg">${keyword ? '該当するFAQが見つかりませんでした。' : 'FAQがまだ登録されていません。'}</p>`;
    return;
  }

  container.innerHTML = filtered.map(f => `
    <div class="faq-item">
      <div class="faq-question">${highlightText(f.question, keyword)}</div>
      <div class="faq-answer">${highlightText(f.answer, keyword)}</div>
      <div class="faq-footer">
        <button class="delete-btn" onclick="deleteFAQ(${f.id})">削除</button>
      </div>
    </div>
  `).join('');
}

// Enterキーで追加
document.getElementById('questionInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('answerInput').focus();
  }
});

renderList();
