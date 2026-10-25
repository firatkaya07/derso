import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { supabase } from "./supabase";
import { useSession } from "./session";
import {
  listSupportNotifications,
  markSupportRead,
  type SupportNotification,
} from "./support";

interface SupportUnreadState {
  /** Destek yanıtı bildirimleri; okunanlar da listede kalır, en yenisi başta. */
  items: SupportNotification[];
  /** Tüm konuşmalardaki okunmamış yanıt sayısı. */
  total: number;
  refresh: () => void;
  /** Konuşmayı okundu yapar; sayaç beklemeden düşer. */
  markRead: (conversationId: string) => Promise<void>;
}

const SupportUnreadContext = createContext<SupportUnreadState | null>(null);

export function SupportUnreadProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const [items, setItems] = useState<SupportNotification[]>([]);

  const refresh = useCallback(() => {
    // Bildirimler yardımcı bir bilgi; yüklenemezse eldeki liste kalır.
    listSupportNotifications().then(setItems, () => {});
  }, []);

  const markRead = useCallback(
    async (conversationId: string) => {
      setItems((prev) =>
        prev.map((item) =>
          item.conversation_id === conversationId ? { ...item, unread: 0 } : item
        )
      );
      try {
        await markSupportRead(conversationId);
      } finally {
        refresh();
      }
    },
    [refresh]
  );

  useEffect(() => {
    if (!userId) return;
    refresh();

    // RLS yalnızca kullanıcının kendi konuşmalarındaki mesajları iletir.
    const channel = supabase
      .channel(`support-unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          if ((payload.new as { sender?: string }).sender === "support") refresh();
        }
      )
      .subscribe();

    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });

    return () => {
      void supabase.removeChannel(channel);
      appState.remove();
    };
  }, [userId, refresh]);

  const value = useMemo(
    () => ({
      items: userId ? items : [],
      total: userId ? items.reduce((sum, item) => sum + item.unread, 0) : 0,
      refresh,
      markRead,
    }),
    [userId, items, refresh, markRead]
  );

  return <SupportUnreadContext.Provider value={value}>{children}</SupportUnreadContext.Provider>;
}

export function useSupportUnread(): SupportUnreadState {
  const value = useContext(SupportUnreadContext);
  if (!value) throw new Error("useSupportUnread, SupportUnreadProvider içinde kullanılmalı");
  return value;
}
