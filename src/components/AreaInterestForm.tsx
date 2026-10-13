"use client";

// "Notify me when you're in my area" — optional, rate-limited, with a consent line.

import { useState } from "react";
import { Button } from "@/components/ui";
import { MapPinIcon } from "@/components/Icons";

export function AreaInterestForm() {
  const [pinCode, setPinCode] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit() {
    setStatus("sending");
    setMessage("");
    try {
      const response = await fetch("/api/area-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ pinCode, city, contact, consent }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Could not save your request.");
        return;
      }
      setStatus("done");
      setMessage("Noted — we'll let you know when a trainer starts covering your area.");
    } catch {
      setStatus("error");
      setMessage("Could not save your request. Please try again.");
    }
  }

  return (
    <div className="rounded-xl border border-forest-900/10 bg-sand-100/70 p-5">
      <p className="t-h4 text-charcoal-900">Not available in your area yet?</p>
      <p className="pt-1 text-body-sm text-muted-600">
        Tell us where you are and we can let you know when a trainer starts covering it.
      </p>
      {status === "done" ? (
        <p className="pt-3 text-body-sm text-success">{message}</p>
      ) : (
        <div className="flex flex-col gap-3 pt-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="t-caption text-muted-600">PIN code</span>
              <div className="relative">
                <MapPinIcon
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-terracotta-500"
                />
                <input
                  inputMode="numeric"
                  value={pinCode}
                  onChange={(event) => setPinCode(event.target.value)}
                  maxLength={6}
                  placeholder="110001"
                  className="h-11 w-full rounded-[10px] border border-forest-900/15 bg-white pl-9 pr-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="t-caption text-muted-600">City</span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="t-caption text-muted-600">Phone or email</span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                className="h-11 rounded-[10px] border border-forest-900/15 bg-white px-3 text-body-sm text-charcoal-900 focus:border-forest-900 focus:outline-none"
              />
            </label>
          </div>
          <label className="flex items-start gap-2 text-body-sm text-charcoal-900">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            I agree that ARAMYA may contact me about trainers near me.
          </label>
          <div className="flex items-center gap-3">
            <Button onClick={() => void submit()} disabled={status === "sending" || !consent || !contact}>
              {status === "sending" ? "Saving..." : "Notify me"}
            </Button>
            {message ? (
              <p className={`text-body-sm ${status === "error" ? "text-error" : "text-success"}`}>{message}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
