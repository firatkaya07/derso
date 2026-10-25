"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  SESSION_REVOKED_AT_RPC,
  accessTokenIssuedAt,
  isSessionRevoked,
  revokedAtValue,
} from "@/lib/session-revocation";

/**
 * Açık tarayıcı sekmesi, admin oturumları kapatınca giriş ekranına döner.
 * Sunucu yönlendirmesi bir sonraki istekte çalışır; bu bileşen açık sekmeyi
 * beklemeden düşürür.
 */
export default function SessionRevocationGuard() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const drop = async (session: Session | null) => {
      if (!session || cancelled) return;
      const { data, error } = await supabase.rpc(SESSION_REVOKED_AT_RPC);
      if (cancelled || error) return;
      if (
        !isSessionRevoked(
          accessTokenIssuedAt(session.access_token),
          revokedAtValue(data)
        )
      ) {
        return;
      }
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/login");
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user.id ?? null);
      if (event === "SIGNED_OUT") return;
      setTimeout(() => void drop(session), 0);
    });

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.auth.getSession().then(({ data: sessionData }) => {
        void drop(sessionData.session);
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
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
          const row = payload.new as { revoked_at?: string } | null;
          void supabase.auth.getSession().then(({ data: sessionData }) => {
            const session = sessionData.session;
            if (
              session &&
              isSessionRevoked(
                accessTokenIssuedAt(session.access_token),
                row?.revoked_at ?? null
              )
            ) {
              void supabase.auth.signOut({ scope: "local" }).then(() => {
                router.replace("/login");
              });
            }
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}
