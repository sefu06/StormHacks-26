import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Screen, styles } from '../components/ui';
import { useCare } from '../lib/care-store';
import { displayTime } from '../lib/dates';
export default function Home() {
  const { state, error } = useCare();
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return <Screen kind="setup"><Text style={styles.title}>CareCompanion</Text><View style={{ gap: 24 }}>{!!error && <Text style={styles.error}>{error}</Text>}{state.recipients.map((person) => {
    const medications = state.medications.filter((m) => m.recipientId === person.id);
    return <View key={person.id} style={{ gap: 12, backgroundColor: '#faf9f7', borderRadius: 20, padding: 16 }}><Text style={[styles.text, { fontSize: 24 }]}>{person.name}</Text><Text style={[styles.text, { fontSize: 14 }]}>Today’s schedule</Text>{medications.flatMap((m) => m.startDate <= today && (!m.endDate || m.endDate >= today) ? m.times.map((time) => ({ ...m, time })) : []).sort((a, b) => a.time.localeCompare(b.time)).map((m) => <View key={`${m.id}-${m.time}`} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: '#e6e2df', gap: 4 }}><Text style={styles.text}>{displayTime(m.time)} · {m.name}</Text><Text style={[styles.text, { fontSize: 12 }]}>{m.dosage} · {m.frequency}</Text></View>)}{!medications.length && <Text style={[styles.text, { fontSize: 12 }]}>No medications added yet.</Text>}<Button title="Add Medication" onPress={() => router.push({ pathname: '/medications/add', params: { recipientId: person.id } })} /></View>;
  })}<Button title="Add Care Recipient" onPress={() => router.push('/setup/care-recipient')} /></View></Screen>;
}
