/* ================================================================
   ui/toast.js — Toast Notification System
================================================================ */
'use strict';

/**
 * Show a toast notification.
 * @param {string} msg    - Message text
 * @param {'info'|'ok'|'err'|'warn'} type - Visual style
 * @param {number} dur    - Duration in ms
 */
function toast(msg, type = 'info', dur = 2800) {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), dur);
}
