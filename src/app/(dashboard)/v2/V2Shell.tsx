"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/components/OrganizationProvider";
import { useToast } from "@/components/Toast";
import {
  DEFAULT_PROFILES_V2,
  loadScheduleProfilesV2,
  type ScheduleProfilesV2,
} from "@/lib/v2/profiles";
import { V2ScheduleProvider } from "@/lib/v2/ScheduleProvider";

export function V2Shell({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const { organizationId } = useOrganization();
  const toast = useToast();
  const [profiles, setProfilesState] = useState<ScheduleProfilesV2>(
    DEFAULT_PROFILES_V2
  );
  const [ready, setReady] = useState(false);
  /** Effect'in bağımlılık değişimini algılaması için sayaç. */
  const loadVersion = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const version = ++loadVersion.current;
    const ref = loadVersion;
    void loadScheduleProfilesV2(supabase, organizationId)
      .then((data) => {
        if (!cancelled) {
          setProfilesState(data);
          setReady(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error((error as Error).message);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
      // Yeni yükleme başlıyorsa ready'yi sıfırla (cleanup'ta güvenli).
      if (ref.current !== version) setReady(false);
    };
  }, [supabase, organizationId, toast]);

  const setProfiles = useCallback((next: ScheduleProfilesV2) => {
    setProfilesState(next);
  }, []);

  if (!ready) {
    return (
      <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
        V2 zaman çizelgesi yükleniyor…
      </div>
    );
  }

  return (
    <V2ScheduleProvider profiles={profiles} setProfiles={setProfiles}>
      {children}
    </V2ScheduleProvider>
  );
}
