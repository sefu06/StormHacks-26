import { useFonts, Allerta_400Regular } from '@expo-google-fonts/allerta';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CareProvider } from '../lib/care-store';
export default function Layout() {
  const [loaded, error] = useFonts({ Allerta_400Regular });
  if (error) return <View style={{ flex: 1, justifyContent: 'center', padding: 30 }}><Text>The app font could not load. Please restart the app.</Text></View>;
  if (!loaded) return <ActivityIndicator style={{ flex: 1 }} />;
  return <SafeAreaProvider><CareProvider><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }} /></CareProvider></SafeAreaProvider>;
}
