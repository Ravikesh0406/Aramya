"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { PhoneIcon, UserIcon } from "@/components/Icons";
import { signIn, signUp } from "@/lib/auth";
import type { UserProfile } from "@/lib/models";

function cleanName(name: string, contact: string) {
  const trimmed = name.trim();
  if (trimmed) return trimmed;
  const [localPart] = contact.split("@");
  return localPart || "Aramya User";
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<UserProfile["role"]>("customer");
  const [identifierMode, setIdentifierMode] = useState<"phone" | "email">("phone");
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [password, setPassword] = useState("");
  const [trainerDetails, setTrainerDetails] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim() || !password.trim()) {
      setError("Enter your contact details and password.");
      return;
    }

    try {
      setSaving(true);
      if (mode === "signup") {
        await signUp({
          name: cleanName(name, value),
          contact: value.trim(),
          role,
          password,
        });
      } else {
        await signIn({ contact: value.trim(), role, password });
      }

      const redirect = new URLSearchParams(window.location.search).get("redirect");
      const fallback = role === "trainer" ? "/trainer" : "/sessions";
      const allowed =
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//") &&
        (redirect !== "/book" || role === "customer") &&
        (redirect !== "/sessions" || role === "customer") &&
        (redirect !== "/trainer" || role === "trainer");
      router.push(allowed ? redirect : fallback);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to authenticate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-forest-900/15 bg-ivory-50 p-1">
        {(["signin", "signup"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option);
              setError("");
            }}
            aria-pressed={mode === option}
            className={`rounded-sm px-4 py-2.5 text-body-sm font-semibold transition duration-200 ease-out ${
              mode === option
                ? "bg-white text-forest-900 shadow-sm"
                : "text-muted-600 hover:text-charcoal-900"
            }`}
          >
            {option === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-forest-900/15 bg-ivory-50 p-1">
        {(["customer", "trainer"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRole(option)}
            aria-pressed={role === option}
            className={`rounded-sm px-4 py-2.5 text-body-sm font-semibold capitalize transition duration-200 ease-out ${
              role === option
                ? "bg-white text-forest-900 shadow-sm"
                : "text-muted-600 hover:text-charcoal-900"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {mode === "signup" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="login-name" className="t-overline text-muted-600">
            Full name
          </label>
          <input
            id="login-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={role === "trainer" ? "Your trainer name" : "Your name"}
            className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-forest-900/15 bg-ivory-50 p-1">
        {(["phone", "email"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setIdentifierMode(option);
              setValue("");
              setPassword("");
              setError("");
            }}
            aria-pressed={identifierMode === option}
            className={`rounded-sm px-4 py-2.5 text-body-sm font-semibold capitalize transition duration-200 ease-out ${
              identifierMode === option
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
          {identifierMode === "phone" ? "Mobile number" : "Email address"}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-600">
            {identifierMode === "phone" ? <PhoneIcon size={18} /> : <UserIcon size={18} />}
          </span>
          <input
            id="login-identifier"
            type={identifierMode === "phone" ? "tel" : "email"}
            inputMode={identifierMode === "phone" ? "tel" : "email"}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError("");
            }}
            placeholder={identifierMode === "phone" ? "+91 98765 43210" : "you@example.com"}
            className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white pl-11 pr-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
          />
        </div>
      </div>

      {mode === "signup" && role === "trainer" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="trainer-details" className="t-overline text-muted-600">
            Services and areas covered
          </label>
          <textarea
            id="trainer-details"
            value={trainerDetails}
            onChange={(event) => setTrainerDetails(event.target.value)}
            placeholder="Yoga, personal training, Indiranagar, HSR Layout..."
            className="min-h-20 w-full rounded-[10px] border border-forest-900/15 bg-white px-4 py-3 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="login-password" className="t-overline text-muted-600">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
          placeholder="Minimum 8 characters"
          className="h-12 w-full rounded-[10px] border border-forest-900/15 bg-white px-4 text-body text-charcoal-900 placeholder:text-muted-600 focus:border-forest-900 focus:outline-none"
        />
      </div>

      {error ? <p className="text-body-sm text-error">{error}</p> : null}

      <Button type="submit" size="lg" disabled={!value.trim() || !password.trim() || saving}>
        {saving ? "Please wait..." : mode === "signin" ? `Sign in as ${role === "trainer" ? "Trainer" : "Customer"}` : `Create ${role} account`}
      </Button>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => setMode((prev) => (prev === "signin" ? "signup" : "signin"))}
          className="text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:text-forest-800"
        >
          {mode === "signin" ? "Need an account?" : "Already have an account?"}
        </button>
        <Link
          href="/forgot-password"
          className="text-body-sm font-semibold text-muted-600 transition duration-200 ease-out hover:text-forest-900"
        >
          Forgot password?
        </Link>
      </div>
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => router.push(role === "trainer" ? "/for-trainers" : "/book")}
          className="text-body-sm font-semibold text-forest-900 transition duration-200 ease-out hover:text-forest-800"
        >
          {role === "trainer" ? "Become a trainer" : "Start booking"}
        </button>
      </div>
    </form>
  );
}
