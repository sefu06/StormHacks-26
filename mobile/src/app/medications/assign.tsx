import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Chevron from '../../../assets/figma/chevron-date.svg';
import { CloseButton, Field, styles } from '../../components/ui';
import { MedicationStage, MedicationAction } from '../../components/medication-stage';
import { useMedicationDraft } from '../../lib/medication-draft';
import { useCare } from '../../lib/care-store';
import { parseDate, time24 } from '../../lib/dates';
export default function Assign() {
  const { name = '', recipientId = '' } = useLocalSearchParams<{ name: string; recipientId: string }>();
  const { state, saveMedications } = useCare();
  const { draft } = useMedicationDraft();
  const [selected, setSelected] = useState<string[]>(recipientId ? [recipientId] : []);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save() {
    if (!selected.length) { setError('Choose at least one care recipient.'); return; }
    const startDate = parseDate(draft.start), endDate = parseDate(draft.end), expiryDate = parseDate(draft.expiry);
    const times = draft.times.map(({ time, period }) => time24(time, period));
    if (!name || !draft.dosage.trim() || !draft.frequency.trim() || !startDate || endDate === null || expiryDate === null || times.some((time) => time === null)) { setError('Complete the administration and medication information first.'); return; }
    setBusy(true); setError('');
    try {
      await saveMedications(selected.map((id) => ({ recipientId: id, name, dosage: draft.dosage.trim(), frequency: draft.frequency.trim(), times: times as string[], instructions: draft.instructions, rx: draft.rx, strength: draft.strength ? `${draft.strength} ${draft.unit}` : '', startDate, endDate, expiryDate, refills: draft.refills })));
      router.dismissAll(); router.replace('/home');
    } catch { setError('Unable to save. Check the recipients and try again.'); }
    finally { setBusy(false); }
  }
  return <MedicationStage title={name} progress={5} error={error} action={<MedicationAction title={busy ? 'Saving…' : 'Save Medication'} disabled={busy} onPress={save} />}>
    <Field label="Assign to Care Recipients"><Pressable accessibilityRole="button" accessibilityLabel="Select care recipients" onPress={() => setOpen(true)} style={{ backgroundColor: '#d9d9d9', borderRadius: 10, minHeight: 36, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={[styles.text, { flex: 1, fontSize: 12, color: selected.length ? '#505050' : '#878787' }]}>{state.recipients.filter((person) => selected.includes(person.id)).map((person) => person.name).join(', ') || 'Select care recipient(s)'}</Text><Chevron /></Pressable></Field>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#0005' }}><Pressable style={{ flex: 1 }} accessibilityLabel="Close recipient selection" onPress={() => setOpen(false)} /><SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff', padding: 20, gap: 16, maxHeight: '70%' }}><View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={styles.label}>Assign to Care Recipients</Text><CloseButton onPress={() => setOpen(false)} /></View><ScrollView>{state.recipients.map((person) => <Pressable key={person.id} accessibilityRole="checkbox" accessibilityLabel={person.name} accessibilityState={{ checked: selected.includes(person.id) }} onPress={() => setSelected((current) => current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id])} style={{ padding: 14, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={styles.text}>{person.name}</Text><Text style={styles.text}>{selected.includes(person.id) ? '✓' : '○'}</Text></Pressable>)}</ScrollView><MedicationAction title="Done" onPress={() => setOpen(false)} /></SafeAreaView></View></Modal>
  </MedicationStage>;
}
