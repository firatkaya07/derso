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
