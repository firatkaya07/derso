"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SETTINGS, type AppSettings } from "@/lib/settings";

const SettingsContext = createContext<AppSettings>(DEFAULT_SETTINGS);

/**
 * Ayarlar sunucuda, sayfa yerleşiminde bir kez okunur ve buradan dağıtılır;
 * her sayfanın ayrı bir istek atmasına gerek kalmaz. Ayarlar kaydedildikten
 * sonra `router.refresh()` yerleşimi yeniden çalıştırır ve değer tazelenir.
 */
export function SettingsProvider({
  settings,
  children,
}: {
  settings: AppSettings;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): AppSettings {
  return useContext(SettingsContext);
}
