import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { DAY_NAMES, DAY_NAMES_SHORT } from "@/lib/types";
import type { DaySchedule, ScheduleRow } from "~/data/schedule";
import { EmptyView } from "./StateViews";
import { colors } from "~/theme";

/** JS'te pazar 0'dır; uygulamada pazartesi 0. */
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

function initialDay(days: DaySchedule[]): number | undefined {
  const today = todayIndex();
  return (days.find((d) => d.day === today) ?? days[0])?.day;
}

export function WeekSchedule({
  days,
  secondary,
  emptyTitle,
  refreshing,
  onRefresh,
}: {
  days: DaySchedule[];
  /** Ders satırındaki ikinci bilgi: sınıf programında öğretmen, öğretmen programında sınıf. */
  secondary: (row: ScheduleRow) => string | undefined;
  emptyTitle: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState(() => initialDay(days));
  const current = days.find((d) => d.day === selected) ?? days[0];

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={colors.primary}
    />
  );

  if (!current) {
    return (
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} refreshControl={refreshControl}>
        <EmptyView title={emptyTitle} />
      </ScrollView>
    );
  }

  const lessonCount = current.rows.filter((row) => row.lesson).length;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.days}
        style={styles.daysBar}
        accessibilityRole="tablist"
      >
        {days.map(({ day }) => {
          const active = day === current.day;
          return (
            <Pressable
              key={day}
              onPress={() => setSelected(day)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={DAY_NAMES[day]}
              style={[styles.day, active && styles.dayActive]}
            >
              <Text style={[styles.dayText, active && styles.dayTextActive]}>
                {DAY_NAMES_SHORT[day]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} refreshControl={refreshControl}>
        <Text style={styles.heading}>
          {DAY_NAMES[current.day]} · {lessonCount} ders
        </Text>
        {current.rows.map((row) => {
          const lesson = row.lesson;
          const detail = lesson ? secondary(row) : undefined;
          return (
            <View
              key={`${row.start}-${lesson?.id ?? "bos"}`}
              style={[styles.row, !lesson && styles.rowEmpty]}
            >
              <View style={styles.time}>
                <Text style={styles.timeStart}>{row.start}</Text>
                <Text style={styles.timeEnd}>{row.end}</Text>
              </View>
              <View
                style={[
                  styles.bar,
                  { backgroundColor: lesson?.subject?.color ?? colors.border },
                ]}
              />
              <View style={styles.body}>
                {lesson ? (
                  <>
                    <Text style={styles.subject}>
                      {lesson.subject?.name ?? "Ders"}
                    </Text>
                    {detail ? <Text style={styles.detail}>{detail}</Text> : null}
                  </>
                ) : (
                  <Text style={styles.free}>Boş</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  daysBar: { flexGrow: 0 },
  days: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  day: {
    minWidth: 56,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 15, fontWeight: "600", color: colors.textSecondary },
  dayTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  heading: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 64,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  rowEmpty: { backgroundColor: colors.surface, borderStyle: "dashed" },
  time: { width: 64, justifyContent: "center", alignItems: "center" },
  timeStart: { fontSize: 15, fontWeight: "600", color: colors.text },
  timeEnd: { fontSize: 13, color: colors.textMuted },
  bar: { width: 4 },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10 },
  subject: { fontSize: 16, fontWeight: "600", color: colors.text },
  detail: { marginTop: 2, fontSize: 14, color: colors.textSecondary },
  free: { fontSize: 15, color: colors.textMuted },
});
