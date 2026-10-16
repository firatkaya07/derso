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
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useSession } from "~/data/session";
import { useAsync } from "~/data/use-async";
import { EmptyView, ErrorView, LoadingView } from "./StateViews";
import { colors } from "~/theme";

export interface EntityItem {
  id: string;
  title: string;
  detail: string | null;
  href: Href;
}

/** Türkçe büyük/küçük harf duyarsız arama ("ı"/"I", "i"/"İ"). */
function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

/** Sınıflar ve Öğretmenler sekmelerinin aranabilir listesi. */
export function EntityList({
  load,
  searchPlaceholder,
  emptyDetail,
}: {
  load: (organizationId: string) => Promise<EntityItem[]>;
  searchPlaceholder: string;
  emptyDetail: string;
}) {
  const { membership } = useSession();
  const organizationId = membership?.organizationId;
  const [query, setQuery] = useState("");

  const list = useAsync(
    async () => (organizationId ? load(organizationId) : []),
    organizationId ?? ""
  );

  const items = useMemo(() => {
    const needle = normalize(query);
    const all = list.data ?? [];
    if (!needle) return all;
    return all.filter((item) => normalize(item.title).includes(needle));
  }, [list.data, query]);

  if (list.loading) return <LoadingView />;
  if (list.error && !list.data) {
    return <ErrorView message={list.error} onRetry={list.refresh} />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        <RefreshControl
          refreshing={list.refreshing}
          onRefresh={list.refresh}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          placeholderTextColor={colors.textMuted}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      }
      ListEmptyComponent={
        <EmptyView
          title={query ? "Sonuç bulunamadı" : "Kayıt yok"}
          detail={query ? undefined : emptyDetail}
        />
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(item.href)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            {item.detail ? <Text style={styles.rowDetail}>{item.detail}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  search: {
    minHeight: 44,
    paddingHorizontal: 14,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 16,
    color: colors.text,
  },
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
});
