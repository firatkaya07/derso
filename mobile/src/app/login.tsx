import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "~/data/supabase";
import logo from "../../assets/icon.png";
import { colors } from "~/theme";

/** Web'deki giriş sayfasıyla aynı eşlemeler; ayrıntı vermek hesap sızdırabilir. */
function describeAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.";
  }
  return "Giriş yapılamadı. Lütfen tekrar deneyin.";
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    // Başarılı girişte SessionProvider oturumu alır ve yönlendirme yapılır.
    if (signInError) {
      setError(describeAuthError(signInError.message));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.brand}>
          <Image
            source={logo}
            alt="Derso logosu"
            style={styles.logo}
            accessibilityIgnoresInvertColors
          />
          <Text style={styles.title}>Derso</Text>
          <Text style={styles.subtitle}>Ders programınız cebinizde</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="ornek@okul.com"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            placeholder="••••••"
            placeholderTextColor={colors.textMuted}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={handleLogin}
            disabled={!canSubmit}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              !canSubmit && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Giriş yap</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>
            Hesabınız yoksa dersomatik.com üzerinden ücretsiz kayıt olabilirsiniz.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  brand: { alignItems: "center", marginBottom: 32 },
  logo: { width: 72, height: 72, borderRadius: 16, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 4 },
  form: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  error: { color: colors.destructive, marginBottom: 12, fontSize: 14 },
  button: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { backgroundColor: colors.primaryHover },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  hint: {
    marginTop: 16,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
