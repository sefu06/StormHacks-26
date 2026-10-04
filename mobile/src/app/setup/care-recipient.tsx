import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Camera from '../../../assets/figma/camera.svg';
import { Button, DateField, Field, Input, Screen, Select, styles } from '../../components/ui';
import { useCare } from '../../lib/care-store';
import { emptyDate, parseDate } from '../../lib/dates';
const options = (values: string[]) => values.map((value) => ({ label: value, value }));
function Tags({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  const [entry, setEntry] = useState('');
  const add = () => { const value = entry.trim(); if (value && !values.includes(value)) onChange([...values, value]); setEntry(''); };
  return <Field label={label}><View style={{ backgroundColor: '#d9d9d9', padding: 8, borderRadius: 10, gap: 6 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{values.map((value) => <Pressable key={value} accessibilityLabel={`Remove ${value}`} onPress={() => onChange(values.filter((v) => v !== value))} style={{ backgroundColor: '#f3f3f3', borderRadius: 5, padding: 4 }}><Text style={[styles.text, { fontSize: 12 }]}>× {value}</Text></Pressable>)}</View><View style={styles.row}><Input accessibilityLabel={`Add ${label.toLowerCase()}`} placeholder={`Add ${label.toLowerCase()}`} value={entry} onChangeText={setEntry} onSubmitEditing={add} style={{ flex: 1 }} /><Pressable onPress={add} accessibilityRole="button" accessibilityLabel={`Add ${label.toLowerCase()}`} style={{ padding: 8 }}><Text style={styles.text}>+</Text></Pressable></View></View></Field>;
}
export default function Setup() {
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
    try { const recipientId = await saveRecipient({ name: name.trim(), birthDate, sex, pregnant, bloodType, height, weight, conditions, allergies }); router.push({ pathname: '/medications/add', params: { recipientId } }); }
    catch { Alert.alert('Unable to save', 'Please try again.'); } finally { setBusy(false); }
  }
  return <Screen kind="setup"><View style={{ alignSelf: 'center', marginBottom: 23 }}><Camera /></View><View style={{ gap: 20 }}>
    <Field label="Name"><Input accessibilityLabel="Name" placeholder="Enter name" value={name} onChangeText={setName} autoCapitalize="words" /></Field>
    <DateField label="Date of Birth" value={birth} onChange={setBirth} />
    <Field label="Sex"><Select label="Sex" value={sex} onChange={setSex} options={options(['Female', 'Male', 'Non-binary', 'Prefer not to say'])} /></Field>
    <Field label="Care recipient is pregnant?"><Select label="Pregnancy status" value={pregnant} onChange={setPregnant} options={options(['No', 'Yes', 'Not applicable'])} /></Field>
    <Field label="Blood Type"><Select label="Blood type" value={bloodType} onChange={setBloodType} options={options(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])} /></Field>
    <Field label="Height"><Input accessibilityLabel="Height in cm" placeholder="Enter height (cm)" keyboardType="decimal-pad" value={height} onChangeText={setHeight} /></Field>
    <Field label="Weight"><Input accessibilityLabel="Weight in kg" placeholder="Enter weight (kg)" keyboardType="decimal-pad" value={weight} onChangeText={setWeight} /></Field>
    <Tags label="Conditions" values={conditions} onChange={setConditions} /><Tags label="Allergies" values={allergies} onChange={setAllergies} />
    {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}<Button title={busy ? 'Saving…' : 'Save and Continue'} disabled={busy} onPress={save} />
  </View></Screen>;
}
