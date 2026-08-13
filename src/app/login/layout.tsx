import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giriş / Kayıt",
  description: "Derso hesabınıza giriş yapın veya ücretsiz kayıt olun.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
