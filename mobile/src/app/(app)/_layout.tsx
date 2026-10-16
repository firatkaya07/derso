import { Stack } from "expo-router";
import { colors } from "~/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text },
        headerBackTitle: "Geri",
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sinif/[id]" options={{ title: "Sınıf programı" }} />
      <Stack.Screen name="ogretmen/[id]" options={{ title: "Öğretmen programı" }} />
    </Stack>
  );
}
