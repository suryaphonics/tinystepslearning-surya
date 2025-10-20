"use strict";

/* ------------------ ASSET PATHS ------------------ */
const INTRO_DURATION_MS = 21000;
const INTRO_VIDEO = "/kids/games/phonics/Treasure-Hunt/assets/intro/treasurehuntintro.mp4";
const FEEDBACK = {
  right: "/kids/games/phonics/Treasure-Hunt/assets/gameplay/scene_chest_right.mp4",
  wrong: "/kids/games/phonics/Treasure-Hunt/assets/gameplay/scene_chest_wrong.mp4",
};
const FEEDBACK_DURATION_MS = 4500;
const IMG_ROOT = "/kids/games/phonics/sound-match/images/";
const BGM_PATH = "/kids/games/phonics/Treasure-Hunt/assets/audio/gameintrobgm.mp3";
const CLAP_SFX = "/kids/games/phonics/Treasure-Hunt/assets/audio/clap.mp3";

/* ------------------ DOM ------------------ */
const videoWrap     = document.getElementById("videoContainer");
const introVideo    = document.getElementById("introVideo");
const videoRight    = document.getElementById("videoRight");
const videoWrong    = document.getElementById("videoWrong");
const gameplayBG    = document.getElementById("gameplayBG");
const question      = document.getElementById("questionText");
const banner        = document.getElementById("banner");
const hudIsland     = document.getElementById("islandName");
const hudStars      = document.getElementById("stars");
const hudTreasures  = document.getElementById("treasures");
const btns          = [document.getElementById("btn0"), document.getElementById("btn1"), document.getElementById("btn2")];
const imgs          = [document.getElementById("img0"), document.getElementById("img1"), document.getElementById("img2")];
const fullscreenBtn = document.getElementById("fullscreenBtn");
const levelOverlay  = document.getElementById("levelOverlay");
const levelCompleteNum = document.getElementById("levelCompleteNum");
const btnNextLevel  = document.getElementById("btnNextLevel");
const btnReplayLevel= document.getElementById("btnReplayLevel");
const btnHub        = document.getElementById("btnHub");
const rotateNotice  = document.getElementById("rotateNotice");

/* ------------------ AUDIO ------------------ */
const clapSfx = new Audio(CLAP_SFX); clapSfx.volume = 0.9;
function playClap(){ if (!muted) { try { clapSfx.currentTime = 0; clapSfx.play(); } catch(e) {} } }

const bgm = new Audio(BGM_PATH);
bgm.loop = true; bgm.volume = 0;
let muted = false;

function fadeAudio(audio, target = 0.2, duration = 1000) {
  const start = audio.volume;
  const delta = target - start;
  const startTime = performance.now();
  return new Promise((resolve) => {
    function step(now) {
      const p = Math.min((now - startTime) / duration, 1);
      audio.volume = muted ? 0 : start + delta * p;
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

/* ---------- Mute button ---------- */
const muteBtn = document.createElement("button");
muteBtn.textContent = "🔊";
Object.assign(muteBtn.style, {
  position: "fixed", bottom: "2%", left: "2%",
  fontSize: "1.2rem",
  background: "linear-gradient(180deg,#fffde7,#fff59d)",
  color: "#333", border: "none", borderRadius: "14px",
  padding: "10px 16px", fontFamily: "'Fredoka One', sans-serif",
  boxShadow: "0 3px 8px rgba(0,0,0,0.4)", cursor: "pointer", zIndex: 120
});
document.body.appendChild(muteBtn);
muteBtn.onclick = () => { muted = !muted; muteBtn.textContent = muted ? "🔇" : "🔊"; bgm.volume = muted ? 0 : 0.2; speechSynthesis.cancel(); };

/* ------------------ SPEECH ------------------ */
let femaleVoice = null;
function loadVoice() {
  const voices = speechSynthesis.getVoices();
  femaleVoice =
    voices.find(v => /Google UK English Female|Samantha|Victoria|Karen|Tessa/i.test(v.name)) ||
    voices.find(v => /en-|English/i.test(v.lang)) ||
    voices[0] || null;
}
speechSynthesis.onvoiceschanged = loadVoice; loadVoice();

function speak(text, opts = {}) {
  if (muted || !("speechSynthesis" in window)) return;
  const msg = new SpeechSynthesisUtterance(text);
  if (femaleVoice) msg.voice = femaleVoice;
  msg.rate = opts.rate ?? 1; msg.pitch = opts.pitch ?? 1.1; msg.volume = opts.volume ?? 1;
  msg.onstart = () => { captionBox.textContent = text; captionBox.style.opacity = 1; };
  msg.onend = () => { captionBox.style.opacity = 0; };
  speechSynthesis.speak(msg);
}

/* ---------- Caption area ---------- */
const captionBox = document.createElement("div");
Object.assign(captionBox.style, {
  position: "fixed",
  bottom: "8%",
  left: "50%",
  transform: "translateX(-50%)",
  fontSize: "1.2rem",
  color: "#fff",
  background: "rgba(0,0,0,0.55)",
  padding: "10px 20px",
  borderRadius: "16px",
  textAlign: "center",
  zIndex: 99999,
  fontFamily: "'Fredoka One', sans-serif",
  opacity: 0,
  transition: "opacity 0.6s",
});
captionBox.id = "captionBox";
document.body.appendChild(captionBox);

/* ------------------ Helpers ------------------ */
function showOverlayLayer() {
  videoWrap.classList.remove("off");
  videoWrap.style.background = "#000";
  videoWrap.style.pointerEvents = "auto";
  videoWrap.style.opacity = "1";
  videoWrap.style.zIndex = "2000";
}
function hideOverlayLayer() {
  videoWrap.classList.add("off");
  videoWrap.style.background = "transparent";
  videoWrap.style.pointerEvents = "none";
  videoWrap.style.opacity = "0";
  videoWrap.style.zIndex = "0";
}
function showVideo(videoEl) {
  if (!videoEl) return;
  showOverlayLayer();
  videoEl.classList.add("show");
  videoEl.style.opacity = 1;
  videoEl.style.zIndex = 3000;
}
function hideVideo(videoEl) {
  if (!videoEl) return;
  videoEl.classList.remove("show");
  videoEl.style.opacity = 0;
  setTimeout(() => (videoEl.style.zIndex = 0), 600);
}
function setHUD() {
  const i = ISLANDS[islandIdx];
  hudIsland.textContent = `${i.name}: ${i.focus}`;
  hudStars.textContent = stars;
  hudTreasures.textContent = treasures;
}
function setQuestion(txt) { question.textContent = txt; question.style.display = "block"; }
function hideQuestion() { question.style.display = "none"; }
function showBanner(msg, { celebrate = false, ms = 2000 } = {}) {
  banner.textContent = msg;
  banner.classList.toggle("celebrate", celebrate);
  banner.style.display = "block";
  setTimeout(() => (banner.style.display = "none"), ms);
}
const HUB_URL = "/kids/games/phonics/";

function showLevelOverlay(num){
  if (levelCompleteNum) levelCompleteNum.textContent = num;
  levelOverlay.classList.add("show");
}
function hideLevelOverlay(){ levelOverlay.classList.remove("show"); }
function waitLevelDecision(){
  return new Promise(resolve => {
    btnNextLevel.onclick = () => { hideLevelOverlay(); resolve("next"); };
    btnReplayLevel.onclick = () => { hideLevelOverlay(); resolve("replay"); };
    btnHub.onclick = () => { window.location.href = HUB_URL; };
  });
}

/* ------------------ Picture positioning ------------------ */
const DEFAULT_OFFSETS = [
  { x: '-145%', y: '-8px' },
  { x: '-80%',  y: '-8px' },
  { x: '-15%',  y: '-8px' },
];
const OFFSETS = {};
function offsetsFor(i, l) { return OFFSETS[`${i}-${l}`] || DEFAULT_OFFSETS; }
function setTileOffsets(offsets = DEFAULT_OFFSETS) {
  // reset to defaults
  btns.forEach((b, i) => {
    const pic = b.querySelector('.pic');
    if (!pic) return;
    const base = DEFAULT_OFFSETS[i];
    pic.style.setProperty('--tile-x', base.x);
    pic.style.setProperty('--tile-y', base.y);
  });
  // apply overrides
  offsets.forEach((o, i) => {
    if (!o) return;
    const pic = btns[i]?.querySelector('.pic');
    if (!pic) return;
    if (o.x != null) pic.style.setProperty('--tile-x', o.x);
    if (o.y != null) pic.style.setProperty('--tile-y', o.y);
  });
}

/* ------------------ Image helpers ------------------ */
function placeholderTileFromURL(url) {
  const base = url.split("/").pop() || "?";
  const letter = (base.split(".")[0] || "?")[0]?.toUpperCase() || "?";
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1f2937"/>
        <stop offset="1" stop-color="#111827"/>
      </linearGradient>
    </defs>
    <rect x="20" y="20" width="360" height="360" rx="32" fill="url(#g)" />
    <text x="50%" y="54%" font-size="220" font-family="Fredoka One, Arial, sans-serif"
          fill="#fff" text-anchor="middle" dominant-baseline="middle">${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
function setImgWithFallback(imgEl, url) {
  let triedPng = false, done = false;
  imgEl.onerror = () => {
    if (done) return;
    if (!triedPng && url.endsWith(".svg")) {
      triedPng = true;
      imgEl.src = url.slice(0, -4) + ".png";
    } else {
      console.warn("❌ Missing image, using placeholder:", url);
      imgEl.src = placeholderTileFromURL(url);
      done = true;
    }
  };
  imgEl.src = url;
}
function showChoices(level, show) {
  if (show && level) imgs.forEach((im, i) => setImgWithFallback(im, level.imgs[i]));
  document.querySelectorAll(".chest .pic").forEach((p) => (p.style.display = show ? "flex" : "none"));
  btns.forEach((b) => (b.style.display = show ? "block" : "none"));
  accepting = show;
}

/* ------------------ Narration ------------------ */
function narrateIntro() {
  const lines = [
    { t: 0,     s: "Welcome to Phonic Sounds Treasure Hunt!" },
    { t: 4500,  s: "I’m your guide, LEO. Let’s sail the ocean seas!" },
    { t: 9000,  s: "Now we hop to the island and find the treasure cave!" },
    { t: 14000, s: "Use your phonics sounds to open the chests." },
    { t: 18500, s: "Ready, adventurer? Let’s begin!" },
  ];
  lines.forEach(({ t, s }) =>
    setTimeout(() => speak(s, { volume: 0.9, rate: 0.85 }), t)
  );
}
function speakQuestion(qText) {
  const m = qText.match(/\/(.+)\//);
  speak(m ? `Find the sound ${m[1]}` : qText, { rate: 0.95 });
}

/* ------------------ INTRO VIDEO ------------------ */
async function playIntro() {
  hideQuestion();
  fullscreenBtn.style.zIndex = "10000";

  showOverlayLayer();

  introVideo.src = INTRO_VIDEO;
  introVideo.muted = true;
  introVideo.playsInline = true;
  introVideo.currentTime = 0;
  introVideo.load();
  showVideo(introVideo);

  // visible Skip
  let skipped = false;
  const skipBtn = document.createElement("button");
  skipBtn.textContent = "Skip ▶";
  Object.assign(skipBtn.style, {
    position: "fixed", right: "2%", top: "2%",
    zIndex: 10001, padding: "10px 14px",
    border: "none", borderRadius: "12px",
    background: "linear-gradient(180deg,#ffcf57,#ffb12a)",
    color: "#5b3400", fontFamily: "'Fredoka One',sans-serif", cursor: "pointer",
    boxShadow: "0 4px 10px rgba(0,0,0,.35)", fontSize: "1rem"
  });
  document.body.appendChild(skipBtn);
  skipBtn.onclick = () => { skipped = true; introVideo.dispatchEvent(new Event("ended")); };

  await new Promise((resolve) => {
    let timeout = setTimeout(() => resolve(), 4000);
    introVideo.oncanplaythrough = () => { clearTimeout(timeout); resolve(); };
    introVideo.onerror = () => { clearTimeout(timeout); resolve(); };
  });

  try { await introVideo.play(); } catch (e) { console.warn("Intro blocked:", e); }

  try { await bgm.play(); } catch {}
  await fadeAudio(bgm, 0.6, 1200);

  narrateIntro();

  introVideo.addEventListener("click", () => { skipped = true; introVideo.dispatchEvent(new Event("ended")); }, { once: true });

  const startedAt = performance.now();
  await new Promise((resolve) => {
    let settled = false;
    const onEnded = () => { if (settled) return; settled = true; resolve(); };
    introVideo.addEventListener("ended", onEnded, { once: true });
    setTimeout(() => { if (!settled) { settled = true; resolve(); } }, INTRO_DURATION_MS + 500);
  });

  if (!skipped) {
    const elapsed = performance.now() - startedAt;
    const remaining = INTRO_DURATION_MS - elapsed;
    if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
  }

  skipBtn.remove();
  hideVideo(introVideo);
  await new Promise(r => setTimeout(r, 300));

  await new Promise(resolve => {
    if (gameplayBG.complete && gameplayBG.naturalWidth > 0) return resolve();
    gameplayBG.onload = resolve;
    gameplayBG.onerror = () => { console.warn("❌ gameplay.png missing (check path/case)"); resolve(); };
  });
  gameplayBG.style.opacity = 1;

  hideOverlayLayer();

  await fadeAudio(bgm, 0.15, 800);
}

/* ------------------ GAME DATA (7 sets) ------------------ */
const I = (name, focus, levels) => ({ name, focus, levels });
const L = (q, a, imgs) => ({ q, a, imgs });
const P = (name) => `${IMG_ROOT}${name}.svg`;

const ISLANDS = [
  I("Island 1", "SATP", [
    L("Find the sound /s/", 0, [P("sun"), P("apple"), P("tiger")]),
    L("Find the sound /a/", 1, [P("pan"), P("apple"), P("dog")]),
    L("Find the sound /t/", 2, [P("apple"), P("pan"), P("tiger")]),
    L("Find the sound /p/", 1, [P("ball"), P("pan"), P("cat")]),
  ]),
  I("Island 2", "INMD", [
    L("Find the sound /i/", 0, [P("igloo"), P("nest"), P("monkey")]),
    L("Find the sound /n/", 1, [P("dog"), P("nest"), P("tiger")]),
    L("Find the sound /m/", 2, [P("apple"), P("lion"), P("monkey")]),
    L("Find the sound /d/", 1, [P("egg"), P("dog"), P("fox")]),
  ]),
  I("Island 3", "GOCK", [
    L("Find the sound /g/", 0, [P("goat"), P("orange"), P("kite")]),
    L("Find the sound /o/", 1, [P("umbrella"), P("orange"), P("cat")]),
    L("Find the sound /c/", 2, [P("dog"), P("rabbit"), P("cat")]),
    L("Find the sound /k/", 1, [P("lion"), P("kite"), P("ball")]),
  ]),
  I("Island 4", "EUR", [
    L("Find the sound /e/", 0, [P("egg"), P("umbrella"), P("rabbit")]),
    L("Find the sound /u/", 1, [P("lion"), P("umbrella"), P("cat")]),
    L("Find the sound /r/", 2, [P("dog"), P("ball"), P("rabbit")]),
  ]),
  I("Island 5", "HBFL", [
    L("Find the sound /h/", 0, [P("hat"), P("ball"), P("fish")]),
    L("Find the sound /b/", 1, [P("cat"), P("ball"), P("lion")]),
    L("Find the sound /f/", 2, [P("apple"), P("dog"), P("fish")]),
    L("Find the sound /l/", 0, [P("lion"), P("rabbit"), P("egg")]),
  ]),
  I("Island 6", "JVWX", [
    L("Find the sound /j/", 0, [P("jam"), P("goat"), P("tiger")]),
    L("Find the sound /v/", 0, [P("van"), P("nest"), P("pan")]),
    L("Find the sound /w/", 0, [P("watch"), P("cat"), P("orange")]),
    L("Find the sound /x/", 2, [P("lion"), P("dog"), P("fox")]),
  ]),
  I("Island 7", "YZQ", [
    L("Find the sound /y/", 0, [P("yoyo"), P("apple"), P("rabbit")]),
    L("Find the sound /z/", 1, [P("dog"), P("zebra"), P("cat")]),
    L("Find the sound /q/", 2, [P("ball"), P("nest"), P("queen")]),
  ]),
];

/* ------------------ STATE ------------------ */
let islandIdx = 0, levelIdx = 0, stars = 0, treasures = 0;
let accepting = false;

/* ------------------ CONFETTI & FX (same as previous) ------------------ */
const confettiCanvas = document.getElementById("confettiCanvas");
const cctx = confettiCanvas.getContext("2d");
function resizeCanvas() { confettiCanvas.width = innerWidth; confettiCanvas.height = innerHeight; }
addEventListener("resize", resizeCanvas); resizeCanvas();

let particles = [];
function spawnCelebration() {
  particles.length = 0;
  for (let i = 0; i < 120; i++) {
    particles.push({
      kind: "dot",
      x: Math.random() * confettiCanvas.width,
      y: -20 - Math.random() * 100,
      r: Math.random() * 5 + 2,
      vx: (Math.random() - 0.5) * 1.5,
      vy: Math.random() * 2 + 2,
      color: `hsl(${Math.random() * 360},100%,65%)`,
    });
  }
}
function animateCelebration() {
  cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  particles.forEach((p, i) => {
    p.x += p.vx; p.y += p.vy;
    cctx.beginPath(); cctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    cctx.fillStyle = p.color; cctx.fill();
    if (p.y > confettiCanvas.height + 30) particles.splice(i, 1);
  });
  if (particles.length) requestAnimationFrame(animateCelebration);
  else confettiCanvas.style.display = "none";
}
function celebrate() {
  spawnCelebration();
  confettiCanvas.style.display = "block";
  animateCelebration();
  showBanner(`🎉 ${["Awesome!","Great job!","Super!","Brilliant!"][(Math.random()*4)|0]}`, { celebrate: true, ms: 1400 });
}

/* Overlay FX (papers + stars) */
const fxCanvas = document.createElement("canvas");
fxCanvas.id = "fxCanvas";
Object.assign(fxCanvas.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: 4000, display: "none" });
document.body.appendChild(fxCanvas);
const fctx = fxCanvas.getContext("2d");
function sizeFx(){ fxCanvas.width = innerWidth; fxCanvas.height = innerHeight; }
addEventListener("resize", sizeFx); sizeFx();
let fxParticles = []; let fxAnimId = null;
function starPath(ctx, r=10, points=5, inset=0.5){
  ctx.moveTo(0, -r);
  for (let i=0; i<points; i++){
    let a = (i * 2 * Math.PI) / points;
    ctx.lineTo(Math.sin(a)*r, -Math.cos(a)*r);
    a += Math.PI/points;
    ctx.lineTo(Math.sin(a)*r*inset, -Math.cos(a)*r*inset);
  }
  ctx.closePath();
}
function launchFx({papers=160, stars=60, duration=2200} = {}){
  fxParticles = [];
  for (let i=0; i<papers; i++){
    fxParticles.push({
      type:"paper",
      x: Math.random()*fxCanvas.width,
      y: -20 - Math.random()*120,
      w: 6 + Math.random()*10,
      h: 10 + Math.random()*16,
      a: Math.random()*Math.PI,
      vr: (Math.random()-0.5)*0.25,
      vx: (Math.random()-0.5)*1.2,
      vy: 2 + Math.random()*2.4,
      color: `hsl(${Math.random()*360},100%,60%)`
    });
  }
  for (let i=0; i<stars; i++){
    fxParticles.push({
      type:"star",
      x: Math.random()*fxCanvas.width,
      y: -20 - Math.random()*120,
      r: 8 + Math.random()*12,
      inset: 0.5 + Math.random()*0.2,
      a: Math.random()*Math.PI,
      vr: (Math.random()-0.5)*0.18,
      vx: (Math.random()-0.5)*0.9,
      vy: 2 + Math.random()*2.2,
      color:"#ffd700", glow:"rgba(255,215,0,0.6)"
    });
  }
  fxCanvas.style.display = "block";
  const start = performance.now();
  function tick(now){
    const t = now - start;
    fctx.clearRect(0,0,fxCanvas.width,fxCanvas.height);
    for (const p of fxParticles){
      p.x += p.vx; p.y += p.vy; p.a += p.vr || 0;
      if (p.type === "paper"){
        fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.a);
        fctx.fillStyle = p.color; fctx.fillRect(-p.w/2, -p.h/2, p.w, p.h); fctx.restore();
      } else {
        fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.a);
        fctx.beginPath(); starPath(fctx, p.r, 5, p.inset);
        fctx.fillStyle = p.color; fctx.shadowColor = p.glow; fctx.shadowBlur = 12; fctx.fill(); fctx.restore();
      }
    }
    if (t < duration && fxParticles.some(p => p.y < fxCanvas.height + 30)){ fxAnimId = requestAnimationFrame(tick); }
    else { fctx.clearRect(0,0,fxCanvas.width,fxCanvas.height); fxCanvas.style.display = "none"; fxAnimId = null; }
  }
  cancelAnimationFrame(fxAnimId || 0);
  fxAnimId = requestAnimationFrame(tick);
}
function grandCelebrateIsland(isleName){
  playClap();
  launchFx({ papers: 320, stars: 140, duration: 3200 });
  showBanner(`🎊 Congratulations! ${isleName} complete!`, { celebrate: true, ms: 2400 });
}

/* ------------------ GAME LOOP ------------------ */
async function runIslands() {
  for (islandIdx = 0; islandIdx < ISLANDS.length; islandIdx++) {
    const island = ISLANDS[islandIdx];
    setHUD();
    showBanner(`🏝️ ${island.name} — Sounds: ${island.focus}`, { ms: 1800 });

    for (levelIdx = 0; levelIdx < island.levels.length; ) {
      const curr = island.levels[levelIdx];
      setQuestion(curr.q);
      showChoices(curr, true);
      setTileOffsets(offsetsFor(islandIdx, levelIdx));
      speakQuestion(curr.q);

      const picked = await waitForChoice();
      showChoices(null, false);
      hideQuestion();

      if (picked === curr.a) {
        showBanner("🎉 Awesome!", { celebrate: true, ms: 1400 });
        await playOverlay(videoRight);
        stars++; treasures++; setHUD();
        levelIdx++;
      } else {
        await playOverlay(videoWrong);
        showBanner("❌ Oops! Try again!", { ms: 900 });
      }
      gameplayBG.style.opacity = 1;
    }

    grandCelebrateIsland(island.name);
    await new Promise(r => setTimeout(r, 800));

    if (islandIdx < ISLANDS.length - 1) {
      if (btnNextLevel)   btnNextLevel.textContent   = "Next Island ➜";
      if (btnReplayLevel) btnReplayLevel.textContent = "Replay Island";
      if (levelCompleteNum) levelCompleteNum.textContent = islandIdx + 1;
      showLevelOverlay(islandIdx + 1);
      const islandChoice = await waitLevelDecision();
      if (islandChoice === "replay") { islandIdx--; }
    }
  }
  showBanner(`🏆 Amazing! You found all ${treasures} treasures!`, { celebrate: true, ms: 2600 });
  hideQuestion();
  showChoices(null, false);
}

/* ------------------ WAIT FOR CHOICE ------------------ */
function waitForChoice() {
  return new Promise((resolve) => {
    const handler = (i) => () => { if (!accepting) return; accepting = false; resolve(i); };
    btns.forEach((b, i) => (b.onclick = handler(i)));
  });
}

/* ------------------ FULLSCREEN + LANDSCAPE ------------------ */
async function enterFullscreenLandscape(){
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) {
      await el.requestFullscreen();
    }
  } catch (e) {
    console.warn("Fullscreen failed:", e);
  }
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock("landscape-primary");
    }
  } catch (e) {
    console.warn("Orientation lock not supported:", e);
  }
}
function isPortrait(){ return matchMedia("(orientation: portrait)").matches; }
function updateRotateNotice(){
  if (!isPortrait()) {
    rotateNotice && (rotateNotice.style.display = "none");
  } else {
    if (!document.fullscreenElement) rotateNotice && (rotateNotice.style.display = "flex");
  }
}
addEventListener("orientationchange", updateRotateNotice);
addEventListener("resize", updateRotateNotice);
document.addEventListener("fullscreenchange", updateRotateNotice);

/* ------------------ FULLSCREEN TOGGLE (backup button) ------------------ */
fullscreenBtn.addEventListener("click", async () => {
  if (!document.fullscreenElement) { await enterFullscreenLandscape(); }
  else { document.exitFullscreen(); }
});

/* ------------------ PLAY FEEDBACK CLIPS ------------------ */
function playOverlay(videoEl){
  return new Promise(async (resolve) => {
    showOverlayLayer();
    videoEl.currentTime = 0;
    videoEl.load();
    showVideo(videoEl);
    try { await videoEl.play(); } catch(e) {}
    setTimeout(() => {
      hideVideo(videoEl);
      setTimeout(() => { hideOverlayLayer(); resolve(); }, 300);
    }, FEEDBACK_DURATION_MS);
  });
}

/* ------------------ START ------------------ */
(async function start() {
  const loadingScreen = document.getElementById("loadingScreen");
  if (loadingScreen) { loadingScreen.classList.add("fadeOut"); setTimeout(() => loadingScreen.remove(), 1000); }

  videoRight.src = FEEDBACK.right;
  videoWrong.src = FEEDBACK.wrong;

  const tapToStart = document.createElement("div");
  tapToStart.textContent = "🎮 Tap to Start Adventure";
  Object.assign(tapToStart.style, {
    position: "fixed", inset: "0",
    background: "rgba(0,0,0,0.8)", color: "#fff",
    fontFamily: "'Fredoka One', sans-serif", fontSize: "2rem",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: "100000", cursor: "pointer",
  });
  document.body.appendChild(tapToStart);

  async function userGestureStart() {
    document.removeEventListener("click", userGestureStart);
    document.removeEventListener("touchstart", userGestureStart);
    tapToStart.remove();

    // 1) Request fullscreen + lock to landscape (where supported)
    await enterFullscreenLandscape();
    updateRotateNotice();

    // 2) Start audio as early as possible (allowed after gesture)
    try { await bgm.play(); } catch {}
    await fadeAudio(bgm, 0.6, 800);
    await fadeAudio(bgm, 0.15, 400); // settle lower for gameplay

    // 3) Run intro + game
    playIntro().catch(err => { console.warn("Intro error:", err); hideOverlayLayer(); })
               .then(() => runIslands());
  }
  document.addEventListener("click", userGestureStart, { once: true });
  document.addEventListener("touchstart", userGestureStart, { once: true });

  // Initial check for rotate notice (helpful if player opens in portrait)
  updateRotateNotice();
})();
