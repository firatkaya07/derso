import type { ClassScheduleDay } from "@/lib/types";
import type { ScheduleProfilesV2 } from "@/lib/v2/profiles";
import {
  dayGroupOf,
  generateProfileSlots,
  isSlotInsideClassWindow,
} from "@/lib/v2/timeline";

/** Sınıf günü penceresine uyan V2 kurum slotları. */
export function v2SlotsForClassDay(
  day: ClassScheduleDay,
  profiles: ScheduleProfilesV2
): Array<{ start: string; end: string }> {
  const group = dayGroupOf(day.day_of_week);
  const profile = group === "weekday" ? profiles.weekday : profiles.weekend;
  return generateProfileSlots(profile)
    .filter((slot) => isSlotInsideClassWindow(slot, day))
    .map((slot) => ({ start: slot.start, end: slot.end }));
}

export function makeV2SlotsForDayResolver(profiles: ScheduleProfilesV2) {
  return (day: ClassScheduleDay) => v2SlotsForClassDay(day, profiles);
}
