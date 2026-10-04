import { UsersRound } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export default function CareTeamPage() {
  return (
    <PlaceholderPage
      icon={UsersRound}
      title="Care team"
      subtitle="People supporting Margaret."
      sectionLabel="Support circle"
      eyebrow="Trusted support"
      emptyTitle="Margaret’s care team is just you"
      message="Invite trusted caregivers to share updates and responsibilities."
      tone="sage"
      action={{ label: "Invite caregiver", href: "/care-team" }}
    />
  );
}
