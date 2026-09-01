import { redirect } from "next/navigation";
import { getRequestMembership } from "@/lib/cache/request";
import { isPlatformAdmin } from "@/lib/admin";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [admin, membership] = await Promise.all([
    isPlatformAdmin(),
    getRequestMembership(),
  ]);
  if (admin) {
    redirect("/admin");
  }
  if (membership) {
    redirect("/home");
  }
  return children;
}
