import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import SearchIcon from '../../../assets/figma/ai-search.svg';
import { Button, Screen, styles } from '../../components/ui';
import { cephalexinInformation } from '../../lib/medication-catalog';
export default function Information() {
  const { name = '', recipientId } = useLocalSearchParams<{ name: string; recipientId: string }>();
  const information = name.toLowerCase().startsWith('cephalexin') ? cephalexinInformation : [];
  return <Screen kind="search"><Text style={[styles.title, { textAlign: 'center', marginBottom: 8 }]}>Add Medication</Text><View style={[styles.row, { height: 35, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#d9d9d9', justifyContent: 'space-between' }]}><Text style={[styles.text, { fontSize: 12 }]}>{name}</Text><SearchIcon /></View><View style={{ gap: 20, marginTop: 20 }}><View style={{ gap: 8 }}>{information.length ? information.map(({ title, text }) => <View style={{ gap: 4 }} key={title}><Text style={[styles.text, { fontSize: 14, lineHeight: 18 }]}>{title}</Text><Text style={[styles.text, { color: '#505050', fontSize: 12, lineHeight: 15 }]}>{text}</Text></View>) : <Text style={styles.text}>Medication information is unavailable. Continue to enter prescription details.</Text>}</View><Button title="Next" onPress={() => router.push({ pathname: '/medications/prescription', params: { name, recipientId } })} /></View></Screen>;
}
