// Shared environment helpers. Add `?emulator` to any page URL to use the
// local Firebase Emulator Suite instead of the real project (for testing).
import { firebaseConfig } from "./firebase-config.js";

export const SDK = "https://www.gstatic.com/firebasejs/10.12.2";

export const EMULATOR = new URLSearchParams(location.search).has("emulator");

const EMU_PROJECT = "demo-wishmaker";

export const config = EMULATOR
  ? {
      apiKey: "demo-key",
      authDomain: `${EMU_PROJECT}.firebaseapp.com`,
      databaseURL: `https://${EMU_PROJECT}-default-rtdb.firebaseio.com`,
      projectId: EMU_PROJECT,
      appId: "demo-app",
    }
  : firebaseConfig;

export const CONFIGURED = EMULATOR || !config.databaseURL.includes("PASTE_");

export const DEFAULT_SETTINGS = { lines: 5, speed: 30 };
export const LIMITS = { lines: [2, 15], speed: [1, 100], name: 40, wish: 200 };

// REST endpoint for a database path (used by the audience page so phones
// never hold a realtime connection — keeps us under the free-plan limit).
export function restUrl(path) {
  if (EMULATOR) {
    return `http://127.0.0.1:9000/${path}.json?ns=${EMU_PROJECT}-default-rtdb`;
  }
  return `${config.databaseURL.replace(/\/$/, "")}/${path}.json`;
}

// Keep ?emulator when linking between pages.
export function pageLink(file) {
  return EMULATOR ? `${file}?emulator` : file;
}
