"use client";

import { Check, Clock3, ListFilter, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { useCareData } from "@/components/care-data-provider";
import { demoToday, type MedicationStatus } from "@/lib/care-data";

type ActivityEntry = {
  id: string;
  date: string;
  time: string;
  personName: string;
  medicationName: string;
  dose: string;
  status: MedicationStatus;
};

function formatDateLabel(date: string) {
  if (date === demoToday) return "Today";
  if (date === "2026-10-02") return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function timeToMinutes(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return 0;

  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;

  return hour * 60 + Number(match[2]);
}

export default function ActivityPage() {
  const { getSchedule, people } = useCareData();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const activityEntries = useMemo<ActivityEntry[]>(() => {
    const dates = Array.from(new Set([
      demoToday,
      ...people.flatMap((person) => Object.keys(person.scheduleByDate)),
    ]));

    return people
      .flatMap((person) => dates.flatMap((date) => (
        getSchedule(person, date)
          .filter(({ status }) => status === "taken" || status === "missed")
          .map((medication) => ({
            id: `${person.slug}-${date}-${medication.id}`,
            date,
            time: medication.time,
            personName: person.name,
            medicationName: medication.name,
            dose: medication.dose,
            status: medication.status,
          }))
      )))
      .sort((first, second) => {
        if (first.date !== second.date) return second.date.localeCompare(first.date);
        return timeToMinutes(first.time) - timeToMinutes(second.time);
      });
  }, [getSchedule, people]);

  const unreadCount = activityEntries.filter(({ status }) => status === "missed").length;
  const visibleEntries = showUnreadOnly
    ? activityEntries.filter(({ status }) => status === "missed")
    : activityEntries;

  return (
    <div className="page-container activity-page">
      <div className="mobile-page-intro">
        <p className="page-kicker">Caring for Margaret</p>
        <h1>Activity</h1>
        <p>Medication confirmations.</p>
      </div>

      <section className="activity-history" aria-labelledby="activity-history-heading">
        <div className="activity-section-heading">
          <h2 id="activity-history-heading">Recent activity</h2>
          <button
            className={showUnreadOnly ? "activity-filter-button activity-filter-button-active" : "activity-filter-button"}
            type="button"
            aria-pressed={showUnreadOnly}
            onClick={() => setShowUnreadOnly((current) => !current)}
          >
            <ListFilter size={15} strokeWidth={1.8} aria-hidden="true" />
            Unread
            <span>{unreadCount}</span>
          </button>
        </div>

        {visibleEntries.length > 0 ? (
          <div className="activity-list" role="list" aria-label={showUnreadOnly ? "Unread activity" : "Recent activity"}>
            {visibleEntries.map((entry) => (
              <Card className={`activity-entry activity-entry-${entry.status}`} key={entry.id} role="listitem">
                <CardContent className="activity-entry-content">
                  <span className="activity-entry-icon" aria-hidden="true">
                    {entry.status === "missed" ? <TriangleAlert size={17} strokeWidth={1.8} /> : <Check size={17} strokeWidth={2} />}
                  </span>
                  <div className="activity-entry-copy">
                    <strong>{entry.personName}</strong>
                    <span>{entry.medicationName}, {entry.dose}</span>
                    <span className="activity-entry-time">
                      <Clock3 size={13} strokeWidth={1.8} aria-hidden="true" />
                      {formatDateLabel(entry.date)} at {entry.time}
                    </span>
                  </div>
                  <div className="activity-entry-actions">
                    <span className="activity-entry-status">{entry.status === "missed" ? "Missed" : "Taken"}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="activity-empty">
            <Check size={18} strokeWidth={1.8} aria-hidden="true" />
            <span>{showUnreadOnly ? "No unread activity" : "No activity yet"}</span>
          </div>
        )}
      </section>
    </div>
  );
}
