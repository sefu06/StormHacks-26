import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BubbleRight from '../../assets/home/bubble-right.svg';
import BubbleLeft from '../../assets/home/bubble-left.svg';
import Check from '../../assets/activity/check.svg';
import AlertIcon from '../../assets/home/alert.svg';
import { BottomNav } from '../components/bottom-nav';
import { HomeDog } from '../components/home-dogs';
import { styles } from '../components/ui';
import { useCare } from '../lib/care-store';

const examples = [
  { id: 'example-1', name: 'Vyvanse', dosage: '10mg capsule', status: 'Taken', yellow: false },
  { id: 'example-2', name: 'Vyvanse', dosage: '10mg capsule', status: 'Taken', yellow: false },
  { id: 'example-3', name: 'Lisopril', dosage: '10mg tablet', status: 'Missed', yellow: true },
];
export default function Activity() {
  const { state, error, ready, markNotificationsRead } = useCare();
  useEffect(() => {
    if (ready && state.medications.some((medication) => medication.notificationRead === false)) {
      void markNotificationsRead().catch(() => {});
    }
  }, [ready, state.medications, markNotificationsRead]);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const entries = state.recipients.length ? state.medications.map((medication) => ({
    id: medication.id, name: medication.name, dosage: medication.dosage,
    status: medication.status ?? 'Missed', yellow: state.recipients.findIndex((person) => person.id === medication.recipientId) % 2 === 1,
  })) : examples;
  return <View style={s.screen}>
    <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top + 32, height * 263 / 994), paddingHorizontal: 30, paddingBottom: 150 }}>
      <View style={s.content}>
        <Text style={s.heading}>Activity</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!entries.length && <Text style={styles.text}>No medication activity yet.</Text>}
        <View style={{ gap: 20 }}>{entries.map((entry, index) => <View key={entry.id} style={{ height: entry.yellow ? 98 : index === 1 ? 97.25 : 94.257 }} accessibilityLabel={`${entry.name}. ${entry.status}: ${entry.dosage}`}>
          <View style={{ position: 'absolute', left: entry.yellow ? 89 : 183.5, top: 11.5, transform: entry.yellow ? [{ scaleX: -1 }] : undefined }}>{entry.yellow ? <BubbleLeft /> : <BubbleRight />}</View>
          <View style={[s.bubble, { marginLeft: entry.yellow ? 116 : 0, backgroundColor: entry.yellow ? '#ffefc1' : '#ffd6ae' }]}>
            <Text numberOfLines={1} style={s.medication}>{entry.name}</Text>
            <View style={s.statusRow}>{entry.status === 'Missed' ? <AlertIcon /> : <Check />}<Text numberOfLines={1} style={s.status}><Text style={s.statusLabel}>{entry.status}:</Text> {entry.dosage}</Text></View>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: entry.yellow ? 13 : 235, top: entry.yellow ? 14.66 : 19 }}><HomeDog yellow={entry.yellow} activity /></View>
        </View>)}</View>
      </View>
    </ScrollView>
    <BottomNav active="notifications" />
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, content: { width: '100%', maxWidth: 314, alignSelf: 'center', gap: 20 },
  heading: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26, lineHeight: 33, color: '#000' },
  bubble: { width: 203, height: 75.746, borderRadius: 15.867, paddingHorizontal: 16.664, justifyContent: 'center', gap: 8 },
  medication: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, lineHeight: 20, color: '#303030' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  status: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.604, color: '#303030', flexShrink: 1 },
  statusLabel: { fontFamily: 'PlusJakartaSans_600SemiBold' },
});
