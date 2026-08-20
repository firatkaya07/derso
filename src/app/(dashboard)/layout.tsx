import {
  getRequestMembership,
  getRequestSettings,
  getRequestFields,
} from "@/lib/cache/request";
import { fieldNamesOf, DEFAULT_FIELD_NAMES } from "@/lib/fields";
import { isPlatformAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Header from "@/components/Header";
import { SettingsProvider } from "@/components/SettingsProvider";
import { OrganizationProvider } from "@/components/OrganizationProvider";
import { FieldsProvider } from "@/components/FieldsProvider";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const membership = await getRequestMembership();

  if (!membership) {
    if (await isPlatformAdmin()) {
      redirect("/admin");
    }
    redirect("/onboarding");
  }

  const [settings, fieldRows] = await Promise.all([
    getRequestSettings(membership.organizationId),
    getRequestFields(membership.organizationId).catch(
      () => [] as Awaited<ReturnType<typeof getRequestFields>>
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
