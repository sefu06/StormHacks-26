"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, ChevronRight, Clock3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCareData } from "@/components/care-data-provider";
import { carePeopleList, demoToday, type PersonSlug, type ScheduleMedication } from "@/lib/care-data";

type MissedMedicationLog = {
  id: string;
  date: string;
  time: string;
  personName: string;
  personSlug: PersonSlug;
  initials: string;
  avatarClass: string;
  medicationName: string;
  dose: string;
  medication: ScheduleMedication;
};

function formatDateLabel(date: string) {
  if (date === demoToday) return "Today";
  if (date === "2026-10-02") return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

export function MissedMedicationNotifications() {
  const { getSchedule, updateMedication } = useCareData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<MissedMedicationLog | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const missedMedicationLog = useMemo<MissedMedicationLog[]>(() => (
    carePeopleList
      .flatMap((person) => Object.keys(person.scheduleByDate).flatMap((date) => (
        getSchedule(person, date)
          .filter(({ status }) => status === "missed")
          .map((medication) => ({
            id: `${person.slug}-${date}-${medication.id}`,
            date,
            time: medication.time,
            personName: person.name,
            personSlug: person.slug,
            initials: person.initials,
            avatarClass: person.avatarClass,
            medicationName: medication.name,
            dose: medication.dose,
            medication,
          }))
      )))
      .sort((first, second) => {
        if (first.date !== second.date) return second.date.localeCompare(first.date);
        return first.time.localeCompare(second.time);
      })
  ), [getSchedule]);

  const currentMissedCount = missedMedicationLog.filter(({ date }) => date === demoToday).length;

  const markSelectedEntryTaken = () => {
    if (!selectedEntry) return;

    const person = carePeopleList.find(({ slug }) => slug === selectedEntry.personSlug);
    if (!person) return;

    updateMedication(person, selectedEntry.date, {
      ...selectedEntry.medication,
      status: "taken",
    });
    setSelectedEntry(null);
    setIsOpen(false);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <div className="notification-menu">
      <Button
        className="notification-trigger"
        variant="ghost"
        size="icon"
        aria-label="Open missed medications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          setSelectedEntry(null);
          setIsOpen((open) => !open);
        }}
      >
        <Bell size={20} strokeWidth={1.8} aria-hidden="true" />
        {currentMissedCount > 0 ? (
          <span className="notification-count" aria-hidden="true">{currentMissedCount}</span>
        ) : null}
      </Button>

      <dialog
        ref={dialogRef}
        className="notification-dialog"
        aria-label={selectedEntry ? "Missed medication details" : undefined}
        aria-labelledby={selectedEntry ? undefined : "notification-dialog-title"}
        onCancel={(event) => {
          event.preventDefault();
          setIsOpen(false);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}
        onClose={() => {
          setSelectedEntry(null);
          setIsOpen(false);
        }}
      >
        <div className="notification-dialog-shell">
          {selectedEntry ? (
            <div className="notification-detail-view">
              <div className="notification-detail-topbar">
                <button
                  className="notification-detail-back"
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                >
                  <ArrowLeft size={17} strokeWidth={1.8} aria-hidden="true" />
                  Missed medications
                </button>
                <Button className="notification-detail-mark-button" size="sm" onClick={markSelectedEntryTaken}>
                  Mark as taken
                </Button>
              </div>

              <div className="notification-detail-heading">
                <span className={`notification-detail-avatar ${selectedEntry.avatarClass}`} aria-hidden="true">
                  {selectedEntry.initials}
                </span>
                <div>
                  <p className="notification-detail-person">{selectedEntry.personName}</p>
                  <h2>{selectedEntry.medicationName}</h2>
                  <p className="notification-detail-time">{formatDateLabel(selectedEntry.date)} at {selectedEntry.time}</p>
                </div>
              </div>

              <dl className="medication-detail-list">
                <div>
                  <dt>Dose</dt>
                  <dd>{selectedEntry.medication.dose}</dd>
                </div>
                <div>
                  <dt>Frequency</dt>
                  <dd>{selectedEntry.medication.frequency}</dd>
                </div>
                <div>
                  <dt>Scheduled for</dt>
                  <dd>{selectedEntry.medication.time}</dd>
                </div>
                <div>
                  <dt>Start date</dt>
                  <dd>{selectedEntry.medication.startDate}</dd>
                </div>
              </dl>

              <div className="notification-detail-copy">
                <div>
                  <p>Instructions</p>
                  <span>{selectedEntry.medication.instructions || "No instructions added"}</span>
                </div>
                <div>
                  <p>Notes</p>
                  <span>{selectedEntry.medication.notes || "No notes added"}</span>
                </div>
              </div>

            </div>
          ) : (
            <>
              <div className="notification-panel-header">
                <h2 id="notification-dialog-title">Missed medications</h2>
              </div>

              {missedMedicationLog.length > 0 ? (
                <div className="notification-log" role="list" aria-label="Missed medications">
                  {missedMedicationLog.map((entry) => (
                    <button
                      className="notification-log-entry"
                      type="button"
                      key={entry.id}
                      role="listitem"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <span className={`notification-log-avatar ${entry.avatarClass}`} aria-hidden="true">
                        {entry.initials}
                      </span>
                      <span className="notification-log-copy">
                        <span className="notification-log-person">{entry.personName}</span>
                        <span className="notification-log-medication">
                          {entry.medicationName}, {entry.dose}
                        </span>
                        <span className="notification-log-time">
                          <Clock3 size={13} strokeWidth={1.8} aria-hidden="true" />
                          {formatDateLabel(entry.date)} at {entry.time}
                        </span>
                      </span>
                      <ChevronRight className="notification-log-chevron" size={17} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="notification-empty">
                  <Bell size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span>No missed medications</span>
                </div>
              )}
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
