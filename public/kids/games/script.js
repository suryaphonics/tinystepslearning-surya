/* ====== DATA & STATE ====== */
const STORAGE = 'ts.games.meta.v1';
const meta = { stars:0, coins:0, streak:0, lastPlayed:null, games:{} };

const GAMES = [
  {
    id:'phonics-zone',
    title:'🔤 Phonics Zone',
    desc:'Play sound, letter, and blending games.',
    url:'/kids/games/phonics/',
    tags:['phonics'],
    color:['#a5f3fc','#c4b5fd'],
    available:true
  },
  {
    id:'grammar-zone',
    title:'✍️ Grammar Zone',
    desc:'Learn grammar with fun sentence-building activities.',
    url:'/kids/games/grammar/',
    tags:['grammar'],
    color:['#fbcfe8','#fde68a'],
    available:true
  },
  {
    id:'public-speaking-zone',
    title:'🗣️ Speaking Zone',
    desc:'Practice public speaking with interactive games.',
    url:'/kids/games/speaking/',
    tags:['speaking'],
    color:['#fcd34d','#a7f3d0'],
    available:true
  }
];

function load(){ try{ const raw=localStorage.getItem(STORAGE); if(raw) return JSON.parse(raw);}catch{} return structuredClone(meta); }
function save(x){ localStorage.setItem(STORAGE, JSON.stringify(x)); }
const state = load();

function updateDaily(){
  const today=new Date(); today.setHours(0,0,0,0);
  const last= state.lastPlayed ? new Date(state.lastPlayed) : null;
  if(!last){ state.streak=1; }
  else{
    last.setHours(0,0,0,0);
    const diff=Math.round((today-last)/86400000);
    if(diff===1) state.streak+=1; else if(diff>1) state.streak=1;
  }
  state.lastPlayed=new Date().toISOString(); save(state);
}

const $ = s=>document.querySelector(s);
const grid = $('#grid');
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1600); }
function fmtDate(iso){ try{ return new Date(iso).toLocaleDateString(); }catch{ return ''; } }

/* ====== CARD RENDER ====== */
function card(game){
  const gstate = state.games[game.id] ?? (state.games[game.id]={best:0,stars:0,plays:0,last:null});
  const pct=Math.min(100,(gstate.stars/3)*100);
  const locked=!game.available;

  const article=document.createElement('article');
  article.className='card'+(locked?' locked':'');
  article.style.setProperty('--glow1', game.color[0]);
  article.style.setProperty('--glow2', game.color[1]);
  article.style.setProperty('--glow3', '#6c1bff');

  const title=document.createElement('div');
  title.className='gameTitle';
  title.innerHTML=`<span>${game.title}</span>${locked?'<span class="badge">🔒 Coming soon</span>':''}`;

  const desc=document.createElement('div'); desc.className='desc'; desc.textContent=game.desc;

  const meta=document.createElement('div'); meta.className='meta';
  meta.innerHTML = `
    <span class="badge">⭐ ${gstate.stars}/3</span>
    <span class="badge">🏆 Best: ${gstate.best}</span>
    ${gstate.last?`<span class="badge">⏱️ ${fmtDate(gstate.last)}</span>`:''}
  `;

  const prog=document.createElement('div'); prog.className='progress';
  prog.innerHTML=`<span style="width:${pct}%"></span>`;

  const actions=document.createElement('div'); actions.className='actions';
  const play=document.createElement('a');
  play.className='btn'; play.textContent=locked?'Locked':'Play';
  play.href=locked?'javascript:void(0)':game.url;
  play.setAttribute('aria-disabled',locked?'true':'false');
  play.addEventListener('click', e=>{
    if(locked){ e.preventDefault(); toast('Coming soon!'); return; }
    gstate.plays++; gstate.last=new Date().toISOString(); state.coins+=1; save(state);
  });

  const details=document.createElement('button'); details.className='btn ghost'; details.textContent='Details';
  details.addEventListener('click',()=> toast(`${game.title}: ${game.desc}`));

  actions.append(play, details);
  article.append(title, desc, meta, prog, actions);
  return article;
}

function render(list=GAMES){
  grid.innerHTML=''; list.forEach(g=>grid.append(card(g)));
  $('#uiStreak').textContent=state.streak; $('#uiStars').textContent=state.stars; $('#uiCoins').textContent=state.coins;
}

/* ====== SEARCH & FILTER ====== */
const search=$('#search'); const chips=document.querySelectorAll('.chip');
function applyFilters(){
  const q=(search.value||'').toLowerCase();
  const active=[...chips].find(c=>c.getAttribute('aria-pressed')==='true')?.dataset.filter || 'all';
  const list=GAMES.filter(g=>{
    const matchesText=[g.title,g.desc,g.tags.join(' ')].join(' ').toLowerCase().includes(q);
    const matchesTag=(active==='all')||(g.tags||[]).includes(active);
    return matchesText&&matchesTag;
  });
  render(list);
}
search.addEventListener('input', applyFilters);
chips.forEach(ch=>ch.addEventListener('click',()=>{ chips.forEach(x=>x.setAttribute('aria-pressed','false')); ch.setAttribute('aria-pressed','true'); applyFilters(); }));

/* ====== POSTMESSAGE PROGRESS ====== */
window.addEventListener('message',(ev)=>{
  const d=ev.data||{};
  if(!d.game) return;
  const id = d.game;
  state.games[id] ??= {best:0,stars:0,plays:0,last:null};
  const g = state.games[id];
  if(typeof d.stars==='number'){
    const before=g.stars; g.stars=Math.max(before,Math.min(3,d.stars));
    state.stars += Math.max(0,g.stars-before);
  }
  if(typeof d.score==='number'){ g.best=Math.max(g.best,d.score); }
  g.last=new Date().toISOString(); state.coins+=2;
  save(state); render(); toast('Progress updated! ⭐');
});

updateDaily(); render();
