import type { Metadata } from "next";
import { V2Shell } from "@/app/(dashboard)/v2/V2Shell";

export const metadata: Metadata = {
  title: "Derso V2",
  robots: { index: false, follow: false },
};

export default function V2Layout({ children }: { children: React.ReactNode }) {
  return <V2Shell>{children}</V2Shell>;
}
