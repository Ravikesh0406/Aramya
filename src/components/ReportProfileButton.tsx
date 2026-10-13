"use client";

// "Report this profile" — minimal, rate-limited trust action.

import { useState } from "react";
import { Button } from "@/components/ui";

const REASONS = [
  "Misleading profile",
  "Pricing seems wrong",
  "Behaviour concern",
  "Not the right person",
  "Something else",
];

export function ReportProfileButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ slug, reason, details, contact, consent }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Could not send your report.");
        return;
      }
      setStatus("sent");
      setMessage("Thank you — our team will review this profile.");
    } catch {
      setStatus("error");
      setMessage("Could not send your report. Please try again.");
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
        Report this profile
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-forest-900/10 bg-white p-5 shadow-sm">
      <p className="t-overline text-terracotta-500">Report this profile</p>
      <label className="flex flex-col gap-1">
        <span className="t-caption text-muted-600">Reason</span>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
        >
          {REASONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="t-caption text-muted-600">What happened?</span>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={3}
          maxLength={1000}
          className="rounded-[10px] border border-forest-900/15 bg-white px-3 py-2 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="t-caption text-muted-600">How can we reach you?</span>
        <input
          type="text"
          value={contact}
          onChange={(event) => setContact(event.target.value)}
          placeholder="Phone or email"
          className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
        />
      </label>
      <label className="flex items-start gap-2 text-body-sm text-charcoal-900">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        I agree that ARAMYA may use this report to review the profile.
      </label>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void submit()} disabled={status === "sending" || !consent || !contact}>
          {status === "sending" ? "Sending..." : "Send report"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {message ? (
        <p className={`text-body-sm ${status === "error" ? "text-error" : "text-success"}`}>{message}</p>
      ) : null}
    </div>
  );
}
