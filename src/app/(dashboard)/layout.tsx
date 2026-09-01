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
import SkipToContent from "@/components/SkipToContent";
import { SettingsProvider } from "@/components/SettingsProvider";
import { OrganizationProvider } from "@/components/OrganizationProvider";
import { FieldsProvider } from "@/components/FieldsProvider";
import { EditionProvider } from "@/components/EditionProvider";

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
  const membershipPromise = getRequestMembership();
  const adminPromise = isPlatformAdmin();
  const membership = await membershipPromise;

  if (!membership) {
    if (await adminPromise) {
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
          <EditionProvider>
            <div className="ios-app min-h-screen bg-[var(--color-surface)]">
              <SkipToContent />
              <Header />
              <main
                id="icerik"
                className="mx-auto max-w-7xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8"
              >
                {children}
              </main>
            </div>
          </EditionProvider>
        </FieldsProvider>
      </SettingsProvider>
    </OrganizationProvider>
  );
}
