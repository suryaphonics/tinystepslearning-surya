// script.js

document.addEventListener('DOMContentLoaded', () => {
  // Utility
  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function L(letter, word, imageFile, audioUrl = '') {
    return { id: letter, letter, word, imageFile, audioUrl };
  }

  // Data: sets
  const SETS = [
    {
      id: 1, name: "Set 1: s a t i p n",
      letters: [
        L('s','Sun','sun.svg'),
        L('a','Apple','apple.svg'),
        L('t','Tiger','tiger.svg'),
        L('i','Igloo','igloo.svg'),
        L('p','Pan','pan.svg'),
        L('n','Nest','nest.svg')
      ]
    },
    {
      id: 2, name: "Set 2: c k e h r m d",
      letters: [
        L('c','Cat','cat.svg'),
        L('k','Kite','kite.svg'),
        L('e','Egg','egg.svg'),
        L('h','Hat','hat.svg'),
        L('r','Rabbit','rabbit.svg'),
        L('m','Monkey','monkey.svg'),
        L('d','Dog','dog.svg')
      ]
    },
    {
      id: 3, name: "Set 3: g o u l f b",
      letters: [
        L('g','Goat','goat.svg'),
        L('o','Orange','orange.svg'),
        L('u','Umbrella','umbrella.svg'),
        L('l','Lion','lion.svg'),
        L('f','Fox','fox.svg'),
        L('b','Ball','ball.svg')
      ]
    },
    {
      id: 4, name: "Set 4: j z w v y",
      letters: [
        L('j','Jug','jug.svg'),
        L('z','Zebra','zebra.svg'),
        L('w','Watch','watch.svg'),
        L('v','Van','van.svg'),
        L('y','Yak','yak.svg')
      ]
    },
    {
      id: 5, name: "Set 5: x q",
      letters: [
        L('x','X‑ray','xray.svg'),
        L('q','Queen','queen.svg')
      ]
    }
  ];

  // Config / state
  const CHOICES_PER_ROUND = 4;
  const MISSES_FOR_HINT = 2;
  const MISSES_FOR_EASY = 3;
  const COINS_PER_CORRECT = 5;
  const BONUS_STREAK_STEPS = [3,5,8];
  const COINS_BONUS = {3:10, 5:15, 8:25};

  const LS_KEY = "tinySteps_alpha_sets_v4";

  let state = loadState();
  let round = { target: null, pool: [], misses: 0 };

  

  // DOM refs
  const setNav = document.getElementById('setNav');
  const setName = document.getElementById('setName');
  const lettersLeft = document.getElementById('lettersLeft');
  const barFill = document.getElementById('barFill');
  const grid = document.getElementById('grid');
  const statusEl = document.getElementById('status');
  const btnPlay = document.getElementById('btnPlay');
  if (btnPlay) btnPlay.classList.add('listen-glow');

  const btnHint = document.getElementById('btnHint');
  const btnReset = document.getElementById('btnReset');
  const backBtn = document.getElementById('backBtn');
  const streakEl = document.getElementById('streak');
  const coinsEl = document.getElementById('coins');
  const cele = document.getElementById('cele');
  const celeNext = document.getElementById('celeNext');
  const celeSub = document.getElementById('celeSub');
  const confCanvas = document.getElementById('confetti');
  const miniCongrats = document.getElementById('miniCongrats');
  let cctx = null;

  if (confCanvas && confCanvas.getContext) {
    cctx = confCanvas.getContext('2d');
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  }

  // Event listeners
  if (btnPlay) btnPlay.addEventListener('click', () => speakTarget(round.target));
  if (btnHint) btnHint.addEventListener('click', showHint);
  if (btnReset) btnReset.addEventListener('click', () => {
    if (confirm("Reset all progress, streaks and coins?")) {
      state = { currentSet:1, mastered:{}, orderCache:{}, coins:0, streak:0, bestStreak:0 };
      saveState();
      buildSetNav();
      updateStats();
      newRound();
    }
  });

  if (backBtn) backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (document.referrer && (new URL(document.referrer)).host === location.host) {
      window.history.back();
    } else {
      window.location.href = '/kids/games/phonics/';
    }
  });

  if (celeNext) celeNext.addEventListener('click', () => {
    hideCelebration();
    goToNextSet();
  });

  // Initial setup
  buildSetNav();
  updateStats();
  newRound();

  // Core functions

  function buildSetNav() {
    setNav.innerHTML = "";
    const highest = getHighestUnlockedSet();
    SETS.forEach(s => {
      const dot = document.createElement('div');
      dot.className = 'dot' + (s.id === state.currentSet ? ' active' : '');
      dot.textContent = s.id;
      if (s.id <= highest) {
        dot.style.cursor = 'pointer';
        dot.addEventListener('click', () => {
          state.currentSet = s.id;
          saveState();
          buildSetNav();
          newRound();
        });
      } else {
        dot.style.opacity = '0.5';
      }
      setNav.appendChild(dot);
    });
  }
function enterFullscreen() {
  const el = document.documentElement; // or document.getElementById('card')
  if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) return;

  const req =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||    // Safari
    el.msRequestFullscreen;          // old Edge/IE

  if (req) {
    try { req.call(el); } catch (_) {}
  }
}

function ensureFullscreenOnFirstTap() {
  const once = () => {
    enterFullscreen();
    document.removeEventListener('click', once, false);
    document.removeEventListener('touchstart', once, false);
  };
  document.addEventListener('click', once, false);
  document.addEventListener('touchstart', once, { passive: true });
}
// Try immediately (may be blocked by some browsers)
enterFullscreen();

// Guarantee on first tap anywhere
ensureFullscreenOnFirstTap();

// Also try when they press primary buttons
if (btnPlay) btnPlay.addEventListener('click', enterFullscreen, { once: true });
if (btnHint) btnHint.addEventListener('click', enterFullscreen, { once: true });


  function newRound() {
    round.misses = 0;
    const s = currentSet();
    ensureOrderCache(s.id);
    if (!state.orderCache[s.id] || !state.orderCache[s.id].length) {
      ensureOrderCache(s.id);
    }
    const targetLetter = state.orderCache[s.id].shift();
    saveState();
    round.target = s.letters.find(l => l.letter === targetLetter);

    let pool = shuffle([...s.letters]).filter(l => l.letter !== round.target.letter);
    while (pool.length < CHOICES_PER_ROUND - 1) {
      const extras = shuffle(SETS.flatMap(ss => ss.letters))
        .filter(l => l.letter !== round.target.letter && !pool.includes(l));
      pool.push(...extras.slice(0, (CHOICES_PER_ROUND - 1) - pool.length));
    }
    pool = pool.slice(0, CHOICES_PER_ROUND - 1);
    pool.push(round.target);
    pool = shuffle(pool);
    round.pool = pool;

    renderChoices(pool);
    updateProgressUI();
    setStatus("Listen and tap the matching picture.");
  }

  function renderChoices(pool) {
    grid.innerHTML = "";
    pool.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'tile';
      btn.setAttribute('aria-label', item.word);
      btn.innerHTML = `
        <div class="emoji">
          <img src="images/${item.imageFile}" alt="${item.word}">
        </div>
        <div class="label">${cap(item.word)}</div>
      `;
      btn.addEventListener('click', (e) => {
        onChoose(item, btn, e.clientX, e.clientY);
      });
      grid.appendChild(btn);
    });
  }

  function onChoose(item, btnEl, x, y) {
  if (!round.target) return;

  if (item.letter === round.target.letter) {
    // Correct answer
    btnEl.classList.add('correct-win');
    btnEl.style.outlineColor = getComputedStyle(document.documentElement).getPropertyValue('--good');
    btnEl.style.transform = 'scale(1.05)';

    state.streak = (state.streak || 0) + 1;
    state.mastered = state.mastered || {};
    state.mastered[item.letter] = true;
    saveState();
    updateStats();
    updateProgressUI();

    // 🔊 Clap sound!
    playClap();

    // Feedback
    showMiniCongrats();
    confettiBurst();

    setTimeout(() => {
      const s2 = currentSet();
      const allDone = s2.letters.every(l => state.mastered && state.mastered[l.letter]);
      if (allDone) { showCelebration(s2.id); } else { newRound(); }
    }, 4200);
  
      
   } else {
  // ❌ WRONG answer — single source of truth for misses + consistent glow
  round.misses = (round.misses || 0) + 1;

  // Always nudge with a gentle glow so kids know where to look
  cueCorrectOne({ strong: false, durationMs: 2200 });

  // On the second miss, remove one wrong to reduce choices
  if (round.misses === 2) {
    removeOneWrong();
  }

  // After enough misses, also show your verbal hint
  if (round.misses >= MISSES_FOR_HINT) {
    showHint(); // this will also glow strongly (Step 2)
  }

  setStatus("Try again…");
}
}
  function showHint() {
  if (!round.target) return;

  // Speak the hint (keeps your existing helpful prompt)
  setStatus(`${round.target.letter} for ${round.target.word}.`);

  // 🔥 Strong, longer glow on the correct tile (visually obvious)
  cueCorrectOne({ strong: true, durationMs: 4000 });
}

function findCorrectTile() {
  const children = Array.from(grid.children);
  const correctWord = (round?.target?.word || "").toLowerCase();
  return children.find(child => {
    const labelEl = child.querySelector('.label');
    return labelEl && labelEl.textContent.toLowerCase() === correctWord;
  });
}

function cueCorrectOne(opts = { strong: false, durationMs: 2400 }) {
  const el = findCorrectTile();
  if (!el) return;

  // Choose class (stronger pulse if this came from HINT)
  const cls = opts.strong ? 'glow-pop-strong' : 'glow-pop';

  // Restart the animation even if it was already applied
  el.classList.remove('glow-pop', 'glow-pop-strong');
  void el.offsetWidth; // reflow to reset animation
  el.classList.add(cls);

  // Keep it glowing for the requested duration, then remove
  window.clearTimeout(el._glowTimer);
  el._glowTimer = window.setTimeout(() => {
    el.classList.remove('glow-pop', 'glow-pop-strong');
  }, opts.durationMs);
}


function removeOneWrong() {
  const children = Array.from(grid.children);
  const correctWord = (round?.target?.word || "").toLowerCase();

  const wrong = children.find(child => {
    const labelEl = child.querySelector('.label');
    return labelEl && labelEl.textContent.toLowerCase() !== correctWord && !child.classList.contains('fade-away');
  });
  if (wrong) {
    wrong.classList.add('fade-away');
    setTimeout(() => wrong.remove(), 420);
  }

  children.forEach(child => {
    const labelEl = child.querySelector('.label');
    if (!labelEl) return;
    const isCorrect = labelEl.textContent.toLowerCase() === correctWord;
    if (!isCorrect) child.classList.add('hint-dim');
    else child.classList.add('glow-pop');
  });

  setTimeout(() => {
    Array.from(grid.children).forEach(child => {
      child.classList.remove('hint-dim', 'glow-pop');
    });
  }, 2200);
}
  function showMiniCongrats() {
  if (!miniCongrats) return;
  miniCongrats.textContent = "🎉 Congratulations!";
  miniCongrats.style.display = 'block';

  // ensure bright, warm color each time
  miniCongrats.style.color = '#ff4d00';               // 🔸 vibrant orange
  miniCongrats.style.textShadow = '0 2px 0 #fff7, 0 0 18px #ff8a00aa';

  miniCongrats.classList.remove('show');
  void miniCongrats.offsetWidth; // restart CSS animation
  miniCongrats.classList.add('show');

  setTimeout(() => {
    miniCongrats.style.display = 'none';
  }, 4000); // 4s
}

// 🔔 Audio: Clap on correct
const CLAP_URL = 'audio/clap.mp3'; // put your file at /kids/games/phonics/sound-match/audio/clap.mp3
let clapAudio = null;

try {
  clapAudio = new Audio(CLAP_URL);
  clapAudio.preload = 'auto';
  clapAudio.volume = 0.9;
} catch (e) {
  console.warn('Clap audio init failed', e);
}

function playClap() {
  if (!clapAudio) return;

  const a = clapAudio.cloneNode(true);
  a.volume = 0.9;
  a.currentTime = 0;

  a.play().catch(() => {});

  // fade out 150ms before stop
  const stopAt = setTimeout(() => {
    const fadeMs = 150;
    const step = 15;
    const dec = a.volume / (fadeMs / step);
    const fader = setInterval(() => {
      a.volume = Math.max(0, a.volume - dec);
      if (a.volume <= 0.01) {
        clearInterval(fader);
        try { a.pause(); a.currentTime = 0; a.src = ""; a.remove(); } catch(_) {}
      }
    }, step);
  }, 4000 - 150);

  a.addEventListener('ended', () => clearTimeout(stopAt), { once: true });
}


  function showCelebration(setId) {
    cele.classList.add('show');
    celeSub.textContent = setId < SETS.length
      ? `You finished Set ${setId}! Next up: Set ${setId + 1} 🎯`
      : `You finished all sets!`;
  }

  function hideCelebration() {
    cele.classList.remove('show');
  }

  function goToNextSet() {
    const next = Math.min(currentSet().id + 1, SETS.length);
    state.currentSet = next;
    saveState();
    buildSetNav();
    newRound();
  }

  function speakTarget(item) {
    if (!item) return;
    if (item.audioUrl) {
      const audio = new Audio(item.audioUrl);
      audio.play().catch(e => console.warn("Audio error", e));
    } else {
      const text = `${item.letter} for ${item.word}. ${item.word}.`;
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.9;
        u.pitch = 1.1;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }
    }
  }

  function updateProgressUI() {
    const s = currentSet();
    if (setName) setName.textContent = s.name;
    const total = s.letters.length;
    const done = s.letters.filter(l => state.mastered && state.mastered[l.letter]).length;
    if (lettersLeft) lettersLeft.textContent = `${done}/${total} letters mastered`;
    if (barFill) barFill.style.width = `${(done/total) * 100}%`;
  }

  function updateStats() {
    if (streakEl) streakEl.textContent = state.streak || 0;
    if (coinsEl) coinsEl.textContent = state.coins || 0;
  }

  function ensureOrderCache(setId) {
    if (!state.orderCache) state.orderCache = {};
    if (!state.orderCache[setId] || !Array.isArray(state.orderCache[setId]) || !state.orderCache[setId].length) {
      const lettersArr = SETS.find(s => s.id === setId).letters.map(l => l.letter);
      state.orderCache[setId] = shuffle(lettersArr.slice());
      saveState();
    }
  }

  function currentSet() {
    return SETS.find(s => s.id === state.currentSet) || SETS[0];
  }

  function getHighestUnlockedSet() {
    let max = 1;
    SETS.forEach(s => {
      const all = s.letters.every(l => state.mastered && state.mastered[l.letter]);
      if (all) max = s.id;
    });
    return max;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function loadState() {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v) return JSON.parse(v);
    } catch(e) {
      console.warn("loadState parse error", e);
    }
    return { currentSet:1, mastered:{}, orderCache:{}, coins:0, streak:0, bestStreak:0 };
  }

  function saveState() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch(e) {
      console.warn("saveState error", e);
    }
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function resizeCanvas() {
    if (confCanvas) {
      confCanvas.width = window.innerWidth;
      confCanvas.height = window.innerHeight;
    }
  }

  function confettiBurst() {
    if (!cctx) return;
    const canvas = confCanvas;
    const colors = ['#FFD700', '#FF69B4', '#00FFFF', '#7CFC00', '#FFA500', '#FF4500'];
    const pieces = [];
    const count = 80;
    const maxFrames = 80;
    let frames = 0;

    for (let i = 0; i < count; i++) {
      pieces.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 + (Math.random() - 0.5) * 50,
        radius: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        dx: (Math.random() - 0.5) * 6,
        dy: (Math.random() - 0.5) * -6 - 2
      });
    }

    function draw() {
      cctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        cctx.beginPath();
        cctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        cctx.fillStyle = p.color;
        cctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        p.dy += 0.3;  // gravity
      });
      frames++;
      if (frames < maxFrames) {
        requestAnimationFrame(draw);
      } else {
        // cleanup: clear canvas
        cctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    draw();
  }

});  // end DOMContentLoaded
