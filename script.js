// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const CIRC = 2 * Math.PI * 130; // omtrek van de ring (r=130)

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

// ---------- state ----------
let totalSeconds = 25 * 60;
let remaining = totalSeconds;
let intervalId = null;
let paused = false;
let pipWindow = null;

// ---------- setup scherm ----------
$('btn-new-timer').addEventListener('click', () => showScreen('screen-setup'));
$('btn-back-start').addEventListener('click', () => showScreen('screen-start'));

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

// ---------- timer engine ----------
function startTimer(){
  remaining = totalSeconds;
  paused = false;
  $('btn-pause').textContent = 'Pauzeer';
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
  const offset = CIRC * (1 - progress);
  const angle = (1 - progress) * 360;

  const text = fmt(remaining);
  $('run-digits').textContent = text;
  $('run-ring-progress').style.strokeDashoffset = offset;
  $('orbit-dot').style.transform =
    `translate(-50%, -50%) rotate(${angle}deg) translate(130px) rotate(-${angle}deg)`;

  if (pipWindow && !pipWindow.closed){
    const pipDigits = pipWindow.document.getElementById('pip-digits');
    const pipRing = pipWindow.document.getElementById('pip-ring-progress');
    if (pipDigits) pipDigits.textContent = text;
    if (pipRing) pipRing.style.strokeDashoffset = offset;
  }
}

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
    const label = pipWindow.document.getElementById('pip-label');
    if (label) label.textContent = 'klaar!';
  }
}

$('btn-done-start').addEventListener('click', () => showScreen('screen-start'));
$('btn-done-again').addEventListener('click', () => startTimer());

// ---------- Picture-in-Picture: houdt de timer zwevend in beeld ----------
const pipBtn = $('btn-pip');

if (!('documentPictureInPicture' in window)){
  pipBtn.style.display = 'none';
}

pipBtn.addEventListener('click', async () => {
  if (!('documentPictureInPicture' in window)) return;

  pipWindow = await window.documentPictureInPicture.requestWindow({
    width: 260,
    height: 260,
  });

  // stijl en fonts overnemen in het pip-venstertje
  [...document.styleSheets].forEach(sheet => {
    try {
      const css = [...sheet.cssRules].map(r => r.cssText).join('\n');
      const style = pipWindow.document.createElement('style');
      style.textContent = css;
      pipWindow.document.head.appendChild(style);
    } catch (e) {
      const link = pipWindow.document.createElement('link');
      link.rel = 'stylesheet';
      link.type = sheet.type;
      link.media = sheet.media;
      link.href = sheet.href;
      pipWindow.document.head.appendChild(link);
    }
  });

  pipWindow.document.body.className = 'pip-body';
  pipWindow.document.body.innerHTML = `
    <div class="ring-wrap" style="width:200px;height:200px;margin:0;">
      <svg class="ring" viewBox="0 0 300 300">
        <circle class="ring-track" cx="150" cy="150" r="130"></circle>
        <circle class="ring-progress" id="pip-ring-progress" cx="150" cy="150" r="130"></circle>
      </svg>
      <div class="ring-center">
        <span class="digits" id="pip-digits" style="font-size:26px;">${fmt(remaining)}</span>
        <span class="ring-label" id="pip-label">focus</span>
      </div>
    </div>
  `;

  updateRunningDisplay();

  pipWindow.addEventListener('pagehide', () => {
    pipWindow = null;
  });
});

// ---------- PWA: registreer service worker zodat de app installeerbaar is ----------
if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
