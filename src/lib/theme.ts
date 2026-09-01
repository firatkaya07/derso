export const THEME_STORAGE_KEY = "derso:theme";

export type AppTheme = "dark" | "light";

export const DEFAULT_THEME: AppTheme = "dark";

export function parseTheme(value: unknown): AppTheme {
  return value === "light" ? "light" : DEFAULT_THEME;
}

export function applyTheme(theme: AppTheme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#000000" : "#f2f2f7");
  }
}

const listeners = new Set<() => void>();

export function subscribeTheme(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getThemeSnapshot(): AppTheme {
  try {
    return parseTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function getServerThemeSnapshot(): AppTheme {
  return DEFAULT_THEME;
}

export function setStoredTheme(next: AppTheme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // gizli mod / kota: DOM yine güncellenir
  }
  applyTheme(next);
  listeners.forEach((listener) => listener());
}

/** İlk boyamadan önce çalışır; açık/koyu flaşını önler. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){
  try {
    var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (t !== "light" && t !== "dark") t = ${JSON.stringify(DEFAULT_THEME)};
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t;
  } catch (e) {
    document.documentElement.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
    document.documentElement.style.colorScheme = ${JSON.stringify(DEFAULT_THEME)};
  }
})();`;
