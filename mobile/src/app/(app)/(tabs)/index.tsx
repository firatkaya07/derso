import type { ComponentProps } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, type Href } from "expo-router";
import { useSession } from "~/data/session";
import { loadCounts } from "~/data/schedule";
import { useAsync } from "~/data/use-async";
import { EmptyView } from "~/components/StateViews";
import { colors } from "~/theme";

interface Tile {
  title: string;
  detail: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  href: Href;
}

export default function HomeScreen() {
  const { membership, edition } = useSession();
  const { width } = useWindowDimensions();
  const tileSize = (width - PADDING * 2 - GAP) / 2;
  const organizationId = membership?.organizationId;

  const counts = useAsync(
    async () => (organizationId ? loadCounts(organizationId) : null),
    organizationId ?? ""
  );

  if (!membership) {
    return (
      <EmptyView
        title="Henüz bir kurumunuz yok"
        detail="Kurumunuzu dersomatik.com üzerinden oluşturduktan sonra programlarınızı burada görebilirsiniz."
      />
    );
  }

  const countLabel = (count: number | undefined, noun: string) =>
    count === undefined ? "…" : `${count} ${noun}`;

  const tiles: Tile[] = [
    {
      title: "Genel tanımlar",
      detail: "Kurum ve ders saatleri",
      icon: "settings-outline",
      href: "/tanimlar",
    },
    {
      title: "Öğretmenler",
      detail: countLabel(counts.data?.teachers, "öğretmen"),
      icon: "people-outline",
      href: "/ogretmenler",
    },
    {
      title: "Sınıflar",
      detail: countLabel(counts.data?.classes, "sınıf"),
      icon: "school-outline",
      href: "/siniflar",
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={counts.refreshing}
          onRefresh={counts.refresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Kurum</Text>
        <Text style={styles.heroTitle}>{membership.organizationName}</Text>
        <Text style={styles.heroDetail}>
          Program sürümü: {edition === "v2" ? "V2" : "V1"}
        </Text>
      </View>

      {counts.error ? <Text style={styles.error}>{counts.error}</Text> : null}

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.title}
            onPress={() => router.navigate(tile.href)}
            accessibilityRole="button"
            accessibilityLabel={`${tile.title}, ${tile.detail}`}
            style={({ pressed }) => [
              styles.tile,
              { width: tileSize, height: tileSize },
              pressed && styles.tilePressed,
            ]}
          >
            <View style={styles.tileIcon}>
              <Ionicons name={tile.icon} size={26} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.tileTitle}>{tile.title}</Text>
              <Text style={styles.tileDetail}>{tile.detail}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const PADDING = 16;
const GAP = 12;

const styles = StyleSheet.create({
  container: { padding: PADDING, paddingBottom: 32 },
  hero: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primaryLight,
    textTransform: "uppercase",
  },
  heroTitle: { marginTop: 4, fontSize: 22, fontWeight: "700", color: "#fff" },
  heroDetail: { marginTop: 6, fontSize: 14, color: colors.primaryLight },
  error: { color: colors.destructive, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: "space-between",
  },
  tilePressed: { backgroundColor: colors.primaryLight },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  tileTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  tileDetail: { marginTop: 2, fontSize: 14, color: colors.textSecondary },
});
