import { MedicationDraftProvider } from '../../lib/medication-draft';
import { Stack, router, useNavigation, usePathname } from 'expo-router';
import { PopupWindow } from '../../components/popup-window';
export default function MedicationModal() {
  const parent = useNavigation('/');
  const pathname = usePathname();
  const close = () => { if (parent.canGoBack()) parent.goBack(); else router.replace('/home'); };
  return <PopupWindow label="medication popup" onClose={close} onBack={pathname !== '/medications/add' ? () => router.back() : undefined}>
    <MedicationDraftProvider><Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#fff' } }} /></MedicationDraftProvider>
  </PopupWindow>;
}
