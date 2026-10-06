// Org ops console — ADMIN_CONTACTS allowlist only.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserBySessionToken } from "@/lib/server/store";
import { isAdmin } from "@/lib/server/admin";
import { Container, Overline } from "@/components/ui";
import { AdminConsole } from "@/components/AdminConsole";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get("aramya_session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user || !isAdmin(user)) redirect("/login?redirect=/admin");
  return (
    <section className="py-10 md:py-14">
      <Container className="flex flex-col gap-8">
        <div>
          <Overline>Org console</Overline>
          <h1 className="t-h1 text-charcoal-900">Operations overview</h1>
          <p className="pt-1.5 text-body text-muted-600">
            Signed in as {user.name} ({user.contact}). Payout and refund queues below.
          </p>
        </div>
        <AdminConsole />
      </Container>
    </section>
  );
}
