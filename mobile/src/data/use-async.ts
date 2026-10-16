import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  /** Geçerli anahtar için henüz sonuç yokken true. */
  loading: boolean;
  /** Aşağı çekip yenileme sırasında true. */
  refreshing: boolean;
  refresh: () => void;
}

interface Settled<T> {
  key: string;
  data?: T;
  error: string | null;
}

/**
 * Ekranlardaki "yükle, hata göster, aşağı çekince yenile" akışı.
 * `key` değişince veri yeniden yüklenir; yükleyici her render'da yeni bir
 * fonksiyon olabilir, en günceli kullanılır.
 */
export function useAsync<T>(load: () => Promise<T>, key: string): AsyncState<T> {
  const loadRef = useRef(load);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let cancelled = false;
    loadRef.current().then(
      (data) => {
        if (cancelled) return;
        setSettled({ key, data, error: null });
        setRefreshing(false);
      },
      (err: unknown) => {
        if (cancelled) return;
        setSettled((prev) => ({
          key,
          // Yenileme başarısız olursa eldeki veri ekranda kalsın.
          data: prev?.key === key ? prev.data : undefined,
          error: err instanceof Error ? err.message : "Bir hata oluştu.",
        }));
        setRefreshing(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [key, reloadToken]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setReloadToken((token) => token + 1);
  }, []);

  const current = settled?.key === key ? settled : null;

  return {
    data: current?.data,
    error: current?.error ?? null,
    loading: !current,
    refreshing,
    refresh,
  };
}
