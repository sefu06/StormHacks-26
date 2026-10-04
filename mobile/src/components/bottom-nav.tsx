import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Bell from '../../assets/home/bell.svg';
import Home from '../../assets/home/home.svg';
import People from '../../assets/home/people.svg';

export function BottomNav({ active, onReminders }: { active: 'home' | 'people' | 'notifications'; onReminders?: () => void }) {
  const insets = useSafeAreaInsets();
  const items = [
    { key: 'notifications', label: 'Medication reminders', Icon: Bell, press: onReminders ?? (() => router.replace({ pathname: '/home', params: { panel: 'notifications' } })) },
    { key: 'home', label: 'Home', Icon: Home, press: () => router.replace('/home') },
    { key: 'people', label: 'People', Icon: People, press: () => router.replace('/people') },
  ];
  return <View style={{ position: 'absolute', alignSelf: 'center', bottom: Math.max(40, insets.bottom + 6), flexDirection: 'row', alignItems: 'center', gap: 42, borderRadius: 20, backgroundColor: '#f3f3f3', paddingHorizontal: 18, paddingVertical: 6 }}>
    {items.map(({ key, label, Icon, press }) => <Pressable key={key} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: active === key }} hitSlop={8} onPress={press} style={active === key ? { backgroundColor: '#d9d9d9', borderRadius: 30, padding: 8 } : undefined}><Icon /></Pressable>)}
  </View>;
}
