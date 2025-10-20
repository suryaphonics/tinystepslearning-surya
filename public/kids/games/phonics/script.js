/* ========= Unified Storage ========= */
const STORAGE = 'ts.games.meta.v1';
const base = { stars:0, coins:0, streak:0, lastPlayed:null, games:{} };

/* ========= Phonics Games (folder routes) ========= */
const GAMES = [
  { id:'sound-match',        title:'🎧 Sound Match',            desc:'Hear a sound and pick matching words.',        url:'/kids/games/phonics/sound-match/',        tags:['listening','letters'], color:['#a5f3fc','#c4b5fd'], available:true },
  { id:'balloon-pop',        title:'🎈 Balloon Pop',            desc:'Pop the balloon with the right letter sound.',  url:'/kids/games/phonics/balloon-pop/',        tags:['letters','listening'], color:['#fde68a','#fca5a5'], available:true },
  { id:'spin-the-wheel',     title:'🎡 Spin the Wheel',         desc:'Spin and say! Identify letters and sounds.',    url:'/kids/games/phonics/spin-the-wheel/',     tags:['letters'],            color:['#bbf7d0','#93c5fd'], available:true },
  { id:'match-letter-image', title:'🧩 Match Letter to Image',  desc:'Match beginning sounds to pictures.',           url:'/kids/games/phonics/match-letter-image/', tags:['blending','letters'], color:['#fbcfe8','#a7f3d0'], available:true },
  { id:'treasure-hunt',      title:'🏴‍☠️ Treasure Hunt',        desc:'Find the right sound to unlock treasure chests.', url:'/kids/games/phonics/Treasure-Hunt/',     tags:['letters','listening'], color:['#facc15','#f87171'], available:true }
];

function load(){
  try {
    const raw = localStorage.getItem(STORAGE);
    if(raw) return JSON.parse(raw);
  } catch(e){}
  return structuredClone(base);
}
function save(x){
  localStorage.setItem(STORAGE, JSON.stringify(x));
}
const state = load();

/* Daily streak logic */
function updateDaily(){
  const today = new Date();
  today.setHours(0,0,0,0);
  const last = state.lastPlayed ? new Date(state.lastPlayed) : null;
  if(!last){
    state.streak = 1;
  } else {
    last.setHours(0,0,0,0);
    const diff = Math.round((today - last) / 86400000);
    if(diff === 1) state.streak += 1;
    else if(diff > 1) state.streak = 1;
  }
  state.lastPlayed = new Date().toISOString();
  save(state);
}

/* UI Helpers */
const $ = s => document.querySelector(s);
const grid = $('#grid');
function toast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 1800);
}
function fmtDate(iso){
  try { return new Date(iso).toLocaleDateString(); }
  catch { return ''; }
}

function card(game){
  const gstate = state.games[game.id] ?? (state.games[game.id] = {best:0, stars:0, plays:0, last:null});
  const pct = Math.min(100, (gstate.stars/3)*100);
  const locked = !game.available;

  const article = document.createElement('article');
  article.className = 'card' + (locked ? ' locked' : '');
  article.style.setProperty('--glow1', game.color[0]);
  article.style.setProperty('--glow2', game.color[1]);

  const title = document.createElement('div');
  title.className = 'gameTitle';
  title.innerHTML = `<span>${game.title}</span>${locked?'<span class="badge">🔒 Coming soon</span>':''}`;

  const desc = document.createElement('div');
  desc.className = 'desc';
  desc.textContent = game.desc;

  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.innerHTML = `
    <span class="badge">⭐ ${gstate.stars}/3</span>
    <span class="badge">🏆 Best: ${gstate.best}</span>
    ${gstate.last?`<span class="badge">⏱️ ${fmtDate(gstate.last)}</span>`:''}
  `;

  const prog = document.createElement('div');
  prog.className = 'progress';
  prog.innerHTML = `<span style="width:${pct}%"></span>`;

  const actions = document.createElement('div');
  actions.className = 'actions';
  const play = document.createElement('a');
  play.className = 'btn';
  play.textContent = locked ? 'Locked' : 'Play';
  play.href = locked ? 'javascript:void(0)' : game.url;

  play.addEventListener('click', e => {
    if(locked){
      e.preventDefault();
      toast('Coming soon!');
      return;
    }
    gstate.plays++;
    gstate.last = new Date().toISOString();
    state.coins++;
    save(state);
  });

  const details = document.createElement('button');
  details.className = 'btn ghost';
  details.textContent = 'Details';
  details.addEventListener('click', ()=>{
    toast(`${game.title}: ${game.desc}`);
  });

  actions.append(play, details);
  article.append(title, desc, meta, prog, actions);
  return article;
}

function render(list = GAMES){
  grid.innerHTML = '';
  list.forEach(g => grid.append(card(g)));
  document.getElementById('uiStreak').textContent = state.streak;
  document.getElementById('uiStars').textContent = state.stars;
  document.getElementById('uiCoins').textContent = state.coins;
}

/* Search & filter logic */
const search = $('#search');
const chips = document.querySelectorAll('.chip');

function applyFilters(){
  const q = (search.value || '').toLowerCase().trim();
  const active = [...chips].find(c=>c.getAttribute('aria-pressed')==='true')?.dataset.filter || 'all';
  const list = GAMES.filter(g => {
    const textMatches = ([g.title, g.desc, g.tags.join(' ')].join(' ')).toLowerCase().includes(q);
    const tagMatches = (active === 'all') || (g.tags || []).includes(active);
    return textMatches && tagMatches;
  });
  render(list);
}

search.addEventListener('input', applyFilters);
chips.forEach(ch => {
  ch.addEventListener('click', ()=>{
    chips.forEach(x => x.setAttribute('aria-pressed','false'));
    ch.setAttribute('aria-pressed','true');
    applyFilters();
  });
});

/* Receive progress from games via postMessage */
window.addEventListener('message', ev => {
  const d = ev.data || {};
  if(!d.game) return;
  const id = d.game;
  state.games[id] ??= {best:0, stars:0, plays:0, last:null};
  const g = state.games[id];
  if(typeof d.stars === 'number'){
    const before = g.stars;
    g.stars = Math.max(before, Math.min(3, d.stars));
    state.stars += Math.max(0, g.stars - before);
  }
  if(typeof d.score === 'number'){
    g.best = Math.max(g.best, d.score);
  }
  g.last = new Date().toISOString();
  state.coins += 2;
  save(state);
  render();
  toast('Progress saved! ⭐');
});

/* Initialization */
updateDaily();
render();

