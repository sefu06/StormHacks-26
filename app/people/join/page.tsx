"use client";

import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { useCareData } from "@/components/care-data-provider";
import { Button } from "@/components/ui/button";

export default function PeopleJoinPage() {
  const router = useRouter();
  const { addCarePerson } = useCareData();
  const [name, setName] = useState("");

  useEffect(() => {
    setName(new URLSearchParams(window.location.search).get("name") ?? "");
  }, []);

  const joinCarePlan = () => {
    if (!name.trim()) return;
    addCarePerson(name);
    router.push("/people");
  };

  return (
    <main className="people-join-screen">
      <div className="people-join-card">
        <span className="people-join-icon" aria-hidden="true">
          <UserRound size={24} strokeWidth={1.8} />
        </span>
        <p className="people-join-kicker">WeCare</p>
        <h1>Join your care plan</h1>
        <p>{name ? `${name}, you’ve been invited to be added to a care plan.` : "You’ve been invited to be added to a care plan."}</p>
        <Button onClick={joinCarePlan} disabled={!name.trim()}>Join care plan</Button>
      </div>
    </main>
  );
}
