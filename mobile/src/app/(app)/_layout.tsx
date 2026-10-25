import { Stack } from "expo-router";
import { SupportUnreadProvider } from "~/data/support-unread";
import { colors } from "~/theme";

export default function AppLayout() {
  return (
    <SupportUnreadProvider>
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          headerBackTitle: "Geri",
          // iOS 26+ başlığı varsayılan olarak saydam; içerik (gün seçici)
          // başlığın altına kayıyordu. Opak başlıkta içerik altından başlar.
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.card },
          contentStyle: { backgroundColor: colors.surface },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sinif/[id]" options={{ title: "Sınıf programı" }} />
        <Stack.Screen name="ogretmen/[id]" options={{ title: "Öğretmen programı" }} />
        <Stack.Screen name="destek/index" options={{ title: "Destek" }} />
        <Stack.Screen name="destek/yeni" options={{ title: "Yeni mesaj" }} />
        <Stack.Screen name="destek/[id]" options={{ title: "Konuşma" }} />
        <Stack.Screen name="bildirimler" options={{ title: "Bildirimler" }} />
      </Stack>
    </SupportUnreadProvider>
  );
}
