/* ================================================================
   ui/nav.js — Navigation, Page Switching, Sidebar
================================================================ */
'use strict';

let sidebarExpanded = false;

function toggleSidebar() {
  sidebarExpanded = !sidebarExpanded;
  document.getElementById('sidebar').classList.toggle('expanded', sidebarExpanded);
  document.getElementById('sb-toggle').textContent = sidebarExpanded ? '⟨' : '⟩';
}

/**
 * Navigate to a main page (lobby, chat, friends).
 * @param {'lobby'|'chat'|'friends'} pg
 */
function navTo(pg) {
  document.querySelectorAll('.sb-item').forEach(e => e.classList.remove('active'));
  document.querySelectorAll('.bn-item').forEach(e => e.classList.remove('active'));

  const sbEl = document.getElementById('sb-' + pg);
  if (sbEl) sbEl.classList.add('active');
  const bnEl = document.getElementById('bn-' + pg);
  if (bnEl) bnEl.classList.add('active');

  if (pg === 'lobby') {
    showPage('pg-lobby');
    showBottomNav();
    renderLB();
  } else if (pg === 'chat') {
    showPage('pg-chat');
    document.getElementById('chat-notif').classList.remove('on');
    document.getElementById('bn-chat-dot').classList.remove('on');
    initChat();
    showBottomNav();
  } else if (pg === 'friends') {
    showPage('pg-friends');
    showBottomNav();
  }
}

/**
 * Show a specific page/screen by element ID.
 * Handles bottom-nav visibility automatically.
 * @param {string} id - element id like 'pg-lobby', 'pg-reflex', etc.
 */
function showPage(id) {
  document.querySelectorAll('.page, .game-screen, .result-screen')
    .forEach(p => p.classList.remove('on'));
  const el = document.getElementById(id);
  if (el) el.classList.add('on');

  const isGameOrResult = el && (
    el.classList.contains('game-screen') ||
    el.classList.contains('result-screen') ||
    id === 'pg-quiz-setup' ||
    id === 'pg-room'
  );
  if (isGameOrResult) hideBottomNav();
  else if (S.name) showBottomNav();
}

function showBottomNav() {
  const el = document.getElementById('bottom-nav');
  if (el) el.style.display = 'flex';
}

function hideBottomNav() {
  const el = document.getElementById('bottom-nav');
  if (el) el.style.display = 'none';
}
