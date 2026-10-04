"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, HeartHandshake, LogOut, ShieldCheck } from "lucide-react";
import { signOut } from "firebase/auth";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const notificationDetails = [
  { label: "Medication alerts", value: "Missed doses and upcoming reminders" },
  { label: "Reminder timing", value: "10 minutes after a missed reminder" },
  { label: "Preferred contact", value: "Text message" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useAuth();

  const displayName = user?.displayName || user?.email || "Caregiver";
  const initials = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const profileDetails = [
    { label: "Email", value: user?.email ?? "—" },
    { label: "Account type", value: "CareCompanion caregiver" },
  ];

  return (
    <div className="page-container caregiver-profile-page">
      <Link className="profile-back-link caregiver-profile-back-link" href="/home">
        <ChevronLeft size={17} strokeWidth={1.8} aria-hidden="true" />
        Overview
      </Link>

      <section className="caregiver-profile-hero" aria-labelledby="caregiver-profile-title">
        <Avatar className="caregiver-profile-avatar">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="caregiver-profile-hero-copy">
          <p className="caregiver-profile-kicker">Caregiver account</p>
          <h1 id="caregiver-profile-title">{displayName}</h1>
        </div>
      </section>

      <section className="caregiver-profile-section" aria-labelledby="caregiver-details-title">
        <div className="caregiver-profile-section-heading">
          <div>
            <p className="caregiver-profile-eyebrow">Your account</p>
            <h2 id="caregiver-details-title">Profile details</h2>
          </div>
        </div>

        <Card className="caregiver-profile-card">
          <CardContent className="caregiver-profile-card-content">
            <dl className="caregiver-profile-detail-list">
              {profileDetails.map((detail) => (
                <div className="caregiver-profile-detail-row" key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>

      <section className="caregiver-profile-section" aria-labelledby="caregiver-preferences-title">
        <div className="caregiver-profile-section-heading">
          <div>
            <p className="caregiver-profile-eyebrow">Stay in the loop</p>
            <h2 id="caregiver-preferences-title">Notification preferences</h2>
          </div>
        </div>

        <Card className="caregiver-profile-card">
          <CardContent className="caregiver-profile-card-content">
            <dl className="caregiver-profile-detail-list">
              {notificationDetails.map((detail) => (
                <div className="caregiver-profile-detail-row" key={detail.label}>
                  <dt>{detail.label}</dt>
                  <dd>{detail.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>

      <div className="caregiver-profile-note">
        <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
        <p>Keep caregiver details up to date so shared care responsibilities stay clear.</p>
      </div>

      <div className="caregiver-profile-about">
        <HeartHandshake size={18} strokeWidth={1.8} aria-hidden="true" />
        <span>CareCompanion helps you coordinate day-to-day care.</span>
      </div>

      <Button
        variant="ghost"
        onClick={handleLogout}
        style={{ marginTop: "1rem", gap: "0.5rem", color: "#c0392b" }}
      >
        <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
        Log out
      </Button>
    </div>
  );
}
