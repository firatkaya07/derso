import { useCallback, useRef } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useFocusEffect } from "expo-router";
import { formatSupportTime, listSupportConversations } from "~/data/support";
import { useAsync } from "~/data/use-async";
import { EmptyView, ErrorView, LoadingView } from "~/components/StateViews";
import { colors } from "~/theme";

function NewButton() {
  return (
    <Pressable
      onPress={() => router.push("/destek/yeni")}
      accessibilityRole="button"
      accessibilityLabel="Yeni mesaj"
      hitSlop={8}
    >
      <Ionicons name="create-outline" size={24} color={colors.primary} />
    </Pressable>
  );
}

export default function SupportListScreen() {
  const list = useAsync(listSupportConversations, "support");
  const { refresh } = list;

  // Bir konuşmadan geri dönünce son mesaj zamanı ve durum güncel görünsün.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  return (
    <>
      <Stack.Screen options={{ headerRight: NewButton }} />
      {list.loading ? (
        <LoadingView />
      ) : list.error && !list.data ? (
        <ErrorView message={list.error} onRetry={list.refresh} />
      ) : (
        <FlatList
          data={list.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={list.refreshing}
              onRefresh={list.refresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View>
              <EmptyView
                title="Henüz konuşmanız yok"
                detail="Sorularınız için destek ekibimize yazabilirsiniz."
              />
              <Pressable
                onPress={() => router.push("/destek/yeni")}
                accessibilityRole="button"
                style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
              >
                <Text style={styles.primaryText}>İlk mesajı gönderin</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/destek/${item.id}`)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.rowText}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  <Text
                    style={[
                      styles.badge,
                      item.status === "open" ? styles.badgeOpen : styles.badgeClosed,
                    ]}
                  >
                    {item.status === "open" ? "AÇIK" : "KAPALI"}
                  </Text>
                </View>
                <Text style={styles.rowDetail}>{formatSupportTime(item.last_message_at)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rowPressed: { backgroundColor: colors.primaryLight },
  rowText: { flex: 1 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowTitle: { flexShrink: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  rowDetail: { marginTop: 2, fontSize: 14, color: colors.textSecondary },
  badge: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  badgeOpen: { backgroundColor: "#ECFDF5", color: "#047857" },
  badgeClosed: { backgroundColor: "#F1F5F9", color: colors.textSecondary },
  primary: {
    minHeight: 48,
    marginHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryPressed: { backgroundColor: colors.primaryHover },
  primaryText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});
