"use client";

import Link from "next/link";
import { Check, Clock3, Plus, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { MissedMedicationNotifications } from "@/components/missed-medication-notifications";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useCareData } from "@/components/care-data-provider";
import { carePeopleList, demoToday } from "@/lib/care-data";

function StatusRow({
  icon: Icon,
  children,
  tone = "quiet",
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  tone?: "quiet" | "warning" | "positive";
}) {
  return (
    <span className={`home-status-row home-status-row-${tone}`}>
      <Icon className="home-status-glyph" size={17} strokeWidth={1.8} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

export default function HomePage() {
  const { getSchedule } = useCareData();
  const todaySchedule = carePeopleList.flatMap((person) => (
    getSchedule(person, demoToday).map((medication) => ({
      ...medication,
      personName: person.name,
    }))
  ));
  const medicationsNeedingAttention = todaySchedule.filter(({ status }) => status === "missed");
  const nextMedication = todaySchedule.find(({ status }) => status === "upcoming");
  const nextMedicationPeople = nextMedication
    ? todaySchedule
      .filter(({ status, name, time }) => status === "upcoming" && name === nextMedication.name && time === nextMedication.time)
      .map(({ personName }) => personName)
    : [];

  return (
    <div className="page-container home-dashboard">
      <header className="home-app-header">
        <div className="home-app-header-copy">
          <h1>Overview</h1>
        </div>
        <div className="home-header-actions">
          <MissedMedicationNotifications />
          <Button asChild className="home-profile-button" variant="ghost" size="icon" aria-label="Open David’s profile">
            <Link href="/profile">
              <Avatar className="home-header-avatar">
                <AvatarFallback>D</AvatarFallback>
              </Avatar>
            </Link>
          </Button>
        </div>
      </header>

      {medicationsNeedingAttention.length > 0 || nextMedication ? (
        <Card className="home-today-summary-card">
          <CardContent className="home-today-summary-content">
            <div className="home-today-summary-copy">
              <p className="home-today-summary-label">Today</p>
              <h1>
                {medicationsNeedingAttention.length > 0
                  ? `${medicationsNeedingAttention.length} medication${medicationsNeedingAttention.length === 1 ? "" : "s"} need${medicationsNeedingAttention.length === 1 ? "s" : ""} attention`
                  : "All medications are on track"}
              </h1>
              {nextMedication ? (
                <p>
                  Next up, {nextMedication.name} at {nextMedication.time} for {nextMedicationPeople.join(" and ")}.
                </p>
              ) : null}
            </div>
            <span
              className={medicationsNeedingAttention.length > 0 ? "home-today-summary-icon home-today-summary-icon-warning" : "home-today-summary-icon home-today-summary-icon-positive"}
              aria-hidden="true"
            >
              {medicationsNeedingAttention.length > 0 ? <TriangleAlert size={24} strokeWidth={1.8} /> : <Clock3 size={24} strokeWidth={1.8} />}
            </span>
          </CardContent>
        </Card>
      ) : null}

      <section className="home-care-section" aria-labelledby="home-care-heading">
        <div className="home-section-heading">
          <h2 id="home-care-heading">People in your care</h2>
          <div className="home-section-actions">
            <span>Today</span>
            <Button asChild className="home-add-medication-button" variant="outline" size="sm">
              <Link href="/schedule?add=1">
                <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
                Add medication
              </Link>
            </Button>
          </div>
        </div>

        {carePeopleList.map((person) => {
          const schedule = getSchedule(person, demoToday);
          const needsAttention = schedule.find(({ status }) => status === "missed") ?? schedule.find(({ status }) => status === "upcoming");
          const taken = schedule.find(({ status }) => status === "taken");

          return (
            <Link className="home-person-link" href={`/home/${person.slug}`} key={person.slug} aria-label={`Open ${person.name}'s care profile`}>
              <Card className="home-person-card">
                <CardContent className="home-person-content">
                  <div className="home-person-identity">
                    <span className={`home-person-avatar ${person.avatarClass}`} aria-hidden="true">{person.initials}</span>
                    <div className="home-person-copy">
                      <h3>{person.name}</h3>
                      {needsAttention ? (
                        <StatusRow icon={TriangleAlert} tone="warning">
                          {needsAttention.status === "missed" ? "Missing" : "Not taken yet"}: {needsAttention.name}, {needsAttention.dose}
                        </StatusRow>
                      ) : null}
                      {taken ? (
                        <StatusRow icon={Check} tone="positive">
                          Taken: {taken.name}, {taken.dose}
                        </StatusRow>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <p className="prototype-note">
        <span className="prototype-note-mark" aria-hidden="true">i</span>
        CareCompanion is a prototype. It reflects caregiver-entered updates and does not replace professional medical advice.
      </p>

    </div>
  );
}
