"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ZentraleAdminWorkspace, loadZentraleAdminData } from "@/features/zentrale/zentrale-admin-workspace";
import type { MembershipPayment, MembershipRecord } from "@/lib/appwrite/appwriteMemberships";

function AdminLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(182,209,164,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(190,176,235,0.14),transparent_22%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-surface-soft)_42%,white_58%))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-[24rem] rounded-2xl" />
        <Skeleton className="h-[24rem] rounded-2xl" />
      </div>
    </main>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(182,209,164,0.18),transparent_26%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-surface-soft)_42%,white_58%))] px-4 py-8">
      <Card className="w-full max-w-lg border-destructive/40 shadow-sm">
        <CardHeader>
          <CardTitle className="text-destructive">Fehler beim Laden</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Die Zentrale konnte nicht geladen werden.
        </CardContent>
      </Card>
    </main>
  );
}

export default function Page() {
  const [data, setData] = useState<{
    produkte: Produkt[];
    staffeln: Staffel[];
    bieteSucheEintraege: BieteSucheEintrag[];
    payments: MembershipPayment[];
    memberships: MembershipRecord[];
    orders: Bestellung[];
    backofficeEvents: BackofficeEvent[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [produkte, staffeln, bieteSucheEintraege, payments, memberships, orders, backofficeEvents] = await loadZentraleAdminData();
        if (!active) return;

        setData({
          produkte: produkte as Produkt[],
          staffeln: staffeln as Staffel[],
          bieteSucheEintraege,
          payments,
          memberships,
          orders,
          backofficeEvents,
        });
      } catch (rawError) {
        if (!active) return;
        setError(rawError instanceof Error ? rawError.message : String(rawError));
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <AdminError message={error} />;
  }

  if (!data) {
    return <AdminLoading />;
  }

  return (
    <ZentraleAdminWorkspace
      initialProdukte={data.produkte}
      initialStaffeln={data.staffeln}
      initialBieteSucheEintraege={data.bieteSucheEintraege}
      initialPayments={data.payments}
      initialMemberships={data.memberships}
      initialOrders={data.orders}
      initialBackofficeEvents={data.backofficeEvents}
    />
  );
}
