/* ================================================================
   ui/friends.js — Friends List & Profile Panel
================================================================ */
'use strict';

const AVATAR_COLORS = ['#00e5ff', '#ff3d6b', '#ffe033', '#39ff94', '#c77dff', '#ff8c42'];

function renderFriendsList() {
  const countEl = document.getElementById('friend-count');
  const listEl  = document.getElementById('friend-list');
  if (countEl) countEl.textContent = S.friends.filter(f => f.online).length;
  if (!listEl) return;

  if (!S.friends.length) {
    listEl.innerHTML = `<div style="font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--muted);padding:1rem 0;text-align:center">No friends yet — search and add players!</div>`;
    return;
  }

  listEl.innerHTML = S.friends.map((f, i) => `
    <div class="friend-item" onclick="viewProfile(${i})">
      <div class="f-avatar" style="background:linear-gradient(135deg,${AVATAR_COLORS[i % AVATAR_COLORS.length]},${AVATAR_COLORS[(i+2) % AVATAR_COLORS.length]})">
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
        <div class="profile-since">NOOB.gg Player</div>
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

  // Search among currently connected players via server would go here.
  // For now, show a helpful message.
  res.innerHTML = `<div style="font-family:'JetBrains Mono',monospace;font-size:.75rem;color:var(--muted)">
    Player search requires both players to be online. Share your room code to play together!
  </div>`;
}

function addFriend(name) {
  if (!S.friends.find(f => f.name === name)) {
    S.friends.push({
      name,
      online: false,
      stats: { reflex: 0, typerace: 0, quiz: 0, wins: 0, gamesPlayed: 0 }
    });
    renderFriendsList();
  }
  toast(name + ' added as friend! 🤝', 'ok');
  closeModals();
}
