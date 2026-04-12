/* ================================================================
   ui/friends.js — Friends List & Profile Panel
================================================================ */
'use strict';

function renderFriendsList() {
  const countEl = document.getElementById('friend-count');
  const listEl  = document.getElementById('friend-list');
  if (countEl) countEl.textContent = S.friends.filter(f => f.online).length;
  if (!listEl) return;

  listEl.innerHTML = S.friends.map((f, i) => `
    <div class="friend-item" onclick="viewProfile(${i})">
      <div class="f-avatar" style="background:linear-gradient(135deg,${BOT_COLS[i % BOT_COLS.length]},${BOT_COLS[(i+2) % BOT_COLS.length]})">
        ${f.name[0].toUpperCase()}
        <div class="f-online-dot ${f.online ? 'on' : 'off'}"></div>
      </div>
      <div class="f-info">
        <div class="f-name">${f.name}</div>
        <div class="f-status">${f.online ? '🟢 Online' : '⚫ Offline'}</div>
      </div>
    </div>
  `).join('');
}

function viewProfile(idx) {
  const isMe = idx === -1;
  const f    = isMe
    ? { name: S.name, online: true, stats: S.myStats }
    : S.friends[idx];

  document.querySelectorAll('.friend-item')
    .forEach((el, i) => el.classList.toggle('active', i === idx));

  const panel = document.getElementById('profile-panel');
  if (!panel) return;

  const gameStats = [
    { icon:'🎯', name:'Reflex Arena', val: f.stats.reflex    ? f.stats.reflex    + 'ms best' : '—' },
    { icon:'⌨️', name:'Type Race',   val: f.stats.typerace  ? f.stats.typerace  + ' WPM'    : '—' },
    { icon:'📋', name:'Quiz Battle', val: f.stats.quiz       ? f.stats.quiz      + ' pts'    : '—' },
  ];

  const winRate = f.stats.wins && f.stats.gamesPlayed
    ? Math.round(f.stats.wins / f.stats.gamesPlayed * 100) + '%'
    : '0%';

  panel.innerHTML = `
    <div class="profile-hero">
      <div class="profile-av-lg" style="background:linear-gradient(135deg,${isMe ? 'var(--c1),var(--c5)' : 'var(--c2),var(--c5)'})">
        ${f.name[0].toUpperCase()}
      </div>
      <div class="profile-info">
        <div class="profile-name">${f.name}${isMe ? ' <span style="font-size:.75rem;color:var(--muted)">(You)</span>' : ''}</div>
        <div class="profile-since">Member since Feb 2026</div>
        <div class="profile-btns">
          ${!isMe ? `
            <button class="btn btn-green btn-sm" onclick="toast('Friend request sent! 🤝','ok')">+ Add Friend</button>
            <button class="btn btn-cyan btn-sm" onclick="navTo('chat');switchChatChannel('global')">💬 Message</button>
          ` : `
            <button class="btn btn-ghost btn-sm" onclick="toast('Profile editing coming soon!','info')">✏️ Edit Profile</button>
          `}
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-val" style="color:var(--c3)">${f.stats.wins || 0}</div>
        <div class="stat-lbl">Wins</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color:var(--c1)">${f.stats.gamesPlayed || 0}</div>
        <div class="stat-lbl">Games</div>
      </div>
      <div class="stat-box">
        <div class="stat-val" style="color:var(--c4)">${winRate}</div>
        <div class="stat-lbl">Win Rate</div>
      </div>
    </div>

    <div class="section-h" style="margin-bottom:.875rem">
      <h2 style="font-size:.72rem;color:var(--c5)">Game Stats</h2>
      <div class="line"></div>
    </div>

    <div class="game-stats-list">
      ${gameStats.map(g => `
        <div class="gstat-row">
          <span class="gstat-icon">${g.icon}</span>
          <div class="gstat-info">
            <div class="gstat-name">${g.name}</div>
            <div class="gstat-detail">Personal best</div>
          </div>
          <div class="gstat-score" style="color:var(--c1)">${g.val}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function showMyProfile() {
  navTo('friends');
  viewProfile(-1);
}

function openAddFriend() {
  document.getElementById('modal-add-friend').classList.add('on');
  setTimeout(() => document.getElementById('af-inp').focus(), 50);
}

function searchFriend() {
  const v   = document.getElementById('af-inp').value.trim();
  const res = document.getElementById('af-results');
  if (!v) { toast('Enter a name!', 'err'); return; }

  const found = BOT_NAMES.filter(n => n.toLowerCase().includes(v.toLowerCase()));
  if (!found.length) {
    res.innerHTML = `<div style="font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--muted)">No players found.</div>`;
    return;
  }

  res.innerHTML = found.map(n => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border)">
      <span style="font-weight:600">${n}</span>
      <button class="btn btn-green btn-sm" onclick="addFriend('${n}');this.textContent='✓ Added';this.disabled=true">+ Add</button>
    </div>
  `).join('');
}

function addFriend(name) {
  if (!S.friends.find(f => f.name === name)) {
    S.friends.push({
      name,
      online: Math.random() > .5,
      stats: {
        reflex:      Math.round(200 + Math.random() * 300),
        typerace:    Math.floor(50  + Math.random() * 80),
        quiz:        Math.floor(1000 + Math.random() * 5000),
        wins:        Math.floor(2   + Math.random() * 20),
        gamesPlayed: Math.floor(8   + Math.random() * 50),
      }
    });
    renderFriendsList();
  }
  toast(name + ' added as friend! 🤝', 'ok');
  closeModals();
}
