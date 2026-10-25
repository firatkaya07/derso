import { useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useSession } from "~/data/session";
import { startSupportConversation } from "~/data/support";
import { colors } from "~/theme";

export default function NewSupportConversationScreen() {
  const { session, membership } = useSession();
  const headerHeight = useHeaderHeight();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const email = session?.user.email ?? null;
  const organizationName = membership?.organizationName ?? null;
  const canSend =
    Boolean(fullName.trim()) && Boolean(phone.trim()) && Boolean(message.trim()) && !sending;

  const submit = async () => {
    if (!canSend) return;
    setError("");
    setSending(true);
    try {
      const conversationId = await startSupportConversation({
        fullName: fullName.trim(),
        phone: phone.trim(),
        message: message.trim(),
        email,
        organizationName,
      });
      router.replace(`/destek/${conversationId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Mesaj gönderilemedi, lütfen tekrar deneyin."
      );
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {organizationName || email ? (
          <View style={styles.account}>
            {organizationName ? <Text style={styles.accountOrg}>{organizationName}</Text> : null}
            {email ? <Text style={styles.accountEmail}>{email}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.label}>Ad Soyad</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Adınız Soyadınız"
          placeholderTextColor={colors.textMuted}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />

        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="05XX XXX XX XX"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />

        <Text style={styles.label}>Mesajınız</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Nasıl yardımcı olabiliriz?"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
        />

        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={submit}
          disabled={!canSend}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.submit,
            pressed && styles.submitPressed,
            !canSend && styles.submitDisabled,
          ]}
        >
          <Text style={styles.submitText}>{sending ? "Gönderiliyor…" : "Konuşmayı başlat"}</Text>
        </Pressable>

        <Text style={styles.hint}>
          Yanıtlarımızı bu ekrandan ve web uygulamasındaki destek penceresinden
          takip edebilirsiniz.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, paddingBottom: 32 },
  account: {
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  accountOrg: { fontSize: 14, fontWeight: "600", color: colors.primaryHover },
  accountEmail: { marginTop: 2, fontSize: 13, color: colors.primary },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 16,
    color: colors.text,
  },
  textarea: { minHeight: 120 },
  error: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    color: colors.destructive,
    fontSize: 14,
  },
  submit: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  submitPressed: { backgroundColor: colors.primaryHover },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  hint: {
    marginTop: 12,
    marginHorizontal: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
