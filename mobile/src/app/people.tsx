import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pencil from '../../assets/home/pencil.svg';
import Trash from '../../assets/home/trash.svg';
import Plus from '../../assets/home/plus.svg';
import { BottomNav } from '../components/bottom-nav';
import { HomeDog } from '../components/home-dogs';
import { Button, CloseButton, styles } from '../components/ui';
import { useCare } from '../lib/care-store';
import { months } from '../lib/dates';

const demoPeople = [{ id: 'demo-alexi', name: 'Alexi Manning', birthDate: '2005-12-22', bloodType: 'O+' }, { id: 'demo-elaine', name: 'Elaine Chen', birthDate: '2005-12-22', bloodType: 'O+' }];
function displayBirthDate(date: string) { if (!date) return 'Not added'; const [year, month, day] = date.split('-'); return `${months[Number(month) - 1]} ${Number(day)}, ${year}`; }
export default function People() {
  const { state, error, removeRecipient } = useCare();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [pendingId, setPendingId] = useState('');
  const [busy, setBusy] = useState(false);
  const people = state.recipients.length ? state.recipients : demoPeople;
  const pending = state.recipients.find((person) => person.id === pendingId);
  const contentHeight = 33 + 20 + people.length * 89 + Math.max(0, people.length - 1) * 20;
  async function confirmRemove() {
    setBusy(true);
    try { await removeRecipient(pendingId); setPendingId(''); setRemoving(false); }
    catch { Alert.alert('Unable to remove recipient', 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <View style={{ flex: 1, backgroundColor: '#fff' }}>
    <ScrollView contentContainerStyle={{ paddingTop: Math.max(insets.top + 32, (height - contentHeight) / 2 + 0.5), paddingHorizontal: 30, paddingBottom: 220 }}>
      <View style={{ width: '100%', maxWidth: 314, alignSelf: 'center', gap: 20 }}><Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: '#000', fontSize: 26, lineHeight: 33 }}>Manage Recipients</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {removing && <Text style={styles.text}>Select a recipient to remove.</Text>}
        {people.map((person, index) => <Pressable key={person.id} accessibilityRole={removing ? 'button' : undefined} accessibilityLabel={`${removing ? 'Remove' : 'Care recipient'} ${person.name}`} disabled={!removing} onPress={() => { if (removing && state.recipients.some((p) => p.id === person.id)) setPendingId(person.id); }} style={{ height: 89, backgroundColor: '#d9d9d9', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 24, justifyContent: 'center', borderWidth: removing ? 1 : 0, borderColor: '#e18f3f' }}>
          <View style={{ gap: 4, marginLeft: index % 2 ? 72 : 0, maxWidth: 194 }}><Text style={{ fontFamily: 'PlusJakartaSans_700Bold', color: '#303030', fontSize: 12 }}>{person.name}</Text><Text style={s.detail}><Text style={s.label}>Date of Birth:</Text> {displayBirthDate(person.birthDate)}</Text><Text style={s.detail}><Text style={s.label}>Blood Type:</Text> {person.bloodType || 'Not added'}</Text></View>
          <View pointerEvents="none" style={{ position: 'absolute', left: index % 2 ? 8 : 236, top: index % 2 ? 8 : 15 }}><HomeDog yellow={index % 2 === 1} /></View>
        </Pressable>)}
      </View>
    </ScrollView>
    {expanded && <Pressable accessibilityLabel="Collapse recipient actions" onPress={() => setExpanded(false)} style={StyleSheet.absoluteFill} />}
    <View pointerEvents="box-none" style={{ position: 'absolute', right: 26, bottom: Math.max(insets.bottom + 98, height * 132 / 994), width: 110, height: 107 }}>
      {expanded && <><Pressable accessibilityRole="button" accessibilityLabel="Remove a care recipient" onPress={() => { setExpanded(false); setRemoving(true); }} style={[s.action, { left: 48, top: 0 }]}><Trash /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Add care recipient" onPress={() => { setExpanded(false); router.push('/setup/care-recipient'); }} style={[s.action, { left: 0, top: 40 }]}><Plus /></Pressable></>}
      <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse recipient actions' : 'Expand recipient actions'} accessibilityState={{ expanded }} onPress={() => { setRemoving(false); setExpanded((current) => !current); }} style={{ position: 'absolute', right: 0, bottom: 0, width: 54, height: 54, backgroundColor: '#e18f3f', borderRadius: 27, alignItems: 'center', justifyContent: 'center' }}><Pencil /></Pressable>
    </View>
    <BottomNav active="people" />
    <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPendingId('')}><View style={{ flex: 1, backgroundColor: '#0006', alignItems: 'center', justifyContent: 'center', padding: 30 }}><View style={{ width: '100%', maxWidth: 342, backgroundColor: '#fff', padding: 24, borderRadius: 20, gap: 16 }}><View style={{ alignSelf: 'flex-end' }}><CloseButton onPress={() => setPendingId('')} /></View><Text style={styles.label}>Remove {pending?.name}?</Text><Text style={styles.text}>This also removes their saved medications from this device.</Text><Button title={busy ? 'Removing…' : 'Remove Recipient'} disabled={busy} onPress={confirmRemove} /><Button title="Cancel" disabled={busy} onPress={() => setPendingId('')} /></View></View></Modal>
  </View>;
}
const s = StyleSheet.create({ detail: { fontFamily: 'PlusJakartaSans_500Medium', color: '#505050', fontSize: 10.604, lineHeight: 14 }, label: { fontFamily: 'PlusJakartaSans_600SemiBold' }, action: { position: 'absolute', width: 40, height: 40, backgroundColor: '#eca662', borderRadius: 27, alignItems: 'center', justifyContent: 'center' } });
