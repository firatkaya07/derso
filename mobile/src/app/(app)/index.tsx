import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, Stack } from "expo-router";
import { useSession } from "~/data/session";
import { loadClasses, loadTeachers } from "~/data/schedule";
import { useAsync } from "~/data/use-async";
import { EmptyView, ErrorView, LoadingView } from "~/components/StateViews";
import { colors } from "~/theme";

type Tab = "classes" | "teachers";

interface ListItem {
  id: string;
  title: string;
  detail: string | null;
  href: `/sinif/${string}` | `/ogretmen/${string}`;
}

/** Türkçe büyük/küçük harf duyarsız arama ("ı"/"I", "i"/"İ"). */
function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

export default function HomeScreen() {
  const { membership, signOut } = useSession();
  const [tab, setTab] = useState<Tab>("classes");
  const [query, setQuery] = useState("");
  const organizationId = membership?.organizationId;

  const lists = useAsync(async () => {
    if (!organizationId) return { classes: [], teachers: [] };
    const [classes, teachers] = await Promise.all([
      loadClasses(organizationId),
      loadTeachers(organizationId),
    ]);
    return { classes, teachers };
  }, organizationId ?? "");

  const items = useMemo<ListItem[]>(() => {
    if (!lists.data) return [];
    const all: ListItem[] =
      tab === "classes"
        ? lists.data.classes.map((c) => ({
            id: c.id,
            title: c.name,
            detail: c.level ? `${c.level}. seviye` : c.description,
            href: `/sinif/${c.id}`,
          }))
        : lists.data.teachers.map((t) => ({
            id: t.id,
            title: t.name,
            detail: t.specialization,
            href: `/ogretmen/${t.id}`,
          }));
    const needle = normalize(query);
    if (!needle) return all;
    return all.filter((item) => normalize(item.title).includes(needle));
  }, [lists.data, tab, query]);

  const header = (
    <Stack.Screen
      options={{
        title: membership?.organizationName ?? "Derso",
        headerRight: () => (
          <Pressable onPress={signOut} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.signOut}>Çıkış</Text>
          </Pressable>
        ),
      }}
    />
  );

  if (!membership) {
    return (
      <>
        {header}
        <EmptyView
          title="Henüz bir kurumunuz yok"
          detail="Kurumunuzu dersomatik.com üzerinden oluşturduktan sonra programlarınızı burada görebilirsiniz."
        />
      </>
    );
  }

  return (
    <View style={styles.container}>
      {header}

      <View style={styles.segment} accessibilityRole="tablist">
        {(
          [
            ["classes", "Sınıflar"],
            ["teachers", "Öğretmenler"],
          ] as const
        ).map(([value, label]) => {
          const selected = tab === value;
          return (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.segmentItem, selected && styles.segmentItemActive]}
            >
              <Text
                style={[styles.segmentText, selected && styles.segmentTextActive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder={tab === "classes" ? "Sınıf ara" : "Öğretmen ara"}
        placeholderTextColor={colors.textMuted}
        clearButtonMode="while-editing"
        autoCorrect={false}
      />

      {lists.loading && !lists.data ? (
        <LoadingView />
      ) : lists.error && !lists.data ? (
        <ErrorView message={lists.error} onRetry={lists.refresh} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={lists.refreshing}
              onRefresh={lists.refresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyView
              title={query ? "Sonuç bulunamadı" : "Kayıt yok"}
              detail={
                query
                  ? undefined
                  : tab === "classes"
                    ? "Sınıfları web uygulamasından ekleyebilirsiniz."
                    : "Öğretmenleri web uygulamasından ekleyebilirsiniz."
              }
            />
          }
          renderItem={({ item }) => (
            <Link href={item.href} asChild>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  {item.detail ? (
                    <Text style={styles.rowDetail}>{item.detail}</Text>
                  ) : null}
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  signOut: { color: colors.primary, fontSize: 16, fontWeight: "500" },
  segment: {
    flexDirection: "row",
    margin: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  segmentItem: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  segmentItemActive: { backgroundColor: colors.card },
  segmentText: { fontSize: 15, color: colors.textSecondary, fontWeight: "500" },
  segmentTextActive: { color: colors.text, fontWeight: "600" },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 16,
    color: colors.text,
  },
  list: { paddingHorizontal: 16, paddingBottom: 32, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rowPressed: { backgroundColor: colors.primaryLight },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  rowDetail: { marginTop: 2, fontSize: 14, color: colors.textSecondary },
  chevron: { fontSize: 24, color: colors.textMuted, marginLeft: 8 },
});
