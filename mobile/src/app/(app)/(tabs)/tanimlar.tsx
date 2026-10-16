import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  academicYearLabel,
  loadSettings,
  locationLabel,
  type AppSettings,
} from "@/lib/settings";
import { loadScheduleProfilesV2, type ScheduleProfilesV2 } from "@/lib/v2/profiles";
import type { ScheduleProfileV2 } from "@/lib/v2/timeline";
import { supabase } from "~/data/supabase";
import { useSession } from "~/data/session";
import { useAsync } from "~/data/use-async";
import { ErrorView, LoadingView } from "~/components/StateViews";
import { colors } from "~/theme";

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value?.trim() || "—"}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function ProfileRows({ label, profile }: { label: string; profile: ScheduleProfileV2 }) {
  return (
    <>
      <Row label={`${label} başlangıç`} value={profile.startTime} />
      <Row label={`${label} ders süresi`} value={`${profile.lessonDurationMinutes} dk`} />
      <Row label={`${label} ders sayısı`} value={String(profile.slotCount)} />
    </>
  );
}

export default function DefinitionsTab() {
  const { membership, edition, session, signOut } = useSession();
  const organizationId = membership?.organizationId;

  const state = useAsync(async (): Promise<{
    settings: AppSettings;
    profiles: ScheduleProfilesV2 | null;
  } | null> => {
    if (!organizationId) return null;
    const [settings, profiles] = await Promise.all([
      loadSettings(supabase, organizationId),
      edition === "v2" ? loadScheduleProfilesV2(supabase, organizationId) : null,
    ]);
    return { settings, profiles };
  }, `${organizationId}:${edition}`);

  if (state.loading) return <LoadingView />;
  if (state.error && !state.data) {
    return <ErrorView message={state.error} onRetry={state.refresh} />;
  }

  const settings = state.data?.settings;
  const profiles = state.data?.profiles;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={state.refreshing}
          onRefresh={state.refresh}
          tintColor={colors.primary}
        />
      }
    >
      {settings ? (
        <>
          <Section title="Kurum">
            <Row label="Kurum adı" value={settings.institutionName ?? membership?.organizationName} />
            <Row label="İl / İlçe" value={locationLabel(settings)} />
            <Row label="Müdür" value={settings.principalName} />
            <Row label="Müdür yardımcısı" value={settings.vicePrincipalName} />
            <Row label="Eğitim-öğretim yılı" value={academicYearLabel(settings)} />
          </Section>

          <Section title={`Ders saatleri (${edition === "v2" ? "V2" : "V1"})`}>
            {profiles ? (
              <>
                <ProfileRows label="Hafta içi" profile={profiles.weekday} />
                <ProfileRows label="Hafta sonu" profile={profiles.weekend} />
              </>
            ) : (
              <>
                <Row label="Ders süresi" value={`${settings.lessonDurationMinutes} dk`} />
                <Row label="Teneffüs" value={`${settings.breakDurationMinutes} dk`} />
              </>
            )}
          </Section>

          <Text style={styles.hint}>
            Tanımları web uygulamasındaki Genel Tanımlar sayfasından
            değiştirebilirsiniz.
          </Text>
        </>
      ) : null}

      <Section title="Hesap">
        <Row label="E-posta" value={session?.user.email} />
      </Section>

      <Pressable
        onPress={signOut}
        accessibilityRole="button"
        style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
      >
        <Text style={styles.signOutText}>Çıkış yap</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 15, color: colors.textSecondary },
  rowValue: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    textAlign: "right",
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 20,
    marginHorizontal: 4,
  },
  signOut: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  signOutPressed: { backgroundColor: "#FEF2F2" },
  signOutText: { fontSize: 16, fontWeight: "600", color: colors.destructive },
});
