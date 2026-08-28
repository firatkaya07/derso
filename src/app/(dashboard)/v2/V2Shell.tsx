"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    let cancelled = false;
    setReady(false);
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
