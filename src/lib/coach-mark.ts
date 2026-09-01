export const COACH_MARK_STORAGE_KEY = "derso:coach:tanimlar:v1";

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

export function subscribeCoachMark(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function hasSeenCoachMark(
  storage?: Pick<Storage, "getItem"> | null
): boolean {
  const store = storage === undefined ? browserStorage() : storage;
  if (!store) return false;
  try {
    return store.getItem(COACH_MARK_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function shouldShowCoachMark(): boolean {
  if (dismissedThisSession) return false;
  return !hasSeenCoachMark();
}

export function markCoachMarkSeen(
  storage?: Pick<Storage, "setItem"> | null
): void {
  dismissedThisSession = true;
  const store = storage === undefined ? browserStorage() : storage;
  if (store) {
    try {
      store.setItem(COACH_MARK_STORAGE_KEY, "1");
    } catch {
      // Gizli tarama / kota: kapatma yine de bu oturumda çalışır.
    }
  }
  emit();
}
