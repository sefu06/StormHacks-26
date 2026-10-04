import { createContext, useContext, useState, type ReactNode } from 'react';
import { emptyDate } from './dates';
const initial = { dosage: '', frequency: '', times: [{ time: '12:00', period: 'AM' }], start: emptyDate, end: emptyDate, instructions: '', rx: '', strength: '', unit: 'mg', refills: '', expiry: emptyDate };
type Draft = typeof initial;
const Context = createContext<{ draft: Draft; update: (values: Partial<Draft>) => void } | null>(null);
export function MedicationDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initial);
  return <Context.Provider value={{ draft, update: (values) => setDraft((current) => ({ ...current, ...values })) }}>{children}</Context.Provider>;
}
export function useMedicationDraft() { const value = useContext(Context); if (!value) throw Error('Missing medication draft'); return value; }
