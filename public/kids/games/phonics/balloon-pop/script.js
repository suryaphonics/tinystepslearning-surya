document.addEventListener('DOMContentLoaded', () => {

  // =========================================================
  // SKY DECORATIONS (Clouds, Planes, Birds, Rainbow)
  // =========================================================

  const skyCanvas = document.getElementById('skyCanvas'); 
  function resizeSky() {
    skyCanvas.width = window.innerWidth;
    skyCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeSky);
  resizeSky();

  const container = document.getElementById('gameContainer');

  function createDeco(className, size, top, left, speedX = 0.2, dir = 1) {
    const el = document.createElement('div');
    el.className = className;
    if (size) {
      el.style.width = size.w + 'px';
      el.style.height = size.h + 'px';
    }
    el.style.top = top + 'px';
    el.style.left = left + 'px';
    el.dataset.speedX = speedX;
    el.dataset.dir = dir;

    // 🎨 Random fun colors for birds & planes
    const colors = getComputedStyle(document.documentElement)
      .getPropertyValue('--balloon-colors')
      .split(',')
      .map(c => c.trim());
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    if (className === 'bird') el.style.setProperty('--bird-color', randomColor);
    if (className === 'plane') el.style.setProperty('--plane-color', randomColor);

    container.appendChild(el);
    return el;
  }

 // =========================
// Diagonal Clouds (PNG images drifting down)
// =========================
let clouds = [];
const cloudCount = 8;
const cloudImages = [
  "images/cloud1.png",
  "images/cloud2.png",
  "images/cloud3.png",
  "images/cloud4.png"
];

for (let i = 0; i < cloudCount; i++) {
  const cloud = document.createElement("div");
  cloud.className = "cloud";

  // Random cloud image
  const img = cloudImages[Math.floor(Math.random() * cloudImages.length)];
  cloud.style.backgroundImage = `url(${img})`;

  // Random size
  const w = 120 + Math.random() * 200;
  const h = w * 0.6;
  cloud.style.width = w + "px";
  cloud.style.height = h + "px";

  // Random starting position
  cloud.style.left = Math.random() * window.innerWidth + "px";
  cloud.style.top = -200 - Math.random() * 400 + "px";

  // Random diagonal drift speed
  cloud.style.animationDuration = (20 + Math.random() * 20) + "s";

  document.body.appendChild(cloud);

  // Respawn cloud after animation
  cloud.addEventListener("animationend", () => {
    cloud.style.top = -200 + "px";
    cloud.style.left = Math.random() * window.innerWidth + "px";
    cloud.style.animationDuration = (20 + Math.random() * 20) + "s";

    const newImg = cloudImages[Math.floor(Math.random() * cloudImages.length)];
    cloud.style.backgroundImage = `url(${newImg})`;
  });

  clouds.push(cloud);
}


  // Planes
  let planes = [];
  for (let i = 0; i < 2; i++) {
    const top = 80 + Math.random() * 120;
    const left = Math.random() * window.innerWidth;
    const dir = Math.random() < 0.5 ? -1 : 1;
    planes.push(createDeco('plane', { w: 0, h: 0 }, top, left, 1 + Math.random(), dir));
  }

  // Birds - larger, animated, with variation
let birds = [];
for (let i = 0; i < 5; i++) {  // a few more birds for variety
  const top = 50 + Math.random() * 200;
  const left = Math.random() * window.innerWidth;
  const dir = Math.random() < 0.5 ? -1 : 1;

  // random size (closer birds bigger)
  const w = 40 + Math.random() * 50;  // 40–90px wide
  const h = w / 2;                    // keep bird proportion

  const bird = createDeco('bird', { w: w, h: h }, top, left, 0.4 + Math.random() * 0.6, dir);

  // random bird color (dark shades for visibility)
  const colors = ["#000", "#333", "#111", "#444"];
  bird.style.setProperty('--bird-color', colors[Math.floor(Math.random() * colors.length)]);

  // each bird has its own flap speed
  bird.style.animationDuration = `${1 + Math.random() * 0.5}s`;

  birds.push(bird);
}

  // Animate decorations
  function animateDecor() {
    const all = [...clouds, ...planes, ...birds];
    all.forEach(el => {
      let x = parseFloat(el.style.left);
      const speed = parseFloat(el.dataset.speedX) || 1;
      const dir = parseInt(el.dataset.dir) || 1;
      x += speed * dir;
      if (dir > 0 && x > window.innerWidth + 50) x = -50;
      if (dir < 0 && x < -50) x = window.innerWidth + 50;
      el.style.left = x + 'px';
    });
    requestAnimationFrame(animateDecor);
  }
  animateDecor();


  // =========================================================
  // STAR BACKGROUND
  // =========================================================

  const starCanvas = document.getElementById('starCanvas');
  const ctx = starCanvas.getContext('2d');
  let stars = [];
  const STAR_COUNT = 200;

  function resizeStar() {
    starCanvas.width = window.innerWidth;
    starCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeStar);
  resizeStar();

  function initStars() {
    const colorArr = getComputedStyle(document.documentElement)
      .getPropertyValue('--star-colors')
      .split(',')
      .map(c => c.trim());
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = Math.random() * 1.5 + 0.5;
      stars.push({
        x: Math.random() * starCanvas.width,
        y: Math.random() * starCanvas.height,
        radius: radius,
        color: colorArr[Math.floor(Math.random() * colorArr.length)],
        alpha: Math.random(),
        dAlpha: (Math.random() * 0.02) + 0.005,
        dx: (Math.random() - 0.5) * 0.1,
        dy: (Math.random() - 0.5) * 0.1
      });
    }
  }

  function animateStars() {
    ctx.clearRect(0, 0, starCanvas.width, starCanvas.height);
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${hexToRgb(s.color)}, ${s.alpha})`;
      ctx.fill();

      s.alpha += s.dAlpha;
      if (s.alpha <= 0 || s.alpha >= 1) {
        s.dAlpha = -s.dAlpha;
        s.alpha = Math.max(0, Math.min(1, s.alpha));
      }

      s.x += s.dx;
      s.y += s.dy;
      if (s.x < 0) s.x = starCanvas.width;
      if (s.x > starCanvas.width) s.x = 0;
      if (s.y < 0) s.y = starCanvas.height;
      if (s.y > starCanvas.height) s.y = 0;
    });
    requestAnimationFrame(animateStars);
  }

  function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) hex = hex.split('').map(h => h + h).join('');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  }

  initStars();
  animateStars();

  // =========================================================
  // BALLOON GAME LOGIC
  // =========================================================

  const LEVELS = [
  ['s','S','a','A','t','T','p','P'],
  ['i','I','n','N','m','M','d','D'],
  ['g','G','o','O','c','C','k','K'],
  ['e','E','u','U','r','R'],
  ['h','H','b','B','f','F','l','L'],
  ['j','J','v','V','w','W','x','X'],
  ['y','Y','z','Z','q','Q']
];


  const phonicsMap = {
    a:{ phoneme:'/a/', word:'apple' },
    b:{ phoneme:'/b/', word:'ball' },
    c:{ phoneme:'/c/ (as in "cat")', word:'cat' },
    d:{ phoneme:'/d/', word:'dog' },
    e:{ phoneme:'/e/', word:'egg' },
    f:{ phoneme:'/f/', word:'fish' },
    g:{ phoneme:'/g/', word:'goat' },
    h:{ phoneme:'/h/', word:'hat' },
    i:{ phoneme:'/i/', word:'igloo' },
    j:{ phoneme:'/j/', word:'jam' },
    k:{ phoneme:'/k/', word:'kite' },
    l:{ phoneme:'/l/', word:'lion' },
    m:{ phoneme:'/m/', word:'mouse' },
    n:{ phoneme:'/n/', word:'nest' },
    o:{ phoneme:'/o/', word:'owl' },
    p:{ phoneme:'/p/', word:'pig' },
    q:{ phoneme:'/qu/ (kw)', word:'queen' },
    r:{ phoneme:'/r/', word:'rat' },
    s:{ phoneme:'/s/', word:'sun' },
    t:{ phoneme:'/t/', word:'tub' },
    u:{ phoneme:'/u/', word:'umbrella' },
    v:{ phoneme:'/v/', word:'van' },
    w:{ phoneme:'/w/', word:'worm' },
    x:{ phoneme:'/x/ (ks)', word:'box' },
    y:{ phoneme:'/y/', word:'yak' },
    z:{ phoneme:'/z/', word:'zebra' }
  };

  let currentLevel = 0;
  let targetLetter = '';
  let isPlaying = false;
  let score = 0;
  let correctInLevel = 0;
  let speechInterval = null;
  let balloonInterval = null;
  let wrongAttempts = 0;
  let voice = null;
  const EXTRA_SPEECH_GAP = 1500;

  // Shared balloon pop sound (use your wav file)
  // Intro "Ready Go" sound
const readySound = new Audio('sounds/Readygunsound.wav');
readySound.preload = 'auto';

const popSoundCorrect = new Audio('sounds/balloonpop.wav');
const popSoundWrong = new Audio('sounds/balloonpop.wav');

popSoundCorrect.preload = 'auto';
popSoundWrong.preload = 'auto';

  const levelTimeEl = document.getElementById('levelTime');
  const levelNumEl = document.getElementById('levelNum');
  const targetLetterEl = document.getElementById('targetLetter');
  const targetInfo = document.getElementById('targetInfo');
  const messageEl = document.getElementById('message');
  const letterDisplay = document.getElementById('letterDisplay');
  const overlayStart = document.getElementById('startOverlay');
  const overlayLevel = document.getElementById('levelOverlay');
  const overlayGameOver = document.getElementById('gameOverOverlay');
  const levelCompleteNum = document.getElementById('levelCompleteNum');
  const scoreSoFar = document.getElementById('scoreSoFar');
  const finalScoreEl = document.getElementById('finalScore');
  const gameOverTitle = document.getElementById('gameOverTitle');
  const gameOverMsg = document.getElementById('gameOverMsg');
  const btnPlay = document.getElementById('btnPlay');
  const btnHow = document.getElementById('btnHow');
  const btnNextLevel = document.getElementById('btnNextLevel');
  const btnReplayLevel = document.getElementById('btnReplayLevel');
  const btnRestart = document.getElementById('btnRestart');
  const btnListen = document.getElementById('btnListen');
  const btnHub1 = document.getElementById('btnHub1');
  const btnHub2 = document.getElementById('btnHub2');
  const celebrate = document.getElementById('celebrate');
  const celebrateText = document.getElementById('celebrateText');
  const btnHubMain = document.getElementById('btnHubMain');
  const timerEl = document.getElementById('timer');
  const starsHUD = document.getElementById('starsHUD');
  const coinsHUD = document.getElementById('coinsHUD');
  const bestHUD = document.getElementById('bestHUD');

  let gameStartTime = null;
  let timerInterval = null;


    // =========================================================
  // GAME FUNCTIONS
  // =========================================================

  function shake(el) {
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 600);
  }

  function showLetter(letter) {
  // Keep actual case (a vs A)
  letterDisplay.textContent = letter;
  letterDisplay.classList.add('show');
  setTimeout(() => {
    letterDisplay.classList.remove('show');
  }, 1000);
}

  function showMessage(msg) {
    messageEl.textContent = msg;
    messageEl.classList.add('show');
    setTimeout(() => messageEl.classList.remove('show'), 2000);
  }

  function updateHUD() {
  levelNumEl.textContent = currentLevel + 1;
  // timerEl and starsHUD are already updated by other functions
}



  function speak(text) {
  window.speechSynthesis.cancel(); // ✅ stop overlap
  if (!voice) {
    const voices = window.speechSynthesis.getVoices();
    // Prefer female if available
voice = voices.find(v => v.name.includes("Samantha") || v.name.includes("Zira")) 
     || voices.find(v => /en/i.test(v.lang)) 
     || voices[0];

  }
  if (!voice) return;

  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.pitch = 1;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

// ================= Timer Functions =================
function startTimer() {
  gameStartTime = Date.now();
  clearInterval(timerInterval); // reset if already running
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    timerEl.textContent = `${minutes}:${seconds}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}
function updateProgressHUD() {
  let saved = JSON.parse(localStorage.getItem("balloonPopProgress")) || {
    stars: 0,
    best: 0,
    coins: 0,
    levelsCompleted: 0
  };
  starsHUD.textContent = saved.stars;
  coinsHUD.textContent = saved.coins;
  bestHUD.textContent = saved.best;
}

 let lastTarget = null;

function pickTargetLetter() {
  const set = LEVELS[currentLevel];
  let newLetter;

  do {
    newLetter = set[Math.floor(Math.random() * set.length)];
  } while (newLetter === lastTarget && set.length > 1);

  targetLetter = newLetter;
  lastTarget = newLetter;

  // ✅ show actual case, not forced uppercase
  targetLetterEl.textContent = targetLetter; 
  return targetLetter;
}





function spawnWave() {
  if (!isPlaying || document.hidden) return;

  const maxOnScreen = 5; // hard-locked at 5


  // Stop if already full
  if (container.querySelectorAll('.balloon-wrapper').length >= maxOnScreen) return;

  // Pull letters for this level
  let waveLetters = [...LEVELS[currentLevel]];

  // Shuffle & select up to maxOnScreen
  waveLetters.sort(() => Math.random() - 0.5);
  waveLetters = waveLetters.slice(0, maxOnScreen);

  // Always include the target letter
  if (!waveLetters.includes(targetLetter)) {
    waveLetters[Math.floor(Math.random() * waveLetters.length)] = targetLetter;
  }

  // Balloon images
  const balloonImages = [
    "images/balloon1.png","images/balloon2.png","images/balloon3.png",
    "images/balloon4.png","images/balloon5.png"
  ];
  balloonImages.sort(() => Math.random() - 0.5);

  // === Even spacing across screen ===
  const screenWidth = window.innerWidth;
  const sectionWidth = screenWidth / maxOnScreen;

  waveLetters.forEach((letter, i) => {
    const baseLeft = i * sectionWidth + sectionWidth / 2;
    const offset = (Math.random() - 0.5) * (sectionWidth / 4); // small variation
    const left = Math.min(screenWidth - 150, Math.max(75, baseLeft + offset));
    createBalloon(letter, left, balloonImages[i % balloonImages.length]);
  });
}



  function createBalloon(letter, leftPos = null, img = null) {
  const wrapper = document.createElement('div');
  wrapper.className = 'balloon-wrapper rising';

  wrapper.style.left = leftPos !== null
    ? leftPos + 'px'
    : Math.random() * (window.innerWidth - 100) + 'px';

  const randomBottom = -200 - Math.random() * 150;
  wrapper.style.bottom = randomBottom + 'px';

  const baseDuration = 20;
  const variation = Math.random() * 10 - 5;
  wrapper.style.animationDuration = (baseDuration + variation) + 's';

  const balloon = document.createElement('div');
  balloon.className = 'balloon';

  const balloonImages = [
    "images/balloon1.png",
    "images/balloon2.png",
    "images/balloon3.png",
    "images/balloon4.png",
    "images/balloon5.png"
  ];
  const chosen = img || balloonImages[Math.floor(Math.random() * balloonImages.length)];
  balloon.style.backgroundImage = `url(${chosen})`;

  // Letter inside balloon
  const inner = document.createElement('div');
  inner.className = 'balloon-inner';
  inner.textContent = letter;
  balloon.appendChild(inner);

  // ✅ Auto-adjust letter position & size
  const image = new Image();
  image.src = chosen;
  image.onload = () => {
    const totalHeight = image.height;
    const circleHeight = totalHeight * (5 / 12); // because 5cm out of 12cm
    const circleCenter = (circleHeight / 2) / totalHeight * 100;

    // Position letter at circle center
    inner.style.top = circleCenter + "%";
    inner.style.transform = "translate(-50%, -50%)";

    // Font size relative to balloon width
    const balloonW = parseFloat(getComputedStyle(balloon).width);
    let fontSize = balloonW * 0.35;

    // Clamp font size between 32px and 72px
    fontSize = Math.max(32, Math.min(72, fontSize));
    inner.style.fontSize = fontSize + "px";
  };

  wrapper.appendChild(balloon);
  container.appendChild(wrapper);

  balloon.addEventListener('click', () => handlePop(wrapper, letter));
  wrapper.addEventListener('animationend', () => {
    if (wrapper.parentNode) wrapper.remove();
  });
}



function showBigCongrats(letter) {
  const msg = document.createElement("div");
  msg.className = "big-congrats";
  msg.innerHTML = `🎉 Good Job! <b>${letter.toUpperCase()}</b> 🎉`;
  document.body.appendChild(msg);

  setTimeout(() => msg.remove(), 1500);
}


  function handlePop(wrapper, letter) {
  if (!isPlaying) return;

  const balloon = wrapper.querySelector('.balloon');

  if (letter.toLowerCase() === targetLetter.toLowerCase()) {
    // ✅ Correct pop
    popSoundCorrect.currentTime = 0;
    popSoundCorrect.play();
    score += 10;
    correctInLevel++;
    updateHUD();
    showBigCongrats(letter);

    // 🎉 Add bounce + glow effect
    balloon.classList.add('balloon-correct');
    setTimeout(() => balloon.classList.remove('balloon-correct'), 800);

    // 🔥 immediately pick new letter
    pickTargetLetter();

    if (correctInLevel >= parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--goal-per-level'))) {
      endLevel(true);
    }
  } else {
    // ❌ Wrong pop
    popSoundWrong.currentTime = 0;
    popSoundWrong.play();

    // 🔴 Haptic vibration for wrong selection
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]); // buzz-pause-buzz pattern
    }

    // 👇 Make the wrong balloon itself shake
    balloon.classList.add('shake');
    setTimeout(() => balloon.classList.remove('shake'), 600);

    wrongAttempts++;
    updateHUD();
    shake(targetInfo);
    showMessage(`Oops! That was ${letter.toUpperCase()}`);

    if (wrongAttempts >= 3) {
      cueCorrectBalloon();
      wrongAttempts = 0;
    }
  }

  // --- Swap balloon to burst PNG ---
  const burstImages = ["images/burst1.png", "images/burst2.png"];
  const burst = burstImages[Math.floor(Math.random() * burstImages.length)];
  balloon.style.backgroundImage = `url(${burst})`;
  balloon.textContent = ""; // remove the letter

  // Add pop class
  balloon.classList.add('balloon-pop');

  // Remove balloon after animation
  setTimeout(() => {
    if (wrapper.parentNode) wrapper.remove();
  }, 500);
}





  function cueCorrectBalloon() {
    const balloons = container.querySelectorAll('.balloon');
    balloons.forEach(b => {
if (b.textContent.toLowerCase() === targetLetter.toLowerCase()) {
        b.classList.add('cue-highlight');
        setTimeout(() => b.classList.remove('cue-highlight'), 2000);
      }
    });
  }



  function endLevel(success) {
    document.querySelector('.game-container').classList.remove('playing');
  isPlaying = false;
      stopTimer();
  clearInterval(balloonInterval);
  clearInterval(speechInterval);

  if (success) {
  bigCelebrate(); // 🎉 fire celebration first

  // Delay Level Complete overlay by 10 seconds
  setTimeout(() => {
    levelCompleteNum.textContent = currentLevel + 1;
    scoreSoFar.textContent = score;

    // Calculate elapsed time for this level
    const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    levelTimeEl.textContent = `${minutes}:${seconds}`;

    overlayLevel.classList.add('show');

    // ✅ Save progress when level is completed
    let saved = JSON.parse(localStorage.getItem("balloonPopProgress")) || {
      stars: 0,
      best: 0,
      coins: 0,
      levelsCompleted: 0
    };

    saved.stars = Math.max(saved.stars, correctInLevel >= 5 ? 3 : correctInLevel >= 3 ? 2 : 1);
    saved.best = Math.max(saved.best, score);
    saved.coins += 10; // earn coins
    saved.levelsCompleted = Math.max(saved.levelsCompleted, currentLevel + 1);

    localStorage.setItem("balloonPopProgress", JSON.stringify(saved));
  }, 10000); // ⏱ 10 sec delay
  } else {
    endGame();
  }
} 
// ==================== CELEBRATION ====================
const clapSound = new Audio('sounds/clap.mp3');
const firecrackerSound = new Audio('sounds/fireworks.mp3');


clapSound.preload = 'auto';
firecrackerSound.preload = 'auto';

function fadeOutAudio(audio, duration = 2000) {
  if (!audio) return;
  let step = audio.volume / (duration / 100);
  let fade = setInterval(() => {
    if (audio.volume > step) {
      audio.volume = Math.max(0, audio.volume - step);
    } else {
      audio.volume = 0;
      audio.pause();
      clearInterval(fade);
    }
  }, 100);
}


  function bigCelebrate() {
  // Pause the game while celebrating
  isPlaying = false;
  clearInterval(balloonInterval);
  clearInterval(speechInterval);
  clearInterval(timerInterval);

  // Step 1: Show big congratulation text
  celebrateText.textContent = getCongratsText();
  celebrate.classList.add('show');

  // trigger CSS animation
  celebrateText.style.animation = "popCelebrate 1s ease forwards";

  // 🔊 Play clap sound immediately
  clapSound.volume = 1;
  clapSound.currentTime = 0;
  clapSound.play().catch(() => {});

  // Step 2: After 2s, start confetti + fireworks
  setTimeout(() => {
    launchConfetti(8000); // smoother, 8s duration

    // Always create NEW firecracker sounds for reliability
    const firecrackerLoop = setInterval(() => {
      const firecracker = new Audio('sounds/fireworks.mp3');
      firecracker.volume = 1;
      firecracker.play().catch(() => {});
    }, 2000);

    // Stop celebration after confetti ends
    setTimeout(() => {
      celebrate.classList.remove('show');
      clearInterval(firecrackerLoop);
      fadeOutAudio(clapSound, 1500);
    }, 8000);

  }, 2000); // ⏱ 2s delay before confetti
}




// ==================== CONFETTI ====================
// ==================== CONFETTI ====================
function launchConfetti(duration = 8000) {
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");
  canvas.style.display = "block";

  // size to viewport
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const confettiPieces = [];
  const colors = [
    "#ff595e","#ffca3a","#8ac926",
    "#1982c4","#6a4c93","#fff","#f72585","#4cc9f0"
  ];

  // 🎉 150 pieces instead of 100
  for (let i = 0; i < 150; i++) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 2 + 1, // ⏩ faster fall
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 15 - 15,
      tiltAngleIncremental: Math.random() * 0.15 + 0.08, // ⏩ faster tilt
      tiltAngle: 0
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiPieces.forEach(p => {
      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
      ctx.stroke();
    });
    update();
  }

  function update() {
    confettiPieces.forEach((p, i) => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2);  // ⏩ faster drop
      p.x += Math.sin(p.d) * 2;              // ⏩ wider spread
      p.tilt = Math.sin(p.tiltAngle + i / 3) * 15;

      // recycle confetti when it falls below screen
      if (p.y > canvas.height) {
        p.x = Math.random() * canvas.width;
        p.y = -10;
      }
    });
  }

  let animationFrame;
  (function loop() {
    draw();
    animationFrame = requestAnimationFrame(loop);
  })();

  // stop + hide after duration
  setTimeout(() => {
    cancelAnimationFrame(animationFrame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = "none";
  }, duration);
}





  function getCongratsText() {
    const arr = ["🎉 Great job! 🎉", "🌟 Awesome! 🌟", "👏 Fantastic! 👏", "🚀 Super! 🚀"];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function endGame() {
    document.querySelector('.game-container').classList.remove('playing');

  isPlaying = false;
      stopTimer();
  clearInterval(balloonInterval);
  clearInterval(speechInterval);
  finalScoreEl.textContent = score;
  overlayGameOver.classList.add('show');

  gameOverTitle.textContent = "Level Failed";
gameOverMsg.textContent = "Try again!";


  // ✅ Save progress even when the game ends
  let saved = JSON.parse(localStorage.getItem("balloonPopProgress")) || {
    stars: 0,
    best: 0,
    coins: 0,
    levelsCompleted: 0
  };

  // Update best score always
  saved.best = Math.max(saved.best, score);

  // Smaller coin reward for failing
  saved.coins += 5;

  // Record levels attempted (don’t increase stars/levels here)
  saved.levelsCompleted = Math.max(saved.levelsCompleted, currentLevel);

  localStorage.setItem("balloonPopProgress", JSON.stringify(saved));
}


  function startLevel() {
  correctInLevel = 0;
  wrongAttempts = 0;
  updateHUD();
  startTimer();
  updateProgressHUD();

  overlayStart.classList.remove('show');
  overlayLevel.classList.remove('show');
  overlayGameOver.classList.remove('show');
  isPlaying = true;
  pickTargetLetter();
    document.querySelector('.game-container').classList.add('playing');
// 🔊 Speak once immediately
const info = phonicsMap[targetLetter.toLowerCase()];
if (info) speak(`${targetLetter} says ${info.phoneme} as ${info.word}`);

  // Speech
  speechInterval = setInterval(() => {
    if (isPlaying) {
const info = phonicsMap[targetLetter.toLowerCase()];
if (info) {
  speak(`${targetLetter} says ${info.phoneme} as ${info.word}`);
  targetLetterEl.textContent = targetLetter; // ✅ keep actual case at bottom
}

    }
  }, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--speech-repeat-interval')) + EXTRA_SPEECH_GAP);

  // 🟢 spawn ONE initial wave
  spawnWave();

  // 🟢 then continue with interval
  clearInterval(balloonInterval);
  balloonInterval = setInterval(spawnWave, 2500);
}


  function startGame() {
    score = 0;
    currentLevel = 0;
    updateHUD();
    startLevel();
  }
const btnFullscreen = document.getElementById('btnFullscreen');

btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      alert(`Error attempting fullscreen: ${err.message}`);
    });
    btnFullscreen.textContent = "❌ Exit Fullscreen";
  } else {
    document.exitFullscreen();
    btnFullscreen.textContent = "⛶ Fullscreen";
  }
});

  // =========================================================
  // BUTTON EVENTS
  // =========================================================

 btnPlay.addEventListener('click', () => {
  overlayStart.classList.remove('show');

   // Unlock all sounds (balloons + celebration)
[popSoundCorrect, popSoundWrong, readySound, clapSound, firecrackerSound].forEach(snd => {
  snd.play().catch(() => {});
  snd.pause();
  snd.currentTime = 0;
});

  
// Unlock speech synthesis (first utterance so browser allows autoplay later)
window.speechSynthesis.cancel();
speak("Let's play!");

  

  // Show countdown
  const overlay = document.getElementById('countdownOverlay');
  const text = document.getElementById('countdownText');
  overlay.style.display = 'flex';

  const steps = ["Ready", "Set", "Go!"];
  let i = 0;

  const runStep = () => {
    text.textContent = steps[i];
    text.style.animation = "none"; // reset animation
    text.offsetHeight; // trigger reflow
    text.style.animation = ""; 
    text.style.animation = "popIn 0.8s ease forwards";

    // play sound on "Ready"
    if (i === 0) {
      readySound.currentTime = 0;
      readySound.play();
    }

    i++;
    if (i < steps.length) {
      setTimeout(runStep, 1000);
    } else {
      setTimeout(() => {
        overlay.style.display = 'none';
        startGame(); // start after countdown
      }, 1000);
    }
  };

  runStep();
});


  btnHow.addEventListener('click', () => {
    alert("Pop the balloons that match the sound! Listen carefully and tap the right one.");
  });

  btnNextLevel.addEventListener('click', () => {
    overlayLevel.classList.remove('show');
    currentLevel++;
    if (currentLevel >= LEVELS.length) {
      alert("🎉 You completed all levels! Great job!");
      startGame();
    } else {
      startLevel();
    }
  });

  btnReplayLevel.addEventListener('click', () => {
    overlayLevel.classList.remove('show');
    startLevel();
  });

  btnRestart.addEventListener('click', () => {
    overlayGameOver.classList.remove('show');
    startGame();
  });

  btnListen.addEventListener('click', () => {
  const info = phonicsMap[targetLetter.toLowerCase()];
  if (info) {
    speak(`${targetLetter} says ${info.phoneme} as ${info.word}`);
    targetLetterEl.textContent = targetLetter; // ✅ keep actual case
  }
});



  const HUB_URL = "https://tinystepslearning-93.web.app/kids/games/phonics/";

btnHub1.addEventListener('click', () => {
  window.location.href = HUB_URL;
});
btnHub2.addEventListener('click', () => {
  window.location.href = HUB_URL;
});
btnHubMain.addEventListener('click', () => {
  window.location.href = HUB_URL;
});

const btnPause = document.getElementById('btnPause');
let paused = false;

btnPause.addEventListener('click', () => {
  if (!isPlaying) return; // only works during active game

  paused = !paused;

  if (paused) {
    btnPause.textContent = "▶ Resume";
    btnPause.classList.add("resume");

    // Stop spawns, speech, and timer
    clearInterval(balloonInterval);
    clearInterval(speechInterval);
    clearInterval(timerInterval);
    window.speechSynthesis.cancel();

    // Freeze CSS animations (requires CSS below)
    document.body.classList.add("paused");

    showMessage("Game Paused");
  } else {
    btnPause.textContent = "⏸ Pause";
    btnPause.classList.remove("resume");

    // Resume speech
    speechInterval = setInterval(() => {
      if (isPlaying) {
const info = phonicsMap[targetLetter.toLowerCase()];
        if (info) speak(`${targetLetter} says ${info.phoneme} as ${info.word}`);
      }
    }, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--speech-repeat-interval')) + EXTRA_SPEECH_GAP);

    // Resume balloon waves
    balloonInterval = setInterval(spawnWave, 2500);

    // Resume timer
    startTimer();

    // Resume CSS animations
    document.body.classList.remove("paused");

    showMessage("Game Resumed");
  }
});



  // =========================================================
  // INITIAL STATE
  // =========================================================

  overlayStart.classList.add('show');
  isPlaying = false;
  updateHUD();

    document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.speechSynthesis.cancel();
  });

  // =========================================================
// CLICK BURST EFFECT (for rocket cursor clicks)
// =========================================================
document.addEventListener("click", e => {
  const burst = document.createElement("div");
  burst.className = "click-burst";
  burst.style.left = e.pageX + "px";
  burst.style.top = e.pageY + "px";
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 400);
});



}); 
