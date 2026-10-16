import { useLocalSearchParams } from "expo-router";
import { ScheduleScreen } from "~/components/ScheduleScreen";
import { loadClassName, loadClassSchedule } from "~/data/schedule";

export default function ClassScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScheduleScreen
      cacheKey={id}
      load={async (organizationId, edition) => {
        const [title, days] = await Promise.all([
          loadClassName(id),
          loadClassSchedule(organizationId, edition, id),
        ]);
        return { title, days };
      }}
      secondary={(row) => row.lesson?.teacher?.name}
      emptyTitle="Bu sınıf için ders günü tanımlanmamış."
    />
  );
}
