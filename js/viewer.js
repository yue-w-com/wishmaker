// Stage projection: live wish list in a seamless upward loop.
import { SDK, EMULATOR, CONFIGURED, config, DEFAULT_SETTINGS } from "./env.js";

const { initializeApp } = await import(`${SDK}/firebase-app.js`);
const {
  getDatabase, connectDatabaseEmulator, ref, query, orderByChild, limitToLast,
  onChildAdded, onChildRemoved, onValue,
} = await import(`${SDK}/firebase-database.js`);

const stage = document.getElementById("stage");
const viewport = document.getElementById("viewport");
const track = document.getElementById("track");
const listA = document.getElementById("listA");
const listB = document.getElementById("listB");
const waiting = document.getElementById("waiting");
const statusEl = document.getElementById("status");

const ROW = 1.3 + 0.5; // line-height + gap between wishes, in em (see .wish)
const MAX_WISHES = 500;

let settings = { ...DEFAULT_SETTINGS };
let fs = 40;
let offset = 0;
let loopHeight = 0;
let scrolling = false;
const rows = new Map(); // id -> [elA, elB]

// ---------- layout ----------

function applySize() {
  fs = stage.clientHeight / (settings.lines * ROW);
  stage.style.setProperty("--fs", `${fs}px`);
  measure();
}

function measure() {
  const wasScrolling = scrolling;
  // Scroll only when the wishes (without the loop separator) overflow the screen.
  const contentHeight = listA.offsetHeight - sepA.offsetHeight;
  scrolling = rows.size > 0 && contentHeight > viewport.clientHeight;
  track.classList.toggle("static", !scrolling);
  listB.classList.toggle("hidden", !scrolling);
  sepA.classList.toggle("hidden", !scrolling);
  loopHeight = listA.offsetHeight;
  if (!scrolling || !wasScrolling) offset = 0;
  else offset %= loopHeight;
  waiting.classList.toggle("hidden", rows.size > 0);
}

new ResizeObserver(applySize).observe(stage);
new ResizeObserver(() => measure()).observe(listA);

// ---------- rows ----------

function makeSep() {
  const s = document.createElement("div");
  s.className = "loop-sep";
  s.textContent = "☆ ･ﾟ: * ✧ ･ﾟ: *  ⚓︎  * :ﾟ･ ✧ * :ﾟ･ ☆";
  return s;
}
const sepA = makeSep();
const sepB = makeSep();
listA.append(sepA);
listB.append(sepB);

function makeRow(name, wish, fresh) {
  const div = document.createElement("div");
  div.className = fresh ? "wish fresh" : "wish";
  const n = document.createElement("span");
  n.className = "n";
  n.textContent = name;
  const bar = document.createElement("span");
  bar.className = "bar";
  bar.textContent = "|";
  const w = document.createElement("span");
  w.className = "w";
  w.textContent = wish;
  div.append(n, bar, w);
  return div;
}

let initialLoaded = false;

function addWish(id, { name = "", wish = "" }) {
  if (rows.has(id)) return;
  const fresh = initialLoaded;
  const a = makeRow(name, wish, fresh);
  const b = makeRow(name, wish, false);
  listA.insertBefore(a, sepA);
  listB.insertBefore(b, sepB);
  rows.set(id, [a, b]);
  measure();
}

function removeWish(id) {
  const pair = rows.get(id);
  if (!pair) return;
  pair.forEach((el) => el.remove());
  rows.delete(id);
  measure();
}

// ---------- animation ----------

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  if (scrolling && loopHeight > 0) {
    offset += settings.speed * fs * 0.02 * dt;
    if (offset >= loopHeight) offset -= loopHeight;
    track.style.transform = `translate3d(0, ${-offset}px, 0)`;
  } else {
    track.style.transform = "";
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- decorations ----------

const stars = document.getElementById("stars");
for (let i = 0; i < 14; i++) {
  const s = document.createElement("span");
  s.className = "star";
  s.textContent = i % 3 ? "·" : "✦";
  s.style.left = `${Math.random() * 100}%`;
  s.style.top = `${Math.random() * 100}%`;
  s.style.fontSize = `${10 + Math.random() * 14}px`;
  s.style.opacity = (0.15 + Math.random() * 0.25).toFixed(2);
  s.style.animationDelay = `${-Math.random() * 3}s`;
  stars.append(s);
}

// Double-click or press F for fullscreen.
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
}
document.addEventListener("dblclick", toggleFullscreen);
document.addEventListener("keydown", (e) => { if (e.key === "f" || e.key === "F") toggleFullscreen(); });

// ---------- Firebase ----------

applySize();

if (!CONFIGURED) {
  waiting.querySelector("span:nth-child(2)").textContent = "Firebase is not configured yet";
  waiting.querySelector("small").textContent = "Edit js/firebase-config.js (see README) (・・;)";
} else {
  const app = initializeApp(config);
  const db = getDatabase(app);
  if (EMULATOR) connectDatabaseEmulator(db, "127.0.0.1", 9000);

  onValue(ref(db, "settings"), (snap) => {
    const v = snap.val() || {};
    settings = {
      lines: Number(v.lines) || DEFAULT_SETTINGS.lines,
      speed: Number(v.speed) || DEFAULT_SETTINGS.speed,
    };
    applySize();
  });

  const q = query(ref(db, "wishes"), orderByChild("ts"), limitToLast(MAX_WISHES));
  onChildAdded(q, (snap) => addWish(snap.key, snap.val() || {}));
  onChildRemoved(q, (snap) => removeWish(snap.key));
  // After the first full load, newly added wishes get a little "pop".
  onValue(q, () => { initialLoaded = true; }, { onlyOnce: true });

  let everConnected = false;
  onValue(ref(db, ".info/connected"), (snap) => {
    const ok = snap.val() === true;
    if (ok) everConnected = true;
    statusEl.classList.toggle("hidden", ok || !everConnected);
  });
}
