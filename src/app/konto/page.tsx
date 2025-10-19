"use client";

import React from "react";
import { useAuthStore } from "@/store/Auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { account, databases, functions } from "@/models/client/config";
import env from "@/app/env";
import { Query } from "appwrite";
import Link from "next/link";
import Image from "next/image";
import { Plus, RefreshCw, AlertTriangle } from "lucide-react";

type Membership = {
  $id: string;
  typ?: string;
  status?: string;
  beantragungs_datum?: string;
  dauer_jahre?: number | null;
  $createdAt?: string | null;
  bezahl_status?: string | null;
  kontingent_aktuell?: number | null;
  kontingent_start?: number | null;
  adresse?: string | null;
};

function normalizeMembership(raw: any): Membership {
  if (!raw) {
    return {
      $id: "",
    };
  }
  const durationCandidate = raw.dauer_jahre ?? raw.dauer ?? raw.laufzeit ?? null;
  let duration: number | null = null;
  if (typeof durationCandidate === "number") {
    duration = Number.isFinite(durationCandidate) ? durationCandidate : null;
  } else if (typeof durationCandidate === "string") {
    const parsed = Number(durationCandidate);
    duration = Number.isFinite(parsed) ? parsed : null;
  }

  return {
    $id: String(raw.$id ?? raw.id ?? ""),
    typ: raw.typ ?? raw.type ?? undefined,
    status: raw.status ?? raw.state ?? undefined,
    beantragungs_datum:
      raw.beantragungs_datum ??
      raw.beantragt_am ??
      raw.createdAt ??
      raw.$createdAt ??
      undefined,
    $createdAt: raw.$createdAt ?? raw.createdAt ?? undefined,
    dauer_jahre: duration,
    bezahl_status: raw.bezahl_status ?? raw.payment_status ?? undefined,
    kontingent_aktuell:
      raw.kontingent_aktuell ??
      raw.aktuelles_kontingent ??
      raw.kontingent ?? 
      raw.balance ??
      raw.guthaben ??
      undefined,
    kontingent_start:
      raw.kontingent_start ??
      raw.start_kontingent ??
      raw.kontingent_gesamt ??
      undefined,
    adresse: raw.rechnungsadresse ?? raw.adresse ?? raw.address ?? undefined,
  };
}

function getMembershipStatusStyle(
  status?: string
): { label: string; className: string } {
  const value = (status ?? "").toString().toLowerCase();
  if (value === "aktiv") {
    return {
      label: "Aktiv",
      className:
        "border border-emerald-800/30 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-900/40",
    };
  }
  if (value === "beantragt" || value === "beantragt/ausstehend") {
    return {
      label: "Beantragt",
      className:
        "border border-amber-300 bg-amber-200 text-amber-900 hover:bg-amber-200/90",
    };
  }
  if (value === "warten" || value === "wartet" || value === "wartet_auf_zahlung") {
    return {
      label: "Zahlung offen",
      className:
        "border border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-100",
    };
  }
  if (value === "pausiert") {
    return {
      label: "Pausiert",
      className:
        "border border-blue-300/60 bg-blue-950/30 text-blue-100 hover:bg-blue-900/30",
    };
  }
  if (value === "abgelehnt") {
    return {
      label: "Abgelehnt",
      className:
        "border border-red-300/60 bg-red-950/30 text-red-200 hover:bg-red-900/30",
    };
  }
  if (value === "beendet" || value === "gekündigt") {
    return {
      label: "Beendet",
      className:
        "border border-slate-400/40 bg-slate-900/30 text-slate-200 hover:bg-slate-800/30",
    };
  }
  if (value === "abgelaufen" || value === "expired") {
    return {
      label: "Abgelaufen",
      className:
        "border border-slate-400/40 bg-slate-900/25 text-slate-200 hover:bg-slate-800/25",
    };
  }
  return {
    label: status ? status : "Unbekannt",
    className:
      "border border-white/30 bg-white/10 text-white hover:bg-white/20",
  };
}

function formatMembershipTypeLabel(type?: string): string {
  const value = (type ?? "").toString().toLowerCase();
  if (value === "business" || value === "unternehmen") return "Business";
  if (value === "privat" || value === "private") return "Privat";
  return type ?? "—";
}

function translateMembershipError(message: string): string {
  const text = (message ?? "").toString();
  const lowered = text.toLowerCase();
  if (lowered.includes("already have an active or pending membership")) {
    return "Sie haben bereits eine aktive oder ausstehende Mitgliedschaft.";
  }
  if (lowered.includes("missing required field") || lowered.includes("missing required field: type")) {
    return "Bitte wählen Sie zuerst einen Mitgliedschaftstyp.";
  }
  if (lowered.includes("unauthenticated")) {
    return "Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.";
  }
  if (lowered.includes("forbidden") && lowered.includes("email")) {
    return "Bitte verifizieren Sie Ihre E-Mail-Adresse vor dem Antrag.";
  }
  if (lowered.includes("not configured")) {
    return "Mitgliedschaften sind derzeit nicht konfiguriert.";
  }
  if (lowered.includes("failed to create membership")) {
    return "Die Mitgliedschaft konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.";
  }
  if (text.trim().length === 0) {
    return "Unbekannter Fehler. Bitte versuchen Sie es später erneut.";
  }
  return text;
}

export default function AccountPage() {
  const { user, logout } = useAuthStore();
  const [orders, setOrders] = React.useState<Bestellung[] | null>(null);
  const [loadingOrders, setLoadingOrders] = React.useState(true);
  const [verificationStatus, setVerificationStatus] = React.useState<
    { state: "idle" | "loading" | "sent" | "error"; message?: string }
  >({ state: "idle" });
  const [membershipType, setMembershipType] = React.useState<"privat" | "business">("privat");
  const [membershipStatus, setMembershipStatus] = React.useState<
    { state: "idle" | "loading" | "success" | "error"; message?: string }
  >({ state: "idle" });
  const [memberships, setMemberships] = React.useState<Membership[]>([]);
  const [loadingMemberships, setLoadingMemberships] = React.useState(false);
  const [membershipLoadError, setMembershipLoadError] = React.useState<string | null>(null);
  const [showApplicationForm, setShowApplicationForm] = React.useState(false);
  const membershipFunctionId = env.appwrite.membership_function_id;
  const membershipCollectionId = env.appwrite.membership_collection_id;
  const hasPrivatMembership = React.useMemo(
    () => memberships.some((m) => (m.typ ?? "").toLowerCase() === "privat"),
    [memberships]
  );
  const hasBusinessMembership = React.useMemo(
    () => memberships.some((m) => (m.typ ?? "").toLowerCase() === "business"),
    [memberships]
  );
  const canAddMoreMemberships = React.useMemo(
    () => !hasPrivatMembership || !hasBusinessMembership,
    [hasPrivatMembership, hasBusinessMembership]
  );

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        setLoadingOrders(true);
        const resp = await databases.listDocuments(
          env.appwrite.db,
          env.appwrite.order_collection_id,
          [Query.equal("userID", user!.$id), Query.orderDesc("$createdAt"), Query.limit(100)]
        );
        if (!cancelled) {
          setOrders(
            resp.documents.map((doc: any) => ({
              $id: doc.$id,
              $createdAt: doc.$createdAt,
              userID: doc.userID,
              angebotID: doc.angebotID,
              menge: doc.menge,
              abholung: doc.abholung,
              preis_einheit: doc.preis_einheit,
              preis_gesamt: doc.preis_gesamt,
              einheit: doc.einheit,
              mitgliedschaftID: doc.mitgliedschaftID,
              produkt_name: doc.produkt_name,
              status: doc.status,
            }))
          );
        }
      } catch (e) {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.$id]);

  const fetchMemberships = React.useCallback(async (): Promise<Membership[]> => {
    if (!user) return [];
    if (!membershipCollectionId || membershipCollectionId === "undefined") {
      throw new Error("Mitgliedschaften sind derzeit nicht konfiguriert.");
    }
    const response = await databases.listDocuments(
      env.appwrite.db,
      membershipCollectionId,
      [
        Query.equal("userID", user.$id),
        Query.orderDesc("$createdAt"),
        Query.limit(10),
      ]
    );
    return response.documents.map((doc: any) => normalizeMembership(doc));
  }, [membershipCollectionId, user?.$id]);

  React.useEffect(() => {
    if (!user) {
      setMemberships([]);
      setMembershipLoadError(null);
      setLoadingMemberships(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingMemberships(true);
      setMembershipLoadError(null);
      try {
        const data = await fetchMemberships();
        if (!cancelled) {
          setMemberships(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? translateMembershipError(err.message)
              : "Die Mitgliedschaft konnte nicht geladen werden.";
          setMemberships([]);
          setMembershipLoadError(message);
        }
      } finally {
        if (!cancelled) {
          setLoadingMemberships(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.$id, fetchMemberships]);

  React.useEffect(() => {
    setShowApplicationForm(memberships.length === 0);
  }, [memberships.length]);

  const refreshMemberships = React.useCallback(async () => {
    if (!user) return;
    setLoadingMemberships(true);
    setMembershipLoadError(null);
    try {
      const data = await fetchMemberships();
      setMemberships(data);
    } catch (err) {
      const message =
        err instanceof Error
          ? translateMembershipError(err.message)
          : "Die Mitgliedschaft konnte nicht geladen werden.";
      setMembershipLoadError(message);
    } finally {
      setLoadingMemberships(false);
    }
  }, [fetchMemberships, user?.$id]);

  function formatPrice(v: number | string) {
    const num = typeof v === "string" ? Number(v) : v;
    if (!Number.isFinite(num)) return "-";
    try {
      return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(num as number);
    } catch {
      const n = num as number;
      return `${Number.isFinite(n) ? n.toFixed(2) : n} €`;
    }
  }

  function formatDate(iso?: string) {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return iso as string;
    }
  }

  function formatDateShort(iso?: string) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    } catch {
      return "—";
    }
  }

  function formatPaymentStatus(status?: string) {
    const value = (status ?? "").toString().toLowerCase();
    if (value === "bezahlt" || value === "paid") return "Bezahlt";
    if (value === "warten" || value === "wartet" || value === "pending") return "Wartet auf Zahlung";
    if (value === "offen") return "Offen";
    if (value === "erinnert" || value === "reminded") return "Zahlungserinnerung gesendet";
    if (value === "rueckerstattet" || value === "erstattet" || value === "refunded") return "Erstattet";
    return status ?? "—";
  }

  function statusBadge(status?: string) {
    const s = (status ?? "").toLowerCase();
    let variant: React.ComponentProps<typeof Badge>["variant"] = "secondary";
    let label = status ?? "Unbekannt";
    if (["angefragt", "offen", "pending", "neu"].includes(s)) {
      variant = "secondary"; label = "Angefragt";
    } else if (["bestaetigt", "bestätigt", "confirmed", "in_bearbeitung", "processing"].includes(s)) {
      variant = "default"; label = s.includes("bearbeitung") ? "In Bearbeitung" : "Bestätigt";
    } else if (["abgeschlossen", "fertig", "completed"].includes(s)) {
      variant = "available"; label = "Abgeschlossen";
    } else if (["storniert", "abgelehnt", "canceled", "rejected"].includes(s)) {
      variant = "destructive"; label = s.startsWith("abgelehnt") ? "Abgelehnt" : "Storniert";
    }
    return <Badge variant={variant}>{label}</Badge>;
  }

  const sendVerificationEmail = React.useCallback(async () => {
    if (!user || user.emailVerification || verificationStatus.state === "loading") return;
    setVerificationStatus({ state: "loading" });
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      if (!origin) {
        throw new Error("Die aktuelle Seitenadresse konnte nicht ermittelt werden.");
      }
      await account.createVerification(`${origin}/verify-email`);
      setVerificationStatus({
        state: "sent",
        message: "Wir haben eine Verifizierungs-E-Mail versendet.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Die Verifizierungs-E-Mail konnte nicht gesendet werden.";
      setVerificationStatus({ state: "error", message });
    }
  }, [user, verificationStatus.state]);

  const requestMembership = React.useCallback(async () => {
    if (!user) return;
    if (!user.emailVerification) {
      setMembershipStatus({
        state: "error",
        message: "Bitte verifizieren Sie Ihre Email, bevor Sie eine Mitgliedschaft beantragen.",
      });
      return;
    }
    if (!membershipFunctionId || membershipFunctionId === "undefined") {
      setMembershipStatus({
        state: "error",
        message: "Mitgliedschaftsanfragen sind derzeit nicht konfiguriert.",
      });
      return;
    }

    setMembershipStatus({ state: "loading" });
    try {
      const execution = await functions.createExecution(
        membershipFunctionId,
        JSON.stringify({ type: membershipType })
      );
      let payload: any = null;
      const rawResponse = (execution as any)?.response;
      if (typeof rawResponse === "string" && rawResponse.trim().length > 0) {
        try {
          payload = JSON.parse(rawResponse);
        } catch (_parseErr) {
          // ignore parse errors and fall back to generic handling
        }
      }
      const executionStatus = String((execution as any)?.status ?? "").toLowerCase();
      const succeeded = executionStatus === "completed" && payload?.success !== false;
      if (!succeeded) {
        const errorMessage =
          payload?.error ??
          (execution as any)?.stderr ??
          (execution as any)?.response ??
          "Die Anfrage konnte nicht gesendet werden.";
        throw new Error(errorMessage);
      }

      let createdMembership: Membership | null = null;
      if (payload?.membership) {
        createdMembership = normalizeMembership(payload.membership);
        setMemberships((prev) => {
          const filtered = prev.filter((m) => m.$id !== createdMembership!.$id);
          return [createdMembership!, ...filtered];
        });
      } else {
        const data = await fetchMemberships();
        setMemberships(data);
        createdMembership =
          data.find((m) => (m.typ ?? "").toLowerCase() === membershipType) ?? data[0] ?? null;
      }
      setMembershipLoadError(null);
      setShowApplicationForm(false);
      const statusMeta = getMembershipStatusStyle(createdMembership?.status);
      const typeLabel = formatMembershipTypeLabel(createdMembership?.typ ?? membershipType);
      setMembershipStatus({
        state: "success",
        message: `Ihre ${typeLabel}-Mitgliedschaft wurde beantragt. Status: ${statusMeta.label}.`,
      });
      const createdType = (createdMembership?.typ ?? membershipType).toLowerCase();
      setMembershipType((prev) => {
        if (createdType === "privat" && !hasBusinessMembership) return "business";
        if (createdType === "business" && !hasPrivatMembership) return "privat";
        return prev;
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? translateMembershipError(error.message)
          : "Die Anfrage konnte nicht gesendet werden.";
      setMembershipStatus({ state: "error", message });
    }
  }, [fetchMemberships, hasBusinessMembership, hasPrivatMembership, membershipFunctionId, membershipType, user]);

  const selectMembershipType = React.useCallback((type: "privat" | "business") => {
    setMembershipType(type);
    setMembershipStatus((prev) => (prev.state === "loading" ? prev : { state: "idle" }));
  }, []);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Bitte anmelden</h1>
          <p className="text-gray-600">Sie müssen angemeldet sein, um Ihr Konto zu verwalten.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Mein Konto</h1>
          <p className="text-gray-600 text-sm sm:text-base">Verwalten Sie Ihre Kontoeinstellungen und Bestellungen</p>
        </div>

        {/* User Info Card */}
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                <AvatarImage src="" alt={user.name} />
                <AvatarFallback className="text-sm sm:text-lg bg-permdal-100 text-permdal-800">
                  {user.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{user.name}</h2>
                <p className="text-gray-600 text-sm truncate">{user.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant={user.emailVerification ? "default" : "secondary"} className="text-xs">
                    {user.emailVerification ? "Email verifiziert" : "Email nicht verifiziert"}
                  </Badge>
                  {!user.emailVerification && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={sendVerificationEmail}
                      disabled={verificationStatus.state === "loading"}
                    >
                      {verificationStatus.state === "loading" ? "Sende…" : "Email verifizieren"}
                    </Button>
                  )}
                  {verificationStatus.message && (
                    <div
                      className={`basis-full text-xs ${verificationStatus.state === "error" ? "text-destructive" : "text-muted-foreground"
                        }`}
                    >
                      {verificationStatus.message}
                    </div>
                  )}
                  {user.labels?.includes("admin") && (
                    <Badge variant="destructive" className="text-xs">Admin</Badge>
                  )}
                  {user.labels?.includes("dev") && (
                    <Badge variant="destructive" className="text-xs">Dev</Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
                Abmelden
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="settings" className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings" className="text-xs sm:text-sm">Kontoeinstellungen</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm">Bestellungen</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Mitgliedschaft</CardTitle>
                <CardDescription>
                  Verfolgen Sie den Status Ihrer Mitgliedschaft oder starten Sie einen neuen Antrag.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refreshMemberships}
                      disabled={loadingMemberships}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {loadingMemberships ? "Aktualisiere…" : "Status aktualisieren"}
                    </Button>
                    <span className="hidden sm:inline">
                      {loadingMemberships
                        ? "Mitgliedschaften werden geladen…"
                        : memberships.length > 0
                          ? "Aktuelle Übersicht Ihrer Mitgliedschaften."
                          : "Noch keine Mitgliedschaft."}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowApplicationForm(true);
                      setMembershipStatus({ state: "idle" });
                    }}
                    disabled={!canAddMoreMemberships || membershipStatus.state === "loading"}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Neue Mitgliedschaft
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                  {memberships.map((membership) => {
                    const statusStyle = getMembershipStatusStyle(membership.status);
                    const typeLabel = formatMembershipTypeLabel(membership.typ);
                    const appliedAt = membership.beantragungs_datum ?? membership.$createdAt;
                    const typeLower = (membership.typ ?? "").toLowerCase();
                    const isPrivat = typeLower === "privat";
                    const appliedAtDate = appliedAt ? new Date(appliedAt) : null;
                    let expiresAtIso: string | undefined;
                    if (appliedAtDate) {
                      const durationYears = typeof membership.dauer_jahre === "number" && membership.dauer_jahre > 0
                        ? membership.dauer_jahre
                        : 1;
                      const expiryDate = new Date(appliedAtDate);
                      expiryDate.setFullYear(expiryDate.getFullYear() + durationYears);
                      expiresAtIso = expiryDate.toISOString();
                    }
                    const validUntilFormatted = formatDateShort(expiresAtIso);
                    const startBalance =
                      typeof membership.kontingent_start === "number" && membership.kontingent_start > 0
                        ? membership.kontingent_start
                        : 1200;
                    const currentBalanceRaw =
                      typeof membership.kontingent_aktuell === "number" && membership.kontingent_aktuell >= 0
                        ? membership.kontingent_aktuell
                        : 800;
                    const balancePercent = startBalance > 0 ? Math.min(100, Math.max(0, (currentBalanceRaw / startBalance) * 100)) : 0;
                    const currentBalanceDisplay =
                      typeof membership.kontingent_aktuell === "number"
                        ? formatPrice(membership.kontingent_aktuell)
                        : formatPrice(currentBalanceRaw);
                    const addressDisplay =
                      membership.adresse ?? "Muster GmbH\nMusterstraße 1\n12345 Musterstadt";
                    return (
                      <Card
                        key={membership.$id}
                        className={`relative overflow-hidden border-none text-white shadow-[0_12px_30px_-12px_rgba(23,16,80,0.5)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_-15px_rgba(23,16,80,0.6)] ${
                          isPrivat
                            ? "bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-800"
                            : "bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-900"
                        }`}
                      >
                        <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
                        <CardContent className="relative flex h-full flex-col gap-6 p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/15">
                                <Image
                                  src="/img/agroforst_ff_icon_bg.png"
                                  alt="Permdal Mitgliedschaft"
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                  priority
                                />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold">{typeLabel}</h3>
                                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Permdal</p>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.className}`}
                            >
                              {statusStyle.label}
                            </Badge>
                          </div>
                            <div className="space-y-5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-white/50">Mitglied</p>
                                  <p className="text-lg font-medium">{user.name ?? "Ihr Name"}</p>
                                </div>
                                {validUntilFormatted !== "—" && (
                                  <span className="text-xs text-white/70">gültig bis {validUntilFormatted}</span>
                                )}
                              </div>
                              {isPrivat ? (
                                <div className="space-y-4">
                                  <div>
                                    <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-white/50">
                                      <span>Guthaben</span>
                                      <span>{currentBalanceDisplay}</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-white via-white/90 to-white/60"
                                        style={{ width: `${balancePercent}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/80">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-7 bg-amber-100 text-amber-900 hover:bg-amber-100/90"
                                      disabled
                                    >
                                      Rechnung prüfen
                                    </Button>
                                    {balancePercent <= 10 && (
                                      <span className="font-semibold text-amber-200">Nur noch wenig Guthaben</span>
                                    )}
                                  </div>
                                  {(!membership.kontingent_aktuell || membership.kontingent_aktuell === 0) &&
                                    (membership.status ?? "").toLowerCase() === "beantragt" && (
                                      <div className="flex items-center gap-2 rounded-md bg-amber-100/90 px-3 py-2 text-xs font-medium text-amber-900">
                                        <AlertTriangle className="h-4 w-4" />
                                        Virtuelle Rechnung wird geprüft – bitte begleichen Sie den offenen Betrag.
                                      </div>
                                    )}
                                  {membership.bezahl_status && (
                                    <div className="text-xs text-white/70">
                                      Zahlungsstatus: {formatPaymentStatus(membership.bezahl_status)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-4 text-sm">
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-white/50">Rechnungsadresse</p>
                                    <p className="whitespace-pre-line text-sm font-medium text-white/90">{addressDisplay}</p>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-white/70">
                                    <span>Nächste Verlängerung</span>
                                    <span>{validUntilFormatted}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-7 bg-white/20 text-white hover:bg-white/30"
                                      onClick={() => refreshMemberships()}
                                      disabled={membershipStatus.state === "loading"}
                                    >
                                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                      Status
                                    </Button>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-7 bg-white/15 text-white hover:bg-white/25"
                                      disabled
                                    >
                                      Rechnung einsehen
                                    </Button>
                                  </div>
                                  {membership.bezahl_status && (
                                    <p className="text-xs text-white/70">
                                      Zahlungsstatus: {formatPaymentStatus(membership.bezahl_status)}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  {canAddMoreMemberships && showApplicationForm && (
                    <Card className="relative flex min-h-[220px] flex-col justify-between border border-dashed border-gray-300 bg-gray-50/80 text-gray-600 shadow-inner transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                      <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/60">
                              <Image
                                src="/img/agroforst_ff_icon_bg.png"
                                alt="Permdal Mitgliedschaft"
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-700">Mitgliedschaft hinzufügen</p>
                              <p className="text-xs text-gray-500">Wählen Sie den passenden Typ und stellen Sie Ihren Antrag.</p>
                            </div>
                          </div>
                          {membershipLoadError && (
                            <p className="text-xs text-destructive">{membershipLoadError}</p>
                          )}
                          {!user.emailVerification && (
                            <p className="text-xs text-amber-600">
                              Bitte verifizieren Sie Ihre Email-Adresse, bevor Sie eine Mitgliedschaft beantragen.
                            </p>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={membershipType === "privat" ? "default" : "outline"}
                              onClick={() => selectMembershipType("privat")}
                              disabled={membershipStatus.state === "loading" || hasPrivatMembership}
                            >
                              Privat
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={membershipType === "business" ? "default" : "outline"}
                              onClick={() => selectMembershipType("business")}
                              disabled={membershipStatus.state === "loading" || hasBusinessMembership}
                            >
                              Business
                            </Button>
                          </div>
                          <Button
                            className="w-full"
                            onClick={requestMembership}
                            disabled={
                              !user.emailVerification ||
                              membershipStatus.state === "loading" ||
                              (membershipType === "privat" && hasPrivatMembership) ||
                              (membershipType === "business" && hasBusinessMembership)
                            }
                          >
                            {membershipStatus.state === "loading" ? "Sende…" : "Mitgliedschaft beantragen"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
                {membershipStatus.message && (
                  <p
                    className={
                      membershipStatus.state === "success"
                        ? "text-sm text-green-600"
                        : "text-sm text-destructive"
                    }
                  >
                    {membershipStatus.message}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Profil</CardTitle>
                <CardDescription>Ihre Basisdaten</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900 mt-1 text-sm sm:text-base">{user.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900 mt-1 text-sm sm:text-base">{user.email}</p>
                  </div>
                </div>
                <Separator />
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">Funktionen zur Bearbeitung werden bald verfügbar sein</p>
                  <Button disabled variant="outline">
                    Bearbeiten
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Benachrichtigungen</CardTitle>
                <CardDescription>
                  Verwalten Sie Ihre Einstellungen für E-Mail-Benachrichtigungen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Bestellbestätigungen</p>
                    <p className="text-sm text-gray-600">Erhalten Sie E-Mails bei neuen Bestellungen</p>
                  </div>
                  <Badge variant="secondary">Aktiviert</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marktplatz-Updates</p>
                    <p className="text-sm text-gray-600">Benachrichtigungen über neue Angebote</p>
                  </div>
                  <Badge variant="secondary">Aktiviert</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Newsletter</p>
                    <p className="text-sm text-gray-600">Regelmäßige Updates über Permdal</p>
                  </div>
                  <Badge variant="outline">Deaktiviert</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>Meine Bestellungen</CardTitle>
                    <CardDescription>
                      Übersicht Ihrer aktuellen und vergangenen Bestellungen
                    </CardDescription>
                  </div>
                  {!loadingOrders && orders && (
                    <Badge variant="outline" className="shrink-0">
                      {orders.length} {orders.length === 1 ? "Eintrag" : "Einträge"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="text-center py-12">Lädt…</div>
                ) : orders && orders.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {orders.map((o) => {
                      const mengeNum = Number((o as any).menge);
                      const unitRaw = (o.einheit || '').toString().toLowerCase();
                      const isGram = unitRaw === 'gramm' || unitRaw === 'g';
                      const displayAsKg = isGram && Number.isFinite(mengeNum) && Math.round(mengeNum) === 1000;
                      return (
                        <Card key={o.$id} className="border bg-white/70">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <CardTitle className="text-base">
                                  {o.produkt_name || `Bestellung ${o.$id.slice(0, 6)}`}
                                </CardTitle>
                                <CardDescription>
                                  erstellt am {formatDate(o.$createdAt)}
                                </CardDescription>
                              </div>
                              {statusBadge(o.status)}
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex flex-col gap-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Menge</span>
                                <span className="font-medium">
                                  {displayAsKg ? '1' : (Number.isFinite(mengeNum) ? mengeNum : (o as any).menge)} {displayAsKg ? 'kg' : o.einheit}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Preis pro Einheit</span>
                                <span className="font-medium">
                                  {formatPrice(o.preis_einheit)} / {displayAsKg ? 'kg' : o.einheit}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Gesamt</span>
                                <span className="font-semibold">{formatPrice(o.preis_gesamt)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Abholung</span>
                                <span className="font-medium">{(o as any).abholung ? "Selbstabholung" : "Lieferung/Absprache"}</span>
                              </div>
                              <Separator />
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Angebot</span>
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/angebote/${o.angebotID}`}>Details</Link>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine Bestellungen</h3>
                    <p className="text-gray-600 mb-4">
                      Besuchen Sie unseren Marktplatz, um Produkte zu bestellen.
                    </p>
                    <Button asChild>
                      <a href="/marktplatz">Zum Marktplatz</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
