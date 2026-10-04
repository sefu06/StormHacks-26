import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { DateField, Field, Input, Select, SymbolIcon, styles } from '../../components/ui';
import { MedicationStage, MedicationAction } from '../../components/medication-stage';
import { useMedicationDraft } from '../../lib/medication-draft';
import { parseDate, time24 } from '../../lib/dates';
export default function Administration() {
  const { name = '', recipientId = '' } = useLocalSearchParams<{ name: string; recipientId: string }>();
  const { draft, update } = useMedicationDraft();
  const { dosage, frequency, times, start, end, instructions } = draft;
  const [error, setError] = useState('');
  function next() {
    const startDate = parseDate(start), endDate = parseDate(end);
    if (!name || !dosage.trim() || !frequency.trim()) { setError('Enter dosage and frequency.'); return; }
    if (!startDate || endDate === null) { setError('Enter valid dates, including a start date.'); return; }
    if (endDate && endDate < startDate) { setError('End date must be on or after the start date.'); return; }
    const scheduled = times.map(({ time, period }) => time24(time, period));
    if (scheduled.some((time) => time === null) || new Set(scheduled).size !== scheduled.length) { setError('Use unique scheduled times in 12-hour format, such as 8:30.'); return; }
    setError(''); router.push({ pathname: '/medications/prescription', params: { name, recipientId } });
  }
  return <MedicationStage title={name} progress={3} error={error} action={<MedicationAction title="Continue to Medication Information" onPress={next} />}><View style={{ gap: 20 }}>
    <Field label="Dosage"><Input accessibilityLabel="Dosage" placeholder="Enter dosage" value={dosage} onChangeText={(dosage) => update({ dosage })} /></Field>
    <Field label="Frequency"><Input accessibilityLabel="Frequency" placeholder="Enter frequency" value={frequency} onChangeText={(frequency) => update({ frequency })} /></Field>
    <Field label="Scheduled Time"><View style={{ gap: 5 }}>{times.map((entry, index) => <View key={index} style={[styles.row, { borderRadius: 10, backgroundColor: '#d9d9d9' }]}><Input accessibilityLabel={`Scheduled time ${index + 1}`} value={entry.time} onChangeText={(time) => update({ times: times.map((t, i) => i === index ? { ...t, time } : t) })} placeholder="12:00" keyboardType="numbers-and-punctuation" style={{ flex: 1 }} /><Select small label={`Time ${index + 1} period`} value={entry.period} onChange={(period) => update({ times: times.map((t, i) => i === index ? { ...t, period } : t) })} options={[{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }]} />{index > 0 ? <Pressable accessibilityLabel={`Remove time ${index + 1}`} onPress={() => update({ times: times.filter((_, i) => i !== index) })} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}><SymbolIcon kind="close" size={18} /></Pressable> : null}</View>)}<MedicationAction compact title="+ Add Scheduled Time" onPress={() => update({ times: [...times, { time: '12:00', period: 'PM' }] })} /></View></Field>
    <DateField label="Start Date" value={start} onChange={(start) => update({ start })} /><DateField label="End Date" value={end} onChange={(end) => update({ end })} />
    <Field label="Special Instructions"><Input accessibilityLabel="Special instructions" placeholder="Enter any special administration instructions" value={instructions} onChangeText={(instructions) => update({ instructions })} multiline style={{ height: 63, paddingVertical: 10, textAlignVertical: 'top' }} /></Field>
  </View></MedicationStage>;
}
