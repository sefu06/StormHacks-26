"use client";

import Link from "next/link";
import { Check, Clock3, List, Plus, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useCareData } from "@/components/care-data-provider";
import { demoToday } from "@/lib/care-data";

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

function MedicationFab() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  const didLongPressRef = useRef(false);

  const clearHoldTimer = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  useEffect(() => () => clearHoldTimer(), []);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    didLongPressRef.current = false;
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true;
      setIsExpanded(true);
    }, 500);
  };

  const handleClick = () => {
    clearHoldTimer();

    if (didLongPressRef.current) {
      didLongPressRef.current = false;
      return;
    }

    if (isExpanded) {
      setIsExpanded(false);
      return;
    }

    router.push("/schedule?add=1");
  };

  return (
    <div className={`home-add-medication-fab-wrap${isExpanded ? " home-add-medication-fab-wrap-expanded" : ""}`}>
      {isExpanded ? (
        <div className="home-add-medication-actions" aria-label="Medication actions">
          <Link className="home-add-medication-action home-add-medication-action-primary" href="/schedule?add=1">
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            <span>Add medication</span>
          </Link>
          <Link className="home-add-medication-action" href="/schedule">
            <List size={18} strokeWidth={1.9} aria-hidden="true" />
            <span>All medications</span>
          </Link>
        </div>
      ) : null}

      <button
        className="home-add-medication-fab"
        type="button"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? "Close medication actions" : "Add medication; press and hold for more options"}
        data-tooltip="Press and hold for options"
        title="Press and hold for options"
        onPointerDown={handlePointerDown}
        onPointerUp={clearHoldTimer}
        onPointerCancel={clearHoldTimer}
        onPointerLeave={clearHoldTimer}
        onClick={handleClick}
      >
        <svg width="34" height="34" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <g transform="translate(-1 -1)">
            <path d="M8.52063 9.52063L14.4794 15.4794M10.2231 19.7356L18.7356 11.2231C19.1334 10.8333 19.4499 10.3685 19.6669 9.85562C19.8839 9.34271 19.9971 8.79187 19.9999 8.23495C20.0028 7.67803 19.8951 7.12608 19.6833 6.611C19.4715 6.09593 19.1597 5.62796 18.7658 5.23416C18.372 4.84035 17.9041 4.52851 17.389 4.31669C16.8739 4.10486 16.322 3.99724 15.765 4.00005C15.2081 4.00287 14.6573 4.11605 14.1444 4.33307C13.6315 4.55009 13.1667 4.86664 12.7769 5.2644L4.2644 13.7769C3.86664 14.1667 3.55009 14.6315 3.33307 15.1444C3.11605 15.6573 3.00287 16.2081 3.00005 16.765C2.99724 17.322 3.10486 17.8739 3.31669 18.389C3.52851 18.9041 3.84035 19.372 4.23416 19.7658C4.62796 20.1597 5.09593 20.4715 5.611 20.6833C6.12608 20.8951 6.67803 21.0028 7.23495 20.9999C7.79187 20.9971 8.34271 20.8839 8.85562 20.6669C9.36852 20.4499 9.83332 20.1334 10.2231 19.7356Z" stroke="currentColor" strokeWidth="1.70249" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <path d="M16 18.4375H22.875M19.4375 15V21.875" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

export default function HomePage() {
  const { getSchedule, people } = useCareData();
  const todaySchedule = people.flatMap((person) => (
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
          </div>
        </div>

        {people.map((person) => {
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

      <MedicationFab />

    </div>
  );
}
