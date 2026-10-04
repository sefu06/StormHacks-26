"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, ChevronLeft, FilePenLine } from "lucide-react";

import { useCareData, type MedicationPoolRecord } from "@/components/care-data-provider";
import { Button } from "@/components/ui/button";

const weekdayOptions = [
  { label: "M", value: "mon" },
  { label: "T", value: "tue" },
  { label: "W", value: "wed" },
  { label: "T", value: "thu" },
  { label: "F", value: "fri" },
  { label: "S", value: "sat" },
  { label: "S", value: "sun" },
];

export type MedicationDraft = {
  name: string;
  dose: string;
  frequency: string;
  time: string;
  days: string[];
  startDate: string;
  instructions: string;
  notes: string;
};

type MedicationDialogProps = {
  initialName?: string;
  open: boolean;
  people: string[];
  onOpenChange: (open: boolean) => void;
  onSave: (draft: MedicationDraft, assignedPeople: string[]) => void;
};

type Step = "choose" | "scan" | "details" | "schedule" | "notes" | "review" | "assign";

const initialDraft: MedicationDraft = {
  name: "",
  dose: "",
  frequency: "Once daily",
  time: "09:00",
  days: weekdayOptions.map(({ value }) => value),
  startDate: "2026-10-03",
  instructions: "",
  notes: "",
};

function StepPills({ step }: { step: Step }) {
  const steps = [
    ["details", "Details"],
    ["schedule", "Schedule"],
    ["notes", "Notes"],
    ["review", "Review"],
    ["assign", "Assign"],
  ] as const;
  const activeIndex = Math.max(0, steps.findIndex(([value]) => value === step));

  if (step === "choose" || step === "scan") return null;

  return (
    <div className="medication-step-pills" aria-label="Medication setup progress">
      {steps.map(([value, label], index) => (
        <span key={value} className={index <= activeIndex ? "medication-step-pill medication-step-pill-active" : "medication-step-pill"}>
          {index < activeIndex ? <Check size={13} strokeWidth={1.8} aria-hidden="true" /> : null}
          {label}
        </span>
      ))}
    </div>
  );
}

function formatTimeInput(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time;

  let hour = Number(match[1]);
  const period = match[3].toUpperCase();

  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour < 12) hour += 12;

  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export function MedicationDialog({ open, people, onOpenChange, onSave, initialName = "" }: MedicationDialogProps) {
  const { medicationPool } = useCareData();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("choose");
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [draft, setDraft] = useState<MedicationDraft>(initialDraft);
  const [selectedSavedMedicationId, setSelectedSavedMedicationId] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setStep(initialName ? "details" : "choose");
      setSelectedPeople([]);
      setDraft({ ...initialDraft, name: initialName });
      setSelectedSavedMedicationId(null);
    }
  }, [open, initialName]);

  const updateDraft = <K extends keyof MedicationDraft>(key: K, value: MedicationDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleDay = (day: string) => {
    updateDraft(
      "days",
      draft.days.includes(day) ? draft.days.filter((value) => value !== day) : [...draft.days, day],
    );
  };

  const close = () => onOpenChange(false);
  const goBack = () => {
    const previous: Partial<Record<Step, Step>> = {
      scan: "choose",
      details: "choose",
      schedule: "details",
      notes: "schedule",
      review: "notes",
      assign: "review",
    };
    setStep(previous[step] ?? "choose");
  };

  const canContinueFromDetails = draft.name.trim().length > 0 && draft.dose.trim().length > 0;
  const canContinueFromSchedule = draft.time.length > 0 && draft.days.length > 0;
  const matchingSavedMedications = draft.name.trim() && !selectedSavedMedicationId
    ? medicationPool.filter(({ medication }) => medication.name.toLowerCase().includes(draft.name.trim().toLowerCase())).slice(0, 4)
    : [];

  const selectSavedMedication = (record: MedicationPoolRecord) => {
    const medication = record.medication;

    setDraft({
      name: medication.name,
      dose: medication.dose,
      frequency: medication.frequency,
      time: formatTimeInput(medication.time),
      days: [...medication.days],
      startDate: medication.startDate,
      instructions: medication.instructions,
      notes: medication.notes,
    });
    setSelectedSavedMedicationId(record.id);
  };

  const togglePerson = (person: string) => {
    setSelectedPeople((current) => current.includes(person)
      ? current.filter((value) => value !== person)
      : [...current, person]);
  };

  return (
    <dialog
      ref={dialogRef}
      className="medication-dialog"
      aria-labelledby="medication-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onClose={close}
    >
      <div className="medication-dialog-shell">
        <header className="medication-dialog-header">
          <div>
            <h2 id="medication-dialog-title">Add medication</h2>
          </div>
        </header>

        <StepPills step={step} />

        {step === "choose" ? (
          <div className="medication-dialog-body">
            <p className="medication-dialog-intro">Add the medication to your pool first. You can assign it after saving.</p>
            <div className="medication-method-list">
              <button type="button" className="medication-method-card" onClick={() => setStep("scan")}>
                <span className="medication-method-icon medication-method-icon-blue" aria-hidden="true">
                  <Camera size={22} strokeWidth={1.8} />
                </span>
                <span className="medication-method-copy">
                  <strong>Scan label</strong>
                  <span>Use the camera to read the medication label.</span>
                </span>
                <span className="medication-method-arrow" aria-hidden="true">›</span>
              </button>
              <button type="button" className="medication-method-card" onClick={() => setStep("details")}>
                <span className="medication-method-icon medication-method-icon-lavender" aria-hidden="true">
                  <FilePenLine size={22} strokeWidth={1.8} />
                </span>
                <span className="medication-method-copy">
                  <strong>Manual entry</strong>
                  <span>Enter the details yourself.</span>
                </span>
                <span className="medication-method-arrow" aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        ) : null}

        {step === "scan" ? (
          <div className="medication-dialog-body medication-scan-state">
            <div className="medication-empty-icon" aria-hidden="true">
              <Camera size={28} strokeWidth={1.8} />
            </div>
            <h3>Scan label</h3>
            <p>Camera scanning is planned for a future version of CareCompanion. You can continue by entering the details manually.</p>
            <Button onClick={() => setStep("details")}>Continue manually</Button>
            <Button type="button" variant="outline" onClick={goBack}>Choose another method</Button>
          </div>
        ) : null}

        {step === "details" ? (
          <div className="medication-dialog-body">
            <div className="medication-form-grid">
              <label className="medication-field medication-field-wide">
                <span>Medication name</span>
                <input
                  value={draft.name}
                  onChange={(event) => {
                    setSelectedSavedMedicationId(null);
                    updateDraft("name", event.target.value);
                  }}
                  placeholder="e.g. Lisinopril"
                  autoFocus
                  aria-autocomplete="list"
                  aria-controls={matchingSavedMedications.length > 0 ? "saved-medication-suggestions" : undefined}
                  aria-expanded={matchingSavedMedications.length > 0}
                />
                {matchingSavedMedications.length > 0 ? (
                  <div className="medication-saved-suggestions" id="saved-medication-suggestions">
                    <span className="medication-saved-suggestions-label">Saved medications</span>
                    {matchingSavedMedications.map((record) => (
                      <button
                        className="medication-saved-suggestion"
                        type="button"
                        key={record.id}
                        onClick={() => selectSavedMedication(record)}
                      >
                        <span>
                          <strong>{record.medication.name}</strong>
                          <span>{record.medication.dose}, {record.medication.frequency}</span>
                        </span>
                        <span aria-hidden="true">Use</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </label>
              <label className="medication-field">
                <span>Dose</span>
                <input value={draft.dose} onChange={(event) => updateDraft("dose", event.target.value)} placeholder="e.g. 10 mg" />
              </label>
              <label className="medication-field">
                <span>Frequency</span>
                <select value={draft.frequency} onChange={(event) => updateDraft("frequency", event.target.value)}>
                  <option>Once daily</option>
                  <option>Twice daily</option>
                  <option>As needed</option>
                </select>
              </label>
              <label className="medication-field medication-field-wide">
                <span>Instructions <em>Optional</em></span>
                <input value={draft.instructions} onChange={(event) => updateDraft("instructions", event.target.value)} placeholder="e.g. Take with food" />
              </label>
            </div>
            <div className="medication-dialog-actions">
              <Button className="medication-dialog-action-button medication-back-button" variant="outline" onClick={goBack}>
                <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
                Back
              </Button>
              <Button
                className="medication-dialog-action-button medication-next-button"
                onClick={() => setStep("schedule")}
                disabled={!canContinueFromDetails}
              >
                Set schedule
              </Button>
            </div>
          </div>
        ) : null}

        {step === "schedule" ? (
          <div className="medication-dialog-body">
            <div className="medication-form-grid">
              <label className="medication-field">
                <span>Time</span>
                <input type="time" value={draft.time} onChange={(event) => updateDraft("time", event.target.value)} />
              </label>
              <label className="medication-field">
                <span>Start date</span>
                <input type="date" value={draft.startDate} onChange={(event) => updateDraft("startDate", event.target.value)} />
              </label>
              <fieldset className="medication-field medication-field-wide">
                <legend>Days</legend>
                <div className="medication-day-list">
                  {weekdayOptions.map(({ label, value }, index) => (
                    <label key={`${value}-${index}`} className={draft.days.includes(value) ? "medication-day medication-day-selected" : "medication-day"}>
                      <input type="checkbox" checked={draft.days.includes(value)} onChange={() => toggleDay(value)} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="medication-dialog-actions">
              <Button className="medication-dialog-action-button medication-back-button" variant="outline" onClick={goBack}>
                <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
                Back
              </Button>
              <Button className="medication-dialog-action-button medication-next-button" onClick={() => setStep("notes")} disabled={!canContinueFromSchedule}>Add notes</Button>
            </div>
          </div>
        ) : null}

        {step === "notes" ? (
          <div className="medication-dialog-body">
            <label className="medication-field">
              <span>Notes <em>Optional</em></span>
              <textarea value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} placeholder="e.g. Take with breakfast" rows={5} autoFocus />
            </label>
            <div className="medication-dialog-actions">
              <Button className="medication-dialog-action-button medication-back-button" variant="outline" onClick={goBack}>
                <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
                Back
              </Button>
              <Button className="medication-dialog-action-button medication-next-button" onClick={() => setStep("review")}>Review &amp; save</Button>
            </div>
          </div>
        ) : null}

        {step === "review" ? (
          <div className="medication-dialog-body">
            <p className="medication-dialog-intro">Review the details before adding this medication to your pool.</p>
            <div className="medication-review-card">
              <div><span>Medication</span><strong>{draft.name}</strong></div>
              <div><span>Dose &amp; frequency</span><strong>{draft.dose}, {draft.frequency}</strong></div>
              <div><span>Schedule</span><strong>{draft.time}, {draft.days.length} days a week</strong></div>
              {draft.instructions ? <div><span>Instructions</span><strong>{draft.instructions}</strong></div> : null}
              {draft.notes ? <div><span>Notes</span><strong>{draft.notes}</strong></div> : null}
            </div>
            <div className="medication-dialog-actions">
              <Button className="medication-dialog-action-button medication-back-button" variant="outline" onClick={goBack}>
                <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
                Back
              </Button>
              <Button className="medication-dialog-action-button medication-next-button" onClick={() => setStep("assign")}>Save to pool</Button>
            </div>
          </div>
        ) : null}

        {step === "assign" ? (
          <div className="medication-dialog-body">
            <div>
              <p className="medication-dialog-intro">Who should receive this medication?</p>
              <p className="medication-assignment-hint">Select one or both people in your care.</p>
            </div>
            <div className="medication-person-list">
              {people.map((person, index) => {
                const isSelected = selectedPeople.includes(person);

                return (
                  <button
                    key={person}
                    type="button"
                    className={isSelected ? "medication-person-choice medication-person-choice-selected" : "medication-person-choice"}
                    aria-pressed={isSelected}
                    onClick={() => togglePerson(person)}
                  >
                    <span className={index === 0 ? "medication-person-avatar medication-person-avatar-peach" : "medication-person-avatar medication-person-avatar-lavender"} aria-hidden="true">
                      {person.charAt(0)}
                    </span>
                    <span>{person}</span>
                    <span className="medication-person-choice-indicator" aria-hidden="true">
                      {isSelected ? <Check size={16} strokeWidth={1.8} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="medication-dialog-actions">
              <Button className="medication-dialog-action-button medication-back-button" variant="outline" onClick={goBack}>
                <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
                Back
              </Button>
              <div className="medication-assignment-actions">
                <Button
                  className="medication-dialog-action-button"
                  variant="outline"
                  onClick={() => {
                    onSave(draft, selectedPeople);
                    setStep("choose");
                    setSelectedPeople([]);
                    setDraft(initialDraft);
                    setSelectedSavedMedicationId(null);
                  }}
                  disabled={selectedPeople.length === 0}
                >
                  Add another
                </Button>
                <Button
                  className="medication-dialog-action-button"
                  onClick={() => { onSave(draft, selectedPeople); close(); }}
                  disabled={selectedPeople.length === 0}
                >
                  Assign medication
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
