"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/models";

const EVENT_NAME = "aramya:currentUserChanged";

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT_NAME));
  }
}

const API_HEADERS = { "Content-Type": "application/json" };
const MUTATION_HEADERS = { ...API_HEADERS, "X-Requested-With": "XMLHttpRequest" };

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as { user: UserProfile | null };
    return data.user;
  } catch {
    return null;
  }
}

export async function signIn(profile: { contact: string; password: string; role: UserProfile["role"] }) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: MUTATION_HEADERS,
    body: JSON.stringify(profile),
  });
  const data = (await response.json()) as { user?: UserProfile; error?: string };
  if (!response.ok || !data.user) {
    throw new Error(data.error ?? "Unable to sign in.");
  }
  notify();
  return data.user;
}

export async function signUp(profile: {
  name: string;
  contact: string;
  role: UserProfile["role"];
  password: string;
}) {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: MUTATION_HEADERS,
    body: JSON.stringify(profile),
  });
  const data = (await response.json()) as { user?: UserProfile; error?: string };
  if (!response.ok || !data.user) {
    throw new Error(data.error ?? "Unable to create account.");
  }
  notify();
  return data.user;
}

export async function clearCurrentUser() {
  await fetch("/api/auth/logout", { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest" } });
  notify();
}

export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const currentUser = await getCurrentUser();
      if (!cancelled) {
        setUser(currentUser);
        setLoading(false);
      }
    }

    void load();
    window.addEventListener("storage", load);
    window.addEventListener(EVENT_NAME, load);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", load);
      window.removeEventListener(EVENT_NAME, load);
    };
  }, []);

  return { user, loading };
}
