"use client";

import Link from "next/link";
import { Check, Copy, Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useCareData } from "@/components/care-data-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PeoplePage() {
  const { people, removeCarePerson } = useCareData();
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const createInvite = () => {
    const name = recipientName.trim();
    if (!name) return;

    const token = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    setInviteUrl(`${window.location.origin}/people/join?name=${encodeURIComponent(name)}&token=${token}`);
    setCopied(false);
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="page-container people-page">
      <div className="mobile-page-intro">
        <h1>People</h1>
      </div>

      <section className="people-section" aria-labelledby="people-heading">
        <div className="people-section-heading">
          <div>
            <h2 id="people-heading">People in your care</h2>
            <p>{people.length} {people.length === 1 ? "person" : "people"}</p>
          </div>
          <Button size="sm" onClick={() => setIsCreatingInvite(true)}>
            <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
            Add person
          </Button>
        </div>

        <div className="people-list">
          {people.map((person) => (
            <Card className="people-card" key={person.slug}>
              <CardContent className="people-card-content">
                <span className={`people-avatar ${person.avatarClass}`} aria-hidden="true">{person.initials}</span>
                <div className="people-card-copy">
                  <strong>{person.fullName}</strong>
                  <span>{person.name === person.fullName ? "Care recipient" : person.name}</span>
                  <Link href={`/home/${person.slug}`}>View profile</Link>
                </div>
                <button
                  className="people-remove-button"
                  type="button"
                  aria-label={`Remove ${person.fullName}`}
                  onClick={() => removeCarePerson(person.slug)}
                >
                  <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                  <span>Remove</span>
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="people-invite-card" aria-labelledby="people-invite-heading">
        <div className="people-invite-heading">
          <span className="people-invite-icon" aria-hidden="true">
            <Link2 size={20} strokeWidth={1.8} />
          </span>
          <div>
            <h2 id="people-invite-heading">Add through a personal link</h2>
            <p>Send them a link so their care profile is added in one step.</p>
          </div>
        </div>

        {!isCreatingInvite && !inviteUrl ? (
          <Button onClick={() => setIsCreatingInvite(true)}>
            Create invite link
          </Button>
        ) : null}

        {isCreatingInvite && !inviteUrl ? (
          <div className="people-invite-form">
            <label className="people-field">
              <span>Their name</span>
              <input
                value={recipientName}
                onChange={(event) => setRecipientName(event.target.value)}
                placeholder="e.g. Alex Manning"
                autoFocus
              />
            </label>
            <div className="people-invite-actions">
              <Button type="button" variant="outline" onClick={() => setIsCreatingInvite(false)}>Cancel</Button>
              <Button type="button" onClick={createInvite} disabled={!recipientName.trim()}>Create link</Button>
            </div>
          </div>
        ) : null}

        {inviteUrl ? (
          <div className="people-invite-result" aria-live="polite">
            <label className="people-field">
              <span>Personal invite link</span>
              <input value={inviteUrl} readOnly aria-label="Personal invite link" />
            </label>
            <div className="people-invite-actions">
              <button className="people-copy-button" type="button" onClick={copyInvite}>
                {copied ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : <Copy size={16} strokeWidth={1.8} aria-hidden="true" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <a className="people-open-link" href={inviteUrl} target="_blank" rel="noreferrer">Open invite</a>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
