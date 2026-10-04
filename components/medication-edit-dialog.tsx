"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { MedicationStatus, ScheduleMedication } from "@/lib/care-data";

type MedicationEditDialogProps = {
  medication: ScheduleMedication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (medication: ScheduleMedication) => void;
};

type EditableMedication = {
  name: string;
  dose: string;
  frequency: string;
  time: string;
  days: string;
  startDate: string;
  instructions: string;
  notes: string;
  status: MedicationStatus;
};

function toEditableMedication(medication: ScheduleMedication | null): EditableMedication {
  return {
    name: medication?.name ?? "",
    dose: medication?.dose ?? "",
    frequency: medication?.frequency ?? "Once daily",
    time: medication?.time ?? "09:00 AM",
    days: medication?.days.join(", ") ?? "Every day",
    startDate: medication?.startDate ?? "2026-10-03",
    instructions: medication?.instructions ?? "",
    notes: medication?.notes ?? "",
    status: medication?.status ?? "upcoming",
  };
}

export function MedicationEditDialog({ medication, open, onOpenChange, onSave }: MedicationEditDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<EditableMedication>(() => toEditableMedication(medication));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) setDraft(toEditableMedication(medication));
  }, [medication, open]);

  const updateDraft = <K extends keyof EditableMedication>(key: K, value: EditableMedication[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const close = () => onOpenChange(false);

  const save = () => {
    if (!medication || draft.name.trim().length === 0 || draft.dose.trim().length === 0) return;

    onSave({
      ...medication,
      name: draft.name.trim(),
      dose: draft.dose.trim(),
      frequency: draft.frequency,
      time: draft.time,
      days: draft.days.split(",").map((day) => day.trim()).filter(Boolean),
      startDate: draft.startDate,
      instructions: draft.instructions.trim(),
      notes: draft.notes.trim(),
      status: draft.status,
    });
    close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="medication-edit-dialog"
      aria-labelledby="medication-edit-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onClose={close}
    >
      <div className="medication-edit-dialog-shell">
        <header className="medication-edit-dialog-header">
          <p className="medication-dialog-kicker">Medication details</p>
          <h2 id="medication-edit-dialog-title">Edit medication</h2>
          <p className="medication-edit-dialog-intro">Update the caregiver-entered details for this medication.</p>
        </header>

        <div className="medication-form-grid medication-edit-form-grid">
          <label className="medication-field medication-field-wide">
            <span>Medication name</span>
            <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} autoFocus />
          </label>
          <label className="medication-field">
            <span>Dose</span>
            <input value={draft.dose} onChange={(event) => updateDraft("dose", event.target.value)} />
          </label>
          <label className="medication-field">
            <span>Frequency</span>
            <select value={draft.frequency} onChange={(event) => updateDraft("frequency", event.target.value)}>
              <option>Once daily</option>
              <option>Twice daily</option>
              <option>As needed</option>
            </select>
          </label>
          <label className="medication-field">
            <span>Time</span>
            <input type="text" value={draft.time} onChange={(event) => updateDraft("time", event.target.value)} placeholder="e.g. 9:00 AM" />
          </label>
          <label className="medication-field">
            <span>Start date</span>
            <input type="date" value={draft.startDate} onChange={(event) => updateDraft("startDate", event.target.value)} />
          </label>
          <label className="medication-field medication-field-wide">
            <span>Days</span>
            <input value={draft.days} onChange={(event) => updateDraft("days", event.target.value)} placeholder="e.g. Every day" />
          </label>
          <label className="medication-field medication-field-wide">
            <span>Instructions <em>Optional</em></span>
            <input value={draft.instructions} onChange={(event) => updateDraft("instructions", event.target.value)} placeholder="e.g. Take with food" />
          </label>
          <label className="medication-field medication-field-wide">
            <span>Notes <em>Optional</em></span>
            <textarea value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} rows={3} placeholder="e.g. After dinner" />
          </label>
          <label className="medication-field medication-field-wide">
            <span>Today’s status</span>
            <select value={draft.status} onChange={(event) => updateDraft("status", event.target.value as MedicationStatus)}>
              <option value="taken">Marked taken</option>
              <option value="missed">Missed</option>
              <option value="upcoming">Not taken yet</option>
            </select>
          </label>
        </div>

        <div className="medication-dialog-actions">
          <Button type="button" className="medication-dialog-action-button medication-back-button" variant="outline" onClick={close}>Cancel</Button>
          <Button className="medication-dialog-action-button medication-next-button" onClick={save} disabled={!draft.name.trim() || !draft.dose.trim()}>Save changes</Button>
        </div>
      </div>
    </dialog>
  );
}
