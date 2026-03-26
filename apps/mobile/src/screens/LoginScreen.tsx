import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/auth.store';
import { api } from '../lib/api';
import { API_URL } from '../lib/config';
import type { User } from '@familycart/types';

WebBrowser.maybeCompleteAuthSession();

export function LoginScreen() {
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      // Abre el navegador en-app para el flujo OAuth de Google.
      // El backend redirige a familycart://auth/callback?code=<auth_code>
      // luego intercambiamos el code por el JWT real vía /auth/exchange
      const redirectUrl = Linking.createURL('auth/callback');
      const result = await WebBrowser.openAuthSessionAsync(
        `${API_URL}/api/auth/google?mobile=1&redirect_uri=${encodeURIComponent(redirectUrl)}`,
        redirectUrl,
      );

      if (result.type !== 'success') {
        setLoading(false);
        return;
      }

      // Extraer el auth code del deep link: familycart://auth/callback?code=xxx
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (!code) {
        Alert.alert('Error', 'No se recibió código de autenticación.');
        setLoading(false);
        return;
      }

      // Intercambiar el auth code por el JWT real + refresh token
      const { accessToken, refreshToken, user } = await api.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/auth/exchange', { code });
      await setAuth(user, accessToken, refreshToken);
    } catch (err) {
      Alert.alert('Error', 'No se pudo iniciar sesión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>FamilyCart</Text>
        <Text style={styles.subtitle}>Lista de compras compartida en familia</Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#374151" />
          ) : (
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
});
