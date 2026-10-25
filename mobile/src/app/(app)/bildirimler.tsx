import { useCallback } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { formatSupportTime } from "~/data/support";
import { useSupportUnread } from "~/data/support-unread";
import { EmptyView } from "~/components/StateViews";
import { colors } from "~/theme";

export default function NotificationsScreen() {
  const { items, refresh, markRead } = useSupportUnread();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.conversation_id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <EmptyView
          title="Yeni bildirim yok"
          detail="Destek taleplerinize yanıt geldiğinde burada görünür."
        />
      }
      renderItem={({ item }) => {
        const unread = item.unread > 0;
        return (
          <Pressable
            onPress={() => {
              if (unread) void markRead(item.conversation_id);
              router.push(`/destek/${item.conversation_id}`);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              !unread && styles.rowRead,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={[styles.icon, !unread && styles.iconRead]}>
              <Ionicons
                name={unread ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                size={20}
                color={unread ? colors.primary : colors.textMuted}
              />
            </View>
            <View style={styles.rowText}>
              {unread ? (
                <Text style={styles.rowTitle}>
                  <Text style={styles.rowName}>{item.full_name}</Text> talebinizden {item.unread}{" "}
                  yeni mesaj
                </Text>
              ) : (
                <Text style={[styles.rowTitle, styles.rowTitleRead]}>
                  <Text style={styles.rowNameRead}>{item.full_name}</Text> talebinize yanıt geldi
                </Text>
              )}
              <Text style={styles.rowDetail}>{formatSupportTime(item.last_reply_at)}</Text>
            </View>
            {unread ? <View style={styles.dot} /> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  rowRead: { backgroundColor: colors.surface },
  rowPressed: { backgroundColor: colors.primaryLight },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  iconRead: { backgroundColor: colors.border },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, lineHeight: 20, color: colors.text },
  rowName: { fontWeight: "700" },
  rowTitleRead: { color: colors.textSecondary },
  rowNameRead: { fontWeight: "600" },
  rowDetail: { marginTop: 2, fontSize: 13, color: colors.textSecondary },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.destructive },
});
