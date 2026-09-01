export const EDITION_INTRO_STORAGE_KEY = "derso:edition-intro:v1";

const listeners = new Set<() => void>();
let dismissedThisSession = false;

function browserStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeEditionIntro(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hasSeenEditionIntro(
  storage?: Pick<Storage, "getItem"> | null
): boolean {
  const store = storage === undefined ? browserStorage() : storage;
  if (!store) return false;
  try {
    return store.getItem(EDITION_INTRO_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function shouldShowEditionIntro(): boolean {
  if (dismissedThisSession) return false;
  return !hasSeenEditionIntro();
}

export function markEditionIntroSeen(
  storage?: Pick<Storage, "setItem"> | null
): void {
  dismissedThisSession = true;
  const store = storage === undefined ? browserStorage() : storage;
  if (store) {
    try {
      store.setItem(EDITION_INTRO_STORAGE_KEY, "1");
    } catch {
      // Gizli tarama / kota: kapatma yine de bu oturumda çalışır.
    }
  }
  emit();
}
