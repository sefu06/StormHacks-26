import { useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chevron from '../../assets/figma/chevron-date.svg';
import SmallChevron from '../../assets/figma/chevron-small.svg';
import { months, type DateParts } from '../lib/dates';

export const styles = StyleSheet.create({
  text: { fontFamily: 'Allerta_400Regular', color: '#303030' },
  title: { fontFamily: 'Allerta_400Regular', color: '#000', fontSize: 32, lineHeight: 41, marginBottom: 20 },
  field: { gap: 5 }, label: { fontFamily: 'Allerta_400Regular', color: '#000', fontSize: 14, lineHeight: 18 },
  input: { fontFamily: 'Allerta_400Regular', fontSize: 12, color: '#505050', backgroundColor: '#d9d9d9', borderRadius: 10, height: 36, paddingHorizontal: 10, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center' },
  primary: { borderRadius: 10, backgroundColor: '#373737', minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  primaryText: { fontFamily: 'Allerta_400Regular', fontSize: 14, color: '#fff' },
  error: { fontFamily: 'Allerta_400Regular', color: '#a12e24', fontSize: 12, lineHeight: 18 },
});
export function Screen({ children, kind = 'form' }: { children: ReactNode; kind?: 'search' | 'form' | 'setup' }) {
  const { height } = useWindowDimensions();
  return <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {router.canGoBack() ? <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ position: 'absolute', top: 4, left: 20, zIndex: 1, padding: 10 }}><Text style={styles.text}>‹ Back</Text></Pressable> : null}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 30, paddingTop: kind === 'search' ? Math.max(60, height / 2 - 249) : kind === 'setup' ? 60 : Math.max(60, height / 2 - 414), paddingBottom: 60 }}>
      <View style={{ width: '100%', maxWidth: 342, alignSelf: 'center' }}>{children}</View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text>{children}</View>; }
export function Input(props: TextInputProps) { return <TextInput placeholderTextColor="#878787" {...props} style={[styles.input, props.style]} />; }
export function Button({ title, onPress, disabled = false, compact = false }: { title: string; onPress: () => void; disabled?: boolean; compact?: boolean }) { return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primary, compact && { minHeight: 23 }, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}><Text style={[styles.primaryText, compact && { fontSize: 12 }]}>{title}</Text></Pressable>; }
export function Select({ label, value, onChange, options, placeholder = 'Select', small = false }: { label: string; value: string; onChange: (value: string) => void; options: { label: string; value: string }[]; placeholder?: string; small?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || placeholder}`} onPress={() => setOpen(true)} style={[styles.row, { height: 36, backgroundColor: '#d9d9d9', borderRadius: 10, paddingHorizontal: 10, justifyContent: 'space-between', gap: 4 }]}><Text style={[styles.text, { fontSize: 12, color: value ? '#505050' : '#878787' }]}>{options.find((o) => o.value === value)?.label || placeholder}</Text>{small ? <SmallChevron /> : <Chevron />}</Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0005' }}><Pressable style={{ flex: 1 }} onPress={() => setOpen(false)} accessibilityLabel="Close selection" /><SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff', padding: 20 }}><Text style={styles.label}>{label}</Text><Picker selectedValue={value} onValueChange={(v) => onChange(String(v))}><Picker.Item label={placeholder} value="" />{options.map((o) => <Picker.Item key={o.value} label={o.label} value={o.value} />)}</Picker><Button title="Done" onPress={() => setOpen(false)} /></SafeAreaView></View></Modal>
  </>;
}
export function DateField({ label, value, onChange }: { label: string; value: DateParts; onChange: (value: DateParts) => void }) { return <Field label={label}><View style={[styles.row, { backgroundColor: '#d9d9d9', borderRadius: 10 }]}><View style={{ flex: 2 }}><Select label={`${label} month`} value={value.month} placeholder="Month" options={months.map((m, i) => ({ label: m, value: String(i + 1) }))} onChange={(month) => onChange({ ...value, month })} /></View><Input accessibilityLabel={`${label} day`} style={{ flex: 1, borderRadius: 0, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#afafaf' }} placeholder="Day" keyboardType="number-pad" maxLength={2} value={value.day} onChangeText={(day) => onChange({ ...value, day })} /><Input accessibilityLabel={`${label} year`} style={{ flex: 1 }} placeholder="Year" keyboardType="number-pad" maxLength={4} value={value.year} onChangeText={(year) => onChange({ ...value, year })} /></View></Field>; }
