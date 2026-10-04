import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from './ui';
export function MedicationAction({ title, onPress, disabled = false, compact = false }: { title: string; onPress: () => void; disabled?: boolean; compact?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => ({ backgroundColor: '#e18f3f', borderRadius: 10, minHeight: compact ? 23 : 36, paddingHorizontal: 10, paddingVertical: compact ? 4 : 8, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : pressed ? 0.8 : 1 })}><Text style={[styles.primaryText, { fontSize: compact ? 12 : 14, textAlign: 'center' }]}>{title}</Text></Pressable>;
}
export function MedicationStage({ title, progress, children, action, error, centeredTitle = false }: { title: string; progress: number; children: ReactNode; action?: ReactNode; error?: string; centeredTitle?: boolean }) {
  const insets = useSafeAreaInsets();
  return <View style={{ flex: 1 }}>
    <View testID="medication-stage-header" style={{ paddingHorizontal: 30, paddingTop: 8, paddingBottom: 20, backgroundColor: '#fff' }}><View style={{ width: '100%', maxWidth: 342, alignSelf: 'center', gap: 20 }}>
      <View accessibilityRole="progressbar" accessibilityLabel="Add medication progress" accessibilityValue={{ min: 0, max: 5, now: progress }} style={{ flexDirection: 'row', gap: 4 }}>{Array.from({ length: 5 }, (_, index) => <View key={index} style={{ flex: 1, height: 6, borderRadius: 10, backgroundColor: index < progress ? '#ffd6ae' : '#f3f3f3' }} />)}</View>
      <Text style={[styles.title, { marginBottom: 0, textAlign: centeredTitle ? 'center' : 'left' }]}>{title}</Text>
    </View></View>
    <ScrollView testID="medication-stage-scroll" style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 30, paddingBottom: 20 }}><View style={{ width: '100%', maxWidth: 342, alignSelf: 'center', gap: 20 }}>{children}</View></ScrollView>
    {(action || error) && <View testID="medication-stage-footer" style={{ paddingHorizontal: 30, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 20), backgroundColor: '#fff' }}><View style={{ width: '100%', maxWidth: 342, alignSelf: 'center', gap: 8 }}>{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}{action}</View></View>}
  </View>;
}
