/* script.js — to'liq funksiya: generate, regenerate, strength (juda kuchli), localStorage save, analyze */

/* Character sets */
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+{}[]<>?,./~`-=";

/* Helpers */
function randInt(max) {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return arr[0] % max;
}
function randomCharFrom(s) { return s[randInt(s.length)]; }
function shuffle(a){
  for (let i=a.length-1;i>0;i--){
    const j=randInt(i+1);
    [a[i],a[j]]=[a[j],a[i]];
  }
}

/* Elements */
const lengthEl = document.getElementById("length");
const lengthValueEl = document.getElementById("lengthValue");
const upperEl = document.getElementById("upper");
const lowerEl = document.getElementById("lower");
const numbersEl = document.getElementById("numbers");
const symbolsEl = document.getElementById("symbols");

const generateBtn = document.getElementById("generateBtn");
const regenerateBtn = document.getElementById("regenerateBtn");
const copyBtn = document.getElementById("copyBtn");
const revealBtn = document.getElementById("revealBtn");
const outputEl = document.getElementById("passwordOutput");
const strengthEl = document.getElementById("strength");

const savedListEl = document.getElementById("savedList");
const clearAllBtn = document.getElementById("clearAllBtn");

const analyzeInput = document.getElementById("analyzeInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const analysisResult = document.getElementById("analysisResult");

const themeToggle = document.getElementById("themeToggle");

/* State */
let lastOptions = null; // for regenerate
let savedPasswords = loadSaved();

/* Initial */
lengthValueEl.textContent = lengthEl.value;
lengthEl.addEventListener("input", ()=> lengthValueEl.textContent = lengthEl.value);

/* Theme: full black in dark mode */
themeToggle.addEventListener("click", ()=>{
  const html = document.documentElement;
  const current = html.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  html.setAttribute("data-theme", next);
  themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
  themeToggle.setAttribute("aria-pressed", String(next==="dark"));
});

/* Generate */
generateBtn.addEventListener("click", ()=>{
  const opts = getOptions();
  const pwd = generatePassword(opts.length, opts);
  outputEl.value = pwd;
  evaluateStrength(pwd);
  lastOptions = opts;
  saveGeneratedPrompt(pwd); // save to localStorage list automatically
  renderSaved();
});

/* Regenerate (same options) */
regenerateBtn.addEventListener("click", ()=>{
  if (!lastOptions) { flash(regenerateBtn, "No settings"); return; }
  const pwd = generatePassword(lastOptions.length, lastOptions);
  outputEl.value = pwd;
  evaluateStrength(pwd);
  saveGeneratedPrompt(pwd);
  renderSaved();
});

/* Copy */
copyBtn.addEventListener("click", async ()=>{
  const txt = outputEl.value;
  if (!txt) { flash(copyBtn,"No password"); return; }
  try {
    await navigator.clipboard.writeText(txt);
    flash(copyBtn,"Copied");
  } catch (e) {
    flash(copyBtn,"Fail");
  }
});

/* Reveal toggle (simple) */
revealBtn.addEventListener("click", ()=>{
  const pressed = revealBtn.getAttribute("aria-pressed")==="true";
  revealBtn.setAttribute("aria-pressed", String(!pressed));
  revealBtn.textContent = pressed ? "Show" : "Hide";
  // keep as text always for easier copy; if you want masking use type=password (but copying sometimes blocked)
  if (!pressed) outputEl.type = "text";
  else outputEl.type = "text";
});

/* Analyze input */
analyzeBtn.addEventListener("click", ()=>{
  const p = analyzeInput.value.trim();
  if (!p) { analysisResult.textContent = "Parol kiritilmagan."; return; }
  const res = analyzePassword(p);
  analysisResult.innerHTML = res.summary + "<br><small>" + res.details + "</small>";
});

/* Saved list actions */
clearAllBtn.addEventListener("click", ()=>{
  if (!confirm("Hammasini o‘chirilsinmi?")) return;
  savedPasswords = [];
  persistSaved();
  renderSaved();
});

/* LocalStorage helpers */
function loadSaved(){
  try {
    const raw = localStorage.getItem("saved_passwords_v1");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
function persistSaved(){
  localStorage.setItem("saved_passwords_v1", JSON.stringify(savedPasswords));
}
/* Save generated automatically (keep max 50, unique near top) */
function saveGeneratedPrompt(pwd){
  if (!pwd) return;
  // Avoid exact duplicates in a row
  if (savedPasswords[0] && savedPasswords[0].pwd === pwd) return;
  savedPasswords.unshift({pwd, at: Date.now()});
  if (savedPasswords.length > 50) savedPasswords.length = 50;
  persistSaved();
}

/* Render saved list */
function renderSaved(){
  if (savedPasswords.length===0){
    savedListEl.textContent = "Hech qanaqa saqlangan parol yo‘q.";
    return;
  }
  savedListEl.innerHTML = "";
  savedPasswords.forEach((item, idx)=>{
    const div = document.createElement("div");
    div.className = "saved-item";

    const meta = document.createElement("div");
    meta.className = "meta";

    const text = document.createElement("div");
    text.textContent = item.pwd;
    text.style.fontFamily = "ui-monospace, Menlo, Monaco, 'Roboto Mono', monospace";

    const time = document.createElement("small");
    const d = new Date(item.at);
    time.textContent = d.toLocaleString();
    time.style.marginLeft = "8px";
    time.style.color = "var(--muted)";

    meta.appendChild(text);
    meta.appendChild(time);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";

    const copy = document.createElement("button");
    copy.className = "small-btn";
    copy.textContent = "Copy";
    copy.onclick = async ()=>{
      try { await navigator.clipboard.writeText(item.pwd); flash(copy,"Copied"); }
      catch { flash(copy,"Fail"); }
    };

    const use = document.createElement("button");
    use.className = "small-btn";
    use.textContent = "Use";
    use.onclick = ()=>{
      outputEl.value = item.pwd;
      evaluateStrength(item.pwd);
    };

    const del = document.createElement("button");
    del.className = "small-btn";
    del.textContent = "Del";
    del.onclick = ()=>{
      if (!confirm("O‘chirilsinmi?")) return;
      savedPasswords.splice(idx,1);
      persistSaved();
      renderSaved();
    };

    actions.appendChild(copy);
    actions.appendChild(use);
    actions.appendChild(del);

    div.appendChild(meta);
    div.appendChild(actions);
    savedListEl.appendChild(div);
  });
}

/* Options getter */
function getOptions(){
  const length = parseInt(lengthEl.value,10);
  return {
    length,
    upper: upperEl.checked,
    lower: lowerEl.checked,
    numbers: numbersEl.checked,
    symbols: symbolsEl.checked
  };
}

/* Generate password (ensures at least one of each chosen type) */
function generatePassword(length, {upper,lower,numbers,symbols}){
  let pool = "";
  const required = [];
  if (upper){ pool += UPPER; required.push(randomCharFrom(UPPER)); }
  if (lower){ pool += LOWER; required.push(randomCharFrom(LOWER)); }
  if (numbers){ pool += NUMS; required.push(randomCharFrom(NUMS)); }
  if (symbols){ pool += SYMBOLS; required.push(randomCharFrom(SYMBOLS)); }
  if (!pool){
    alert("Iltimos — parol tarkibini tanlang.");
    return "";
  }
  const remaining = Math.max(0, length - required.length);
  const chars = [];
  for (let i=0;i<remaining;i++) chars.push(randomCharFrom(pool));
  const all = required.concat(chars);
  shuffle(all);
  return all.slice(0, length).join("");
}

/* Strength evaluation (AI-like label including 'Juda kuchli') */
function evaluateStrength(pwd){
  if (!pwd){ strengthEl.textContent = "—"; strengthEl.style.background="transparent"; return; }
  // estimate entropy: log2(poolSize) * length but adjust for repeated simple patterns
  const poolSize = (/[A-Z]/.test(pwd) ? 26 : 0) + (/[a-z]/.test(pwd) ? 26 : 0) + (/[0-9]/.test(pwd) ? 10 : 0) + (/[^A-Za-z0-9]/.test(pwd) ? 32 : 0);
  const entropyPerChar = Math.log2(Math.max(2, poolSize));
  let entropy = Math.round(entropyPerChar * pwd.length);

  // penalty for common patterns (simple checks)
  const lowers = pwd.toLowerCase();
  const commonWords = ["password","1234","qwerty","admin","letmein"];
  for (const w of commonWords) if (lowers.includes(w)) entropy = Math.max(1, entropy - 20);

  // more penalty for repeated characters
  if (/^(.)\1+$/.test(pwd)) entropy = Math.max(1, entropy - 30);

  // Map entropy to label
  let label = "Zaif";
  let color = "var(--danger)";
  if (entropy < 40) { label = "Zaif"; color = "var(--danger)"; }
  else if (entropy < 60) { label = "O'rta"; color = "orange"; }
  else if (entropy < 90) { label = "Kuchli"; color = "var(--success)"; }
  else { label = "Juda kuchli"; color = "#006400"; } // dark green for extra strong

  // Show label + bits
  strengthEl.textContent = `${label} · ~${entropy} bit`;
  strengthEl.style.background = color;
  strengthEl.style.color = "#fff";
}

/* Analyze password for brute-force time estimate */
function analyzePassword(pwd){
  const pool = (/[A-Z]/.test(pwd) ? 26 : 0) + (/[a-z]/.test(pwd) ? 26 : 0) + (/[0-9]/.test(pwd) ? 10 : 0) + (/[^A-Za-z0-9]/.test(pwd) ? 32 : 0);
  const entropyPerChar = Math.log2(Math.max(2,pool));
  const entropy = entropyPerChar * pwd.length;

  // assume attacker 1e10 guesses/sec (10 billion/s) — conservative high-power GPU cluster
  const guessesPerSecond = 1e10;
  const possible = Math.pow(2, entropy); // large — may be Infinity for huge entropy, handle via log
  // time in seconds using log math: time = 2^entropy / guessesPerSecond
  // compute using logs to avoid overflow:
  const log10_time_sec = (entropy * Math.LOG10E * Math.LN2) - Math.log10(guessesPerSecond); // but simpler compute: log10(2^entropy) = entropy*log10(2)
  const log10_time = entropy * Math.LOG10E * Math.LN2; // this is WRONG approach — simpler: use entropy*log10(2)
  // Fix: log10(2^entropy) = entropy * log10(2)
  const log10_2 = Math.LOG10E * Math.LN2; // equals log10(2)
  const log10_seconds = entropy * log10_2 - Math.log10(guessesPerSecond);
  // convert to human-readable
  const seconds = Math.pow(10, log10_seconds); // may underflow/overflow but we'll format via magnitudes
  // create friendly string: prefer years
  const log10_secs = log10_seconds;
  let human;
  if (isFinite(log10_secs)) {
    const years = Math.pow(10, log10_secs) / (60*60*24*365);
    if (years < 1) {
      const secs = Math.pow(10, log10_seconds);
      human = secs < 1 ? "<1 s" : `${Math.round(secs)} s`;
    } else if (years < 1e3) {
      human = `${Math.round(years)} yil`;
    } else {
      // show in scientific
      const mag = Math.floor(Math.log10(years));
      human = `~10^${mag} yil`;
    }
  } else {
    human = "Juda uzoq (10^+ yil)";
  }

  // Summary and details
  const summary = `Taxminiy buzish vaqti: <strong>${human}</strong>`;
  const details = `Entropiya taxminan ${Math.round(entropy)} bit. (Taxmin: ${pool} belgidan, ${pwd.length} uzunlik) — 10ⁱ taxminiy yadro hisoblash tezligi ob'yektiv sharoitda.`;

  return {summary, details};
}

/* Flash small text on button */
function flash(btn, text){
  const orig = btn.textContent;
  btn.textContent = text;
  setTimeout(()=> btn.textContent = orig, 900);
}

/* Persist on unload */
window.addEventListener("beforeunload", persistSaved);

/* render on load */
renderSaved();

/* Useful: generate first password */
document.getElementById("generateBtn").click();
