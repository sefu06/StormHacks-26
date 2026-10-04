import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BubbleRight from '../../assets/home/bubble-right.svg';
import BubbleLeft from '../../assets/home/bubble-left.svg';
import Check from '../../assets/activity/check.svg';
import FilterClose from '../../assets/activity/filter-close.svg';
import { BottomNav } from '../components/bottom-nav';
import { HomeDog } from '../components/home-dogs';
import { styles } from '../components/ui';
import { useCare } from '../lib/care-store';

function activityTimestamp(timestamp?: string) {
  if (!timestamp) return 'Time unavailable';
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  const now = new Date();
  const today = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  const time = `${date.getHours() % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')}${date.getHours() >= 12 ? 'PM' : 'AM'}`;
  return `${today ? 'Today' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${time}`;
}
const examples = [
  { id: 'example-1', name: 'Vyvanse', dosage: '10mg capsule', status: 'Taken', yellow: false, recipient: 'Alexi Manning', timestamp: 'Today at 10:59AM' },
  { id: 'example-2', name: 'Vyvanse', dosage: '10mg capsule', status: 'Taken', yellow: false, recipient: 'Alexi Manning', timestamp: 'Today at 9:59AM' },
  { id: 'example-3', name: 'Vyvanse', dosage: '10mg capsule', status: 'Missed', yellow: true, recipient: 'Alexi Manning', timestamp: 'Today at 8:59AM' },
];
export default function Activity() {
  const [missedOnly, setMissedOnly] = useState(false);
  const { state, error, ready, markNotificationsRead } = useCare();
  useEffect(() => {
    if (ready && state.medications.some((medication) => medication.notificationRead === false)) {
      void markNotificationsRead().catch(() => {});
    }
  }, [ready, state.medications, markNotificationsRead]);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const allEntries = state.recipients.length ? state.medications.map((medication) => ({
    id: medication.id, name: medication.name, dosage: medication.dosage,
    recipient: state.recipients.find((person) => person.id === medication.recipientId)?.name || 'Care recipient',
    timestamp: activityTimestamp(medication.missedAt || medication.activityAt),
    status: medication.status ?? 'Missed', yellow: state.recipients.findIndex((person) => person.id === medication.recipientId) % 2 === 1,
  })) : examples;
  const entries = missedOnly ? allEntries.filter((entry) => entry.status === 'Missed') : allEntries;
  return <View style={s.screen}>
    <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top + 32, height * (missedOnly ? 386 : 263) / 994), paddingHorizontal: 30, paddingBottom: 190 }}>
      <View style={s.content}>
        <Text style={s.heading}>Activity</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {!entries.length && <Text style={styles.text}>{missedOnly ? 'No missed medications.' : 'No medication activity yet.'}</Text>}
        <View style={{ gap: 20 }}>{entries.map((entry, index) => <View key={entry.id} style={{ height: entry.yellow ? 98 : index === 1 ? 97.25 : 94.257 }} accessibilityLabel={`${entry.timestamp}. ${entry.recipient}. ${entry.status}: ${entry.name}, ${entry.dosage}`}>
          <View style={{ position: 'absolute', left: entry.yellow ? 89 : 183.5, top: 11.5, transform: entry.yellow ? [{ scaleX: -1 }] : undefined }}>{entry.yellow ? <BubbleLeft /> : <BubbleRight />}</View>
          <View style={[s.bubble, { marginLeft: entry.yellow ? 116 : 0, backgroundColor: entry.yellow ? '#ffefc1' : '#ffd6ae' }]}>
            <View><Text style={s.timestamp}>{entry.timestamp}</Text><Text numberOfLines={1} style={s.medication}>{entry.recipient}</Text></View>
            <View style={s.statusRow}><Check /><Text numberOfLines={1} ellipsizeMode="tail" style={s.status}><Text style={s.statusLabel}>{entry.status}: {entry.name},</Text> {entry.dosage}</Text></View>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: entry.yellow ? 13 : 235, top: entry.yellow ? 14.66 : 19 }}><HomeDog yellow={entry.yellow} activity filtered={missedOnly} /></View>
        </View>)}</View>
      </View>
    </ScrollView>
    <Pressable accessibilityRole="button" accessibilityLabel={missedOnly ? 'Clear missed filter' : 'Filter by missed'} accessibilityState={{ selected: missedOnly }} onPress={() => setMissedOnly((current) => !current)} style={{ position: 'absolute', right: 19, bottom: Math.max(insets.bottom + 120, height * 120 / 994), backgroundColor: missedOnly ? '#eca662' : '#e18f3f', borderRadius: 27, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: missedOnly ? 50 : 42 }}>{missedOnly && <FilterClose />}<Text style={{ fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: '#fff' }}>Filter by missed</Text></Pressable>
    <BottomNav active="notifications" />
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, content: { width: '100%', maxWidth: 314, alignSelf: 'center', gap: 20 },
  heading: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26, lineHeight: 33, color: '#000' },
  bubble: { width: 203, height: 75.746, borderRadius: 15.867, paddingHorizontal: 16.664, justifyContent: 'center', gap: 8 },
  timestamp: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 9, lineHeight: 12, color: '#505050' },
  medication: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16, lineHeight: 20, color: '#303030' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, width: '100%' },
  status: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.604, color: '#303030', flex: 1, minWidth: 0 },
  statusLabel: { fontFamily: 'PlusJakartaSans_600SemiBold' },
});
