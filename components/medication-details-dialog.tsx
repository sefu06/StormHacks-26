"use client";

import { useEffect, useRef } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MedicationStatus, ScheduleMedication } from "@/lib/care-data";

type MedicationDetailsDialogProps = {
  medication: ScheduleMedication | null;
  personName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
};

const statusCopy: Record<MedicationStatus, string> = {
  taken: "Marked taken today",
  missed: "Missed today",
  upcoming: "Not taken yet today",
};

function formatDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00`);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

export function MedicationDetailsDialog({
  medication,
  personName,
  open,
  onOpenChange,
  onEdit,
}: MedicationDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const close = () => onOpenChange(false);

  return (
    <dialog
      ref={dialogRef}
      className="medication-details-dialog"
      aria-labelledby="medication-details-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onClose={close}
    >
      <div className="medication-details-dialog-shell">
        <header className="medication-details-dialog-header">
          <div className="medication-details-dialog-header-copy">
            <p className="medication-dialog-kicker">Medication details</p>
            <h2 id="medication-details-dialog-title">{medication?.name ?? "Medication"}</h2>
            <p>Applied to {personName}</p>
          </div>
          {medication ? (
            <Button className="medication-details-edit-button" variant="outline" size="sm" onClick={onEdit}>
              <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
              Edit details
            </Button>
          ) : null}
        </header>

        {medication ? (
          <>
            <p className={`medication-detail-status medication-detail-status-${medication.status}`}>
              {statusCopy[medication.status]}
            </p>

            <dl className="medication-detail-list">
              <div>
                <dt>Dose</dt>
                <dd>{medication.dose}</dd>
              </div>
              <div>
                <dt>Frequency</dt>
                <dd>{medication.frequency}</dd>
              </div>
              <div>
                <dt>Schedule</dt>
                <dd>{medication.time}, {medication.days.join(", ")}</dd>
              </div>
              <div>
                <dt>Start date</dt>
                <dd>{formatDate(medication.startDate)}</dd>
              </div>
            </dl>

            <div className="medication-detail-copy">
              <div>
                <p>Instructions</p>
                <span>{medication.instructions || "No instructions added"}</span>
              </div>
              <div>
                <p>Notes</p>
                <span>{medication.notes || "No notes added"}</span>
              </div>
            </div>

          </>
        ) : null}
      </div>
    </dialog>
  );
}
