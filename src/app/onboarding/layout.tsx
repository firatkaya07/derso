import { redirect } from "next/navigation";
import { getRequestMembership } from "@/lib/cache/request";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const membership = await getRequestMembership();
  if (membership) {
    redirect("/home");
  }
  return children;
}
