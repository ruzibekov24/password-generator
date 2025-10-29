/* script.js — parol generatsiya, clipboard, kuch indikator, theme toggle */

/* Utility: cryptographically secure random integer in [0, max) */
function randInt(max) {
  // Using crypto.getRandomValues for better randomness than Math.random
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/* Characters sets */
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMS  = "0123456789";
const SYMBOLS = "!@#$%^&*()_+{}[]<>?,./~`-=";

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const lengthEl = document.getElementById("length");
  const lengthValueEl = document.getElementById("lengthValue");
  const upperEl = document.getElementById("upper");
  const lowerEl = document.getElementById("lower");
  const numbersEl = document.getElementById("numbers");
  const symbolsEl = document.getElementById("symbols");
  const generateBtn = document.getElementById("generateBtn");
  const copyBtn = document.getElementById("copyBtn");
  const outputEl = document.getElementById("passwordOutput");
  const revealBtn = document.getElementById("toggleReveal");
  const strengthEl = document.getElementById("strength");
  const themeToggle = document.getElementById("themeToggle");

  // reflect initial length
  lengthValueEl.textContent = lengthEl.value;

  lengthEl.addEventListener("input", () => {
    lengthValueEl.textContent = lengthEl.value;
  });

  // Theme toggle
  themeToggle.addEventListener("click", () => {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme") || "light";
    const next = current === "light" ? "dark" : "light";
    html.setAttribute("data-theme", next);
    themeToggle.textContent = next === "dark" ? "☀️" : "🌙";
    themeToggle.setAttribute("aria-pressed", next === "dark");
  });

  // Generate password on button click
  generateBtn.addEventListener("click", () => {
    const length = parseInt(lengthEl.value, 10);
    const opts = {
      upper: upperEl.checked,
      lower: lowerEl.checked,
      numbers: numbersEl.checked,
      symbols: symbolsEl.checked
    };
    const pwd = generatePassword(length, opts);
    outputEl.value = pwd;
    evaluateStrength(pwd);
  });

  // Copy to clipboard
  copyBtn.addEventListener("click", async () => {
    const text = outputEl.value;
    if (!text) {
      flashTemporarily(copyBtn, "No password");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      flashTemporarily(copyBtn, "Copied!");
    } catch (err) {
      console.error("Clipboard error:", err);
      flashTemporarily(copyBtn, "Failed");
    }
  });

  // Reveal toggle
  revealBtn.addEventListener("click", () => {
    const isPressed = revealBtn.getAttribute("aria-pressed") === "true";
    revealBtn.setAttribute("aria-pressed", String(!isPressed));
    revealBtn.textContent = isPressed ? "Show" : "Hide";
    // switch readonly input type by replacing with a similar input (we keep it simple: toggle readonly + monospace)
    if (!isPressed) {
      outputEl.type = "text";
      outputEl.focus();
      outputEl.select();
    } else {
      outputEl.type = "text"; // still text but unreadable? We keep text to allow copying; alternative is to mask with dots by using password, but readonly password prevents copy in some browsers. So we use text.
    }
  });

  // Generate a password on first load
  generateBtn.click();

  /* Helper functions */

  // Ensure at least one character from each selected set appears:
  function generatePassword(length, {upper, lower, numbers, symbols}) {
    let pool = "";
    const required = [];

    if (upper) {
      pool += UPPER;
      required.push(randomCharFrom(UPPER));
    }
    if (lower) {
      pool += LOWER;
      required.push(randomCharFrom(LOWER));
    }
    if (numbers) {
      pool += NUMS;
      required.push(randomCharFrom(NUMS));
    }
    if (symbols) {
      pool += SYMBOLS;
      required.push(randomCharFrom(SYMBOLS));
    }

    if (!pool) {
      alert("Iltimos — parol tarkibini tanlang (katta/kichik harflar, raqam yoki belgilar).");
      return "";
    }

    // If requested length less than number of required types, adjust by taking slice
    const remaining = Math.max(0, length - required.length);
    const chars = [];

    for (let i = 0; i < remaining; i++) {
      chars.push(randomCharFrom(pool));
    }

    // combine required + chars and shuffle
    const all = required.concat(chars);
    shuffleArray(all);

    // If length < all.length, slice to requested length (rare)
    return all.slice(0, length).join("");
  }

  function randomCharFrom(str) {
    return str[randInt(str.length)];
  }

  // Fisher-Yates shuffle
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // Strength estimation
  function evaluateStrength(password) {
    if (!password) {
      strengthEl.textContent = "—";
      strengthEl.style.background = "transparent";
      return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    // Map score to label + color
    let label = "Zaif";
    let color = "var(--danger)";
    if (score <= 2) {
      label = "Zaif";
      color = "var(--danger)";
    } else if (score <= 4) {
      label = "O'rta";
      color = "orange";
    } else {
      label = "Kuchli";
      color = "var(--success)";
    }

    strengthEl.textContent = label;
    strengthEl.style.background = color;
    strengthEl.style.color = "#fff";
  }

  // Small UI helper to flash text on a button
  function flashTemporarily(buttonEl, text) {
    const original = buttonEl.textContent;
    buttonEl.textContent = text;
    setTimeout(() => buttonEl.textContent = original, 1200);
  }
});
