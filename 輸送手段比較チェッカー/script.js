const IDS = ['cargoValue', 'interestRate', 'seaDays', 'seaFreight', 'airDays', 'airFreight'];

function loadFromStorage() {
  IDS.forEach(id => {
    const val = localStorage.getItem('transport_' + id);
    if (val !== null) {
      document.getElementById(id).value = val;
    }
  });
}

function saveToStorage() {
  IDS.forEach(id => {
    localStorage.setItem('transport_' + id, document.getElementById(id).value);
  });
}

function fmt(num) {
  return Math.round(num).toLocaleString('ja-JP') + '円';
}

function calcInterestCost(cargoValue, rate, days) {
  return cargoValue * (rate / 100) * (days / 365);
}

function calculate() {
  const cargoValue = parseFloat(document.getElementById('cargoValue').value) || 0;
  const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
  const seaDays = parseFloat(document.getElementById('seaDays').value) || 0;
  const seaFreight = parseFloat(document.getElementById('seaFreight').value) || 0;
  const airDays = parseFloat(document.getElementById('airDays').value) || 0;
  const airFreight = parseFloat(document.getElementById('airFreight').value) || 0;

  const seaInterest = calcInterestCost(cargoValue, interestRate, seaDays);
  const seaTotal = seaFreight + seaInterest;

  const airInterest = calcInterestCost(cargoValue, interestRate, airDays);
  const airTotal = airFreight + airInterest;

  // Update per-card result
  document.getElementById('seaResult').textContent = '総コスト：' + fmt(seaTotal);
  document.getElementById('airResult').textContent = '総コスト：' + fmt(airTotal);

  // Verdict
  const resultSection = document.getElementById('resultSection');
  const verdictEl = document.getElementById('verdict');
  const breakdownEl = document.getElementById('breakdown');
  resultSection.style.display = 'block';

  const diff = Math.abs(seaTotal - airTotal);
  let verdictClass, verdictText;

  if (seaTotal < airTotal) {
    verdictClass = 'sea-wins';
    verdictText = '🚢 船便が有利（' + fmt(diff) + '安い）';
  } else if (airTotal < seaTotal) {
    verdictClass = 'air-wins';
    verdictText = '✈️ 航空便が有利（' + fmt(diff) + '安い）';
  } else {
    verdictClass = 'tie';
    verdictText = '⚖️ 同コスト（コスト差なし）';
  }

  verdictEl.className = 'verdict ' + verdictClass;
  verdictEl.textContent = verdictText;

  breakdownEl.innerHTML = `
    <div class="breakdown-item">
      <div class="label">🚢 船便：輸送費</div>
      <div class="value">${fmt(seaFreight)}</div>
    </div>
    <div class="breakdown-item">
      <div class="label">🚢 船便：在庫金利コスト</div>
      <div class="value">${fmt(seaInterest)}</div>
      <div class="sub">${seaDays}日分</div>
    </div>
    <div class="breakdown-item">
      <div class="label">✈️ 航空便：輸送費</div>
      <div class="value">${fmt(airFreight)}</div>
    </div>
    <div class="breakdown-item">
      <div class="label">✈️ 航空便：在庫金利コスト</div>
      <div class="value">${fmt(airInterest)}</div>
      <div class="sub">${airDays}日分</div>
    </div>
    <div class="breakdown-item">
      <div class="label">🚢 船便：総コスト</div>
      <div class="value" style="font-size:1.05rem;color:${seaTotal <= airTotal ? '#0369a1' : '#1e293b'}">${fmt(seaTotal)}</div>
    </div>
    <div class="breakdown-item">
      <div class="label">✈️ 航空便：総コスト</div>
      <div class="value" style="font-size:1.05rem;color:${airTotal < seaTotal ? '#92400e' : '#1e293b'}">${fmt(airTotal)}</div>
    </div>
  `;

  saveToStorage();
}

document.getElementById('calcBtn').addEventListener('click', calculate);

// Allow Enter key on inputs to trigger calculation
IDS.forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') calculate();
  });
});

loadFromStorage();
