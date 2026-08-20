/** Cmd+Enter (macOS) veya Ctrl+Enter ile gönder. */
export function isSendHotkey(e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}): boolean {
  return e.key === "Enter" && (e.metaKey || e.ctrlKey);
}

export const SEND_HOTKEY_HINT = "⌘/Ctrl + Enter ile gönder";
