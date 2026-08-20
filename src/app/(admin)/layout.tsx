import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin · Derso",
    template: "%s · Derso Admin",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
