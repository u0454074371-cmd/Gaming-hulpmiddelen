// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const CIRC = 2 * Math.PI * 130;

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.dataset.active = 'false');
  $(id).dataset.active = 'true';
}

function fmt(totalSeconds){
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

function digitsOf(totalSeconds){
  return fmt(totalSeconds).replace(/:/g, '').split('');
}

const STYLE_NAMES = { orbit: 'orbit', board: 'vertrekbord', terminal: 'terminal', wave: 'golf' };
const STYLE_ACCENT = { orbit: '#5ef2c4', board: '#ffb020', terminal: '#39ff88', wave: '#2f9bdb' };

// ---------- state ----------
let totalSeconds = 25 * 60;
let remaining = totalSeconds;
let intervalId = null;
let paused = false;
let pipWindow = null;
let selectedStyle = 'orbit';
let prevDigits = null;

// ---------- start / setup navigatie ----------
$('btn-new-timer').addEventListener('click', () => showScreen('screen-setup'));
$('btn-back-start').addEventListener('click', () => showScreen('screen-start'));

document.querySelectorAll('.style-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.style-card').forEach(c => c.dataset.active = 'false');
    card.dataset.active = 'true';
    selectedStyle = card.dataset.style;
  });
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(c => c.dataset.active = 'false');
    chip.dataset.active = 'true';
    const min = parseInt(chip.dataset.min, 10);
    $('input-hours').value = Math.floor(min / 60);
    $('input-minutes').value = min % 60;
  });
});

['input-hours', 'input-minutes'].forEach(id => {
  $(id).addEventListener('input', () => {
    document.querySelectorAll('.chip').forEach(c => c.dataset.active = 'false');
  });
});

$('btn-start-timer').addEventListener('click', () => {
  const h = Math.max(0, Math.min(23, parseInt($('input-hours').value, 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt($('input-minutes').value, 10) || 0));
  totalSeconds = h * 3600 + m * 60;
  if (totalSeconds <= 0){
    $('input-minutes').focus();
    return;
  }
  startTimer();
});

// ---------- timer-engine ----------
function startTimer(){
  remaining = totalSeconds;
  paused = false;
  prevDigits = null;
  $('btn-pause').textContent = 'Pauzeer';
  document.body.dataset.style = selectedStyle;
  $('run-style-label').textContent = STYLE_NAMES[selectedStyle];
  if (selectedStyle === 'board') buildBoard();
  showScreen('screen-running');
  updateRunningDisplay();
  clearInterval(intervalId);
  intervalId = setInterval(tick, 1000);
}

function tick(){
  if (paused) return;
  remaining -= 1;
  if (remaining <= 0){
    remaining = 0;
    updateRunningDisplay();
    clearInterval(intervalId);
    finishTimer();
    return;
  }
  updateRunningDisplay();
}

function updateRunningDisplay(){
  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const text = fmt(remaining);

  if (selectedStyle === 'orbit') updateOrbit(progress, text);
  if (selectedStyle === 'board') updateBoard(text, progress);
  if (selectedStyle === 'terminal') updateTerminal(progress, text);
  if (selectedStyle === 'wave') updateWave(progress, text);

  updatePip(progress, text);
}

// ---- Orbit ----
function updateOrbit(progress, text){
  const offset = CIRC * (1 - progress);
  const angle = (1 - progress) * 360;
  $('orbit-digits').textContent = text;
  $('orbit-progress').style.strokeDashoffset = offset;
  $('orbit-dot').style.transform =
    `translate(-50%, -50%) rotate(${angle}deg) translate(130px) rotate(-${angle}deg)`;
}

// ---- Vertrekbord (split-flap) ----
function buildBoard(){
  const row = $('board-row');
  row.innerHTML = '';
  const groups = [
    ['h0', 'h1'], ['m0', 'm1'], ['s0', 's1']
  ];
  groups.forEach((pair, gi) => {
    const group = document.createElement('div');
    group.className = 'flip-group';
    pair.forEach((_, i) => {
      const idx = gi * 2 + i;
      const card = document.createElement('div');
      card.className = 'flip-card';
      card.id = 'flip-' + idx;
      card.innerHTML = `<div class="flip-digit">0</div>`;
      group.appendChild(card);
    });
    row.appendChild(group);
    if (gi < 2){
      const sep = document.createElement('div');
      sep.className = 'flip-sep';
      sep.textContent = ':';
      row.appendChild(sep);
    }
  });

  const status = $('board-status');
  status.innerHTML = '';
  for (let i = 0; i < 20; i++){
    const lamp = document.createElement('div');
    lamp.className = 'lamp';
    status.appendChild(lamp);
  }
}

function updateBoard(text, progress){
  const digits = digitsOf(remaining);
  digits.forEach((d, i) => {
    const card = $('flip-' + i);
    if (!card) return;
    const label = card.querySelector('.flip-digit');
    if (prevDigits && prevDigits[i] !== d){
      card.classList.remove('flipping');
      void card.offsetWidth;
      card.classList.add('flipping');
      setTimeout(() => { label.textContent = d; }, 160);
    } else if (!prevDigits){
      label.textContent = d;
    }
  });
  prevDigits = digits;

  const lit = Math.round(progress * 20);
  document.querySelectorAll('#board-status .lamp').forEach((lamp, i) => {
    lamp.classList.toggle('lit', i < lit);
  });
}

// ---- Terminal ----
function updateTerminal(progress, text){
  $('term-digits').textContent = text;
  const width = 24;
  const filled = Math.round(progress * width);
  const bar = '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + '] ' + Math.round(progress * 100) + '%';
  $('term-bar').textContent = bar;
}

// ---- Golf ----
function updateWave(progress, text){
  $('wave-digits').textContent = text;
  $('wave-fluid').style.height = Math.max(0, progress * 100) + '%';
}

// ---------- besturing ----------
$('btn-pause').addEventListener('click', () => {
  paused = !paused;
  $('btn-pause').textContent = paused ? 'Hervat' : 'Pauzeer';
});

$('btn-reset').addEventListener('click', () => {
  clearInterval(intervalId);
  showScreen('screen-setup');
});

function finishTimer(){
  try { $('chime').play(); } catch (e) {}
  if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
  showScreen('screen-done');
  if (pipWindow && !pipWindow.closed){
    const el = pipWindow.document.getElementById('pip-digits');
    if (el) el.textContent = 'klaar!';
  }
}

$('btn-done-start').addEventListener('click', () => showScreen('screen-start'));
$('btn-done-again').addEventListener('click', () => startTimer());

// ---------- Picture-in-Picture: zwevend venster, ziet er neutraal-strak uit ----------
const pipBtn = $('btn-pip');
if (!('documentPictureInPicture' in window)) pipBtn.style.display = 'none';

pipBtn.addEventListener('click', async () => {
  if (!('documentPictureInPicture' in window)) return;

  pipWindow = await window.documentPictureInPicture.requestWindow({ width: 260, height: 140 });

  const style = pipWindow.document.createElement('style');
  style.textContent = `
    body{ margin:0; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;
      background:#0b0d10; font-family:'Space Mono', monospace; }
    .pip-digits{ font-size:30px; font-weight:700; color:#eef1f3; }
    .pip-bar-track{ width:80%; height:6px; border-radius:999px; background:#232a32; margin-top:12px; overflow:hidden; }
    .pip-bar-fill{ height:100%; border-radius:999px; transition:width .3s linear; }
  `;
  pipWindow.document.head.appendChild(style);
  pipWindow.document.body.innerHTML = `
    <span class="pip-digits" id="pip-digits">${fmt(remaining)}</span>
    <div class="pip-bar-track"><div class="pip-bar-fill" id="pip-bar-fill"></div></div>
  `;

  updatePip(totalSeconds > 0 ? remaining / totalSeconds : 0, fmt(remaining));

  pipWindow.addEventListener('pagehide', () => { pipWindow = null; });
});

function updatePip(progress, text){
  if (!pipWindow || pipWindow.closed) return;
  const digits = pipWindow.document.getElementById('pip-digits');
  const bar = pipWindow.document.getElementById('pip-bar-fill');
  if (digits) digits.textContent = text;
  if (bar){
    bar.style.width = Math.max(0, progress * 100) + '%';
    bar.style.background = STYLE_ACCENT[selectedStyle] || '#6c9fff';
  }
}

// ---------- PWA ----------
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
