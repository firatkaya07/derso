"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OrganizationMembership } from "@/lib/org";

const OrganizationContext = createContext<OrganizationMembership | null>(null);

export function OrganizationProvider({
  membership,
  children,
}: {
  membership: OrganizationMembership;
  children: ReactNode;
}) {
  return (
    <OrganizationContext.Provider value={membership}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationMembership {
  const value = useContext(OrganizationContext);
  if (!value) {
    throw new Error("useOrganization yalnızca OrganizationProvider içinde kullanılabilir");
  }
  return value;
}
