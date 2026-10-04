"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { HeartHandshake } from "lucide-react";

import { auth } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // After sign-up, go to the setup page to create the senior profile
      router.replace("/setup/care-recipient");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") {
        setError("An account with that email already exists.");
      } else {
        setError("Couldn't create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="care-recipient-setup-screen">
      <div className="care-recipient-setup-page" style={{ maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <HeartHandshake size={36} strokeWidth={1.5} style={{ margin: "0 auto 0.75rem" }} />
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>CareCompanion</h1>
          <p style={{ opacity: 0.6 }}>Create your caregiver account</p>
        </div>

        <Card>
          <CardContent style={{ padding: "1.5rem" }}>
            <form onSubmit={submit} className="care-recipient-setup-form" style={{ gap: "1rem" }}>
              <div className="care-recipient-setup-group">
                <label htmlFor="signup-email">Email</label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="care-recipient-setup-group">
                <label htmlFor="signup-password">Password</label>
                <input
                  id="signup-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="care-recipient-setup-group">
                <label htmlFor="signup-confirm">Confirm password</label>
                <input
                  id="signup-confirm"
                  type="password"
                  placeholder="Same password again"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p role="alert" style={{ color: "#c0392b", fontSize: "0.875rem" }}>
                  {error}
                </p>
              )}

              <button className="care-recipient-setup-save" type="submit" disabled={loading}>
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          </CardContent>
        </Card>

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem", opacity: 0.7 }}>
          Already have an account?{" "}
          <Link href="/login" style={{ fontWeight: 600, opacity: 1 }}>
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
