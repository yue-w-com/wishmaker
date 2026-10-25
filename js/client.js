// Audience page: sends a wish with one REST request (no realtime connection).
import { CONFIGURED, LIMITS, restUrl } from "./env.js";

const form = document.getElementById("wishForm");
const nameEl = document.getElementById("name");
const wishEl = document.getElementById("wish");
const sendBtn = document.getElementById("sendBtn");
const msg = document.getElementById("msg");
const count = document.getElementById("count");
const done = document.getElementById("done");
const echo = document.getElementById("echo");
const againBtn = document.getElementById("againBtn");

const COOLDOWN_MS = 3000;
let lastSent = 0;
let sending = false;

const clean = (s) => s.replace(/\s+/g, " ").trim();

function update() {
  count.textContent = wishEl.value.length;
  sendBtn.disabled = sending || !clean(nameEl.value) || !clean(wishEl.value);
}

nameEl.addEventListener("input", update);
wishEl.addEventListener("input", update);

// Remember the name for "Make another wish".
try { nameEl.value = localStorage.getItem("everGivenName") || ""; } catch {}
update();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = clean(nameEl.value).slice(0, LIMITS.name);
  const wish = clean(wishEl.value).slice(0, LIMITS.wish);

  if (!name) return say("Please tell us your name! (・・;)", nameEl);
  if (!wish) return say("Don't forget your wish! (・・;)", wishEl);
  if (!CONFIGURED) return say("The ship isn't ready yet (Firebase not configured) (；ω；)");
  if (Date.now() - lastSent < COOLDOWN_MS) return say("Wait a moment, sailor～ (｡•́︿•̀｡)");

  sending = true;
  update();
  sendBtn.textContent = "Sending... ┗(･ω･;)┛";
  say("");

  try {
    const res = await fetch(restUrl("wishes"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, wish, ts: { ".sv": "timestamp" } }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    lastSent = Date.now();
    try { localStorage.setItem("everGivenName", name); } catch {}
    echo.textContent = "";
    const n = document.createElement("small");
    n.className = "echo-name";
    n.textContent = `☆ ${name}`;
    echo.append(n, wish);
    form.classList.add("hidden");
    done.classList.remove("hidden");
    wishEl.value = "";
  } catch (err) {
    console.error(err);
    say("Oh no, a storm! Please try again (；´Д｀)");
  } finally {
    sending = false;
    sendBtn.textContent = "Tell Captain Oh ⚓︎";
    update();
  }
});

againBtn.addEventListener("click", () => {
  done.classList.add("hidden");
  form.classList.remove("hidden");
  update();
  wishEl.focus();
});

function say(text, focusEl) {
  msg.textContent = text;
  if (focusEl) focusEl.focus();
}
