// ===== Footer Year =====
const yearEl = document.getElementById('y');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== Mobile Drawer Toggle =====
const btn = document.querySelector('.nav-toggle');
const drawer = document.getElementById('drawer');
const scrim = document.getElementById('scrim');

function openNav(open) {
  if (!btn || !drawer || !scrim) return;
  btn.setAttribute('aria-expanded', String(open));
  drawer.classList.toggle('show', open);
  scrim.hidden = !open;
  scrim.classList.toggle('show', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

if (btn) {
  btn.addEventListener('click', () =>
    openNav(btn.getAttribute('aria-expanded') !== 'true')
  );
  scrim.addEventListener('click', () => openNav(false));
  drawer.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => openNav(false))
  );
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') openNav(false);
  });
}

// ===== Mascot Rotating Messages =====
const speech = document.getElementById('speech');
const mascot = document.getElementById('mascot');

const rotateLines = [
  "👏 Great job showing up today! 🌟",
  "🎯 Keep learning and having fun!",
  "🚀 You're a shining star in class!",
  "📚 Every step counts — keep going!"
];

const surpriseLines = [
  "🎉 Bonus tip: teach someone else what you learned!",
  "🔤 Say the ABCs backwards… just kidding! 😄",
  "🧠 Brain stretch: find 3 words that rhyme!",
  "🎯 Mini mission: play 2 games today!",
  "🥳 High five! You’re doing amazing!"
];

let i = 0;
let timer;

function fadeToNextLine() {
  if (!speech) return;
  speech.classList.add('hide');
  setTimeout(() => {
    i = (i + 1) % rotateLines.length;
    speech.textContent = rotateLines[i];
    speech.classList.remove('hide');
  }, 600);
}

function startCycle() {
  stopCycle();
  timer = setInterval(fadeToNextLine, 5000);
}

function stopCycle() {
  if (timer) clearInterval(timer);
}

startCycle();

// ===== Mascot Click Surprise =====
if (mascot) {
  mascot.addEventListener('click', () => {
    stopCycle();
    if (!speech) return;

    speech.classList.add('hide');
    setTimeout(() => {
      speech.textContent =
        surpriseLines[Math.floor(Math.random() * surpriseLines.length)];
      speech.classList.remove('hide');
    }, 600);

    mascot.classList.remove('pop');
    void mascot.offsetWidth; // reset animation
    mascot.classList.add('pop');

    setTimeout(startCycle, 5000);
  });
}

// ===== Mascot Pop Animation =====
const style = document.createElement('style');
style.textContent = `
  @keyframes pop {
    0% { transform: scale(1); }
    40% { transform: scale(1.3); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); }
  }
  .pop { animation: pop 0.6s ease; }
`;
document.head.appendChild(style);

// ===== Nebula Parallax Effect =====
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  const nebula = document.querySelector('.nebula');
  if (nebula) {
    nebula.style.transform = `translateY(${scrollY * 0.1}px) scale(1.05)`;
  }
});
// ===== Falling Sparkling Stars Generator =====
function createFallingStar() {
  const star = document.createElement("div");
  star.classList.add("falling-star");

  // Random horizontal start position
  star.style.left = `${Math.random() * 100}vw`;

  // Random animation duration between 4–9s
  const duration = 4 + Math.random() * 5;
  star.style.animationDuration = `${duration}s`;

  // Random size (1–3px)
  const size = 1 + Math.random() * 2;
  star.style.width = `${size}px`;
  star.style.height = `${size}px`;

  document.body.appendChild(star);

  // Remove after animation ends
  setTimeout(() => star.remove(), duration * 1000);
}

// Create a new falling star every 200–400ms
setInterval(createFallingStar, 300);
