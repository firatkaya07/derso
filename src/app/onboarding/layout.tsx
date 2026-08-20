import { redirect } from "next/navigation";
import { getRequestMembership } from "@/lib/cache/request";
import { isPlatformAdmin } from "@/lib/admin";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (await isPlatformAdmin()) {
    redirect("/admin");
  }

  const membership = await getRequestMembership();
  if (membership) {
    redirect("/home");
  }
  return children;
}
