"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CLIENT_CACHE_TTL_MS,
  readClientCache,
  writeClientCache,
} from "@/lib/cache/client";

interface LoadResult<T> {
  /** Sonucu üreten yükleyici; kimliği değişince veri başka bir sorguya aittir. */
  loader: unknown;
  attempt: number;
  data: T | null;
  error: Error | null;
}

export interface AsyncDataOptions {
  /**
   * Verilirse sonuç tarayıcı bellek önbelleğine yazılır ve sonraki mount’ta
   * anında gösterilir (stale-while-revalidate).
   */
  cacheKey?: string;
  /** Varsayılan 30 sn. */
  cacheTtlMs?: number;
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
 *
 * `cacheKey` verilirse soft navigasyonda anlık cache hit + arka plan yenileme.
 */
export function useAsyncData<T>(
  load: () => Promise<T>,
  options: AsyncDataOptions = {}
): AsyncData<T> {
  const { cacheKey, cacheTtlMs = CLIENT_CACHE_TTL_MS } = options;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<LoadResult<T>>(() => {
    const cached =
      cacheKey !== undefined ? readClientCache<T>(cacheKey) : undefined;
    return {
      loader: cached !== undefined ? load : null,
      attempt: cached !== undefined ? 0 : -1,
      data: cached ?? null,
      error: null,
    };
  });

  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (!active) return;
        if (cacheKey) writeClientCache(cacheKey, data, cacheTtlMs);
        setResult({ loader: load, attempt, data, error: null });
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
  }, [load, attempt, cacheKey, cacheTtlMs]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const loaderChanged = result.loader !== load;
  const cachedWhileChanging =
    loaderChanged && cacheKey
      ? readClientCache<T>(cacheKey)
      : undefined;
  const loading =
    (loaderChanged && cachedWhileChanging === undefined) ||
    result.attempt !== attempt;

  return {
    data: loaderChanged
      ? (cachedWhileChanging ?? null)
      : result.data,
    error: loaderChanged ? null : result.error,
    loading,
    reload,
  };
}
