import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PopupWindow } from '../../components/popup-window';
import { HomeDog } from '../../components/home-dogs';
import { MedicationAction } from '../../components/medication-stage';
import { DateField, Field, Input, Select, SymbolIcon, styles } from '../../components/ui';
import { useCare } from '../../lib/care-store';
import { emptyDate, parseDate } from '../../lib/dates';
const options = (values: string[]) => values.map((value) => ({ label: value, value }));
function Tags({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  const [entry, setEntry] = useState('');
  const add = () => { const value = entry.trim(); if (value && !values.includes(value)) onChange([...values, value]); setEntry(''); };
  return <Field label={label}>
    <View style={[styles.row, { minHeight: 36, backgroundColor: '#d9d9d9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 8 }]}>
      <View style={{ flex: 1, gap: 4 }}>
        {values.length > 0 && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {values.map((value) => <Pressable key={value} accessibilityLabel={`Remove ${value}`} onPress={() => onChange(values.filter((v) => v !== value))} style={{ maxWidth: '100%', backgroundColor: '#f3f3f3', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <SymbolIcon kind="close" size={12} /><Text style={[styles.text, { fontSize: 12, lineHeight: 16, flexShrink: 1 }]}>{value}</Text>
          </Pressable>)}
        </View>}
        <Input accessibilityLabel={`Add ${label.toLowerCase()}`} placeholder={`Add ${label.toLowerCase()}`} value={entry} onChangeText={setEntry} onSubmitEditing={add} returnKeyType="done" style={{ width: '100%', height: 24, paddingHorizontal: 0 }} />
      </View>
      <Pressable onPress={add} accessibilityRole="button" accessibilityLabel={`Add ${label.toLowerCase()}`} hitSlop={10} style={{ width: 18, height: 24, alignItems: 'center', justifyContent: 'center' }}>
        <SymbolIcon kind="plus" size={18} />
      </Pressable>
    </View>
  </Field>;
}
export default function Setup() {
  const insets = useSafeAreaInsets();
  const close = () => { if (router.canGoBack()) router.back(); else router.replace('/home'); };
  const { saveRecipient } = useCare();
  const [name, setName] = useState(''); const [birth, setBirth] = useState(emptyDate);
  const [sex, setSex] = useState(''); const [pregnant, setPregnant] = useState(''); const [bloodType, setBloodType] = useState('');
  const [height, setHeight] = useState(''); const [weight, setWeight] = useState('');
  const [conditions, setConditions] = useState<string[]>([]); const [allergies, setAllergies] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save() {
    if (!name.trim()) { setError('Enter the care recipient’s name.'); return; }
    const birthDate = parseDate(birth);
    if (birthDate === null) { setError('Enter a valid date of birth.'); return; }
    setBusy(true); setError('');
    try { const recipientId = await saveRecipient({ name: name.trim(), birthDate, sex, pregnant, bloodType, height, weight, conditions, allergies }); router.replace({ pathname: '/medications/add', params: { recipientId } }); }
    catch { Alert.alert('Unable to save', 'Please try again.'); } finally { setBusy(false); }
  }
  return <PopupWindow label="care recipient popup" onClose={close}>
    <View testID="recipient-header" style={{ paddingHorizontal: 30, paddingTop: 8, paddingBottom: 20, zIndex: 1 }}><View style={{ width: '100%', maxWidth: 342, alignSelf: 'center' }}><Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26, lineHeight: 33, color: '#000', paddingRight: 70 }}>Add Care Recipient</Text></View></View>
    <ScrollView testID="recipient-fields" style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 30, paddingBottom: 20 }}><View style={{ width: '100%', maxWidth: 342, alignSelf: 'center', gap: 20, paddingTop: 52.257 }}>
    <View pointerEvents="none" style={{ position: 'absolute', right: 7, top: 0, zIndex: 1 }}><HomeDog /></View>
    <Field label="Name"><Input accessibilityLabel="Name" placeholder="Enter name" value={name} onChangeText={setName} autoCapitalize="words" /></Field>
    <DateField label="Date of Birth" value={birth} onChange={setBirth} />
    <Field label="Sex"><Select label="Sex" value={sex} onChange={setSex} options={options(['Female', 'Male', 'Other'])} /></Field>
    <View style={[styles.row, { justifyContent: 'space-between', gap: 12 }]}>
      <Text style={[styles.label, { flex: 1 }]}>Care recipient is pregnant?</Text>
      <Select inline label="Pregnancy status" value={pregnant} onChange={setPregnant} options={options(['No', 'Yes', 'Not applicable'])} />
    </View>
    <Field label="Blood Type"><Select label="Blood type" value={bloodType} onChange={setBloodType} options={options(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])} /></Field>
    <Field label="Height">
      <View style={[styles.row, { backgroundColor: '#d9d9d9', borderRadius: 10 }]}>
        <Input accessibilityLabel="Height in cm" placeholder="Enter height" keyboardType="decimal-pad" value={height} onChangeText={setHeight} style={{ flex: 1 }} />
        <Text style={[styles.text, { fontSize: 12, color: '#505050', paddingRight: 10 }]}>cm</Text>
      </View>
    </Field>
    <Field label="Weight">
      <View style={[styles.row, { backgroundColor: '#d9d9d9', borderRadius: 10 }]}>
        <Input accessibilityLabel="Weight in kg" placeholder="Enter weight" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} style={{ flex: 1 }} />
        <Text style={[styles.text, { fontSize: 12, color: '#505050', paddingRight: 10 }]}>kg</Text>
      </View>
    </Field>
    <Tags label="Conditions" values={conditions} onChange={setConditions} /><Tags label="Allergies" values={allergies} onChange={setAllergies} />
  </View></ScrollView>
    <View testID="recipient-footer" style={{ paddingHorizontal: 30, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 20) }}><View style={{ width: '100%', maxWidth: 342, alignSelf: 'center', gap: 8 }}>{!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}<MedicationAction title={busy ? 'Saving…' : 'Save Care Recipient'} disabled={busy} onPress={save} /></View></View>
  </PopupWindow>;
}
