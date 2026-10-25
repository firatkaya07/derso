import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useSupportUnread } from "~/data/support-unread";
import { colors } from "~/theme";

/** Başlık sağındaki zil; okunmamış destek yanıtı varsa kırmızı sayaç gösterir. */
export function NotificationBell() {
  const { total } = useSupportUnread();
  const label = total > 99 ? "99+" : String(total);

  return (
    <Pressable
      onPress={() => router.push("/bildirimler")}
      accessibilityRole="button"
      accessibilityLabel={total > 0 ? `Bildirimler, ${total} okunmamış` : "Bildirimler"}
      hitSlop={8}
      style={styles.button}
    >
      <Ionicons name="notifications-outline" size={24} color={colors.primary} />
      {total > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.destructive,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
});
