import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Button, DateField, Field, Input, Screen, Select, SymbolIcon, styles } from '../../components/ui';
import { useCare } from '../../lib/care-store';
import { emptyDate, parseDate, time24 } from '../../lib/dates';
export default function Prescription() {
  const { name = '', recipientId = '' } = useLocalSearchParams<{ name: string; recipientId: string }>();
  const { saveMedication } = useCare();
  const [dosage, setDosage] = useState(''); const [frequency, setFrequency] = useState('');
  const [times, setTimes] = useState([{ time: '12:00', period: 'AM' }]);
  const [rx, setRx] = useState(''); const [strength, setStrength] = useState(''); const [unit, setUnit] = useState('mg');
  const [start, setStart] = useState(emptyDate); const [end, setEnd] = useState(emptyDate); const [expiry, setExpiry] = useState(emptyDate); const [refills, setRefills] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save() {
    const startDate = parseDate(start); const endDate = parseDate(end); const expiryDate = parseDate(expiry);
    if (!name || !dosage.trim() || !frequency.trim()) { setError('Enter dosage and frequency.'); return; }
    if (!startDate || endDate === null || expiryDate === null) { setError('Enter valid dates, including a start date.'); return; }
    if (endDate && endDate < startDate) { setError('End date must be on or after the start date.'); return; }
    const scheduled = times.map(({ time, period }) => time24(time, period));
    if (scheduled.some((t) => t === null) || new Set(scheduled).size !== scheduled.length) { setError('Use unique scheduled times in 12-hour format, such as 8:30.'); return; }
    if (refills && !/^\d+$/.test(refills)) { setError('Enter a whole number of refills.'); return; }
    if (strength && (!Number.isFinite(Number(strength)) || Number(strength) <= 0)) { setError('Enter a positive strength.'); return; }
    setBusy(true); setError('');
    try { await saveMedication({ recipientId, name, dosage: dosage.trim(), frequency: frequency.trim(), times: scheduled as string[], rx, strength: strength ? `${strength} ${unit}` : '', startDate, endDate, expiryDate, refills }); router.dismissAll(); router.replace('/home'); }
    catch { Alert.alert('Unable to save', 'Check the recipient and try again.'); } finally { setBusy(false); }
  }
  return <Screen><Text style={styles.title}>{name}</Text><View style={{ gap: 20 }}>
    <Field label="Dosage"><Input accessibilityLabel="Dosage" placeholder="Enter dosage" value={dosage} onChangeText={setDosage} /></Field>
    <Field label="Frequency"><Input accessibilityLabel="Frequency" placeholder="Enter frequency" value={frequency} onChangeText={setFrequency} /></Field>
    <Field label="Scheduled Time"><View style={{ gap: 5 }}>{times.map((entry, index) => <View key={index} style={[styles.row, { borderRadius: 10, backgroundColor: '#d9d9d9' }]}><Input accessibilityLabel={`Scheduled time ${index + 1}`} value={entry.time} onChangeText={(time) => setTimes((current) => current.map((t, i) => i === index ? { ...t, time } : t))} placeholder="12:00" keyboardType="numbers-and-punctuation" style={{ flex: 1 }} /><Select small label={`Time ${index + 1} period`} value={entry.period} onChange={(period) => setTimes((current) => current.map((t, i) => i === index ? { ...t, period } : t))} options={[{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }]} />{index > 0 ? <Pressable accessibilityLabel={`Remove time ${index + 1}`} onPress={() => setTimes((current) => current.filter((_, i) => i !== index))} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}><SymbolIcon kind="close" size={18} /></Pressable> : null}</View>)}<Button compact title="+ Add Scheduled Time" onPress={() => setTimes((current) => [...current, { time: '12:00', period: 'PM' }])} /></View></Field>
    <Field label="Prescription/Rx Number"><Input accessibilityLabel="Prescription/Rx number" placeholder="Enter prescription/Rx number" value={rx} onChangeText={setRx} /></Field>
    <Field label="Strength"><View style={[styles.row, { backgroundColor: '#d9d9d9', borderRadius: 10 }]}><Input accessibilityLabel="Strength" placeholder="Enter strength" keyboardType="decimal-pad" value={strength} onChangeText={setStrength} style={{ flex: 1 }} /><Select small label="Strength unit" value={unit} onChange={setUnit} options={['mg', 'mcg', 'g', 'mL', 'IU'].map((v) => ({ label: v, value: v }))} /></View></Field>
    <DateField label="Start Date" value={start} onChange={setStart} /><DateField label="End Date" value={end} onChange={setEnd} />
    <Field label="Number of Refills"><Input accessibilityLabel="Number of refills" placeholder="Enter number" keyboardType="number-pad" value={refills} onChangeText={setRefills} /></Field>
    <DateField label="Expiry Date" value={expiry} onChange={setExpiry} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<Button title={busy ? 'Saving…' : 'Save Medication'} disabled={busy} onPress={save} />
  </View></Screen>;
}
