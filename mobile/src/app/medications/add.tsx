import { MedicationStage } from '../../components/medication-stage';
import { MedicationGuide } from '../../components/medication-guide';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import SearchIcon from '../../../assets/medication/search.svg';
import { Input, styles } from '../../components/ui';
import { useCare } from '../../lib/care-store';
import { medicationCatalog } from '../../lib/medication-catalog';
export default function Search() {
  const { recipientId } = useLocalSearchParams<{ recipientId: string }>();
  const { state } = useCare(); const [query, setQuery] = useState('');
  const matches = [...new Set([...medicationCatalog, ...state.medications.map((m) => m.name)])].filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()));
  const select = (name: string) => router.push({ pathname: '/medications/information', params: { name, recipientId } });
  return <MedicationStage title="Add Medication" progress={query.trim() ? 1 : 0} centeredTitle><View><View style={[styles.row, { backgroundColor: '#d9d9d9', height: 35, borderRadius: 10, paddingRight: 10 }]}><Input accessibilityLabel="Search by medication name" placeholder="Search by medication name" value={query} onChangeText={setQuery} autoCorrect={false} style={{ flex: 1, height: 35 }} /><Pressable accessibilityRole="button" accessibilityLabel="Search medications" onPress={() => { if (query.trim() && !matches.length) select(query.trim()); }}><SearchIcon /></Pressable></View>
    {query.trim() ? <View style={{ paddingHorizontal: 10 }}>{(matches.length ? matches : [`Add “${query.trim()}”`]).map((name, index, list) => <Pressable key={name} accessibilityRole="button" onPress={() => select(matches.length ? name : query.trim())} style={({ pressed }) => ({ height: 36, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: pressed ? '#e9e9e9' : '#f3f3f3', borderBottomWidth: index === list.length - 1 ? 0 : 1, borderColor: '#afafaf', borderBottomLeftRadius: index === list.length - 1 ? 10 : 0, borderBottomRightRadius: index === list.length - 1 ? 10 : 0 })}><Text style={[styles.text, { color: '#505050', fontSize: 12 }]}>{name}</Text></Pressable>)}</View> : null}
    </View><MedicationGuide searching={!!query.trim()} /></MedicationStage>;
}
