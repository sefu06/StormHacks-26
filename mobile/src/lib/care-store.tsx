import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Recipient = { id: string; name: string; birthDate: string; sex: string; pregnant: string; bloodType: string; height: string; weight: string; conditions: string[]; allergies: string[] };
export type MedicationStatus = 'Missed' | 'Taken';
export type Medication = { activityAt?: string; instructions?: string; missedAt?: string; notificationRead?: boolean; status?: MedicationStatus; id: string; recipientId: string; name: string; dosage: string; frequency: string; times: string[]; rx: string; strength: string; startDate: string; endDate: string; expiryDate: string; refills: string };
type CareState = { recipients: Recipient[]; medications: Medication[] };
const empty: CareState = { recipients: [], medications: [] };
const key = 'carecompanion.native.v1';
const Context = createContext<{ state: CareState; ready: boolean; error: string; saveRecipient: (recipient: Omit<Recipient, 'id'>) => Promise<string>; saveMedication: (medication: Omit<Medication, 'id'>) => Promise<void>; saveMedications: (medications: Omit<Medication, 'id'>[]) => Promise<void>; removeRecipient: (id: string) => Promise<void>; markNotificationsRead: () => Promise<void> } | null>(null);

export function CareProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CareState>(empty);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then((raw) => {
      if (!raw || !active) return;
      const saved = JSON.parse(raw) as CareState;
      if (!Array.isArray(saved.recipients) || !Array.isArray(saved.medications)) throw Error('Invalid saved data');
      setState(saved);
    }).catch(() => { if (active) setError('Saved data could not be loaded.'); }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  async function persist(next: CareState) { await AsyncStorage.setItem(key, JSON.stringify(next)); setState(next); }
  async function saveRecipient(recipient: Omit<Recipient, 'id'>) {
    const id = `person-${Date.now()}`;
    await persist({ ...state, recipients: [...state.recipients, { ...recipient, id }] });
    return id;
  }
  async function saveMedication(medication: Omit<Medication, 'id'>) { await saveMedications([medication]); }
  async function saveMedications(medications: Omit<Medication, 'id'>[]) {
    if (medications.some((medication) => !state.recipients.some(({ id }) => id === medication.recipientId))) throw Error('Choose a care recipient first.');
    const timestamp = Date.now();
    await persist({ ...state, medications: [...state.medications, ...medications.map((medication, index) => ({ ...medication, status: medication.status ?? 'Missed' as const, notificationRead: false, activityAt: medication.activityAt ?? new Date(timestamp).toISOString(), id: `medication-${timestamp}-${index}` }))] });
  }
  async function removeRecipient(id: string) {
    await persist({ ...state, recipients: state.recipients.filter((person) => person.id !== id), medications: state.medications.filter((medication) => medication.recipientId !== id) });
  }
  async function markNotificationsRead() {
    if (!state.medications.some((medication) => medication.notificationRead === false)) return;
    await persist({ ...state, medications: state.medications.map((medication) => ({ ...medication, notificationRead: true })) });
  }
  return <Context.Provider value={{ state, ready, error, saveRecipient, saveMedication, saveMedications, removeRecipient, markNotificationsRead }}>{children}</Context.Provider>;
}
export function useCare() { const value = useContext(Context); if (!value) throw Error('Missing CareProvider'); return value; }
