"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
  people: CarePerson[];
  medicationPool: MedicationPoolRecord[];
  getSchedule: (person: CarePerson, date: string) => ScheduleMedication[];
  addMedicationToPool: (medication: NewMedicationInput, assignedTo: PersonSlug[]) => void;
  updateMedication: (person: CarePerson, date: string, medication: ScheduleMedication) => void;
  addCarePerson: (name: string) => void;
  removeCarePerson: (slug: PersonSlug) => void;
};

const CareDataContext = createContext<CareDataContextValue | null>(null);
const peopleStorageKey = "carecompanion.people";

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

function createPersonSlug(name: string, existingPeople: CarePerson[]) {
  const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "person";
  let slug = baseSlug;
  let suffix = 2;

  while (existingPeople.some((person) => person.slug === slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function createCarePerson(name: string, existingPeople: CarePerson[]): CarePerson {
  const trimmedName = name.trim();
  const initials = trimmedName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "P";

  return {
    slug: createPersonSlug(trimmedName, existingPeople),
    name: trimmedName,
    fullName: trimmedName,
    initials,
    avatarClass: "home-person-avatar-new",
    asNeededMedication: "No as-needed medication added yet.",
    detailGroups: [
      {
        title: "Basic details",
        items: [
          { label: "Full name", value: trimmedName },
          { label: "Pronouns", value: "Not added yet" },
          { label: "Location", value: "Not added yet" },
        ],
      },
      {
        title: "Medication context",
        items: [
          { label: "Allergies", value: "Not added yet" },
          { label: "Primary pharmacy", value: "Not added yet" },
        ],
      },
    ],
    scheduleByDate: {},
  };
}

export function CareDataProvider({ children }: { children: React.ReactNode }) {
  const [people, setPeople] = useState<CarePerson[]>(carePeopleList);
  const [hasLoadedPeople, setHasLoadedPeople] = useState(false);
  const [overrides, setOverrides] = useState<MedicationOverrides>({});
  const [medicationPool, setMedicationPool] = useState<MedicationPoolRecord[]>([]);

  useEffect(() => {
    try {
      const savedPeople = window.localStorage.getItem(peopleStorageKey);
      if (savedPeople) {
        const parsedPeople = JSON.parse(savedPeople) as CarePerson[];
        if (Array.isArray(parsedPeople) && parsedPeople.length > 0 && parsedPeople.every((person) => person.slug && person.name)) {
          setPeople(parsedPeople);
        }
      }
    } catch {
      // Keep the demo people when local storage is unavailable or malformed.
    }

    setHasLoadedPeople(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPeople) return;

    try {
      window.localStorage.setItem(peopleStorageKey, JSON.stringify(people));
    } catch {
      // The in-memory state still works when local storage is unavailable.
    }
  }, [hasLoadedPeople, people]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== peopleStorageKey || !event.newValue) return;

      try {
        const nextPeople = JSON.parse(event.newValue) as CarePerson[];
        if (Array.isArray(nextPeople) && nextPeople.length > 0 && nextPeople.every((person) => person.slug && person.name)) {
          setPeople(nextPeople);
        }
      } catch {
        // Ignore malformed updates from another tab.
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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

  const addCarePerson = useCallback((name: string) => {
    if (!name.trim()) return;

    setPeople((current) => {
      if (current.some((person) => person.name.toLowerCase() === name.trim().toLowerCase())) return current;
      return [...current, createCarePerson(name, current)];
    });
  }, []);

  const removeCarePerson = useCallback((slug: PersonSlug) => {
    setPeople((current) => current.length <= 1 ? current : current.filter((person) => person.slug !== slug));
  }, []);

  const updateMedication = useCallback((person: CarePerson, date: string, medication: ScheduleMedication) => {
    setMedicationPool((current) => current.map((record) => {
      if (record.id !== medication.id) return record;

      const { status: _status, ...medicationDetails } = medication;
      return { ...record, medication: { ...record.medication, ...medicationDetails } };
    }));

    setOverrides((current) => ({
      ...people.reduce((next, carePerson) => {
        if (getScheduleForDate(carePerson, demoToday).some(({ id }) => id === medication.id)) {
          next[getMedicationKey(carePerson, date, medication.id)] = medication;
        }
        return next;
      }, {
        ...current,
        [getMedicationKey(person, date, medication.id)]: medication,
      } as MedicationOverrides),
    }));
  }, [people]);

  const value = useMemo(() => ({ people, medicationPool, getSchedule, addMedicationToPool, updateMedication, addCarePerson, removeCarePerson }), [
    addCarePerson,
    addMedicationToPool,
    getSchedule,
    medicationPool,
    people,
    removeCarePerson,
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
