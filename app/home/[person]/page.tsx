"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, ShieldCheck, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { useCareData } from "@/components/care-data-provider";
import { MedicationDetailsDialog } from "@/components/medication-details-dialog";
import { MedicationEditDialog } from "@/components/medication-edit-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  demoToday,
  type MedicationStatus,
  type ScheduleMedication,
} from "@/lib/care-data";

const statusCopy: Record<MedicationStatus, string> = {
  taken: "Marked taken",
  missed: "Missed",
  upcoming: "Not taken yet",
};

function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function formatFullDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parseDate(date));
}

function StatusIcon({ status }: { status: MedicationStatus }) {
  if (status === "taken") return <Check size={18} strokeWidth={2} aria-hidden="true" />;
  if (status === "missed") return <TriangleAlert size={18} strokeWidth={1.8} aria-hidden="true" />;
  return <Clock3 size={18} strokeWidth={1.8} aria-hidden="true" />;
}

export default function PersonProfilePage() {
  const params = useParams<{ person: string }>();
  const { getSchedule, people, updateMedication } = useCareData();
  const person = people.find(({ slug }) => slug === params?.person);

  if (!person) return null;

  const schedule = getSchedule(person, demoToday);
  const [selectedMedication, setSelectedMedication] = useState<ScheduleMedication | null>(null);
  const [editingMedication, setEditingMedication] = useState<ScheduleMedication | null>(null);

  const saveMedication = (updatedMedication: ScheduleMedication) => {
    updateMedication(person, demoToday, updatedMedication);
  };

  return (
    <div className="page-container person-profile-page">
      <Link className="profile-back-link" href="/home">
        <ChevronLeft size={17} strokeWidth={1.8} aria-hidden="true" />
        Overview
      </Link>

      <section className="person-profile-hero" aria-labelledby="person-profile-title">
        <Avatar className={`person-profile-avatar ${person.avatarClass}`}>
          <AvatarFallback className={person.avatarClass}>{person.initials}</AvatarFallback>
        </Avatar>
        <h1 id="person-profile-title">{person.fullName}</h1>
      </section>

      <section className="profile-schedule-section" aria-labelledby="profile-schedule-title">
        <Card className="profile-calendar-card">
          <CardContent className="profile-calendar-content">
            <div className="profile-calendar-heading">
              <h3>{formatFullDate(demoToday)}</h3>
              <h2 id="profile-schedule-title">Today’s medication schedule</h2>
            </div>

            <div className="profile-schedule-list">
              {schedule.length === 0 ? (
                <div className="profile-schedule-empty">
                  <CalendarDays size={21} strokeWidth={1.8} aria-hidden="true" />
                  <p>No medication updates for this day.</p>
                  <span>Scheduled medications will appear here when they are added.</span>
                </div>
              ) : schedule.map((medication) => (
                <button
                  type="button"
                  className={`profile-schedule-item profile-schedule-item-${medication.status}`}
                  key={medication.id}
                  aria-haspopup="dialog"
                  aria-label={`View ${medication.name} medication details`}
                  onClick={() => setSelectedMedication(medication)}
                >
                  <time>{medication.time}</time>
                  <span className="profile-schedule-copy">
                    <span className="profile-schedule-name-row">
                      <strong>{medication.name}</strong>
                    </span>
                    <span className="profile-schedule-dose">{medication.dose}</span>
                    {medication.instructions ? <span>{medication.instructions}</span> : null}
                  </span>
                  <span className="profile-schedule-status">
                    <StatusIcon status={medication.status} />
                    <span className="profile-schedule-status-label">{statusCopy[medication.status]}</span>
                  </span>
                  <ChevronRight className="profile-schedule-chevron" size={18} strokeWidth={1.8} aria-hidden="true" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="profile-schedule-note">
          <ShieldCheck size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>Statuses reflect caregiver-entered updates and do not confirm that medication was swallowed.</span>
        </div>
      </section>

      <section className="profile-details-section" aria-labelledby="profile-details-title">
        <div className="profile-section-heading profile-details-heading">
          <h2 id="profile-details-title">Personal details</h2>
        </div>

        <div className="profile-details-content">
          <div className="profile-detail-grid">
            {person.detailGroups.map((group) => (
              <section className="profile-detail-group" key={group.title} aria-labelledby={`detail-group-${group.title.toLowerCase().replaceAll(" ", "-")}`}>
                <h3 id={`detail-group-${group.title.toLowerCase().replaceAll(" ", "-")}`}>{group.title}</h3>
                <dl>
                  {group.items.map((item) => (
                    <div className="profile-detail-row" key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

          <div className="profile-as-needed">
            <p>As-needed medication</p>
            <span>{person.asNeededMedication}</span>
          </div>
        </div>
      </section>

      <MedicationDetailsDialog
        medication={selectedMedication}
        personName={person.name}
        open={selectedMedication !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMedication(null);
        }}
        onEdit={() => {
          if (!selectedMedication) return;
          setEditingMedication(selectedMedication);
          setSelectedMedication(null);
        }}
      />

      <MedicationEditDialog
        medication={editingMedication}
        open={editingMedication !== null}
        onOpenChange={(open) => {
          if (!open) setEditingMedication(null);
        }}
        onSave={saveMedication}
      />
    </div>
  );
}
