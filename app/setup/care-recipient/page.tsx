"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCareData } from "@/components/care-data-provider";

const initialConditions = ["ADHD", "High cholesterol"];
const initialAllergies = ["Cephalexin", "Tree nuts"];

function SelectField({
  value,
  onChange,
  children,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="care-recipient-setup-select">
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      <img src="/figma-setup/chevron-down-context.svg" width="20" height="20" alt="" aria-hidden="true" />
    </div>
  );
}

function TagField({
  label,
  tags,
  onRemove,
  onAdd,
}: {
  label: string;
  tags: string[];
  onRemove: (tag: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="care-recipient-setup-group">
      <label>{label}</label>
      <div className="care-recipient-setup-tag-field">
        <div className="care-recipient-setup-tags">
          {tags.length > 0 ? tags.map((tag) => (
              <span className="care-recipient-setup-tag" key={tag}>
                <button type="button" onClick={() => onRemove(tag)} aria-label={`Remove ${tag}`}>
                  <img src="/figma-setup/tag-plus.svg" width="14" height="14" alt="" aria-hidden="true" />
                </button>
                {tag}
              </span>
            )) : (
              <span className="care-recipient-setup-placeholder">
                {label === "Conditions" ? "Add a condition" : "Add an allergy"}
              </span>
            )}
        </div>
        <button type="button" className="care-recipient-setup-add" onClick={onAdd} aria-label={`Add ${label.toLowerCase()}`}>
          <img src="/figma-setup/add-plus.svg" width="18" height="18" alt="" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export default function CareRecipientSetupPage() {
  const router = useRouter();
  const { addCarePerson } = useCareData();
  const [name, setName] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [sex, setSex] = useState("");
  const [pregnant, setPregnant] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("filled") !== "1") return;

    setName("Alexi Manning");
    setMonth("December");
    setDay("22");
    setYear("2005");
    setSex("Female");
    setPregnant("No");
    setBloodType("O+");
    setHeight("5’3");
    setWeight("80");
    setConditions(initialConditions);
    setAllergies(initialAllergies);
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    addCarePerson(name, [
      { title: "Basic details", items: [
        { label: "Full name", value: name.trim() },
        { label: "Date of birth", value: [month, day, year].filter(Boolean).join(" ") || "Not added yet" },
        { label: "Sex", value: sex || "Not added yet" },
        { label: "Pregnancy status", value: pregnant || "Not added yet" },
        { label: "Blood type", value: bloodType || "Not added yet" },
        { label: "Height", value: height ? `${height} cm` : "Not added yet" },
        { label: "Weight", value: weight ? `${weight} kg` : "Not added yet" },
      ] },
      { title: "Medication context", items: [
        { label: "Conditions", value: conditions.join(", ") || "Not added yet" },
        { label: "Allergies", value: allergies.join(", ") || "Not added yet" },
      ] },
    ]);
    router.push(`/medications/add?recipient=${encodeURIComponent(name.trim())}`);
  };

  const addCondition = () => {
    const nextCondition = ["Hypertension", "Osteoarthritis", "Diabetes"].find((item) => !conditions.includes(item));
    if (nextCondition) setConditions((current) => [...current, nextCondition]);
  };

  const addAllergy = () => {
    const nextAllergy = ["Penicillin", "Latex", "Sulfa drugs"].find((item) => !allergies.includes(item));
    if (nextAllergy) setAllergies((current) => [...current, nextAllergy]);
  };

  return (
    <main className="care-recipient-setup-screen">
      <div className="care-recipient-setup-page">
        <img
          className="care-recipient-setup-photo"
          src="/figma-setup/camera-group.svg"
          width="100"
          height="100"
          alt=""
          aria-hidden="true"
        />

        <form className="care-recipient-setup-form" onSubmit={submit}>
          <div className="care-recipient-setup-group care-recipient-setup-name">
            <label htmlFor="setup-name">Name</label>
            <input id="setup-name" required pattern={".*\\S.*"} placeholder="Enter name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>

          <div className="care-recipient-setup-group">
            <label>Date of Birth</label>
            <div className="care-recipient-setup-date-fields">
              <SelectField label="Birth month" value={month} onChange={setMonth}>
                <option value="">Month</option>
                {[
                  "January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December",
                ].map((option) => <option key={option}>{option}</option>)}
              </SelectField>
              <input aria-label="Birth day" inputMode="numeric" value={day} onChange={(event) => setDay(event.target.value)} />
              <input aria-label="Birth year" inputMode="numeric" value={year} onChange={(event) => setYear(event.target.value)} />
            </div>
          </div>

          <div className="care-recipient-setup-group">
            <label>Sex</label>
            <SelectField label="Sex" value={sex} onChange={setSex}>
              <option value="">Select an option</option>
              <option>Female</option>
              <option>Male</option>
              <option>Other</option>
            </SelectField>
          </div>

          <div className="care-recipient-setup-pregnancy">
            <label htmlFor="setup-pregnant">Care recipient is pregnant?</label>
            <SelectField label="Pregnancy status" value={pregnant} onChange={setPregnant}>
              <option value="">Select</option>
              <option>No</option>
              <option>Yes</option>
              <option>Not applicable</option>
            </SelectField>
          </div>

          <div className="care-recipient-setup-group">
            <label>Blood Type</label>
            <SelectField label="Blood type" value={bloodType} onChange={setBloodType}>
              <option value="">Select an option</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((option) => <option key={option}>{option}</option>)}
            </SelectField>
          </div>

          <div className="care-recipient-setup-group">
            <label htmlFor="setup-height">Height</label>
            <div className="care-recipient-setup-unit-field">
              <input id="setup-height" placeholder="Enter height" value={height} onChange={(event) => setHeight(event.target.value)} />
              <span>cm</span>
            </div>
          </div>

          <div className="care-recipient-setup-group">
            <label htmlFor="setup-weight">Weight</label>
            <div className="care-recipient-setup-unit-field">
              <input id="setup-weight" inputMode="decimal" placeholder="Enter weight" value={weight} onChange={(event) => setWeight(event.target.value)} />
              <span>kg</span>
            </div>
          </div>

          <TagField
            label="Conditions"
            tags={conditions}
            onRemove={(tag) => setConditions((current) => current.filter((item) => item !== tag))}
            onAdd={addCondition}
          />

          <TagField
            label="Allergies"
            tags={allergies}
            onRemove={(tag) => setAllergies((current) => current.filter((item) => item !== tag))}
            onAdd={addAllergy}
          />

          <button className="care-recipient-setup-save" type="submit">Save and Continue</button>
        </form>
      </div>
    </main>
  );
}
