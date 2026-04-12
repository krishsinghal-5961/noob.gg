/* ================================================================
   results.js — Match Results / Podium Screen
================================================================ */
'use strict';

/**
 * Display the results screen.
 * @param {Array<{name:string, score:number}>} results - sorted best-first
 * @param {string} unit   - score unit label (e.g. 'ms', 'pts', 'WPM')
 * @param {string} gameName - display name of the game
 */
function showResults(results, unit, gameName) {
  showPage('pg-results');
  hideBottomNav();

  const isLow = unit === 'ms'; // lower = better for reflex
  const winner = results[0];
  const isWin  = winner && winner.name.replace(' (You)', '') === S.name;

  document.getElementById('res-hero').textContent  = isWin ? '🏆 YOU WIN!' : '🎮 GAME OVER';
  document.getElementById('res-sub').textContent   = gameName + ' — Match Complete';

  // Podium (top 3)
  const podEmojis = ['🥇','🥈','🥉'];
  const podium    = document.getElementById('res-podium');
  if (podium) {
    // Render as 2nd, 1st, 3rd left-to-right for visual effect
    const order = results.length >= 3
      ? [results[1], results[0], results[2]]
      : results.length === 2
        ? [null, results[0], results[1]]
        : [null, results[0], null];

    podium.innerHTML = order.map((r, visIdx) => {
      const realRank = visIdx === 0 ? 2 : visIdx === 1 ? 1 : 3;
      if (!r) return '';
      const isMe = r.name.includes(S.name);
      return `
        <div class="pod pod-${realRank}" style="${isMe ? 'border-color:var(--c3);box-shadow:var(--g3)' : ''}">
          <div class="pod-emoji">${podEmojis[realRank - 1]}</div>
          <div class="pod-name" style="${isMe ? 'color:var(--c3)' : ''}">${r.name}</div>
          <div class="pod-score">${r.score}${unit}</div>
        </div>
      `;
    }).join('');
  }

  // Full standings
  const list = document.getElementById('res-list');
  if (list) {
    list.innerHTML = results.map((r, i) => {
      const isMe = r.name.includes(S.name);
      return `
        <div class="fl-row">
          <span class="fl-rank">${podEmojis[i] || ('#' + (i + 1))}</span>
          <span style="flex:1;${isMe ? 'font-weight:700;color:var(--c3)' : ''}">${r.name}</span>
          <span class="fl-score">${r.score} ${unit}</span>
        </div>
      `;
    }).join('');
  }

  // Update win/loss stats
  if (S.myStats) {
    S.myStats.gamesPlayed = (S.myStats.gamesPlayed || 0) + 1;
    if (isWin) S.myStats.wins = (S.myStats.wins || 0) + 1;
  }
}

function playAgain() {
  showPage('pg-room');
  renderRoom();
  hideBottomNav();
}
