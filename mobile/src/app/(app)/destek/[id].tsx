import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "~/data/supabase";
import {
  attachmentUrl,
  formatBytes,
  formatSupportTime,
  isImageMime,
  listSupportConversations,
  listSupportMessages,
  sendSupportMessage,
  type SupportConversation,
  type SupportMessage,
} from "~/data/support";
import { useAsync } from "~/data/use-async";
import { ErrorView, LoadingView } from "~/components/StateViews";
import { colors } from "~/theme";

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // iOS'ta "will" olayları animasyonla eş zamanlı gelir; Android'de yalnızca "did" var.
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subs = [
      Keyboard.addListener(show, () => setVisible(true)),
      Keyboard.addListener(hide, () => setVisible(false)),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  return visible;
}

function Attachment({ message }: { message: SupportMessage }) {
  if (!message.attachment_path) return null;
  const url = attachmentUrl(message.attachment_path);
  const mine = message.sender === "user";

  if (isImageMime(message.attachment_mime)) {
    return (
      <Pressable onPress={() => void Linking.openURL(url)} accessibilityRole="imagebutton">
        <Image
          source={{ uri: url }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={message.attachment_name ?? "Görsel"}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      accessibilityRole="link"
      style={[styles.file, mine ? styles.fileMine : styles.fileTheirs]}
    >
      <Ionicons name="document-outline" size={18} color={mine ? "#FFFFFF" : colors.primary} />
      <Text style={[styles.fileName, mine && styles.textMine]} numberOfLines={1}>
        {message.attachment_name ?? "Dosya"}
      </Text>
      {message.attachment_size ? (
        <Text style={[styles.fileSize, mine && styles.textMine]}>
          {formatBytes(message.attachment_size)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function Bubble({ message }: { message: SupportMessage }) {
  const mine = message.sender === "user";
  return (
    <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        {!mine ? <Text style={styles.supportLabel}>DESTEK</Text> : null}
        {message.body ? (
          <Text style={[styles.body, mine && styles.textMine]}>{message.body}</Text>
        ) : null}
        <Attachment message={message} />
        <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
          {formatSupportTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

export default function SupportConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  // Klavye açıkken alt güvenli alan klavyenin altında kalır; boşluk bırakılmaz.
  const bottomInset = keyboardVisible ? 0 : insets.bottom;
  const listRef = useRef<FlatList<SupportMessage>>(null);

  const state = useAsync(async (): Promise<{
    conversation: SupportConversation | null;
    messages: SupportMessage[];
  }> => {
    const [conversations, messages] = await Promise.all([
      listSupportConversations(),
      listSupportMessages(id),
    ]);
    return { conversation: conversations.find((c) => c.id === id) ?? null, messages };
  }, id);

  // Canlı gelen ve bu ekrandan gönderilen mesajlar, yüklenen listeye eklenir.
  const [added, setAdded] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loaded = state.data?.messages;
  const messages = useMemo(() => {
    const base = loaded ?? [];
    const known = new Set(base.map((m) => m.id));
    return [...base, ...added.filter((m) => !known.has(m.id))];
  }, [loaded, added]);

  const addMessage = useCallback(
    (row: SupportMessage) =>
      setAdded((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row])),
    []
  );

  useEffect(() => {
    const channel = supabase
      .channel(`support-messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          addMessage(payload.new as SupportMessage);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, addMessage]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setError("");
    setSending(true);
    setDraft("");
    try {
      addMessage(await sendSupportMessage(id, body));
    } catch (err) {
      setDraft(body);
      setError(
        err instanceof Error ? err.message : "Mesaj gönderilemedi, lütfen tekrar deneyin."
      );
    } finally {
      setSending(false);
    }
  };

  if (state.loading) return <LoadingView />;
  if (state.error && !state.data) {
    return <ErrorView message={state.error} onRetry={state.refresh} />;
  }

  const closed = state.data?.conversation?.status === "closed";
  const canSend = Boolean(draft.trim()) && !sending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Bubble message={item} />}
        contentContainerStyle={styles.list}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={<Text style={styles.empty}>Henüz mesaj yok.</Text>}
      />

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {closed ? (
        <Text style={[styles.closed, { paddingBottom: 12 + bottomInset }]}>
          Bu konuşma kapatıldı. Destek listesinden yeni bir mesaj başlatabilirsiniz.
        </Text>
      ) : (
        <View style={[styles.composer, { paddingBottom: 8 + bottomInset }]}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Yanıtınızı yazın…"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            style={({ pressed }) => [
              styles.send,
              pressed && styles.sendPressed,
              !canSend && styles.sendDisabled,
            ]}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { padding: 12, gap: 10, flexGrow: 1 },
  empty: { textAlign: "center", marginTop: 32, fontSize: 14, color: colors.textSecondary },
  bubbleRow: { flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },
  bubble: { maxWidth: "85%", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  supportLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 2,
  },
  body: { fontSize: 15, lineHeight: 21, color: colors.text },
  textMine: { color: "#FFFFFF" },
  time: { fontSize: 10, marginTop: 4 },
  timeMine: { color: "#C7D2FE" },
  timeTheirs: { color: colors.textMuted },
  image: { width: 220, height: 160, marginTop: 6, borderRadius: 10 },
  file: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  fileMine: { backgroundColor: "rgba(255,255,255,0.2)" },
  fileTheirs: { backgroundColor: colors.primaryLight },
  fileName: { flexShrink: 1, fontSize: 13, fontWeight: "600", color: colors.primaryHover },
  fileSize: { fontSize: 12, color: colors.textSecondary },
  error: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    color: colors.destructive,
    fontSize: 13,
  },
  closed: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 13,
    color: colors.textSecondary,
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  sendPressed: { backgroundColor: colors.primaryHover },
  sendDisabled: { opacity: 0.5 },
});
