import { ActivityIndicator, View, StyleSheet } from 'react-native';

export function Spinner() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});
