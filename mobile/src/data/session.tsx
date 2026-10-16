import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getCurrentMembership, type OrganizationMembership } from "@/lib/org";
import { loadScheduleEdition } from "@/lib/user-preferences";
import { DEFAULT_EDITION, type ScheduleEdition } from "@/lib/edition";
import { supabase } from "./supabase";

interface SessionState {
  /** Oturum ve kurum bilgisi ilk kez okunana kadar true. */
  loading: boolean;
  session: Session | null;
  membership: OrganizationMembership | null;
  edition: ScheduleEdition;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<OrganizationMembership | null>(
    null
  );
  const [edition, setEdition] = useState<ScheduleEdition>(DEFAULT_EDITION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const apply = async (next: Session | null) => {
      if (!next) {
        if (cancelled) return;
        setSession(null);
        setMembership(null);
        setEdition(DEFAULT_EDITION);
        setLoading(false);
        return;
      }
      const [nextMembership, nextEdition] = await Promise.all([
        getCurrentMembership(supabase),
        loadScheduleEdition(supabase, next.user.id),
      ]);
      if (cancelled) return;
      setSession(next);
      setMembership(nextMembership);
      setEdition(nextEdition);
      setLoading(false);
    };

    // onAuthStateChange ilk olarak INITIAL_SESSION ile kayıtlı oturumu bildirir.
    // Callback içinde Supabase çağrısı beklemek kilitlenmeye yol açabildiği
    // için iş bir sonraki tura bırakılır.
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "TOKEN_REFRESHED") {
        setSession(next);
        return;
      }
      setTimeout(() => void apply(next), 0);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <SessionContext.Provider
      value={{ loading, session, membership, edition, signOut }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession, SessionProvider içinde kullanılmalı");
  return value;
}
