"use client";

import Link from "next/link";
import { Container, Overline, ButtonLink } from "@/components/ui";
import { useCurrentUser, clearCurrentUser } from "@/lib/auth";

export function ProfilePage() {
  const { user, loading } = useCurrentUser();

  if (loading) {
    return (
      <Container className="py-20">
        <p className="rounded-xl border border-forest-900/10 bg-white p-6 text-body text-muted-600 shadow-sm">Loading your profile...</p>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="flex max-w-2xl flex-col gap-5 py-20">
        <Overline>Profile</Overline>
        <h1 className="t-h1 text-charcoal-900">Sign in to view your profile</h1>
        <p className="text-body text-muted-600">Your account details are available after sign-in.</p>
        <ButtonLink href="/login?redirect=/profile">Sign in</ButtonLink>
      </Container>
    );
  }

  return (
    <section className="py-14 md:py-20">
      <Container className="flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col gap-3">
          <Overline>Profile</Overline>
          <h1 className="t-h1 text-charcoal-900">{user.name}</h1>
          <p className="text-body text-muted-600">{user.contact} · {user.role}</p>
        </div>
        <div className="grid gap-3 rounded-xl border border-forest-900/10 bg-white p-6 shadow-sm">
          <p className="t-h4 text-charcoal-900">Account details</p>
          <p className="text-body-sm text-muted-600">Your role determines where your requests and bookings appear.</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <ButtonLink href={user.role === "trainer" ? "/trainer" : "/sessions"}>
              {user.role === "trainer" ? "Open trainer dashboard" : "My sessions"}
            </ButtonLink>
            <button
              type="button"
              onClick={() => void clearCurrentUser()}
              className="inline-flex h-12 items-center justify-center rounded-[10px] border border-forest-900/25 bg-white px-6 text-[16px] font-semibold text-forest-900 transition duration-200 ease-out hover:border-forest-900/50 hover:shadow-sm"
            >
              Sign out
            </button>
          </div>
        </div>
        <Link href="/book" className="text-body-sm font-semibold text-forest-900">Book a trial</Link>
      </Container>
    </section>
  );
}
