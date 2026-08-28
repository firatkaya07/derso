"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { ScheduleProfilesV2 } from "@/lib/v2/profiles";
import { DEFAULT_PROFILES_V2 } from "@/lib/v2/profiles";
import {
  dayGroupOf,
  generateProfileSlots,
  type DayGroup,
  type TimelineSlot,
} from "@/lib/v2/timeline";

type V2ScheduleContextValue = {
  profiles: ScheduleProfilesV2;
  setProfiles: (next: ScheduleProfilesV2) => void;
  slotsForGroup: (group: DayGroup) => TimelineSlot[];
  slotsForDay: (dayOfWeek: number) => TimelineSlot[];
};

const V2ScheduleContext = createContext<V2ScheduleContextValue | null>(null);

export function V2ScheduleProvider({
  profiles,
  setProfiles,
  children,
}: {
  profiles: ScheduleProfilesV2;
  setProfiles: (next: ScheduleProfilesV2) => void;
  children: ReactNode;
}) {
  const value = useMemo<V2ScheduleContextValue>(
    () => ({
      profiles,
      setProfiles,
      slotsForGroup: (group) =>
        generateProfileSlots(
          group === "weekday" ? profiles.weekday : profiles.weekend
        ),
      slotsForDay: (dayOfWeek) => {
        const group = dayGroupOf(dayOfWeek);
        return generateProfileSlots(
          group === "weekday" ? profiles.weekday : profiles.weekend
        );
      },
    }),
    [profiles, setProfiles]
  );

  return (
    <V2ScheduleContext.Provider value={value}>{children}</V2ScheduleContext.Provider>
  );
}

export function useV2Schedule(): V2ScheduleContextValue {
  const ctx = useContext(V2ScheduleContext);
  if (!ctx) {
    throw new Error("useV2Schedule yalnızca V2 layout içinde kullanılabilir");
  }
  return ctx;
}

export function useV2ScheduleOptional(): V2ScheduleContextValue | null {
  return useContext(V2ScheduleContext);
}

export { DEFAULT_PROFILES_V2 };
