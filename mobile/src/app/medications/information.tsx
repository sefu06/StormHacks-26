import { MedicationStage, MedicationAction } from '../../components/medication-stage';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import SearchIcon from '../../../assets/medication/search.svg';
import { styles } from '../../components/ui';
import { cephalexinInformation } from '../../lib/medication-catalog';
export default function Information() {
  const { name = '', recipientId } = useLocalSearchParams<{ name: string; recipientId: string }>();
  const information = name.toLowerCase().startsWith('cephalexin') ? cephalexinInformation : [];
  return <MedicationStage title="Add Medication" progress={2} centeredTitle action={<MedicationAction title="Continue to Administration Instructions" onPress={() => router.push({ pathname: '/medications/administration', params: { name, recipientId } })} />}><View style={[styles.row, { height: 35, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#d9d9d9', justifyContent: 'space-between' }]}><Text style={[styles.text, { fontSize: 12 }]}>{name}</Text><SearchIcon /></View><View><View style={{ gap: 8 }}>{information.length ? information.map(({ title, text }) => <View style={{ gap: 4 }} key={title}><Text style={styles.label}>{title}</Text><Text style={[styles.text, { color: '#505050', fontSize: 12, lineHeight: 15 }]}>{text}</Text></View>) : <Text style={styles.text}>Medication information is unavailable. Continue to enter prescription details.</Text>}</View></View></MedicationStage>;
}
