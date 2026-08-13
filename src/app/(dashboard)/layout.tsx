import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { loadSettings } from "@/lib/settings";
import { fieldNamesOf, loadFields, DEFAULT_FIELD_NAMES } from "@/lib/fields";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { SettingsProvider } from "@/components/SettingsProvider";
import { OrganizationProvider } from "@/components/OrganizationProvider";
import { FieldsProvider } from "@/components/FieldsProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const membership = await getCurrentMembership(supabase);

  if (!membership) {
    redirect("/onboarding");
  }

  const [settings, fieldRows] = await Promise.all([
    loadSettings(supabase, membership.organizationId),
    loadFields(supabase, membership.organizationId).catch(
      () => [] as Awaited<ReturnType<typeof loadFields>>
    ),
  ]);

  const fields =
    fieldRows.length > 0 ? fieldNamesOf(fieldRows) : [...DEFAULT_FIELD_NAMES];

  return (
    <OrganizationProvider membership={membership}>
      <SettingsProvider settings={settings}>
        <FieldsProvider fields={fields}>
          <div className="min-h-screen bg-[var(--color-surface)]">
            <Header />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </FieldsProvider>
      </SettingsProvider>
    </OrganizationProvider>
  );
}
