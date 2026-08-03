"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_FIELD_NAMES } from "@/lib/fields";

const FieldsContext = createContext<string[]>([...DEFAULT_FIELD_NAMES]);

export function FieldsProvider({
  fields,
  children,
}: {
  fields: string[];
  children: ReactNode;
}) {
  return (
    <FieldsContext.Provider value={fields}>
      {children}
    </FieldsContext.Provider>
  );
}

export function useFields(): string[] {
  return useContext(FieldsContext);
}
