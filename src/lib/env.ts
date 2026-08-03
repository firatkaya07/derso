const SETUP_HINT =
  ".env.example dosyasını .env.local olarak kopyalayıp Supabase proje bilgilerinizi girin.";

// Next.js NEXT_PUBLIC_* değişkenlerini yalnızca tam literal olarak yazıldığında
// derleme sırasında gömer; bu yüzden değişken adları burada dinamik kurulamaz.
function readPublicEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${name} ortam değişkeni tanımlı değil. ${SETUP_HINT}`);
  }
  return trimmed;
}

export function getSupabaseUrl(): string {
  return readPublicEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

export function getSupabaseAnonKey(): string {
  return readPublicEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Giriş sayfasındaki "Yeni Hesap Oluştur" düğmesini açar. Derso kurum içi bir
 * uygulama olduğu için varsayılan kapalıdır; hesapları Supabase panelinden
 * açmak yerine uygulama üzerinden açmak isterseniz açık konuma alın.
 */
export const signUpEnabled =
  process.env.NEXT_PUBLIC_ALLOW_SIGNUP?.trim() === "true";
