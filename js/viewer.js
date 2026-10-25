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

const ROW = 1.3 + 0.5; // wish line-height + spacing, in em (sets the text size)
const MAX_WISHES = 500;

let settings = { ...DEFAULT_SETTINGS };
let fs = 40;
let loopHeight = 0;
let scrolling = false;
const rows = new Map(); // id -> [elA, elB]

// ---------- layout ----------

function applySize() {
  stage.classList.toggle("oldtv", settings.oldtv);
  // Old TV mode shrinks the viewport to the CRT safe area, so size from it.
  fs = viewport.clientHeight / (settings.lines * ROW);
  stage.style.setProperty("--fs", `${fs}px`);
  measure();
}

function measure() {
  const wasScrolling = scrolling;
  // Scroll only when the wishes overflow the screen. In static mode the last
  // divider is hidden; while looping it separates the last and first wish.
  track.classList.remove("static");
  const contentHeight = listA.offsetHeight - (listA.lastElementChild?.querySelector(".divider")?.offsetHeight || 0);
  scrolling = rows.size > 0 && contentHeight > viewport.clientHeight;
  track.classList.toggle("static", !scrolling);
  listB.classList.toggle("hidden", !scrolling);
  // Loop length = exact distance from the first copy to the second, so the
  // seam lands on the identical spot and doesn't jump.
  const oldLoop = loopHeight;
  loopHeight = listB.getBoundingClientRect().top - listA.getBoundingClientRect().top;
  syncScroll(wasScrolling, oldLoop);
  waiting.classList.toggle("hidden", rows.size > 0);
}

new ResizeObserver(applySize).observe(stage);
new ResizeObserver(() => measure()).observe(listA);

// ---------- rows ----------

// Cute dividers between wishes; picked from the wish id so each wish keeps
// the same one even when others are deleted.
const DIVIDERS = ["⚓︎", "(｡•̀ᴗ-)✧", "☆ﾐ", "ฅ^•ﻌ•^ฅ", "✧", "(っ˘ω˘ς)", "⋆｡ﾟ☾", "(ﾉ◕ヮ◕)ﾉ"];

function pickDivider(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return DIVIDERS[h % DIVIDERS.length];
}

function makeRow(id, name, wish, fresh) {
  const div = document.createElement("div");
  div.className = fresh ? "wish fresh" : "wish";
  const n = document.createElement("div");
  n.className = "n";
  n.textContent = name;
  const w = document.createElement("div");
  w.className = "w";
  w.textContent = wish;
  const d = document.createElement("div");
  d.className = "divider";
  d.textContent = pickDivider(id);
  div.append(n, w, d);
  return div;
}

let initialLoaded = false;

function addWish(id, { name = "", wish = "" }) {
  if (rows.has(id)) return;
  const fresh = initialLoaded;
  const a = makeRow(id, name, wish, fresh);
  const b = makeRow(id, name, wish, false);
  listA.append(a);
  listB.append(b);
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

// The loop position is set every frame from the clock (not a compositor
// animation: jumping back to the top there can show one blank frame while
// the browser repaints the far-away top of the list). Position is derived
// from elapsed time, so a slow frame never makes the speed drift.
let baseOffset = 0;
let baseTime = 0;
let pxPerSec = 0;

function currentOffset(now = performance.now()) {
  if (!loopHeight) return 0;
  return (baseOffset + ((now - baseTime) / 1000) * pxPerSec) % loopHeight;
}

function frame(now) {
  track.style.transform = scrolling ? `translate3d(0, ${-currentOffset(now)}px, 0)` : "";
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Scroll speed in text-heights per second. 1–50 is a gentle linear range;
// above 50 it speeds up twice as fast, so 100 is double the old maximum.
function speedFactor(speed) {
  return 0.02 * (speed + 2 * Math.max(0, speed - 50));
}

// Called whenever the list, size or speed changes: keep the same on-screen
// position and continue at the new speed / loop length.
function syncScroll(wasScrolling, oldLoop) {
  const now = performance.now();
  let offset = 0;
  if (scrolling && wasScrolling && oldLoop > 0) {
    offset = (baseOffset + ((now - baseTime) / 1000) * pxPerSec) % oldLoop;
  }
  baseOffset = loopHeight > 0 ? offset % loopHeight : 0;
  baseTime = now;
  pxPerSec = speedFactor(settings.speed) * fs;
}

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
      oldtv: v.oldtv === true,
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
