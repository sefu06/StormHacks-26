import { Stack, router, useNavigation, usePathname } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { styles } from '../../components/ui';

export default function MedicationModal() {
  const { height } = useWindowDimensions();
  const parent = useNavigation('/');
  const pathname = usePathname();
  const close = () => { if (parent.canGoBack()) parent.goBack(); else router.replace('/home'); };

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
    <Pressable accessibilityRole="button" accessibilityLabel="Close medication popup" onPress={close} style={[StyleSheet.absoluteFill, { backgroundColor: '#0006' }]} />
    <View accessibilityViewIsModal style={{ height: height * 0.8, flexShrink: 1, width: '100%', maxWidth: 440, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, minHeight: 48 }}>
        {pathname !== '/medications/add' ? <Pressable accessibilityRole="button" accessibilityLabel="Previous medication step" onPress={() => router.back()} style={{ padding: 10 }}><Text style={styles.text}>‹ Back</Text></Pressable> : <View />}
        <Pressable accessibilityRole="button" accessibilityLabel="Close medication popup" onPress={close} style={{ padding: 10 }}><Text style={styles.text}>×</Text></Pressable>
      </View>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#fff' } }} />
    </View>
  </KeyboardAvoidingView>;
}
