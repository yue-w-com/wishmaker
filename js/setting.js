// Admin page: sign in, change Viewer settings, delete / clear wishes.
import { SDK, EMULATOR, CONFIGURED, config, DEFAULT_SETTINGS, LIMITS, pageLink } from "./env.js";

const $ = (id) => document.getElementById(id);

const loginCard = $("loginCard");
const notAdminCard = $("notAdminCard");
const panel = $("panel");
const linesEl = $("lines");
const speedEl = $("speed");

$("clientLink").href = pageLink("index.html");
$("viewerLink").href = pageLink("viewer.html");

linesEl.addEventListener("input", () => ($("linesOut").textContent = linesEl.value));
speedEl.addEventListener("input", () => ($("speedOut").textContent = speedEl.value));

if (!CONFIGURED) {
  $("loginMsg").textContent = "Firebase is not configured yet — edit js/firebase-config.js (see README) (・・;)";
  $("loginBtn").disabled = true;
  throw new Error("Firebase not configured");
}

const { initializeApp } = await import(`${SDK}/firebase-app.js`);
const {
  getDatabase, connectDatabaseEmulator, ref, get, set, remove, onValue, query, orderByChild,
} = await import(`${SDK}/firebase-database.js`);
const {
  getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} = await import(`${SDK}/firebase-auth.js`);

const app = initializeApp(config);
const db = getDatabase(app);
const auth = getAuth(app);
if (EMULATOR) {
  connectDatabaseEmulator(db, "127.0.0.1", 9000);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}

// ---------- auth ----------

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginMsg").textContent = "Boarding... ┗(･ω･;)┛";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    $("loginMsg").textContent = "";
  } catch (err) {
    console.error(err);
    $("loginMsg").textContent = "Wrong email or password (；ω；)";
  }
});

document.querySelectorAll("[data-logout]").forEach((b) =>
  b.addEventListener("click", () => signOut(auth)));

let unsubs = [];

onAuthStateChanged(auth, async (user) => {
  unsubs.forEach((u) => u());
  unsubs = [];
  loginCard.classList.toggle("hidden", !!user);
  notAdminCard.classList.add("hidden");
  panel.classList.add("hidden");
  if (!user) return;

  let isAdmin = false;
  try {
    isAdmin = (await get(ref(db, `admins/${user.uid}`))).val() === true;
  } catch (err) {
    console.error(err);
  }
  if (!isAdmin) {
    $("uid").textContent = user.uid;
    notAdminCard.classList.remove("hidden");
    return;
  }
  panel.classList.remove("hidden");
  startListening();
});

// ---------- live data ----------

function startListening() {
  let first = true;
  unsubs.push(onValue(ref(db, "settings"), (snap) => {
    const v = { ...DEFAULT_SETTINGS, ...(snap.val() || {}) };
    $("current").textContent =
      `Now on stage: ${v.lines} lines · speed ${v.speed}${v.oldtv ? " · Old TV mode" : ""}`;
    if (first) {
      // Load the live values into the controls once; afterwards don't
      // overwrite what the captain is adjusting.
      linesEl.value = v.lines; $("linesOut").textContent = v.lines;
      speedEl.value = v.speed; $("speedOut").textContent = v.speed;
      $("oldtv").checked = !!v.oldtv;
      first = false;
    }
  }));

  unsubs.push(onValue(query(ref(db, "wishes"), orderByChild("ts")), (snap) => {
    const list = $("wishList");
    list.textContent = "";
    const items = [];
    snap.forEach((child) => { items.push([child.key, child.val() || {}]); });
    $("wishCount").textContent = items.length;
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No wishes yet (｡･ω･｡)";
      list.append(li);
      return;
    }
    // Newest first.
    for (const [id, w] of items.reverse()) {
      const li = document.createElement("li");
      const txt = document.createElement("span");
      txt.className = "txt";
      const b = document.createElement("b");
      b.textContent = w.name;
      txt.append(b, ` | ${w.wish}`);
      const del = document.createElement("button");
      del.className = "del";
      del.type = "button";
      del.title = "Delete this wish";
      del.textContent = "✕";
      del.addEventListener("click", async () => {
        if (!confirm(`Delete this wish?\n\n${w.name} | ${w.wish}`)) return;
        try { await remove(ref(db, `wishes/${id}`)); }
        catch (err) { console.error(err); alert("Couldn't delete (；ω；)"); }
      });
      li.append(txt, del);
      list.append(li);
    }
  }));
}

// ---------- actions ----------

const clamp = (n, [lo, hi]) => Math.min(hi, Math.max(lo, Math.round(n)));

$("applyBtn").addEventListener("click", async () => {
  const msg = $("applyMsg");
  const next = {
    lines: clamp(Number(linesEl.value), LIMITS.lines),
    speed: clamp(Number(speedEl.value), LIMITS.speed),
    oldtv: $("oldtv").checked,
  };
  msg.textContent = "Sending to the stage...";
  try {
    await set(ref(db, "settings"), next);
    msg.textContent = "Aye aye! Applied ✧(≖ ◡ ≖✿)";
  } catch (err) {
    console.error(err);
    msg.textContent = "Couldn't apply settings (；ω；)";
  }
});

$("clearBtn").addEventListener("click", async () => {
  const msg = $("clearMsg");
  if (!confirm("Clear ALL wishes from the stage? This can't be undone.")) return;
  try {
    await remove(ref(db, "wishes"));
    msg.textContent = "All clear, captain! (ノ´ヮ`)ノ*: ･ﾟ";
  } catch (err) {
    console.error(err);
    msg.textContent = "Couldn't clear wishes (；ω；)";
  }
});
