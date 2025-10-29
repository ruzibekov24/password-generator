/* script.js — Full functionality: generate, regenerate, strength, localStorage save, analyze, theme persistence */

// Character sets
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+{}[]<>?,./~`-=";

// Utils
function randInt(max){
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % max;
}
function randomCharFrom(s){ return s[randInt(s.length)]; }
function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = randInt(i+1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// DOM refs (matching current HTML structure)
const lengthEl = document.getElementById('length');
const lengthValue = document.getElementById('lengthValue');
const lowerEl = document.getElementById('lowercase');
const upperEl = document.getElementById('uppercase');
const numbersEl = document.getElementById('numbers');
const symbolsEl = document.getElementById('symbols');

const generateBtn = document.getElementById('generate');
const copyBtn = document.getElementById('copyBtn');
const passwordInput = document.getElementById('password');
const strengthLabel = document.getElementById('strengthLabel');
const strengthBar = document.getElementById('strengthBar');
const themeToggle = document.getElementById('themeToggle');

// For saved list and analyzer (if present in page version)
const savedListEl = document.getElementById('savedList');
const clearAllBtn = document.getElementById('clearAllBtn');
const regenerateBtn = document.getElementById('regenerateBtn');
const revealBtn = document.getElementById('revealBtn');
const analyzeInput = document.getElementById('analyzeInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const analysisResult = document.getElementById('analysisResult');

// State
let lastOptions = null;
let savedPasswords = loadSaved();

// Initialize UI
if(lengthEl && lengthValue) {
  lengthValue.textContent = lengthEl.value;
  lengthEl.addEventListener('input', ()=> lengthValue.textContent = lengthEl.value);
}

// Theme persistence (uses data-theme on body or class 'dark')
(function initTheme(){
  const prefer = localStorage.getItem('pg_theme');
  if(prefer === 'dark') document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  updateThemeButton();
})();

if(themeToggle){
  themeToggle.addEventListener('click', ()=>{
    document.body.classList.toggle('dark');
    localStorage.setItem('pg_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    updateThemeButton();
  });
}
function updateThemeButton(){
  if(!themeToggle) return;
  themeToggle.textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark Mode';
}

// Generation logic
function getOptions(){
  return {
    length: lengthEl ? parseInt(lengthEl.value,10) : 12,
    lower: lowerEl ? lowerEl.checked : true,
    upper: upperEl ? upperEl.checked : true,
    numbers: numbersEl ? numbersEl.checked : true,
    symbols: symbolsEl ? symbolsEl.checked : false
  };
}

function generatePassword(length, {lower,upper,numbers,symbols}){
  let pool = '';
  const required = [];
  if(upper){ pool += UPPER; required.push(randomCharFrom(UPPER)); }
  if(lower){ pool += LOWER; required.push(randomCharFrom(LOWER)); }
  if(numbers){ pool += NUMS; required.push(randomCharFrom(NUMS)); }
  if(symbols){ pool += SYMBOLS; required.push(randomCharFrom(SYMBOLS)); }
  if(pool.length === 0) {
    alert('Iltimos, kamida bitta belgilar turini tanlang.');
    return '';
  }
  const remaining = Math.max(0, length - required.length);
  const chars = [];
  for(let i=0;i<remaining;i++) chars.push(randomCharFrom(pool));
  const all = required.concat(chars);
  shuffle(all);
  return all.slice(0, length).join('');
}

// Strength evaluation (entropy-based with pattern penalties)
function estimateEntropy(pwd){
  if(!pwd) return 0;
  const pool = (/[A-Z]/.test(pwd) ? 26 : 0) + (/[a-z]/.test(pwd) ? 26 : 0) + (/[0-9]/.test(pwd) ? 10 : 0) + (/[^A-Za-z0-9]/.test(pwd) ? 32 : 0);
  const entPerChar = Math.log2(Math.max(2,pool));
  let entropy = entPerChar * pwd.length;
  const low = pwd.toLowerCase();
  const common = ['password','1234','qwerty','admin','letmein','abcdef'];
  for(const c of common) if(low.includes(c)) entropy -= 20;
  if(/^(.)\1+$/.test(pwd)) entropy -= 30; // all same char
  if(/(\d)\1{2,}/.test(pwd)) entropy -= 8; // repeated digits
  return Math.max(0, Math.round(entropy));
}

function updateStrengthUI(pwd){
  if(!strengthLabel || !strengthBar) return;
  const e = estimateEntropy(pwd);
  let label = 'Zaif';
  let pct = 10;
  let color = '#ef4444';
  if(e < 40){ label = 'Zaif'; pct = 20; color = '#ef4444'; }
  else if(e < 60){ label = "O'rta"; pct = 50; color = '#f59e0b'; }
  else if(e < 90){ label = 'Kuchli'; pct = 75; color = '#10b981'; }
  else { label = 'Juda kuchli'; pct = 100; color = '#006400'; }
  strengthLabel.textContent = `${label} · ~${e} bit`;
  strengthBar.style.background = '#e6e6e6';
  strengthBar.style.width = '100%';
  // create inner colored bar
  if(!strengthBar.querySelector('.inner')){
    const inner = document.createElement('div');
    inner.className = 'inner';
    inner.style.height = '100%';
    inner.style.borderRadius = '3px';
    inner.style.transition = 'width 300ms, background 300ms';
    strengthBar.appendChild(inner);
  }
  const inner = strengthBar.querySelector('.inner');
  inner.style.width = pct + '%';
  inner.style.background = color;
}

// Saving to localStorage
function loadSaved(){
  try{
    const raw = localStorage.getItem('pg_saved_v2');
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function persistSaved(){
  localStorage.setItem('pg_saved_v2', JSON.stringify(savedPasswords));
}

function savePassword(pwd){
  if(!pwd) return;
  if(savedPasswords[0] && savedPasswords[0].pwd === pwd) return;
  savedPasswords.unshift({pwd, at: Date.now()});
  if(savedPasswords.length > 100) savedPasswords.length = 100;
  persistSaved();
}

function renderSaved(){
  if(!savedListEl) return;
  savedListEl.innerHTML = '';
  if(savedPasswords.length === 0){ savedListEl.textContent = 'Hech qanaqa saqlangan parol yo\'q.'; return; }
  savedPasswords.forEach((it, idx)=>{
    const row = document.createElement('div');
    row.className = 'saved-item';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const t = document.createElement('div');
    t.textContent = it.pwd;
    t.style.fontFamily = 'ui-monospace, Menlo, Monaco, "Roboto Mono", monospace';
    const time = document.createElement('small');
    time.textContent = new Date(it.at).toLocaleString();
    time.style.marginLeft = '10px';
    time.style.color = 'var(--muted)';
    meta.appendChild(t); meta.appendChild(time);

    const actions = document.createElement('div');
    actions.style.display = 'flex'; actions.style.gap='6px';
    const cbtn = document.createElement('button'); cbtn.className='small-btn'; cbtn.textContent='Copy';
    cbtn.onclick = async ()=>{ try{ await navigator.clipboard.writeText(it.pwd); flash(cbtn,'Copied'); }catch{ flash(cbtn,'Fail'); }};
    const use = document.createElement('button'); use.className='small-btn'; use.textContent='Use'; use.onclick = ()=>{ passwordInput.value = it.pwd; updateStrengthUI(it.pwd); };
    const del = document.createElement('button'); del.className='small-btn'; del.textContent='Del'; del.onclick = ()=>{ if(!confirm('O\'chirilsinmi?')) return; savedPasswords.splice(idx,1); persistSaved(); renderSaved(); };
    actions.appendChild(cbtn); actions.appendChild(use); actions.appendChild(del);

    row.appendChild(meta);
    row.appendChild(actions);
    savedListEl.appendChild(row);
  });
}

// Analyze (brute-force time estimate)
function analyzePassword(pwd){
  const pool = (/[A-Z]/.test(pwd) ? 26 : 0) + (/[a-z]/.test(pwd) ? 26 : 0) + (/[0-9]/.test(pwd) ? 10 : 0) + (/[^A-Za-z0-9]/.test(pwd) ? 32 : 0);
  const entropy = Math.log2(Math.max(2, pool)) * pwd.length;
  // guesses per second assumption
  const guessesPerSec = 1e10; // 10 billion
  const log10_seconds = entropy * Math.log10(2) - Math.log10(guessesPerSec);
  // convert
  if(!isFinite(log10_seconds)) return {summary: 'Juda uzoq', details: `Entropiya: ${Math.round(entropy)} bit`};
  const years = Math.pow(10, log10_seconds) / (60*60*24*365);
  let human;
  if(years < 1) {
    const secs = Math.pow(10, log10_seconds);
    human = secs < 1 ? '<1 s' : `${Math.round(secs)} s`;
  } else if(years < 1000) {
    human = `${Math.round(years)} yil`;
  } else {
    const mag = Math.floor(Math.log10(years));
    human = `~10^${mag} yil`;
  }
  return {summary: `Taxminiy buzish vaqti: <strong>${human}</strong>`, details: `Entropiya taxminan ${Math.round(entropy)} bit (${pool} belgilar, uzunlik ${pwd.length})`};
}

// Flash helper
function flash(el, txt){
  const orig = el.textContent;
  el.textContent = txt;
  setTimeout(()=> el.textContent = orig, 1000);
}

// Event wiring (only if elements exist)
if(generateBtn){
  generateBtn.addEventListener('click', ()=>{
    const opts = getOptions();
    const pwd = generatePassword(opts.length, opts);
    passwordInput.value = pwd;
    updateStrengthUI(pwd);
    lastOptions = opts;
    savePassword(pwd);
    renderSaved();
  });
}
if(typeof regenerateBtn !== 'undefined' && regenerateBtn){
  regenerateBtn.addEventListener('click', ()=>{
    if(!lastOptions){ flash(regenerateBtn,'No settings'); return; }
    const pwd = generatePassword(lastOptions.length, lastOptions);
    passwordInput.value = pwd;
    updateStrengthUI(pwd);
    savePassword(pwd);
    renderSaved();
  });
}
if(copyBtn){
  copyBtn.addEventListener('click', async ()=>{
    const txt = passwordInput.value;
    if(!txt){ flash(copyBtn,'No password'); return; }
    try{ await navigator.clipboard.writeText(txt); flash(copyBtn,'Copied'); }catch{ flash(copyBtn,'Fail'); }
  });
}
if(typeof revealBtn !== 'undefined' && revealBtn){
  revealBtn.addEventListener('click', ()=>{
    const pressed = revealBtn.getAttribute('aria-pressed') === 'true';
    revealBtn.setAttribute('aria-pressed', String(!pressed));
    revealBtn.textContent = pressed ? 'Show' : 'Hide';
    // keep input as text for easy copy
  });
}
if(typeof analyzeBtn !== 'undefined' && analyzeBtn){
  analyzeBtn.addEventListener('click', ()=>{
    const p = analyzeInput.value.trim();
    if(!p){ analysisResult.textContent = 'Parol kiritilmagan.'; return; }
    const res = analyzePassword(p);
    analysisResult.innerHTML = res.summary + '<br><small>' + res.details + '</small>';
  });
}
if(typeof clearAllBtn !== 'undefined' && clearAllBtn){
  clearAllBtn.addEventListener('click', ()=>{
    if(!confirm('Hammasini o\'chirilsinmi?')) return;
    savedPasswords = [];
    persistSaved();
    renderSaved();
  });
}

// On load
renderSaved();
// auto-generate first password
if(generateBtn) generateBtn.click();

// persist before unload
window.addEventListener('beforeunload', persistSaved);
