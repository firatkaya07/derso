import { useLocalSearchParams } from "expo-router";
import { ScheduleScreen } from "~/components/ScheduleScreen";
import { loadTeacherName, loadTeacherSchedule } from "~/data/schedule";

export default function TeacherScheduleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScheduleScreen
      cacheKey={id}
      load={async (organizationId, edition) => {
        const [title, days] = await Promise.all([
          loadTeacherName(id),
          loadTeacherSchedule(organizationId, edition, id),
        ]);
        return { title, days };
      }}
      secondary={(row) => row.lesson?.class?.name}
      emptyTitle="Bu öğretmene henüz ders yerleştirilmemiş."
    />
  );
}
