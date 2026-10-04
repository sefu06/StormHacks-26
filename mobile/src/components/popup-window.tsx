import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Chevron from '../../assets/home/chevron.svg';
import { CloseButton } from './ui';
export function PopupWindow({ children, onClose, onBack, label }: { children: ReactNode; onClose: () => void; onBack?: () => void; label: string }) {
  const { height } = useWindowDimensions();
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Close ${label}`} onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: '#0006' }]} />
    <View testID="popup-window" accessibilityViewIsModal style={{ height: height * 0.8, flexShrink: 1, width: '100%', maxWidth: 440, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, minHeight: 48 }}>
        {onBack ? <Pressable accessibilityRole="button" accessibilityLabel="Previous medication step" onPress={onBack} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><View style={{ transform: [{ rotate: '90deg' }, { scale: 1.3 }] }}><Chevron /></View></Pressable> : <View />}
        <CloseButton label={`Close ${label}`} onPress={onClose} />
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
    </View>
  </KeyboardAvoidingView>;
}
