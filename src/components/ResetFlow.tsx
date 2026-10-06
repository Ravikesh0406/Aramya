"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

const HEADERS = { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" };

export function ResetFlow() {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [contact, setContact] = useState("");
  const [role, setRole] = useState("customer");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ contact: contact.trim(), role }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setMessage(data.message ?? "Code sent.");
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-confirm", {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ contact: contact.trim(), role, token, newPassword: password }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Reset failed.");
      setMessage(data.message ?? "Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {step === "request" ? (
        <form onSubmit={requestCode} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-forest-900/15 bg-ivory-50 p-1">
            {(["customer", "trainer"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setRole(option)}
                aria-pressed={role === option}
                className={`rounded-sm px-4 py-2.5 text-body-sm font-semibold capitalize transition duration-200 ease-out ${
                  role === option ? "bg-white text-forest-900 shadow-sm" : "text-muted-600 hover:text-charcoal-900"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-2">
            <span className="t-overline text-muted-600">Mobile number or email</span>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="+91 98765 43210"
              required
              className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
            />
          </label>
          <Button type="submit" size="lg" disabled={busy || !contact.trim()}>
            {busy ? "Sending…" : "Send reset code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={confirmReset} className="flex flex-col gap-4">
          <p className="text-body-sm text-muted-600">
            Enter the 8-character code sent to <strong>{contact}</strong> and choose a new password.
          </p>
          <label className="flex flex-col gap-2">
            <span className="t-overline text-muted-600">Reset code</span>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.toUpperCase())}
              placeholder="A1B2C3D4"
              required
              minLength={8}
              maxLength={8}
              className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white px-4 font-mono text-body uppercase text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="t-overline text-muted-600">New password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
              className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
            />
          </label>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Updating…" : "Set new password"}
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("request");
              setError("");
              setMessage("");
            }}
            className="text-body-sm font-semibold text-muted-600 hover:text-charcoal-900"
          >
            Use a different contact
          </button>
        </form>
      )}
      {message ? <p className="text-body-sm font-medium text-success">{message} <Link href="/login" className="underline">Sign in</Link></p> : null}
      {error ? <p className="text-body-sm text-error">{error}</p> : null}
    </div>
  );
}
