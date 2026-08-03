import Header from "@/components/Header";
import { SettingsProvider } from "@/components/SettingsProvider";
import { createClient } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/settings";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const settings = await loadSettings(supabase);

  return (
    <SettingsProvider settings={settings}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </SettingsProvider>
  );
}
