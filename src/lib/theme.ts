export type AppTheme = "dark" | "light";

export const DEFAULT_THEME: AppTheme = "light";

export function parseTheme(value: unknown): AppTheme {
  return value === "dark" ? "dark" : DEFAULT_THEME;
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
let sessionTheme: AppTheme = DEFAULT_THEME;

export function subscribeTheme(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getThemeSnapshot(): AppTheme {
  return sessionTheme;
}

export function getServerThemeSnapshot(): AppTheme {
  return DEFAULT_THEME;
}

export function setStoredTheme(next: AppTheme): void {
  sessionTheme = next;
  applyTheme(next);
  listeners.forEach((listener) => listener());
}

/** Her açılışta aydınlık tema; kayıtlı koyu tercih okunmaz. */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){
  document.documentElement.dataset.theme = "light";
  document.documentElement.style.colorScheme = "light";
})();`;
