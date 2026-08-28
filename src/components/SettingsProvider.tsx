"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { configurePairedSubjects } from "@/lib/paired-subjects";
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
  useEffect(() => {
    configurePairedSubjects(settings.pairedSubjectPairs);
  }, [settings.pairedSubjectPairs]);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): AppSettings {
  return useContext(SettingsContext);
}
