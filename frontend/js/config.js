/* ================================================================
   config.js — App-wide Constants & Static Data
   NOOB.gg — No logic here, just pure data.
================================================================ */
'use strict';

const APP_NAME    = 'NOOB.gg';
const APP_VERSION = '1.0.0';

/* WebSocket server URL — swap this for your actual backend */
const WS_URL = 'wss://noob-gg.onrender.com/ws';

/* Bot names & colors used for simulated multiplayer */
const BOT_NAMES = ['Arjun_X', 'Neha_X', 'Rohan_X', 'Priya_X', 'Karan_X'];
const BOT_COLS  = ['#00e5ff', '#ff3d6b', '#ffe033', '#39ff94', '#c77dff', '#ff8c42'];

/* ── ENGLISH WORD DICTIONARY (subset — enough for Word Bomb) ── */
const WORD_DICT = new Set(`
able about above accept access account across act action active actual add address
adult advance after again against age ago agree ahead air all allow almost along
already also always among amount and another any apart apply approach area around arrive
ask associate assume attack attend authority available away back bad base become before
behind believe benefit best better between big black body book both bring build business
call can care carry case cause certain change charge chat check child claim class clear
close come common community company complete concern consider contain continue control cost
could course cover create cross cut dark data deal death degree describe design detail
develop different difficult direct discuss drive each early east easy effect else enable
enough enter entry environment equal even event every exact example exist experience face
fact fall false family far fast feel field fight find fine finish first follow force form
free from front full future game give glass global good government group grow half hand
hard have head hear help high hold home hope house human idea identify include industry
inside instead interest involve issue itself join keep kind know land large last later
learn leave level life light likely list live local long look major make manage many
market matter may media meet method mind modern money more move much national near need
network never next night none north note nothing number object often open operate order
other outside over own paper part pass past percent person place plan point policy post
power present press prevent private probably produce project public put question quick range
reach read real receive reflect relate remain report require research respond result return
right risk role rule run same save say school search seem select send service several
share show simple since skill small social society some sort sound south space stand start
state stay still stock stop structure study subject such support sure system table take
talk task teach team tell term test than think three through time together top town trade
travel true trust truth turn type understand unit until upon use value very view visit
wait want water while wide will wind wish within world write
`.trim().split(/\s+/));

/* ── SYLLABLE → KNOWN VALID WORDS ── */
const SYLLABLE_VALID_WORDS = {
  ST: ['STREET','STRONG','START','STONE','STORM','STATION','STACK','STAND','STAR','STOP','STEEL','STEM'],
  ING:['KING','RING','BRING','SPRING','SOMETHING','STING','SWING','SING','THING','WING','STRING'],
  ER: ['UNDER','WATER','ENTER','RIVER','NEVER','AFTER','TIGER','SUPER','FLOWER','SILVER','WONDER'],
  AT: ['THAT','FLAT','GREAT','CHAT','HATE','LATE','RATE','STATE','GATE','PLATE','SKATE','DEBATE'],
  EN: ['OPEN','THEN','GREEN','SEVEN','EVEN','OFTEN','WHEN','QUEEN','LEMON','GARDEN','SCREEN','CHICKEN'],
  OR: ['FLOOR','STORE','BEFORE','SPORT','SHORT','STORM','BORDER','CORNER','RECORD','ORDER','IGNORE','HORROR'],
  AL: ['ALSO','SMALL','TALL','BALL','WALL','TOTAL','ANIMAL','FINAL','LOCAL','METAL','MORAL','ROYAL'],
  TH: ['WITH','BOTH','EARTH','WORTH','TEETH','BIRTH','DEATH','CLOTH','HEALTH','GROWTH','NORTH','SOUTH'],
  CH: ['MUCH','EACH','REACH','TEACH','BEACH','TOUCH','RICH','LUNCH','BUNCH','RANCH','ARCH','CATCH'],
  RE: ['FREE','THREE','AGREE','TREE','FREEZE','GREET','DEGREE','STREET','STREAM','DREAM','CREAM','SCREAM'],
  UN: ['UNDER','UNTIL','UNCLE','FUNNY','RUNNING','SUNDRY','BUNCH','FUND','PUNCH','JUNGLE','BUNDLE','HUNGER'],
  IN: ['FIND','KIND','MIND','SPIN','SKIN','TWIN','GRIN','PRINT','DRINK','THINK','SHRINK','BRING'],
  ON: ['BONE','DONE','STONE','PHONE','ALONE','THRONE','NONE','ZONE','TONE','PRONE','SHONE','CONDONE'],
  AN: ['CAN','MAN','PLAN','SCAN','BEGAN','JAPAN','HUMAN','URBAN','ORGAN','OCEAN','SPAN','THAN'],
  AR: ['CAR','FAR','STAR','CHART','SHARP','PARTY','MARCH','LARGE','GARDEN','MARKET','ARTIST','CARBON'],
  OW: ['SHOW','SLOW','BLOW','FLOW','GROW','KNOW','SNOW','THROW','BELOW','ELBOW','FOLLOW','HOLLOW'],
  IG: ['BIG','DIG','RIG','SIGN','NIGHT','LIGHT','FIGHT','MIGHT','RIGHT','SIGHT','BRIGHT','FLIGHT'],
  OT: ['NOT','HOT','SHOT','KNOT','SPOT','PLOT','BLOT','TROT','ROBOT','PILOT','BALLOT','DEVOTE'],
  AM: ['GAME','FAME','SAME','NAME','FRAME','BLAME','FLAME','CLAIM','EXAM','STEAM','SCREAM','GRAM'],
  OL: ['COLD','BOLD','FOLD','GOLD','HOLD','MOLD','SOLD','TOLD','OLDER','GOLDEN','SOLDIER','SHOULDER'],
};

/* ── QUIZ QUESTION BANK ── */
const QUIZ_BANK = [
  {q:'What does "HTTP" stand for?', opts:['HyperText Transfer Protocol','High Transfer Text Protocol','Hyper Terminal Transfer Protocol','HyperText Transmission Port'], correct:0},
  {q:'Which data structure uses LIFO?', opts:['Queue','Stack','Array','Tree'], correct:1},
  {q:'What is the time complexity of binary search?', opts:['O(n)','O(n²)','O(log n)','O(1)'], correct:2},
  {q:'Which language runs in the browser natively?', opts:['Python','Java','C++','JavaScript'], correct:3},
  {q:'What does CSS stand for?', opts:['Cascading Style Sheets','Computer Style Syntax','Creative Sheet System','Code Style Standard'], correct:0},
  {q:'Which port does HTTPS use by default?', opts:['80','8080','443','3000'], correct:2},
  {q:'What is a "null pointer dereference"?', opts:['A typo in code','Accessing memory at address 0','A slow network call','A corrupted database'], correct:1},
  {q:'Which sorting algorithm has O(n log n) average case?', opts:['Bubble Sort','Insertion Sort','Merge Sort','Selection Sort'], correct:2},
  {q:'What does API stand for?', opts:['App Programming Interface','Application Protocol Integration','Application Programming Interface','Advanced Protocol Interface'], correct:2},
  {q:'Which protocol is WebSocket based on?', opts:['UDP','TCP','FTP','SMTP'], correct:1},
  {q:'What is the output of: typeof null in JavaScript?', opts:['"null"','"undefined"','"object"','"boolean"'], correct:2},
  {q:'Which Git command stages all changed files?', opts:['git commit -a','git add .','git push origin','git stage all'], correct:1},
  {q:'What does SQL stand for?', opts:['Structured Query Language','Simple Question Language','System Queue Logic','Sequential Query Layout'], correct:0},
  {q:'Which HTTP method is typically used to UPDATE a resource?', opts:['GET','POST','PUT','DELETE'], correct:2},
  {q:'What does DOM stand for?', opts:['Document Object Model','Data Object Management','Display Output Method','Dynamic Object Module'], correct:0},
];

/* ── LEADERBOARD SEED DATA ── */
const LB = {
  reflex:   [{name:'Arjun',score:187},{name:'Priya',score:211},{name:'Rohan',score:245}],
  wordbomb: [{name:'Neha',score:14},{name:'Arjun',score:11},{name:'Karan',score:9}],
  pattern:  [{name:'Priya',score:9},{name:'Rohan',score:7},{name:'Neha',score:6}],
  typerace: [{name:'Arjun',score:118,u:'WPM'},{name:'Neha',score:102,u:'WPM'},{name:'Rohan',score:91,u:'WPM'}],
  quiz:     [{name:'Rohan',score:5200},{name:'Priya',score:4800},{name:'Arjun',score:4100}],
};

/* ── TYPE RACE ROUND DEFINITIONS ── */
const TR_ROUNDS = [
  {
    label: 'Round 1 — Warm Up',
    color: 'var(--c4)', borderColor: 'rgba(57,255,148,.3)',
    texts: [
      "The internet is a vast global network that connects billions of devices across the world. It enables people to communicate, share information, and access services from anywhere at any time.",
      "Software engineering is the discipline of designing, building, and maintaining software systems. It involves careful planning, clear requirements, and iterative development to create reliable applications.",
      "Real-time communication allows users to exchange messages and data instantly without perceptible delay. This capability is essential for multiplayer games, video calls, and collaborative editing tools.",
    ]
  },
  {
    label: 'Round 2 — Technical Mode',
    color: 'var(--c3)', borderColor: 'rgba(255,224,51,.3)',
    texts: [
      "WebSocket connections operate over TCP/IP port 443 using the wss:// protocol. The server maintains 1024 concurrent sessions with avg latency < 50ms and 99.9% uptime SLA guarantees.",
      "The SHA-256 hash function produces a 256-bit (32-byte) output. Memory usage peaks at 2.4GB during high-load scenarios, with CPU at 87.3% utilization across 16 threads on Node.js v18.12.0.",
      "API endpoints: GET /api/v2/users/{id}, POST /api/v2/rooms, DELETE /api/v2/sessions/{token}. Rate limit: 100 req/min. Response format: { status: 200, data: [], meta: { total: 1024 } }.",
    ]
  },
  {
    label: 'Round 3 — Code Challenge',
    color: 'var(--c2)', borderColor: 'rgba(255,61,107,.3)',
    texts: [
      "const ws = new WebSocket('wss://noob.gg/game?room=XK7F2Q'); ws.onopen = () => ws.send(JSON.stringify({ type: 'JOIN', payload: { name: 'Player1', token: 'abc-123' } }));",
      "function calcScore(ms, maxTime) { return ms < maxTime ? Math.round(1000 + (1 - ms/maxTime) * 500) : 0; } // Returns 0-1500 pts based on speed: <100ms=1500, >limit=0",
      "SELECT u.name, AVG(g.score) AS avg_score FROM users u JOIN game_results g ON u.id = g.user_id WHERE g.created_at > NOW() - INTERVAL '7 days' GROUP BY u.name ORDER BY avg_score DESC LIMIT 10;",
    ]
  }
];

/* ── CHAT CHANNELS ── */
const CHAT_CHANNELS = [
  {id:'global',   icon:'🌐', name:'Global',    sub:'All players online'},
  {id:'gaming',   icon:'🎮', name:'Gaming',    sub:'Game talk'},
  {id:'off-topic',icon:'💬', name:'Off-Topic', sub:'Chill chat'},
];

const BOT_MSGS = {
  global:     ["gg everyone", "anyone up for a quiz?", "my reflex is getting better 😤", "this platform is 🔥", "who wants to play word bomb?", "just hit 145 WPM on type race!", "anyone else find memory lock insane?"],
  gaming:     ["bro that reflex arena is addicting", "word bomb strategy: always use words with common endings", "type race round 3 is brutal lol", "memory lock at round 8 is where I keep dying"],
  'off-topic':["what's everyone studying?", "anyone deploying to Vercel too?", "this was built for a college project 😂", "the quiz battle UI looks exactly like kahoot!"],
};
