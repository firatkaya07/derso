import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { NotificationBell } from "~/components/NotificationBell";
import { colors } from "~/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IconName, activeName: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    // Sekme rengi her zaman aşağıdaki tintColor'lardan gelen bir string'dir.
    return <Ionicons name={focused ? activeName : name} size={24} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerTitleStyle: { color: colors.text },
        sceneStyle: { backgroundColor: colors.surface },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ana sayfa",
          tabBarIcon: tabIcon("home-outline", "home"),
          headerRight: NotificationBell,
          headerRightContainerStyle: { paddingRight: 16 },
        }}
      />
      <Tabs.Screen
        name="siniflar"
        options={{ title: "Sınıflar", tabBarIcon: tabIcon("school-outline", "school") }}
      />
      <Tabs.Screen
        name="ogretmenler"
        options={{ title: "Öğretmenler", tabBarIcon: tabIcon("people-outline", "people") }}
      />
      <Tabs.Screen
        name="tanimlar"
        options={{
          title: "Genel tanımlar",
          tabBarLabel: "Tanımlar",
          tabBarIcon: tabIcon("settings-outline", "settings"),
        }}
      />
    </Tabs>
  );
}
