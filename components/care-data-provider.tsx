"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  carePeopleList,
  demoToday,
  getScheduleForDate,
  type CarePerson,
  type PersonSlug,
  type ScheduleMedication,
} from "@/lib/care-data";

type MedicationOverrides = Record<string, ScheduleMedication>;

export type NewMedicationInput = Omit<ScheduleMedication, "id" | "status">;

export type MedicationPoolRecord = {
  id: string;
  medication: ScheduleMedication;
  assignedTo: PersonSlug[];
};

type CareDataContextValue = {
  medicationPool: MedicationPoolRecord[];
  getSchedule: (person: CarePerson, date: string) => ScheduleMedication[];
  addMedicationToPool: (medication: NewMedicationInput, assignedTo: PersonSlug[]) => void;
  updateMedication: (person: CarePerson, date: string, medication: ScheduleMedication) => void;
};

const CareDataContext = createContext<CareDataContextValue | null>(null);

function getMedicationKey(person: CarePerson, date: string, medicationId: string) {
  return `${person.slug}:${date}:${medicationId}`;
}

function formatDisplayTime(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function isScheduledOnDate(medication: ScheduleMedication, date: string) {
  if (date < medication.startDate) return false;
  if (medication.days.includes("Every day")) return true;

  const weekdayCodes = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const weekday = weekdayCodes[new Date(`${date}T12:00:00`).getDay()];

  return medication.days.includes(weekday);
}

export function CareDataProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<MedicationOverrides>({});
  const [medicationPool, setMedicationPool] = useState<MedicationPoolRecord[]>([]);

  const getSchedule = useCallback((person: CarePerson, date: string) => (
    [
      ...getScheduleForDate(person, date).map((medication) => (
        overrides[getMedicationKey(person, date, medication.id)] ?? medication
      )),
      ...medicationPool
        .filter(({ assignedTo, medication }) => assignedTo.includes(person.slug) && isScheduledOnDate(medication, date))
        .map(({ medication }) => overrides[getMedicationKey(person, date, medication.id)] ?? medication),
    ]
  ), [medicationPool, overrides]);

  const addMedicationToPool = useCallback((medication: NewMedicationInput, assignedTo: PersonSlug[]) => {
    const id = `${medication.name.trim().toLowerCase().replaceAll(" ", "-")}-${Date.now()}`;
    const savedMedication: ScheduleMedication = {
      ...medication,
      id,
      time: formatDisplayTime(medication.time),
      status: "upcoming",
    };

    setMedicationPool((current) => [...current, { id, medication: savedMedication, assignedTo }]);
  }, []);

  const updateMedication = useCallback((person: CarePerson, date: string, medication: ScheduleMedication) => {
    setMedicationPool((current) => current.map((record) => {
      if (record.id !== medication.id) return record;

      const { status: _status, ...medicationDetails } = medication;
      return { ...record, medication: { ...record.medication, ...medicationDetails } };
    }));

    setOverrides((current) => ({
      ...carePeopleList.reduce((next, carePerson) => {
        if (getScheduleForDate(carePerson, demoToday).some(({ id }) => id === medication.id)) {
          next[getMedicationKey(carePerson, date, medication.id)] = medication;
        }
        return next;
      }, {
        ...current,
        [getMedicationKey(person, date, medication.id)]: medication,
      } as MedicationOverrides),
    }));
  }, []);

  const value = useMemo(() => ({ medicationPool, getSchedule, addMedicationToPool, updateMedication }), [
    addMedicationToPool,
    getSchedule,
    medicationPool,
    updateMedication,
  ]);

  return <CareDataContext.Provider value={value}>{children}</CareDataContext.Provider>;
}

export function useCareData() {
  const context = useContext(CareDataContext);

  if (!context) {
    throw new Error("useCareData must be used within CareDataProvider");
  }

  return context;
}
