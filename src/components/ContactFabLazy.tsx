"use client";

import dynamic from "next/dynamic";

/**
 * Destek FAB kök layout’ta lazy yüklenir — ilk paint JS’ine dahil edilmez.
 * ssr:false yalnızca Client Component içinde kullanılabilir.
 */
const ContactFab = dynamic(() => import("@/components/ContactFab"), {
  ssr: false,
  loading: () => null,
});

export default function ContactFabLazy() {
  return <ContactFab />;
}
