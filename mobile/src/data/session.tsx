import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { getCurrentMembership, type OrganizationMembership } from "@/lib/org";
import { loadScheduleEdition } from "@/lib/user-preferences";
import { DEFAULT_EDITION, type ScheduleEdition } from "@/lib/edition";
import {
  SESSION_IS_REVOKED_RPC,
  rpcFlag,
  sessionIdMatches,
} from "@/lib/session-revocation";
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
  const sessionRef = useRef<Session | null>(null);

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    setSession(null);
    setMembership(null);
    setEdition(DEFAULT_EDITION);
    setLoading(false);
  }, []);

  const signOutLocal = useCallback(async () => {
    clearSession();
    await supabase.auth.signOut({ scope: "local" });
  }, [clearSession]);

  /** Bu oturumun session_id'si iptal listesindeyse yerel girişi siler. */
  const dropIfRevoked = useCallback(
    async (next: Session | null): Promise<boolean> => {
      if (!next) return false;
      const { data, error } = await supabase.rpc(SESSION_IS_REVOKED_RPC);
      if (error || !rpcFlag(data)) return false;
      await signOutLocal();
      return true;
    },
    [signOutLocal]
  );

  useEffect(() => {
    let cancelled = false;

    const apply = async (next: Session | null) => {
      if (!next) {
        if (cancelled) return;
        clearSession();
        return;
      }
      const [nextMembership, nextEdition, dropped] = await Promise.all([
        getCurrentMembership(supabase),
        loadScheduleEdition(supabase, next.user.id),
        dropIfRevoked(next),
      ]);
      if (cancelled || dropped) return;
      sessionRef.current = next;
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
        sessionRef.current = next;
        setSession(next);
        setTimeout(() => void dropIfRevoked(next), 0);
        return;
      }
      setTimeout(() => void apply(next), 0);
    });

    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void dropIfRevoked(sessionRef.current);
      }
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
      appState.remove();
    };
  }, [clearSession, dropIfRevoked]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    const channel = supabase
      .channel(`session-revocation:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_revocations",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { session_id?: string } | null;
          const current = sessionRef.current;
          if (current && sessionIdMatches(current.access_token, row?.session_id)) {
            void signOutLocal();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.user.id, signOutLocal]);

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
