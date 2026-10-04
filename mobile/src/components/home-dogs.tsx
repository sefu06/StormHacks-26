import type { ComponentType } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import Body from '../../assets/home/dog-body.svg';
import Head from '../../assets/home/dog-head.svg';
import LeftEar from '../../assets/home/dog-ear-left.svg';
import RightEar from '../../assets/home/dog-ear-right.svg';
import Eyes from '../../assets/home/dog-eyes.svg';
import Mouth from '../../assets/home/dog-mouth.svg';
import YellowBody from '../../assets/home/yellow-body.svg';
import YellowBodyExpanded from '../../assets/home/yellow-body-expanded.svg';
import YellowHead from '../../assets/home/yellow-head.svg';
import YellowLeftEar from '../../assets/home/yellow-ear-left.svg';
import YellowRightEar from '../../assets/home/yellow-ear-right.svg';

function Layer({ asset: Asset, left, top, transform }: { asset: ComponentType<SvgProps>; left: number; top: number; transform?: ViewStyle['transform'] }) {
  return <View style={{ position: 'absolute', left, top, transform }}><Asset /></View>;
}
export function HomeDog({ yellow = false, expanded = false }: { yellow?: boolean; expanded?: boolean }) {
  if (yellow) return <View style={{ width: 64, height: 84 }} accessible={false}>
    <Layer asset={YellowRightEar} left={41.65} top={1.19} transform={[{ rotate: '-12.47deg' }]} />
    <Layer asset={expanded ? YellowBodyExpanded : YellowBody} left={0} top={37.38} />
    <Layer asset={YellowHead} left={9.38} top={9.04} />
    <Layer asset={Eyes} left={31.08} top={24.03} />
    <View style={{ position: 'absolute', left: 28.93, top: 28.59, width: 20.524, height: 14.66, borderRadius: 13.18, backgroundColor: '#fdeec3' }} />
    <Layer asset={Mouth} left={38.05} top={30.54} />
    <Layer asset={YellowLeftEar} left={10.21} top={1.0} transform={[{ rotate: '11.14deg' }]} />
  </View>;
  return <View style={{ width: 71, height: 75.257 }} accessible={false}>
    <Layer asset={Body} left={4.886} top={30.3} transform={[{ scaleX: -1 }]} />
    <View style={{ position: 'absolute', width: 71, height: 42.021, transform: [{ scaleX: -1 }] }}>
    <View style={{ position: 'absolute', left: 39.14, top: 0, width: 31.859, height: 30.772, justifyContent: 'center', alignItems: 'center' }}><View style={{ width: 26.837, height: 17.604, transform: [{ rotate: '139.77deg' }, { scaleY: -1 }] }}><RightEar /></View></View>
    <Layer asset={Head} left={11.38} top={1.95} transform={[{ scaleX: -1 }]} />
    <View style={{ position: 'absolute', left: 0, top: 0, width: 30.929, height: 31.785, justifyContent: 'center', alignItems: 'center' }}><View style={{ width: 26.837, height: 17.604, transform: [{ rotate: '-48.76deg' }] }}><LeftEar /></View></View>
    <Layer asset={Eyes} left={33.08} top={16.94} transform={[{ scaleX: -1 }]} />
    <View style={{ position: 'absolute', left: 30.93, top: 21.5, width: 20.524, height: 14.66, borderRadius: 13.18, backgroundColor: '#ffd6ae' }} />
    <Layer asset={Mouth} left={40.05} top={23.45} transform={[{ scaleX: -1 }]} />
    </View>
  </View>;
}
