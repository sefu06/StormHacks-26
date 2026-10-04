import { ListChecks } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export default function ActivityPage() {
  return (
    <PlaceholderPage
      icon={ListChecks}
      title="Activity"
      subtitle="Recent care activity."
      sectionLabel="Recent"
      eyebrow="A clear history"
      emptyTitle="No care activity yet"
      message="Medication confirmations, reminders, and check-ins will appear here."
      tone="periwinkle"
    />
  );
}
