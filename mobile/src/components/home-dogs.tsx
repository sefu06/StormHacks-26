import FilteredYellowBody from '../../assets/activity/yellow-body-filtered.svg';
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
import ActivityYellowBody from '../../assets/activity/yellow-body.svg';
import YellowHead from '../../assets/home/yellow-head.svg';
import YellowLeftEar from '../../assets/home/yellow-ear-left.svg';
import YellowRightEar from '../../assets/home/yellow-ear-right.svg';

function Layer({ asset: Asset, left, top, transform }: { asset: ComponentType<SvgProps>; left: number; top: number; transform?: ViewStyle['transform'] }) {
  return <View style={transform ? { position: 'absolute', left, top, transform } : { position: 'absolute', left, top }}><Asset /></View>;
}

function FigmaLayer({
  asset: Asset,
  left,
  top,
  width,
  height,
  transform,
  contentWidth = width,
  contentHeight = height,
  assetWidth = contentWidth,
  assetHeight = contentHeight,
  assetLeft = 0,
  assetTop = 0,
}: {
  asset: ComponentType<SvgProps>;
  left: number;
  top: number;
  width: number;
  height: number;
  transform?: ViewStyle['transform'];
  contentWidth?: number;
  contentHeight?: number;
  assetWidth?: number;
  assetHeight?: number;
  assetLeft?: number;
  assetTop?: number;
}) {
  const frameStyle = { position: 'absolute' as const, left, top, width, height, justifyContent: 'center' as const, alignItems: 'center' as const };
  const contentStyle = transform
    ? { position: 'relative' as const, width: contentWidth, height: contentHeight, transform }
    : { position: 'relative' as const, width: contentWidth, height: contentHeight };
  return <View style={frameStyle}><View style={contentStyle}><Asset width={assetWidth} height={assetHeight} style={{ position: 'absolute', left: assetLeft, top: assetTop }} /></View></View>;
}
export function HomeDog({ yellow = false, expanded = false, activity = false, filtered = false }: { yellow?: boolean; expanded?: boolean; activity?: boolean; filtered?: boolean }) {
  if (yellow) return <View style={{ width: 64, height: 84 }} accessible={false}>
    <Layer asset={YellowRightEar} left={41.65} top={1.19} transform={[{ rotate: '-12.47deg' }]} />
    <Layer asset={filtered ? FilteredYellowBody : activity ? ActivityYellowBody : expanded ? YellowBodyExpanded : YellowBody} left={0} top={37.38} />
    <Layer asset={YellowHead} left={9.38} top={9.04} />
    <Layer asset={Eyes} left={31.08} top={24.03} />
    <View style={{ position: 'absolute', left: 28.93, top: 28.59, width: 20.524, height: 14.66, borderRadius: 13.18, backgroundColor: '#fdeec3' }} />
    <Layer asset={Mouth} left={38.05} top={30.54} />
    <Layer asset={YellowLeftEar} left={10.21} top={1.0} transform={[{ rotate: '11.14deg' }]} />
  </View>;
  return <View style={{ width: 71, height: 75.257, transform: [{ scaleX: -1 }] }} accessible={false}>
    <FigmaLayer asset={Body} left={1.61} top={30.3} width={64.504} height={44.957} transform={[{ scaleX: -1 }]} />
    <View style={{ position: 'absolute', left: 0, top: 0, width: 71, height: 42.021 }}>
      <FigmaLayer asset={RightEar} left={39.14} top={0} width={31.859} height={30.772} contentWidth={26.837} contentHeight={17.604} assetWidth={26.837} assetHeight={15.632} transform={[{ rotate: '139.77deg' }, { scaleY: -1 }]} />
      <FigmaLayer asset={Head} left={11.38} top={1.95} width={48.867} height={40.071} transform={[{ scaleX: -1 }]} />
      <FigmaLayer asset={LeftEar} left={0} top={0} width={30.929} height={31.785} contentWidth={26.837} contentHeight={17.604} assetWidth={26.837} assetHeight={15.632} transform={[{ rotate: '48.76deg' }]} />
      <FigmaLayer asset={Eyes} left={33.08} top={16.94} width={15.33} height={3.832} transform={[{ scaleX: -1 }]} />
      <View style={{ position: 'absolute', left: 30.93, top: 21.5, width: 20.524, height: 14.66, borderRadius: 13.18, backgroundColor: '#ffd6ae' }} />
      <FigmaLayer asset={Mouth} left={40.54} top={23.45} width={7.007} height={8.221} contentWidth={7.007} contentHeight={8.221} assetWidth={8.159} assetHeight={8.88} assetLeft={-0.493} transform={[{ scaleX: -1 }]} />
    </View>
  </View>;
}
