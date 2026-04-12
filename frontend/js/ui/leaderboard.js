/* ================================================================
   ui/leaderboard.js — Leaderboard Rendering
================================================================ */
'use strict';

function renderLB() {
  const config = [
    { key:'reflex',   icon:'🎯', name:'Reflex Arena',  unit:'ms',  low:true  },
    { key:'wordbomb', icon:'💣', name:'Word Bomb',      unit:'rnds',low:false },
    { key:'pattern',  icon:'🧠', name:'Memory Lock',   unit:'pts', low:false },
    { key:'typerace', icon:'⌨️', name:'Type Race',     unit:'WPM', low:false },
    { key:'quiz',     icon:'📋', name:'Quiz Battle',   unit:'pts', low:false },
  ];

  const grid = document.getElementById('lb-grid');
  if (!grid) return;

  grid.innerHTML = config.map(c => {
    const rows = (LB[c.key] || []).slice(0, 3);
    return `
      <div class="lb-card">
        <div class="lb-card-hd">
          <span style="font-size:1.1rem">${c.icon}</span>
          <span style="font-family:'Orbitron',monospace;font-size:.72rem;font-weight:700;color:var(--text)">${c.name}</span>
        </div>
        ${rows.map((r, i) => `
          <div class="lb-row">
            <span class="lb-rank ${i === 0 ? 'g' : ''}">#${i + 1}</span>
            <span style="flex:1;font-size:.82rem;${r.name === S.name ? 'color:var(--c3);font-weight:700' : ''}">${r.name}</span>
            <span class="lb-score" style="color:${i===0?'var(--c3)':'var(--c1)'}">
              ${r.score}${r.u || c.unit}
            </span>
          </div>
        `).join('')}
        ${rows.length === 0 ? `<div style="font-family:'JetBrains Mono',monospace;font-size:.7rem;color:var(--muted);padding:.5rem 0">No scores yet</div>` : ''}
      </div>
    `;
  }).join('');
}
