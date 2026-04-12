/* ================================================================
   state.js — Global Application State
   Single source of truth. Mutate only via explicit assignments.
   In multiplayer: sync this with the WebSocket server.
================================================================ */
'use strict';

const S = {
  /* Auth / identity */
  name: '',

  /* Current room */
  game:     null,          // 'reflex' | 'wordbomb' | 'pattern' | 'typerace' | 'quiz'
  code:     '',            // 6-char room code
  roomType: 'public',      // 'public' | 'private'
  isHost:   false,

  /* Players in current room */
  players: [],             // [{ name, color, isMe, ready }]

  /* Quiz settings */
  quizQs:   [],
  quizSecs: 20,

  /* Chat */
  chatChannel:  'global',
  chatMessages: {},        // { channelId: [{ author, text, time, system? }] }

  /* Social */
  friends: [],             // [{ name, online, stats }]
  myStats: {},
};
