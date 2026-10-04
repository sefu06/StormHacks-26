import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { DateField, Field, Input, Select, styles } from '../../components/ui';
import { MedicationStage, MedicationAction } from '../../components/medication-stage';
import { useMedicationDraft } from '../../lib/medication-draft';
import { parseDate } from '../../lib/dates';
export default function Prescription() {
  const { name = '', recipientId = '' } = useLocalSearchParams<{ name: string; recipientId: string }>();
  const { draft, update } = useMedicationDraft();
  const { rx, strength, unit, refills, expiry } = draft;
  const [error, setError] = useState('');
  function next() {
    if (parseDate(expiry) === null) { setError('Enter a valid expiry date.'); return; }
    if (refills && !/^\d+$/.test(refills)) { setError('Enter a whole number of refills.'); return; }
    if (strength && (!Number.isFinite(Number(strength)) || Number(strength) <= 0)) { setError('Enter a positive strength.'); return; }
    setError(''); router.push({ pathname: '/medications/assign', params: { name, recipientId } });
  }
  return <MedicationStage title={name} progress={4} error={error} action={<MedicationAction title="Continue to Assign Recipients" onPress={next} />}><View style={{ gap: 20 }}>
    <Field label="Prescription/Rx Number"><Input accessibilityLabel="Prescription/Rx number" placeholder="Enter prescription/Rx number" value={rx} onChangeText={(rx) => update({ rx })} /></Field>
    <Field label="Strength"><View style={[styles.row, { backgroundColor: '#d9d9d9', borderRadius: 10 }]}><Input accessibilityLabel="Strength" placeholder="Enter strength" keyboardType="decimal-pad" value={strength} onChangeText={(strength) => update({ strength })} style={{ flex: 1 }} /><Select small label="Strength unit" value={unit} onChange={(unit) => update({ unit })} options={['mg', 'mcg', 'g', 'mL', 'IU'].map((v) => ({ label: v, value: v }))} /></View></Field>
    <Field label="Number of Refills"><Input accessibilityLabel="Number of refills" placeholder="Enter number" keyboardType="number-pad" value={refills} onChangeText={(refills) => update({ refills })} /></Field>
    <DateField label="Expiry Date" value={expiry} onChange={(expiry) => update({ expiry })} />
  </View></MedicationStage>;
}
