import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

interface Props {
  username: string;
  onUsernameChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  loading: boolean;
  remainingAttempts: number | null;
  onSubmit: () => void;
  onForgotPassword: () => void;
  forgotLabel?: string;
  testIDs?: { username?: string; password?: string; submit?: string; error?: string };
}

export default function AuthLoginForm({
  username, onUsernameChange, password, onPasswordChange,
  loading, remainingAttempts, onSubmit, onForgotPassword,
  forgotLabel = 'Zapomenuté heslo?', testIDs,
}: Props) {
  return (
    <>
      {remainingAttempts !== null && remainingAttempts < 5 && (
        <View style={s.warningBox} testID={testIDs?.error}>
          <Text style={s.warningTitle}>Zbývající pokusy: {remainingAttempts}</Text>
          <Text style={s.warningText}>Poté bude účet uzamčen na 15 minut.</Text>
        </View>
      )}

      <Text style={s.label}>Email</Text>
      <TextInput
        style={s.input}
        placeholder="vas@email.cz"
        placeholderTextColor="rgba(255,255,255,0.5)"
        value={username}
        onChangeText={onUsernameChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoFocus
        testID={testIDs?.username}
      />

      <Text style={s.label}>Heslo</Text>
      <TextInput
        style={s.input}
        placeholder="Vaše heslo"
        placeholderTextColor="rgba(255,255,255,0.5)"
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry
        onSubmitEditing={onSubmit}
        testID={testIDs?.password}
      />

      <TouchableOpacity
        style={[s.primaryButton, loading && s.primaryButtonDisabled]}
        onPress={onSubmit}
        disabled={loading}
        testID={testIDs?.submit}
      >
        <Text style={s.primaryButtonText}>
          {loading ? 'Přihlašuji...' : 'Přihlásit se'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.forgotLink} onPress={onForgotPassword}>
        <Text style={s.forgotLinkText}>{forgotLabel}</Text>
      </TouchableOpacity>
    </>
  );
}

const s = StyleSheet.create({
  warningBox: {
    backgroundColor: 'rgba(244,67,54,0.2)',
    padding: 14, borderRadius: 10, marginBottom: 16,
    borderLeftWidth: 3, borderLeftColor: '#ef9a9a',
  },
  warningTitle: { fontSize: 14, fontWeight: '600', color: '#ef9a9a', marginBottom: 4 },
  warningText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#ffffff', marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 14,
    fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12, color: '#ffffff',
  },
  primaryButton: { backgroundColor: '#FF9800', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  forgotLink: { padding: 12, alignItems: 'center' },
  forgotLinkText: { color: '#FF9800', fontSize: 14, fontWeight: '600' },
});
