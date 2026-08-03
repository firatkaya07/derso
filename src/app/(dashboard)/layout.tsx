import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { loadSettings } from "@/lib/settings";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { SettingsProvider } from "@/components/SettingsProvider";
import { OrganizationProvider } from "@/components/OrganizationProvider";

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

  const settings = await loadSettings(supabase, membership.organizationId);

  return (
    <OrganizationProvider membership={membership}>
      <SettingsProvider settings={settings}>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </SettingsProvider>
    </OrganizationProvider>
  );
}
