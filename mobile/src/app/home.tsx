import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Bell from '../../assets/home/bell.svg';
import HomeIcon from '../../assets/home/home.svg';
import PeopleIcon from '../../assets/home/people.svg';
import Pill from '../../assets/home/pill.svg';
import PillExpanded from '../../assets/home/pill-expanded.svg';
import Plus from '../../assets/home/plus.svg';
import ListIcon from '../../assets/home/list.svg';
import Profile from '../../assets/home/profile.svg';
import Chevron from '../../assets/home/chevron.svg';
import BubbleRight from '../../assets/home/bubble-right.svg';
import BubbleLeft from '../../assets/home/bubble-left.svg';
import AlertIcon from '../../assets/home/alert.svg';
import Check from '../../assets/home/check.svg';
import { HomeDog } from '../components/home-dogs';
import { Button, styles } from '../components/ui';
import { useCare, type Recipient } from '../lib/care-store';
import { displayTime } from '../lib/dates';

const demoPeople = [{ id: 'demo-alexi', name: 'Alexi Manning' }, { id: 'demo-elaine', name: 'Elaine Chen' }];
type Panel = 'people' | 'medications' | 'notifications' | 'profile' | 'choose' | 'recipient' | null;
export default function Home() {
  const { state, error } = useCare();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedId, setSelectedId] = useState('');
  const people = state.recipients.length ? state.recipients : demoPeople;
  const selected = state.recipients.find((person) => person.id === selectedId);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  function addMedication(recipientId?: string) {
    setExpanded(false);
    if (recipientId) { setPanel(null); router.push({ pathname: '/medications/add', params: { recipientId } }); }
    else if (state.recipients.length === 1) addMedication(state.recipients[0].id);
    else if (!state.recipients.length) { setPanel(null); router.push('/setup/care-recipient'); }
    else setPanel('choose');
  }
  const panelTitle = panel === 'people' ? 'People' : panel === 'profile' ? 'Your profile' : panel === 'notifications' ? 'Medication reminders' : panel === 'choose' ? 'Choose a care recipient' : panel === 'recipient' ? selected?.name || 'Care recipient' : 'Medications';
  const medications = state.medications.filter((m) => panel !== 'recipient' || m.recipientId === selectedId);
  function personDetails(person: Recipient) { return [['Date of birth', person.birthDate], ['Sex', person.sex], ['Blood type', person.bloodType], ['Height', person.height && `${person.height} cm`], ['Weight', person.weight && `${person.weight} kg`], ['Conditions', person.conditions.join(', ')], ['Allergies', person.allergies.join(', ')]]; }
  return <View style={s.screen}>
    <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top + 32, height * 263 / 994), paddingHorizontal: 30, paddingBottom: 220 }}>
      <View style={s.content}><View style={s.heading}><Text style={s.headingText}>Overview</Text><Pressable accessibilityRole="button" accessibilityLabel="Open your profile" onPress={() => setPanel('profile')}><Profile /></Pressable></View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={{ gap: 53, marginTop: 50 }}>{people.map((person, index) => {
          const yellow = index % 2 === 1;
          const saved = state.medications.filter((m) => m.recipientId === person.id);
          const due = saved.filter((m) => m.startDate <= today && (!m.endDate || m.endDate >= today));
          const demo = !state.recipients.length;
          return <View key={person.id} style={{ height: yellow ? 128 : 131 }}>
            <View style={{ position: 'absolute', left: yellow ? 79 : 183.5, top: 11.5, transform: yellow ? [{ scaleX: -1 }] : undefined }}>{yellow ? <BubbleLeft /> : <BubbleRight />}</View>
            <View style={[s.bubble, { alignSelf: yellow ? 'flex-end' : 'flex-start', backgroundColor: yellow ? '#ffefc1' : '#ffd6ae' }]}>
              <View style={s.statusRow}><AlertIcon /><Text numberOfLines={1} style={[s.statusText, demo && { flexShrink: 0 }]}><Text style={s.statusLabel}>{demo ? 'Missing:' : 'Due:'}</Text> {demo ? 'Lisopril, 10mg tablet' : due[0] ? `${due[0].name}, ${due[0].dosage}` : 'No medications due'}</Text></View>
              <View style={s.statusRow}><Check /><Text numberOfLines={1} style={[s.statusText, demo && { flexShrink: 0 }]}><Text style={s.statusLabel}>{demo ? 'Taken:' : 'Saved:'}</Text> {demo ? 'Vyvanse, 10mg capsule' : `${saved.length} medication${saved.length === 1 ? '' : 's'}`}</Text></View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`View ${person.name}`} onPress={() => { setSelectedId(person.id); setPanel('recipient'); }} style={[s.personBar, { top: yellow ? 87 : 90 }]}><Text numberOfLines={1} style={s.personName}>{person.name}</Text><View style={{ transform: [{ rotate: '-90deg' }] }}><Chevron /></View></Pressable>
            <View pointerEvents="none" style={{ position: 'absolute', left: yellow ? 13 : 235, top: yellow ? 7.91 : 19 }}><HomeDog yellow={yellow} expanded={expanded} /></View>
          </View>;
        })}</View>
      </View>
    </ScrollView>
    {expanded && <Pressable accessibilityLabel="Collapse medication actions" onPress={() => setExpanded(false)} style={StyleSheet.absoluteFill} />}
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 26, bottom: Math.max(insets.bottom + 98, height * 132 / 994), width: 110, height: 107 }}>
      {expanded && <>
        <Pressable accessibilityRole="button" accessibilityLabel="View medication list" onPress={() => { setExpanded(false); setPanel('medications'); }} style={[s.action, { left: 48, top: 0 }]}><ListIcon /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Add medication" onPress={() => addMedication()} style={[s.action, { left: 0, top: 40 }]}><Plus /></Pressable>
      </>}
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse medication actions' : 'Expand medication actions'} accessibilityState={{ expanded }} onPress={() => setExpanded((value) => !value)} style={[s.pill, { right: 0, bottom: 0 }]}>{expanded ? <PillExpanded /> : <Pill />}</Pressable>
    </View>
    <View style={[s.nav, { bottom: Math.max(40, insets.bottom + 6) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Medication reminders" onPress={() => { setExpanded(false); setPanel('notifications'); }}><Bell /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Home" onPress={() => { setExpanded(false); setPanel(null); }}><HomeIcon /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="People" onPress={() => { setExpanded(false); setPanel('people'); }}><PeopleIcon /></Pressable>
    </View>
    <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={() => setPanel(null)}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}><Pressable onPress={() => setPanel(null)} accessibilityLabel="Close panel" style={[StyleSheet.absoluteFill, { backgroundColor: '#0006' }]} /><View style={{ height: height * 0.8, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}><View style={s.heading}><Text style={[styles.title, { fontSize: 24 }]}>{panelTitle}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close panel" onPress={() => setPanel(null)} style={{ padding: 10 }}><Text style={styles.text}>×</Text></Pressable></View><ScrollView contentContainerStyle={{ gap: 16 }}>
        {panel === 'people' || panel === 'choose' ? <>{state.recipients.map((person) => <Button key={person.id} title={person.name} onPress={() => panel === 'choose' ? addMedication(person.id) : (setSelectedId(person.id), setPanel('recipient'))} />)}<Button title="Add Care Recipient" onPress={() => { setPanel(null); router.push('/setup/care-recipient'); }} /></> : null}
        {panel === 'profile' ? <Text style={styles.text}>CareCompanion{ '\n\n' }{state.recipients.length} care recipients{ '\n' }{state.medications.length} saved medications</Text> : null}
        {panel === 'recipient' && selected ? <>{personDetails(selected).map(([label, value]) => value ? <View key={label}><Text style={styles.label}>{label}</Text><Text style={styles.text}>{value}</Text></View> : null)}<Button title="Add Medication" onPress={() => addMedication(selected.id)} /></> : null}
        {['recipient', 'medications', 'notifications'].includes(panel || '') ? <>{medications.length ? medications.map((m) => <View key={m.id} style={{ gap: 4, backgroundColor: '#f3f3f3', padding: 14, borderRadius: 10 }}><Text style={styles.label}>{m.name}</Text><Text style={styles.text}>{m.dosage} · {m.frequency}</Text><Text style={styles.text}>{m.times.map(displayTime).join(', ')}</Text><Text style={styles.text}>{state.recipients.find((p) => p.id === m.recipientId)?.name}</Text></View>) : <Text style={styles.text}>No medications added yet.</Text>}</> : null}
      </ScrollView></View></View>
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' }, content: { width: '100%', maxWidth: 314, alignSelf: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headingText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26, color: '#000', lineHeight: 33 },
  bubble: { width: 203, height: 75.746, borderRadius: 15.867, paddingHorizontal: 16.664, justifyContent: 'center', gap: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, statusText: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 10.604, color: '#000', flexShrink: 1 }, statusLabel: { fontFamily: 'PlusJakartaSans_600SemiBold' },
  personBar: { position: 'absolute', left: 0, right: 0, height: 41, borderRadius: 10, backgroundColor: '#d9d9d9', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, personName: { fontFamily: 'Allerta_400Regular', fontSize: 12, color: '#505050', flexShrink: 1 },
  nav: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', gap: 42, borderRadius: 20, backgroundColor: '#f3f3f3', paddingHorizontal: 24, paddingVertical: 10 },
  pill: { position: 'absolute', width: 54, height: 54, backgroundColor: '#e18f3f', borderRadius: 27, padding: 12 }, action: { position: 'absolute', width: 40, height: 40, backgroundColor: '#eca662', borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
});
