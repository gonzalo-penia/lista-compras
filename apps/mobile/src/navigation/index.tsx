import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/auth.store';
import { LoginScreen } from '../screens/LoginScreen';
import { FamilySetupScreen } from '../screens/FamilySetupScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ListDetailScreen } from '../screens/ListDetailScreen';
import { useFamilies } from '../hooks/useFamilies';
import { Spinner } from '../components/Spinner';

export type RootStackParamList = {
  Login: undefined;
  FamilySetup: undefined;
  Home: undefined;
  ListDetail: { listId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Configuración de deep linking para capturar familycart://auth/callback?token=xxx
const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      Login: 'login',
    },
  },
};

export function AppNavigator() {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Home" component={AuthenticatedRoot} />
            <Stack.Screen name="FamilySetup" component={FamilySetupScreen} />
            <Stack.Screen
              name="ListDetail"
              component={ListDetailScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Verifica si el usuario tiene familia. Si no, redirige a FamilySetup
function AuthenticatedRoot() {
  const { data: families, isLoading } = useFamilies();

  if (isLoading) return <Spinner />;

  if (!families || families.length === 0) {
    return <FamilySetupScreen />;
  }

  return <HomeScreen />;
}
