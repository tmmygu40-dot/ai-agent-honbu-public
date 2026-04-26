const STORAGE_KEY = 'neage_generator_v1';

const fields = ['sender', 'recipient', 'item', 'reason', 'effectiveDate', 'extra', 'currentPrice', 'newPrice', 'rateValue'];

// ===== localStorage =====
function saveToStorage() {
  const data = {};
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  const priceType = document.querySelector('input[name="priceType"]:checked');
  if (priceType) data.priceType = priceType.value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    fields.forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id] !== undefined) el.value = data[id];
    });
    if (data.priceType) {
      const radio = document.querySelector(`input[name="priceType"][value="${data.priceType}"]`);
      if (radio) {
        radio.checked = true;
        togglePriceInput(data.priceType);
      }
    }
  } catch (e) {
    // ignore
  }
}

// ===== Price type toggle =====
function togglePriceInput(type) {
  document.getElementById('amountInput').classList.toggle('hidden', type !== 'amount');
  document.getElementById('rateInput').classList.toggle('hidden', type !== 'rate');
}

document.querySelectorAll('input[name="priceType"]').forEach(radio => {
  radio.addEventListener('change', () => {
    togglePriceInput(radio.value);
    saveToStorage();
  });
});

// ===== Auto-save on input =====
fields.forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', saveToStorage);
});

// ===== Format date =====
function formatDate(dateStr) {
  if (!dateStr) return '　　　年　　月　　日';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}年${m}月${day}日`;
}

function todayFormatted() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// ===== Generate letter =====
function generateLetter() {
  const sender = document.getElementById('sender').value.trim();
  const recipient = document.getElementById('recipient').value.trim();
  const item = document.getElementById('item').value.trim();
  const reason = document.getElementById('reason').value.trim();
  const effectiveDate = document.getElementById('effectiveDate').value;
  const extra = document.getElementById('extra').value.trim();
  const priceType = document.querySelector('input[name="priceType"]:checked').value;

  let priceInfo = '';
  if (priceType === 'amount') {
    const current = document.getElementById('currentPrice').value.trim();
    const next = document.getElementById('newPrice').value.trim();
    if (current && next) {
      priceInfo = `現行価格：${current}\n改定後価格：${next}`;
    } else if (next) {
      priceInfo = `改定後価格：${next}`;
    } else {
      priceInfo = '価格詳細については別途ご案内いたします。';
    }
  } else {
    const rate = document.getElementById('rateValue').value.trim();
    priceInfo = rate ? `値上げ率：現行価格より${rate}%増` : '値上げ率については別途ご案内いたします。';
  }

  const itemText = item || '弊社取扱品目';
  const reasonText = reason || '原材料費・エネルギーコスト等の高騰';
  const recipientText = recipient || 'ご担当者様';
  const senderText = sender || '';
  const effectiveDateText = formatDate(effectiveDate);

  let letter = `${todayFormatted()}

${recipientText}

`;

  if (senderText) {
    letter += `${senderText}\n\n`;
  }

  letter += `価格改定のお願いとご通知

拝啓　時下ますますご清栄のこととお慶び申し上げます。平素より格別のお引き立てを賜り、誠にありがとうございます。

さて、このたびは弊社の${itemText}につきまして、誠に不本意ではございますが、価格の改定をお願い申し上げることとなりました。

価格改定の理由といたしまして、昨今の${reasonText}により、現行の価格水準を維持することが困難な状況となっております。これまで企業努力によりコスト増加の吸収に努めてまいりましたが、今後の安定的な供給を続けるためにはやむを得ない措置として、価格の改定をお願いする運びとなりました。

【価格改定の内容】
対象：${itemText}
実施日：${effectiveDateText}
${priceInfo}
`;

  if (extra) {
    letter += `\n${extra}\n`;
  }

  letter += `
ご迷惑をおかけいたしますことを深くお詫び申し上げますとともに、何卒ご理解・ご了承いただきますようお願い申し上げます。

今後とも変わらぬお引き立てを賜りますよう、よろしくお願い申し上げます。

敬具`;

  return letter;
}

// ===== Events =====
document.getElementById('generateBtn').addEventListener('click', () => {
  const letter = generateLetter();
  const resultSection = document.getElementById('resultSection');
  const resultText = document.getElementById('resultText');
  resultText.textContent = letter;
  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const text = document.getElementById('resultText').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const feedback = document.getElementById('copyFeedback');
    feedback.classList.remove('hidden');
    setTimeout(() => feedback.classList.add('hidden'), 2000);
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const feedback = document.getElementById('copyFeedback');
    feedback.classList.remove('hidden');
    setTimeout(() => feedback.classList.add('hidden'), 2000);
  });
});

document.getElementById('clearBtn').addEventListener('click', () => {
  if (!confirm('入力内容をリセットしますか？')) return;
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelector('input[name="priceType"][value="amount"]').checked = true;
  togglePriceInput('amount');
  document.getElementById('resultSection').classList.add('hidden');
  localStorage.removeItem(STORAGE_KEY);
});

// ===== Init =====
loadFromStorage();

// Set today as default date if empty
const dateField = document.getElementById('effectiveDate');
if (!dateField.value) {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  dateField.value = `${y}-${m}-${day}`;
}
