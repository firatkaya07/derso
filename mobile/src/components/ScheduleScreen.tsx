import { Stack } from "expo-router";
import type { DaySchedule, ScheduleRow } from "~/data/schedule";
import { useAsync } from "~/data/use-async";
import { useSession } from "~/data/session";
import { ErrorView, LoadingView } from "./StateViews";
import { WeekSchedule } from "./WeekSchedule";

/** Sınıf ve öğretmen programı ekranlarının ortak iskeleti. */
export function ScheduleScreen({
  load,
  secondary,
  emptyTitle,
  cacheKey,
}: {
  load: (
    organizationId: string,
    edition: ReturnType<typeof useSession>["edition"]
  ) => Promise<{ title: string; days: DaySchedule[] }>;
  secondary: (row: ScheduleRow) => string | undefined;
  emptyTitle: string;
  /** Ekranın hangi kaydı gösterdiği; değişince veri yeniden yüklenir. */
  cacheKey: string;
}) {
  const { membership, edition } = useSession();
  const organizationId = membership?.organizationId;

  const state = useAsync(async () => {
    if (!organizationId) return { title: "", days: [] };
    return load(organizationId, edition);
  }, `${organizationId}:${edition}:${cacheKey}`);

  return (
    <>
      {state.data?.title ? <Stack.Screen options={{ title: state.data.title }} /> : null}
      {state.loading && !state.data ? (
        <LoadingView />
      ) : state.error && !state.data ? (
        <ErrorView message={state.error} onRetry={state.refresh} />
      ) : (
        <WeekSchedule
          days={state.data?.days ?? []}
          secondary={secondary}
          emptyTitle={emptyTitle}
          refreshing={state.refreshing}
          onRefresh={state.refresh}
        />
      )}
    </>
  );
}
