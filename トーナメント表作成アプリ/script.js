// ===== State =====
let teams = [];
let bracket = null; // { rounds: [ [{ team1, team2, winner }] ] }

const STORAGE_KEY = 'tournament_state';

// ===== Init =====
window.addEventListener('DOMContentLoaded', () => {
  loadState();
  renderTeamList();
  if (bracket) {
    showTournament();
    renderBracket();
  }

  document.getElementById('add-btn').addEventListener('click', addTeam);
  document.getElementById('team-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTeam();
  });
  document.getElementById('shuffle-btn').addEventListener('click', shuffleTeams);
  document.getElementById('generate-btn').addEventListener('click', generateTournament);
  document.getElementById('reset-btn').addEventListener('click', resetTournament);
});

// ===== Team Management =====
function addTeam() {
  const input = document.getElementById('team-input');
  const name = input.value.trim();
  if (!name) return;
  if (teams.includes(name)) {
    alert('同じチーム名がすでに登録されています。');
    return;
  }
  if (teams.length >= 16) {
    alert('最大16チームまで登録できます。');
    return;
  }
  teams.push(name);
  input.value = '';
  input.focus();
  renderTeamList();
  saveState();
}

function removeTeam(index) {
  teams.splice(index, 1);
  renderTeamList();
  saveState();
}

function shuffleTeams() {
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  renderTeamList();
  saveState();
}

function renderTeamList() {
  const list = document.getElementById('team-list');
  list.innerHTML = '';
  teams.forEach((name, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="team-num">${i + 1}</span>
      <span class="team-name">${escHtml(name)}</span>
      <button class="remove-btn" data-index="${i}" title="削除">✕</button>
    `;
    list.appendChild(li);
  });
  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeTeam(parseInt(btn.dataset.index)));
  });

  const info = document.querySelector('.team-count-info');
  if (info) info.remove();
  if (teams.length > 0) {
    const p = document.createElement('p');
    p.className = 'team-count-info';
    const needed = nextPowerOf2(teams.length);
    const byes = needed - teams.length;
    p.textContent = `${teams.length}チーム登録済み${byes > 0 ? `（不戦勝 ${byes}枠補完）` : ''}`;
    list.parentNode.insertBefore(p, list.nextSibling);
  }
}

// ===== Tournament Generation =====
function generateTournament() {
  if (teams.length < 2) {
    alert('2チーム以上登録してください。');
    return;
  }

  const size = nextPowerOf2(teams.length);
  const slots = [...teams];
  while (slots.length < size) slots.push(null); // null = BYE

  // Build first round
  const firstRound = [];
  for (let i = 0; i < size; i += 2) {
    firstRound.push({ team1: slots[i], team2: slots[i + 1], winner: null });
  }

  // Auto-advance BYEs
  firstRound.forEach(m => {
    if (m.team1 === null && m.team2 !== null) m.winner = m.team2;
    if (m.team2 === null && m.team1 !== null) m.winner = m.team1;
    if (m.team1 === null && m.team2 === null) m.winner = null; // both bye (won't happen)
  });

  bracket = { rounds: [firstRound] };

  // Build subsequent rounds (TBD)
  let prev = firstRound;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2) {
      round.push({ team1: null, team2: null, winner: null });
    }
    bracket.rounds.push(round);
    prev = round;
  }

  propagateWinners();
  showTournament();
  renderBracket();
  saveState();
}

function propagateWinners() {
  for (let r = 0; r < bracket.rounds.length - 1; r++) {
    const curr = bracket.rounds[r];
    const next = bracket.rounds[r + 1];
    for (let i = 0; i < curr.length; i += 2) {
      const nextMatch = next[Math.floor(i / 2)];
      nextMatch.team1 = curr[i].winner;
      nextMatch.team2 = curr[i + 1] ? curr[i + 1].winner : null;

      // Auto-advance if one side is null (BYE carry-forward)
      if (nextMatch.team1 !== null && nextMatch.team2 === null) {
        nextMatch.winner = nextMatch.team1;
      } else if (nextMatch.team1 === null && nextMatch.team2 !== null) {
        nextMatch.winner = nextMatch.team2;
      } else {
        // Keep existing winner only if teams haven't changed
        const currentWinner = nextMatch.winner;
        if (currentWinner && currentWinner !== nextMatch.team1 && currentWinner !== nextMatch.team2) {
          nextMatch.winner = null;
        }
      }
    }
  }
}

// ===== Render Bracket =====
function renderBracket() {
  const el = document.getElementById('tournament-bracket');
  el.innerHTML = '';

  const roundNames = getRoundNames(bracket.rounds.length);

  bracket.rounds.forEach((round, ri) => {
    const roundDiv = document.createElement('div');
    roundDiv.className = 'round';

    const label = document.createElement('div');
    label.className = 'round-label';
    label.textContent = roundNames[ri] || `第${ri + 1}回戦`;
    roundDiv.appendChild(label);

    const matchesCol = document.createElement('div');
    matchesCol.className = 'matches-col';

    round.forEach((match, mi) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'match-wrapper';

      const matchEl = document.createElement('div');
      matchEl.className = 'match';

      const slot1 = makeSlot(match, 'team1', ri, mi);
      const slot2 = makeSlot(match, 'team2', ri, mi);
      matchEl.appendChild(slot1);
      matchEl.appendChild(slot2);
      wrapper.appendChild(matchEl);

      // Connector to next round
      if (ri < bracket.rounds.length - 1) {
        const conn = document.createElement('div');
        conn.className = 'connector';
        const top = document.createElement('div');
        top.className = 'connector-top';
        const mid = document.createElement('div');
        mid.className = 'connector-mid';
        const bot = document.createElement('div');
        bot.className = 'connector-bottom';
        conn.appendChild(top);
        conn.appendChild(mid);
        conn.appendChild(bot);
        wrapper.appendChild(conn);
      }

      matchesCol.appendChild(wrapper);
    });

    roundDiv.appendChild(matchesCol);
    el.appendChild(roundDiv);
  });

  // Champion display
  const lastRound = bracket.rounds[bracket.rounds.length - 1];
  const champion = lastRound[0] ? lastRound[0].winner : null;

  let champArea = document.getElementById('champion-area');
  if (!champArea) {
    champArea = document.createElement('div');
    champArea.id = 'champion-area';
    document.getElementById('tournament-section').appendChild(champArea);
  }

  if (champion) {
    champArea.classList.remove('hidden');
    champArea.innerHTML = `
      <div class="trophy">🏆</div>
      <div class="champion-label">優勝</div>
      <div class="champion-name">${escHtml(champion)}</div>
    `;
  } else {
    champArea.classList.add('hidden');
  }
}

function makeSlot(match, teamKey, roundIndex, matchIndex) {
  const slot = document.createElement('div');
  slot.className = 'team-slot';
  const teamName = match[teamKey];
  const otherKey = teamKey === 'team1' ? 'team2' : 'team1';
  const otherName = match[otherKey];

  if (teamName === null) {
    slot.classList.add('bye');
    slot.textContent = 'BYE';
  } else if (teamName === undefined || teamName === '') {
    slot.classList.add('empty');
    slot.textContent = '―';
  } else {
    slot.textContent = teamName;

    if (match.winner) {
      if (match.winner === teamName) {
        slot.classList.add('winner');
      } else {
        slot.classList.add('loser');
      }
    } else if (!otherName && otherName !== null) {
      // Waiting for opponent
      slot.classList.add('tbd');
    } else if (otherName === null) {
      // Bye → auto-win, do nothing extra
    } else {
      // Clickable to set winner
      slot.addEventListener('click', () => {
        setWinner(roundIndex, matchIndex, teamName);
      });
      slot.title = 'クリックして勝者に設定';
    }
  }
  return slot;
}

function setWinner(roundIndex, matchIndex, winnerName) {
  const match = bracket.rounds[roundIndex][matchIndex];
  if (!match.team1 || !match.team2) return;
  if (match.team2 === null || match.team1 === null) return;

  // Toggle: click same winner to undo
  if (match.winner === winnerName) {
    match.winner = null;
  } else {
    match.winner = winnerName;
  }

  propagateWinners();
  renderBracket();
  saveState();
}

// ===== Helpers =====
function nextPowerOf2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function getRoundNames(total) {
  const names = [];
  const map = {
    1: ['決勝'],
    2: ['準決勝', '決勝'],
    3: ['準々決勝', '準決勝', '決勝'],
    4: ['1回戦', '準々決勝', '準決勝', '決勝'],
  };
  if (map[total]) return map[total];
  for (let i = 0; i < total; i++) {
    if (i === total - 1) names.push('決勝');
    else if (i === total - 2) names.push('準決勝');
    else if (i === total - 3) names.push('準々決勝');
    else names.push(`第${i + 1}回戦`);
  }
  return names;
}

function showTournament() {
  document.getElementById('input-section').classList.remove('hidden');
  document.getElementById('tournament-section').classList.remove('hidden');
}

function resetTournament() {
  if (!confirm('トーナメント表をリセットしますか？\nチームの登録はそのまま残ります。')) return;
  bracket = null;
  document.getElementById('tournament-section').classList.add('hidden');
  document.getElementById('tournament-bracket').innerHTML = '';
  const champArea = document.getElementById('champion-area');
  if (champArea) champArea.remove();
  saveState();
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== localStorage =====
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ teams, bracket }));
  } catch (e) {}
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    teams = data.teams || [];
    bracket = data.bracket || null;
  } catch (e) {
    teams = [];
    bracket = null;
  }
}
