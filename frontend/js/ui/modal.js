/* ================================================================
   ui/modal.js — Modal / Overlay System
================================================================ */
'use strict';

function openModal(game) {
  S.game = game;
  const names = {
    reflex:   '🎯 Reflex Arena',
    wordbomb: '💣 Word Bomb',
    pattern:  '🧠 Memory Lock',
    typerace: '⌨️ Type Race',
    quiz:     '📋 Quiz Battle',
  };
  document.getElementById('modal-title').textContent = names[game] || 'Join Game';
  switchTab('create');
  setRoomType('public');
  document.getElementById('modal-room').classList.add('on');
}

function closeModals() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('on'));
}

function switchTab(tab) {
  document.getElementById('tab-create-body').style.display = tab === 'create' ? '' : 'none';
  document.getElementById('tab-join-body').style.display   = tab === 'join'   ? '' : 'none';
  document.getElementById('tab-create').classList.toggle('on', tab === 'create');
  document.getElementById('tab-join').classList.toggle('on', tab === 'join');
}

function setRoomType(type) {
  S.roomType = type;
  const pub = document.getElementById('tp-pub');
  const pvt = document.getElementById('tp-pvt');
  pub.style.background = type === 'public' ? 'rgba(57,255,148,.1)' : '';
  pub.style.color       = type === 'public' ? 'var(--c4)' : '';
  pub.style.border      = type === 'public' ? '1px solid rgba(57,255,148,.3)' : '';
  pvt.className = type === 'private' ? 'btn btn-full btn-cyan' : 'btn btn-full btn-muted';
}
