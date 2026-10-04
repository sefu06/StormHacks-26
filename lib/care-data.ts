export type PersonSlug = string;

export type MedicationStatus = "taken" | "missed" | "upcoming";

export type ScheduleMedication = {
  id: string;
  time: string;
  name: string;
  dose: string;
  frequency: string;
  days: string[];
  startDate: string;
  status: MedicationStatus;
  instructions: string;
  notes: string;
};

export type DetailGroup = {
  title: string;
  items: Array<{ label: string; value: string }>;
};

export type CarePerson = {
  slug: PersonSlug;
  name: string;
  fullName: string;
  initials: string;
  avatarClass: string;
  detailGroups: DetailGroup[];
  asNeededMedication: string;
  scheduleByDate: Record<string, ScheduleMedication[]>;
};

export const demoToday = "2026-10-03";

const dailyMedicationTemplates = [
  {
    id: "morning",
    time: "7:30 AM",
    name: "Vyvanse",
    dose: "30 mg capsule",
    frequency: "Once daily",
    days: ["Every day"],
    startDate: "2026-10-01",
    instructions: "Take in the morning exactly as prescribed.",
    notes: "Do not create a late-day catch-up reminder.",
  },
  {
    id: "morning-blood-pressure",
    time: "8:15 AM",
    name: "Lisinopril",
    dose: "10 mg tablet",
    frequency: "Once daily",
    days: ["Every day"],
    startDate: "2026-10-01",
    instructions: "Take once daily with water, following the prescription label.",
    notes: "",
  },
  {
    id: "evening-cholesterol",
    time: "6:30 PM",
    name: "Atorvastatin",
    dose: "20 mg tablet",
    frequency: "Once daily",
    days: ["Every day"],
    startDate: "2026-10-01",
    instructions: "Take as prescribed.",
    notes: "Caregiver note: after dinner.",
  },
  {
    id: "evening-supplement",
    time: "8:30 PM",
    name: "Vitamin D3",
    dose: "1,000 IU softgel",
    frequency: "Once daily",
    days: ["Every day"],
    startDate: "2026-10-01",
    instructions: "Take as directed with an evening snack.",
    notes: "",
  },
];

function buildDailySchedule(statuses: Record<string, MedicationStatus>) {
  return dailyMedicationTemplates.map((medication) => ({
    ...medication,
    status: statuses[medication.id] ?? "upcoming",
  }));
}

const margaretSchedule: Record<string, ScheduleMedication[]> = {
  "2026-10-02": buildDailySchedule({
    morning: "taken",
    "morning-blood-pressure": "taken",
    "evening-cholesterol": "missed",
    "evening-supplement": "taken",
  }),
  [demoToday]: buildDailySchedule({
    morning: "taken",
    "morning-blood-pressure": "missed",
    "evening-cholesterol": "upcoming",
    "evening-supplement": "upcoming",
  }),
  "2026-10-04": buildDailySchedule({
    morning: "upcoming",
    "morning-blood-pressure": "upcoming",
    "evening-cholesterol": "upcoming",
    "evening-supplement": "upcoming",
  }),
};

const alexSchedule: Record<string, ScheduleMedication[]> = {
  "2026-10-02": buildDailySchedule({
    morning: "missed",
    "morning-blood-pressure": "taken",
    "evening-cholesterol": "taken",
    "evening-supplement": "taken",
  }),
  [demoToday]: buildDailySchedule({
    morning: "missed",
    "morning-blood-pressure": "taken",
    "evening-cholesterol": "upcoming",
    "evening-supplement": "upcoming",
  }),
  "2026-10-04": buildDailySchedule({
    morning: "upcoming",
    "morning-blood-pressure": "upcoming",
    "evening-cholesterol": "upcoming",
    "evening-supplement": "upcoming",
  }),
};

export const carePeople: Record<PersonSlug, CarePerson> = {
  margaret: {
    slug: "margaret",
    name: "Margaret",
    fullName: "Margaret Chen",
    initials: "M",
    avatarClass: "home-person-avatar-margaret",
    asNeededMedication: "Acetaminophen, 325 mg tablet, as needed according to the package label or clinician guidance.",
    detailGroups: [
      {
        title: "Basic details",
        items: [
          { label: "Date of birth", value: "June 12, 1958" },
          { label: "Age", value: "68" },
          { label: "Pronouns", value: "She / her" },
          { label: "Location", value: "Burnaby, BC" },
          { label: "Height", value: "160 cm, 5 ft 3 in" },
          { label: "Weight", value: "67 kg, 148 lb" },
        ],
      },
      {
        title: "Medication context",
        items: [
          { label: "Medication allergy", value: "Penicillin, rash reported as a young adult" },
          { label: "Sensitivity", value: "Latex, skin irritation from some bandages" },
          { label: "Primary pharmacy", value: "Demo Pharmacy, Burnaby, BC" },
          { label: "Next medication review", value: "December 15, 2026" },
        ],
      },
      {
        title: "Care preferences",
        items: [
          { label: "Reminder style", value: "Gentle, direct, never scolding" },
          { label: "Repeat reminder", value: "Once after 10 minutes without a response" },
          { label: "Escalation", value: "Notify David after 30 minutes" },
          { label: "Contact method", value: "Voice call first, then text message" },
        ],
      },
      {
        title: "Relevant context",
        items: [
          { label: "Care notes", value: "ADHD, hypertension, high cholesterol, mild hand osteoarthritis" },
          { label: "Fall-safety note", value: "Occasional dizziness when standing quickly" },
          { label: "Medication storage", value: "Kitchen drawer by the coffee maker" },
          { label: "Blood pressure", value: "Home cuff used 2 to 3 times per week" },
        ],
      },
    ],
    scheduleByDate: margaretSchedule,
  },
  alex: {
    slug: "alex",
    name: "Alex",
    fullName: "Alex Manning",
    initials: "A",
    avatarClass: "home-person-avatar-alex",
    asNeededMedication: "No as-needed medication added yet.",
    detailGroups: [
      {
        title: "Basic details",
        items: [
          { label: "Full name", value: "Alex Manning" },
          { label: "Pronouns", value: "Not added yet" },
          { label: "Location", value: "Not added yet" },
          { label: "Preferred language", value: "Not added yet" },
        ],
      },
      {
        title: "Medication context",
        items: [
          { label: "Allergies", value: "Not added yet" },
          { label: "Primary pharmacy", value: "Not added yet" },
          { label: "Next medication review", value: "Not added yet" },
        ],
      },
      {
        title: "Care preferences",
        items: [
          { label: "Reminder style", value: "Not added yet" },
          { label: "Contact method", value: "Not added yet" },
          { label: "Best check-in time", value: "Not added yet" },
        ],
      },
      {
        title: "Relevant context",
        items: [
          { label: "Care notes", value: "Add caregiver-confirmed context here" },
          { label: "Medication storage", value: "Not added yet" },
        ],
      },
    ],
    scheduleByDate: alexSchedule,
  },
};

export const carePeopleList = Object.values(carePeople);

export function getCarePerson(slug: string | string[] | undefined) {
  const value = Array.isArray(slug) ? slug[0] : slug;
  return value && value in carePeople ? carePeople[value as PersonSlug] : undefined;
}

export function getScheduleForDate(person: CarePerson, date: string) {
  return person.scheduleByDate[date] ?? [];
}
