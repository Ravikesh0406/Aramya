"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { PhoneIcon, UserIcon } from "@/components/Icons";

export function LoginForm() {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [submitted, setSubmitted] = useState(false);
  const [value, setValue] = useState("");

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) setSubmitted(true);
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-forest-900/15 bg-ivory-50 p-1">
        {(["phone", "email"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option);
              setValue("");
              setSubmitted(false);
            }}
            aria-pressed={mode === option}
            className={`rounded-sm px-4 py-2.5 text-body-sm font-semibold capitalize transition duration-200 ease-out ${
              mode === option
                ? "bg-white text-forest-900 shadow-sm"
                : "text-muted-600 hover:text-charcoal-900"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="login-identifier" className="t-overline text-muted-600">
          {mode === "phone" ? "Mobile number" : "Email address"}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-600">
            {mode === "phone" ? <PhoneIcon size={18} /> : <UserIcon size={18} />}
          </span>
          <input
            id="login-identifier"
            type={mode === "phone" ? "tel" : "email"}
            inputMode={mode === "phone" ? "tel" : "email"}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setSubmitted(false);
            }}
            placeholder={mode === "phone" ? "+91 98765 43210" : "you@example.com"}
            className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-11 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="login-password" className="t-overline text-muted-600">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
        />
      </div>

      <Button type="submit" size="lg" disabled={!value.trim()}>
        Sign in
      </Button>

      {submitted ? (
        <p
          role="status"
          className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-body-sm text-success"
        >
          Demo build — authentication is wired up at launch. Your details were
          not sent anywhere.
        </p>
      ) : null}

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          className="text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:text-forest-800"
        >
          Forgot password?
        </button>
        <button
          type="button"
          className="text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:text-forest-800"
        >
          Create an account
        </button>
      </div>
    </form>
  );
}
