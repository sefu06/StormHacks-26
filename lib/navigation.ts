import type { LucideIcon } from "lucide-react";
import { Activity, CalendarDays, Home, UsersRound } from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navigationItems: NavigationItem[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/care-team", label: "Care team", icon: UsersRound },
];

export const pageCopy = {
  "/home": {
    title: "Care overview",
    subtitle: "A calm overview of Margaret’s care.",
  },
  "/schedule": {
    title: "Schedule",
    subtitle: "Medication and wellness reminders.",
  },
  "/activity": {
    title: "Activity",
    subtitle: "Recent care activity.",
  },
  "/care-team": {
    title: "Care team",
    subtitle: "People supporting Margaret.",
  },
  "/profile": {
    title: "Your profile",
    subtitle: "Your caregiver account and preferences.",
  },
} as const;

export function getPageCopy(pathname: string) {
  if (pathname.startsWith("/home/")) {
    return {
      title: "Care profile",
      subtitle: "Today’s schedule and personal care notes.",
    };
  }

  return pageCopy[pathname as keyof typeof pageCopy] ?? pageCopy["/home"];
}
