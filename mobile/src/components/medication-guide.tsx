import { Text, View } from 'react-native';
import Body from '../../assets/medication/body.svg';
import Head from '../../assets/medication/head.svg';
import RightEar from '../../assets/medication/right-ear.svg';
import LeftEar from '../../assets/medication/left-ear.svg';
import Eyes from '../../assets/medication/eyes.svg';
import Mouth from '../../assets/medication/mouth.svg';
import Tail from '../../assets/medication/bubble-tail.svg';
export function MedicationGuide({ searching }: { searching: boolean }) {
  return <View style={{ width: 268, height: 256.31, alignSelf: 'center', marginTop: 40 }}>
    <View style={{ position: 'absolute', left: 37, top: 48, transform: [{ scaleX: -1 }] }}><Tail /></View>
    <View style={{ backgroundColor: '#ffd6ae', borderRadius: 20.948, height: 100, padding: 22 }}><Text style={{ fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14, lineHeight: 19, color: '#000' }}>{searching ? 'Select the specific medication that your care recipient is currently taking.' : 'Please search for the name of the medication that your care recipient is currently taking.'}</Text></View>
    <View accessible={false} style={{ position: 'absolute', left: 73, top: 127, width: 122, height: 129.31 }}>
      <View style={{ position: 'absolute', left: 8.4, top: 52.06, transform: [{ scaleX: -1 }] }}><Body /></View>
      <View style={{ position: 'absolute', left: 0, top: 0, width: 54.743, height: 52.877, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 46.114, height: 30.249, transform: [{ rotate: '139.77deg' }, { scaleY: -1 }] }}><RightEar /></View></View>
      <View style={{ position: 'absolute', left: 18.47, top: 3.36, transform: [{ scaleX: -1 }] }}><Head /></View>
      <View style={{ position: 'absolute', left: 68.85, top: 0, width: 53.146, height: 54.616, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 46.114, height: 30.249, transform: [{ rotate: '48.76deg' }] }}><LeftEar /></View></View>
      <View style={{ position: 'absolute', left: 38.82, top: 29.11, transform: [{ scaleX: -1 }] }}><Eyes /></View>
      <View style={{ position: 'absolute', left: 33.59, top: 36.95, width: 35.267, height: 25.191, borderRadius: 22.647, backgroundColor: '#ffd6ae' }} />
      <View style={{ position: 'absolute', left: 39.50, top: 40.3, transform: [{ scaleX: -1 }] }}><Mouth /></View>
    </View>
  </View>;
}
