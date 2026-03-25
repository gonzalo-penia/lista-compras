import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useCreateFamily, useJoinFamily } from '../hooks/useFamilies';

type Mode = 'pick' | 'create' | 'join';

export function FamilySetupScreen() {
  const navigation = useNavigation();
  const [mode, setMode] = useState<Mode>('pick');
  const [value, setValue] = useState('');

  const createFamily = useCreateFamily();
  const joinFamily = useJoinFamily();

  const isPending = createFamily.isPending || joinFamily.isPending;

  async function handleSubmit() {
    if (!value.trim()) return;
    try {
      if (mode === 'create') {
        await createFamily.mutateAsync(value.trim());
      } else {
        await joinFamily.mutateAsync(value.trim().toUpperCase());
      }
      // La navegación se actualiza automáticamente por el estado del store de familias
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Algo salió mal. Intentá de nuevo.');
    }
  }

  if (mode === 'pick') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>FamilyCart</Text>
          <Text style={styles.subtitle}>
            Empezá creando tu familia o uniéndote a una existente
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setMode('create')}
          >
            <Text style={styles.primaryButtonText}>Crear familia</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setMode('join')}
          >
            <Text style={styles.secondaryButtonText}>Unirme con código</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <TouchableOpacity
          onPress={() => {
            setMode('pick');
            setValue('');
          }}
        >
          <Text style={styles.backLink}>← Volver</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>
          {mode === 'create' ? 'Crear familia' : 'Unirme a una familia'}
        </Text>

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setValue}
          placeholder={
            mode === 'create' ? 'Nombre de la familia' : 'Código de invitación'
          }
          placeholderTextColor="#9ca3af"
          maxLength={mode === 'create' ? 50 : 6}
          autoCapitalize={mode === 'join' ? 'characters' : 'words'}
          autoFocus
        />

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (isPending || !value.trim()) && styles.disabledButton,
          ]}
          onPress={handleSubmit}
          disabled={isPending || !value.trim()}
        >
          <Text style={styles.primaryButtonText}>
            {isPending
              ? 'Cargando...'
              : mode === 'create'
                ? 'Crear'
                : 'Unirme'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    padding: 32,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#15803d',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  backLink: {
    fontSize: 14,
    color: '#9ca3af',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
