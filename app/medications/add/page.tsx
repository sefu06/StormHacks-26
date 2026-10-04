"use client";

import { Allerta } from "next/font/google";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useCareData } from "@/components/care-data-provider";
import { cephalexinInformation, medicationCatalog } from "@/lib/medication-catalog";
import styles from "./page.module.css";

const allerta = Allerta({ weight: "400", subsets: ["latin"], display: "swap" });
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
type DateParts = { month: string; day: string; year: string };
const emptyDate: DateParts = { month: "", day: "", year: "" };

function parseDate(parts: DateParts) {
  if (!parts.month && !parts.day && !parts.year) return "";
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const date = new Date(year, month - 1, day);
  if (!/^\d{4}$/.test(parts.year) || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${parts.year}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}`;
}

function DateField({ label, value, onChange }: { label: string; value: DateParts; onChange: (value: DateParts) => void }) {
  return (
    <fieldset className={styles.field}>
      <legend>{label}</legend>
      <div className={styles.dateFields}>
        <div className={styles.selectWrap}>
          <select aria-label={`${label} month`} value={value.month} onChange={(e) => onChange({ ...value, month: e.target.value })}>
            <option value="">Month</option>
            {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
          </select>
          <img src="/figma-medication/chevron-date.svg" width={20} height={20} alt="" />
        </div>
        <input aria-label={`${label} day`} placeholder="Day" inputMode="numeric" maxLength={2} value={value.day} onChange={(e) => onChange({ ...value, day: e.target.value })} />
        <input aria-label={`${label} year`} placeholder="Year" inputMode="numeric" maxLength={4} value={value.year} onChange={(e) => onChange({ ...value, year: e.target.value })} />
      </div>
    </fieldset>
  );
}

export default function AddMedicationPage() {
  const router = useRouter();
  const { medicationPool, people, addMedicationToPool } = useCareData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  const [step, setStep] = useState<"search" | "information" | "prescription">("search");
  const [recipient, setRecipient] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [times, setTimes] = useState([{ time: "12:00", period: "AM" }]);
  const [rx, setRx] = useState("");
  const [strength, setStrength] = useState("");
  const [unit, setUnit] = useState("mg");
  const [startDate, setStartDate] = useState(emptyDate);
  const [endDate, setEndDate] = useState(emptyDate);
  const [expiryDate, setExpiryDate] = useState(emptyDate);
  const [refills, setRefills] = useState("");
  const [assignedSlug, setAssignedSlug] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRecipient(params.get("recipient") ?? "");
  }, []);

  const matches = [...new Set([...medicationCatalog, ...medicationPool.map(({ medication }) => medication.name)])]
    .filter((name) => name.toLowerCase().includes(query.trim().toLowerCase()));
  const person = recipient ? people.find(({ name }) => name.toLowerCase() === recipient.toLowerCase()) : people.find(({ slug }) => slug === assignedSlug);
  const information = selected.toLowerCase().startsWith("cephalexin") ? cephalexinInformation : [];

  function selectMedication(name: string) {
    setSelected(name);
    setQuery(name);
    setStep("information");
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === "information") setStep("search");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const expiry = parseDate(expiryDate);
    if (!start || end === null || expiry === null) { setError("Enter valid dates, including a start date."); return; }
    if (end && end < start) { setError("End date must be on or after the start date."); return; }
    if (!person) { setError("Select a care recipient before saving."); return; }
    const scheduledTimes: string[] = [];
    for (const { time, period } of times) {
      const match = time.match(/^(\d{1,2}):(\d{2})$/);
      if (!match || Number(match[1]) < 1 || Number(match[1]) > 12 || Number(match[2]) > 59) { setError("Enter scheduled times in 12-hour format, such as 8:30."); return; }
      const hour = Number(match[1]) % 12 + (period === "PM" ? 12 : 0);
      scheduledTimes.push(`${String(hour).padStart(2, "0")}:${match[2]}`);
    }
    if (new Set(scheduledTimes).size !== scheduledTimes.length) { setError("Each scheduled time must be different."); return; }
    addMedicationToPool({
      name: selected, dose: dosage.trim(), frequency: frequency.trim(), time: scheduledTimes[0], scheduledTimes,
      days: ["Every day"], startDate: start, endDate: end || undefined, expiryDate: expiry || undefined,
      prescriptionNumber: rx.trim(), strength: strength ? `${strength} ${unit}` : "", refills: refills ? Number(refills) : undefined,
      instructions: "", notes: "",
    }, [person.slug]);
    router.push(`/home/${person.slug}`);
  }

  return (
    <main className={`${styles.screen} ${step === "prescription" ? styles.prescriptionScreen : ""} ${allerta.className}`}>
      <section className={styles.content} aria-labelledby="add-medication-title">
        <h1 id="add-medication-title" className={step === "prescription" ? styles.medicationTitle : ""}>{step === "prescription" ? selected : "Add Medication"}</h1>
        {step !== "prescription" ? <>
          <form className={styles.search} onSubmit={search} role="search">
            <input type="search" aria-label="Search by medication name" placeholder="Search by medication name" value={query} onChange={(e) => { setQuery(e.target.value); setStep("search"); }} autoComplete="off" />
            <button type="submit" aria-label="Search medications"><img src="/figma-medication/ai-search.svg" width={25} height={20} alt="" /></button>
          </form>
          {step === "search" && query.trim() ? <div className={styles.suggestions} aria-label="Medication suggestions">
            {matches.map((name) => <button type="button" key={name} onClick={() => selectMedication(name)}>{name}</button>)}
            {!matches.length ? <button type="button" onClick={() => selectMedication(query.trim())}>Add “{query.trim()}”</button> : null}
          </div> : null}
          {step === "information" ? <div className={styles.information}>
            <div className={styles.informationSections}>
              {information.length ? information.map(({ title, text }) => <section key={title}><h2>{title}</h2><p>{text}</p></section>) : <p>Medication information is unavailable for this medication. Continue to enter the prescription details.</p>}
            </div>
            <button className={styles.primary} type="button" onClick={() => setStep("prescription")}>Next</button>
          </div> : null}
        </> : <form className={styles.prescriptionForm} onSubmit={save}>
          <label className={styles.field}>Dosage<input required placeholder="Enter dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} /></label>
          <label className={styles.field}>Frequency<input required placeholder="Enter frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} /></label>
          <fieldset className={styles.field}><legend>Scheduled Time</legend><div className={styles.timeFields}>
            {times.map(({ time, period }, index) => <div className={styles.control} key={index}>
              <input aria-label={`Scheduled time ${index + 1}`} required value={time} placeholder="12:00" inputMode="numeric" onChange={(e) => setTimes((current) => current.map((entry, i) => i === index ? { ...entry, time: e.target.value } : entry))} />
              <div className={styles.smallSelect}><select aria-label={`Scheduled time ${index + 1} AM or PM`} value={period} onChange={(e) => setTimes((current) => current.map((entry, i) => i === index ? { ...entry, period: e.target.value } : entry))}><option>AM</option><option>PM</option></select><img src="/figma-medication/chevron-small.svg" width={14} height={14} alt="" /></div>
              {index > 0 ? <button className={styles.removeTime} type="button" aria-label={`Remove scheduled time ${index + 1}`} onClick={() => setTimes((current) => current.filter((_, i) => i !== index))}>×</button> : null}
            </div>)}
            <button className={`${styles.primary} ${styles.addTime}`} type="button" onClick={() => setTimes((current) => [...current, { time: "12:00", period: "PM" }])}>+ Add Scheduled Time</button>
          </div></fieldset>
          <label className={styles.field}>Prescription/Rx Number<input placeholder="Enter prescription/Rx number" value={rx} onChange={(e) => setRx(e.target.value)} /></label>
          <label className={styles.field}>Strength<div className={styles.control}><input aria-label="Strength" type="number" min="0" step="any" placeholder="Enter strength" value={strength} onChange={(e) => setStrength(e.target.value)} /><div className={styles.smallSelect}><select aria-label="Strength unit" value={unit} onChange={(e) => setUnit(e.target.value)}><option>mg</option><option>mcg</option><option>g</option><option>mL</option><option>IU</option></select><img src="/figma-medication/chevron-small.svg" width={14} height={14} alt="" /></div></div></label>
          <DateField label="Start Date" value={startDate} onChange={setStartDate} />
          <DateField label="End Date" value={endDate} onChange={setEndDate} />
          <label className={styles.field}>Number of Refills<input type="number" min="0" step="1" placeholder="Enter number" value={refills} onChange={(e) => setRefills(e.target.value)} /></label>
          <DateField label="Expiry Date" value={expiryDate} onChange={setExpiryDate} />
          {!recipient ? <label className={styles.field}>Care Recipient<select required value={assignedSlug} onChange={(e) => setAssignedSlug(e.target.value)}><option value="">Select a care recipient</option>{people.map(({ slug, name }) => <option key={slug} value={slug}>{name}</option>)}</select></label> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button className={styles.primary} type="submit">Save Medication</button>
        </form>}
      </section>
    </main>
  );
}
