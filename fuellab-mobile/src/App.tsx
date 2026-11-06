import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './auth';
import { colors } from './theme';
import AuthScreen from './screens/AuthScreen';
import TodayScreen from './screens/TodayScreen';
import { RecipesScreen, RecipeDetailScreen } from './screens/RecipesScreen';
import AddRecipeScreen from './screens/AddRecipeScreen';
import PlannerScreen from './screens/PlannerScreen';
import ShoppingScreen from './screens/ShoppingScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const RecipesStack = createNativeStackNavigator();

function RecipesNavigator() {
  return (
    <RecipesStack.Navigator>
      <RecipesStack.Screen name="RecipesList" component={RecipesScreen} options={{ title: 'Recipes' }} />
      <RecipesStack.Screen name="RecipeDetail" component={RecipeDetailScreen} options={{ title: 'Recipe' }} />
      <RecipesStack.Screen name="AddRecipe" component={AddRecipeScreen} options={{ title: 'Add your own' }} />
    </RecipesStack.Navigator>
  );
}

function Main() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.green,
        headerTintColor: colors.ink,
      }}
    >
      <Tab.Screen name="Today" component={TodayScreen} options={{ tabBarLabel: 'Today', title: 'Today' }} />
      <Tab.Screen name="Recipes" component={RecipesNavigator} options={{ headerShown: false, tabBarLabel: 'Recipes' }} />
      <Tab.Screen name="Planner" component={PlannerScreen} options={{ tabBarLabel: 'Planner' }} />
      <Tab.Screen name="Shopping" component={ShoppingScreen} options={{ tabBarLabel: 'Shopping' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Main />
      </NavigationContainer>
    </AuthProvider>
  );
}
