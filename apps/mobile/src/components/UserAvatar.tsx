import { Image, View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/auth.store';

export function UserAvatar() {
  const { user } = useAuthStore();
  if (!user) return null;

  if (user.picture) {
    return (
      <Image
        source={{ uri: user.picture }}
        style={styles.avatar}
        referrerPolicy="no-referrer"
      />
    );
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.fallback}>
      <Text style={styles.initials}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  fallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
