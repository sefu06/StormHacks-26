"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { useCareData } from "@/components/care-data-provider";
import { MedicationDialog, type MedicationDraft } from "@/components/medication-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const people = ["Margaret", "Alex"];

export default function SchedulePage() {
  const [isMedicationDialogOpen, setIsMedicationDialogOpen] = useState(false);
  const { medicationPool, addMedicationToPool } = useCareData();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") === "1") {
      setIsMedicationDialogOpen(true);
    }
  }, []);

  const saveMedication = (draft: MedicationDraft, assignedPeople: string[]) => {
    const assignedTo = assignedPeople.flatMap((personName) => {
      if (personName === "Margaret") return ["margaret"] as const;
      if (personName === "Alex") return ["alex"] as const;
      return [] as const;
    });

    if (assignedTo.length === 0) return;

    addMedicationToPool(draft, assignedTo);
  };

  return (
    <div className="page-container schedule-dashboard">
      <div className="mobile-page-intro">
        <p className="page-kicker">Caring for Margaret</p>
        <h1>Schedule</h1>
        <p>Medication and wellness reminders.</p>
      </div>

      <section className="schedule-pool-section" aria-labelledby="schedule-pool-heading">
        <div className="schedule-pool-heading">
          <div>
            <p className="schedule-pool-kicker">Medication planning</p>
            <h2 id="schedule-pool-heading">Medication pool</h2>
            <p>Add a medication once, then assign it to one or both people in your care.</p>
          </div>
          <div className="schedule-pool-actions">
            <span>{medicationPool.length} saved</span>
            <Button
              className="home-add-medication-button"
              variant="outline"
              size="sm"
              onClick={() => setIsMedicationDialogOpen(true)}
            >
              <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
              Add medication
            </Button>
          </div>
        </div>

        {medicationPool.length === 0 ? (
          <Card className="schedule-pool-empty-card">
            <CardContent className="schedule-pool-empty-content">
              <p>No medications in the pool yet.</p>
              <span>Medications added here can be assigned to Margaret, Alex, or both.</span>
            </CardContent>
          </Card>
        ) : (
          <div className="schedule-pool-list">
            {medicationPool.map(({ id, medication, assignedTo }) => (
              <Card className="schedule-medication-card" key={id}>
                <CardContent className="schedule-medication-card-content">
                  <div>
                    <p className="schedule-medication-label">Medication</p>
                    <h3>{medication.name}</h3>
                    <p>{medication.dose}, {medication.frequency}</p>
                  </div>
                  <span className="schedule-medication-assignment">Assigned to {assignedTo.map((person) => person === "margaret" ? "Margaret" : "Alex").join(" and ")}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="prototype-note">
        <span className="prototype-note-mark" aria-hidden="true">i</span>
        CareCompanion is a prototype. It reflects caregiver-entered updates and does not replace professional medical advice.
      </p>

      <MedicationDialog
        open={isMedicationDialogOpen}
        people={people}
        onOpenChange={setIsMedicationDialogOpen}
        onSave={saveMedication}
      />
    </div>
  );
}
