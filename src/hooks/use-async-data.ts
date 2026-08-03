"use client";

import { useCallback, useEffect, useState } from "react";

interface LoadResult<T> {
  /** Sonucu üreten yükleyici; kimliği değişince veri başka bir sorguya aittir. */
  loader: unknown;
  attempt: number;
  data: T | null;
  error: Error | null;
}

export interface AsyncData<T> {
  data: T | null;
  error: Error | null;
  /** İlk yükleme, bağımlılık değişimi veya yenileme sürerken true. */
  loading: boolean;
  reload: () => void;
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

/**
 * `useEffect` içinde veri çekmenin iki klasik sorununu çözer: sonuçlar yarışa
 * girip eski cevabın yenisinin üzerine yazması ve hataların sessizce yutulması.
 *
 * `load` fonksiyonu `useCallback` ile sarmalanmalıdır; kimliği bağımlılık
 * görevi görür (örneğin seçili sınıf değişince yeni bir `load` üretilir ve veri
 * otomatik yenilenir).
 *
 * `reload()` ile yapılan yenilemelerde önceki veri ekranda kalır, böylece bir
 * kayıt eklendikten sonra tablo boşalıp yeniden çizilmez. Sorgunun kendisi
 * değiştiğinde ise veri temizlenir; aksi halde bir önceki sınıfın programı
 * kısa süreliğine yanlış başlık altında görünürdü.
 */
export function useAsyncData<T>(load: () => Promise<T>): AsyncData<T> {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadResult<T>>({
    loader: null,
    attempt: -1,
    data: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (active) setResult({ loader: load, attempt, data, error: null });
      },
      (error: unknown) => {
        if (active)
          setResult({
            loader: load,
            attempt,
            data: null,
            error: toError(error),
          });
      }
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const loaderChanged = result.loader !== load;
  const loading = loaderChanged || result.attempt !== attempt;

  return {
    data: loaderChanged ? null : result.data,
    error: loaderChanged ? null : result.error,
    loading,
    reload,
  };
}
