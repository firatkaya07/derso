/**
 * Tarayıcı bellek önbelleği (TTL).
 * Soft navigasyon / remount’ta aynı org verisini anında gösterir;
 * arka planda useAsyncData yeniler (stale-while-revalidate).
 */

/** Soft navigasyonda anlık veri için; 2 dk stale-while-revalidate. */
export const CLIENT_CACHE_TTL_MS = 120_000;

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export function readClientCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

export function writeClientCache(
  key: string,
  data: unknown,
  ttlMs: number = CLIENT_CACHE_TTL_MS
): void {
  store.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/** prefix ile başlayan tüm anahtarları siler; prefix yoksa hepsini temizler. */
export function invalidateClientCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      store.delete(key);
    }
  }
}

export function invalidateOrgClientCache(organizationId: string): void {
  invalidateClientCache(`org:${organizationId}`);
}
