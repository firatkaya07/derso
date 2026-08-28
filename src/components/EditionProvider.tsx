"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_EDITION,
  pathForEdition,
  type ScheduleEdition,
} from "@/lib/edition";
import {
  loadScheduleEdition,
  saveScheduleEdition,
} from "@/lib/user-preferences";

type EditionContextValue = {
  edition: ScheduleEdition;
  ready: boolean;
  setEdition: (next: ScheduleEdition) => void;
};

const EditionContext = createContext<EditionContextValue | null>(null);

export function EditionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [edition, setEditionState] = useState<ScheduleEdition>(DEFAULT_EDITION);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
        const stored = await loadScheduleEdition(supabase, id);
        if (!cancelled) setEditionState(stored);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const setEdition = useCallback(
    (next: ScheduleEdition) => {
      setEditionState(next);
      if (userId) {
        void saveScheduleEdition(supabase, userId, next).catch(() => {
          // UI tercihi zaten güncellendi; kayıt hatası rotayı engellemez
        });
      }
      const target = pathForEdition(pathname, next);
      if (target !== pathname) {
        router.push(target);
      }
    },
    [userId, pathname, router, supabase]
  );

  // Tercihe uymayan sürüm rotasındaysa yönlendir (ilk yükleme / doğrudan link)
  useEffect(() => {
    if (!ready || !userId) return;
    const target = pathForEdition(pathname, edition);
    if (target !== pathname) {
      router.replace(target);
    }
  }, [ready, userId, edition, pathname, router]);

  const value = useMemo(
    () => ({ edition, ready, setEdition }),
    [edition, ready, setEdition]
  );

  return (
    <EditionContext.Provider value={value}>{children}</EditionContext.Provider>
  );
}

export function useEdition(): EditionContextValue {
  const ctx = useContext(EditionContext);
  if (!ctx) {
    throw new Error("useEdition yalnızca EditionProvider içinde kullanılabilir");
  }
  return ctx;
}

export function useEditionOptional(): EditionContextValue | null {
  return useContext(EditionContext);
}
