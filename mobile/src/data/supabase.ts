import "expo-sqlite/localStorage/install";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";

const SETUP_HINT =
  "mobile/.env.example dosyasını .env.local olarak kopyalayıp Supabase bilgilerini girin.";

// Expo, EXPO_PUBLIC_* değişkenlerini yalnızca literal erişimde gömer.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  throw new Error(`Supabase ortam değişkenleri tanımlı değil. ${SETUP_HINT}`);
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Mobilde token yenileme döngüsü yalnızca uygulama ön plandayken çalışmalı.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
