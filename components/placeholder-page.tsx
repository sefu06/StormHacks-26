import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PlaceholderPageProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  sectionLabel: string;
  eyebrow: string;
  emptyTitle: string;
  message: string;
  tone: "lavender" | "peach" | "periwinkle" | "sage";
  action?: {
    label: string;
    href: string;
  };
};

export function PlaceholderPage({
  icon: Icon,
  title,
  subtitle,
  sectionLabel,
  eyebrow,
  emptyTitle,
  message,
  tone,
  action,
}: PlaceholderPageProps) {
  return (
    <div className="page-container">
      <div className="mobile-page-intro">
        <p className="page-kicker">Caring for Margaret</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <p className="page-section-label">{sectionLabel}</p>

      <Card className={`placeholder-surface placeholder-surface-${tone}`}>
        <CardContent className="placeholder-content">
          <div className="placeholder-heading-row">
            <div className="placeholder-icon" aria-hidden="true">
              <Icon size={22} strokeWidth={1.8} />
            </div>
            <p className="placeholder-eyebrow">{eyebrow}</p>
          </div>
          <div className="placeholder-copy">
            <h2>{emptyTitle}</h2>
            <p>{message}</p>
          </div>
          {action ? (
            <Button asChild className="placeholder-action">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <p className="prototype-note">
        <span className="prototype-note-mark" aria-hidden="true">i</span>
        CareCompanion is a prototype. It reflects caregiver-entered updates and does not replace professional medical advice.
      </p>
    </div>
  );
}
