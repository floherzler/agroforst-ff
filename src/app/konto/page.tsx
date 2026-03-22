"use client";

import React from "react";
import { useAuthStore } from "@/store/Auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { sendVerificationEmail as sendVerificationEmailRequest } from "@/lib/appwrite/appwriteAuth";
import {
  listMembershipsByUserId,
  type MembershipPayment as Payment,
  type MembershipRecord as Membership,
} from "@/lib/appwrite/appwriteMemberships";
import { listBestellungen } from "@/lib/appwrite/appwriteOrders";
import { requestMembership as requestMembershipAction } from "@/lib/appwrite/appwriteFunctions";
import { Link } from "@tanstack/react-router";

import { Plus, RefreshCw, Copy, Check } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

function formatPaymentStatusLabel(status?: string | null): string {
  const value = (status ?? "").toString().toLowerCase();
  if (value === "offen") return "Offen";
  if (value === "teilbezahlt") return "Teilbezahlt";
  if (value === "bezahlt") return "Bezahlt";
  return status ?? "Unbekannt";
}

function extractPaymentAmount(payment?: Payment | null): number | null {
  if (!payment) return null;
  const fields = [payment.betragEur, payment.betrag];
  for (const value of fields) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
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
  const [copiedPaymentRef, setCopiedPaymentRef] = React.useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const copyEmailTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const ibanPlaceholder = "DE12345678901234567890";
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
  const primaryMembership = React.useMemo(() => {
    if (memberships.length === 0) return null;
    const activeMembership = memberships.find(
      (membership) => (membership.status ?? "").toLowerCase() === "aktiv"
    );
    return activeMembership ?? memberships[0];
  }, [memberships]);

  const handleCopyPaymentRef = React.useCallback(async (refKey: string, value: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedPaymentRef(refKey);
      setTimeout(() => {
        setCopiedPaymentRef((prev) => (prev === refKey ? null : prev));
      }, 2000);
    } catch {
      setCopiedPaymentRef(null);
    }
  }, []);

  React.useEffect(() => {
    return () => {
      if (copyEmailTimeout.current) {
        clearTimeout(copyEmailTimeout.current);
      }
    };
  }, []);

  const handleCopyEmail = React.useCallback(async () => {
    if (!user?.email || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      if (copyEmailTimeout.current) {
        clearTimeout(copyEmailTimeout.current);
      }
      copyEmailTimeout.current = setTimeout(() => {
        setCopiedEmail(false);
        copyEmailTimeout.current = null;
      }, 2000);
    } catch {
      setCopiedEmail(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    const currentUserId = user.id;
    let cancelled = false;
    async function load() {
      try {
        setLoadingOrders(true);
        const resp = await listBestellungen({ userId: currentUserId, limit: 100 });
        if (!cancelled) {
          setOrders(resp);
        }
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, user?.id]);

  const fetchMemberships = React.useCallback(async (): Promise<Membership[]> => {
    if (!user) return [];
    return listMembershipsByUserId({ userId: user.id, limit: 10 });
  }, [user]);

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
  }, [user, user?.id, fetchMemberships]);

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
  }, [fetchMemberships, user]);

  function formatPrice(v?: number | string | null) {
    if (v === undefined || v === null) return "-";
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

  function formatDateShort(iso?: string | null) {
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
      await sendVerificationEmailRequest({ verificationUrl: `${origin}/verify-email` });
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

  const submitMembershipRequest = React.useCallback(async () => {
    if (!user) return;
    if (!user.emailVerification) {
      setMembershipStatus({
        state: "error",
        message: "Bitte verifizieren Sie Ihre Email, bevor Sie eine Mitgliedschaft beantragen.",
      });
      return;
    }

    setMembershipStatus({ state: "loading" });
    try {
      const response = await requestMembershipAction({ type: membershipType });
      let createdMembership: Membership | null = null;
      if (response.membership) {
        createdMembership = response.membership;
        setMemberships((prev) => {
          const filtered = prev.filter((m) => m.id !== createdMembership!.id);
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
  }, [fetchMemberships, hasBusinessMembership, hasPrivatMembership, membershipType, user]);

  const selectMembershipType = React.useCallback((type: "privat" | "business") => {
    setMembershipType(type);
    setMembershipStatus((prev) => (prev.state === "loading" ? prev : { state: "idle" }));
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f7f1e8] to-[#ede5d9] flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-2 border-permdal-200 bg-white/80 backdrop-blur shadow-xl">
          <CardHeader className="text-center space-y-3">
            <CardTitle className="text-2xl text-[#2c3e2d]">Anmeldung erforderlich</CardTitle>
            <CardDescription className="text-base text-[#5a5a5a]">
              Bitte melde dich an, um dein Konto zu verwalten
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full rounded-full bg-[#2c3e2d] hover:bg-[#3a523b]">
              <Link to="/login" search={{ redirect: "/konto" }}>Zum Login</Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-full border-permdal-300">
              <Link to="/signup" search={{ redirect: "/konto" }}>Konto erstellen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memberLabels = Array.isArray(user.labels) ? user.labels : [];
  const roleLabels = memberLabels.filter((label) => {
    const value = label.toLowerCase();
    return value === "admin" || value === "dev";
  });
  const isEmailVerified = Boolean(user.emailVerification);

  // Theme and preferences
  const themePreference: string = "system"; // Default to system theme
  let themeLabel: string;
  switch (themePreference) {
    case "dark":
      themeLabel = "Dunkel";
      break;
    case "system":
      themeLabel = "System";
      break;
    default:
      themeLabel = "Hell";
  }
  const newsletterOptIn = false; // Default newsletter opt-in
  const contextualLabels = memberLabels.filter((label) => {
    const value = label.toLowerCase();
    return value !== "admin" && value !== "dev";
  });

  // Primary membership info
  const membershipStatusStyle = primaryMembership
    ? getMembershipStatusStyle(primaryMembership.status)
    : null;
  const membershipTypeLabel = primaryMembership
    ? formatMembershipTypeLabel(primaryMembership.typ)
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f1e8] to-[#ede5d9]">
      {/* Floating logout button */}
      <div className="fixed bottom-6 right-6 z-50 sm:bottom-8 sm:right-8">
        <Button
          variant="destructive"
          size="sm"
          onClick={logout}
          className="flex items-center gap-2 shadow-lg rounded-full"
          title="Abmelden"
          aria-label="Abmelden"
        >
          Abmelden
        </Button>
      </div>
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8 sm:mb-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#2c3e2d] mb-3">Dein Konto</h1>
            <p className="text-[#5a5a5a] text-base sm:text-lg max-w-2xl mx-auto">Verwalte deine Mitgliedschaft, Bestellungen und Kontoeinstellungen</p>
          </div>


          {/* Tabs */}
          <Tabs defaultValue="settings" className="space-y-6 sm:space-y-8">
            <TabsList className="grid w-full grid-cols-2 bg-white/60 backdrop-blur-sm border border-permdal-200 p-1 rounded-full">
              <TabsTrigger value="settings" className="text-sm sm:text-base rounded-full data-[state=active]:bg-[#2c3e2d] data-[state=active]:text-white">Mitgliedschaft</TabsTrigger>
              <TabsTrigger value="orders" className="text-sm sm:text-base rounded-full data-[state=active]:bg-[#2c3e2d] data-[state=active]:text-white">Bestellungen</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-6 sm:space-y-8">
              <Card className="border-2 border-permdal-200 bg-white/60 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl text-[#2c3e2d]">Deine Mitgliedschaften</CardTitle>
                  <CardDescription className="text-base text-[#5a5a5a]">
                    Übersicht und Verwaltung deiner aktiven und ausstehenden Mitgliedschaften.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={refreshMemberships}
                      disabled={loadingMemberships}
                      className="rounded-full border-permdal-300 hover:bg-permdal-50"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {loadingMemberships ? "Aktualisiere…" : "Aktualisieren"}
                    </Button>
                    <span className="text-sm text-[#5a5a5a]">
                      {loadingMemberships
                        ? "Lade Mitgliedschaften…"
                        : memberships.length > 0
                          ? `${memberships.length} Mitgliedschaft${memberships.length > 1 ? "en" : ""} gefunden`
                          : "Noch keine Mitgliedschaft."}
                    </span>
                    {canAddMoreMemberships && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setShowApplicationForm(true);
                          setMembershipStatus({ state: "idle" });
                        }}
                        disabled={membershipStatus.state === "loading"}
                        className="rounded-full bg-permdal-500 hover:bg-permdal-400 text-white shadow-md"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Neue Mitgliedschaft
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    {memberships.map((membership) => {
                      const statusStyle = getMembershipStatusStyle(membership.status);
                      const typeLabel = formatMembershipTypeLabel(membership.typ);
                      const appliedAt = membership.beantragungsDatum ?? membership.createdAt;
                      const typeLower = (membership.typ ?? "").toLowerCase();
                      const isPrivat = typeLower === "privat";
                      const appliedAtDate = appliedAt ? new Date(appliedAt) : null;
                      let expiresAtIso: string | undefined;
                      if (appliedAtDate) {
                        const durationYears = typeof membership.dauerJahre === "number" && membership.dauerJahre > 0
                          ? membership.dauerJahre
                          : 1;
                        const expiryDate = new Date(appliedAtDate);
                        expiryDate.setFullYear(expiryDate.getFullYear() + durationYears);
                        expiresAtIso = expiryDate.toISOString();
                      }
                      const validUntilFormatted = formatDateShort(expiresAtIso);
                      const startBalance =
                        typeof membership.kontingentStart === "number" && membership.kontingentStart > 0
                          ? membership.kontingentStart
                          : null;
                      const currentBalance =
                        typeof membership.kontingentAktuell === "number" && membership.kontingentAktuell >= 0
                          ? membership.kontingentAktuell
                          : null;
                      const addressDisplay =
                        membership.adresse ?? "Muster GmbH\nMusterstraße 1\n12345 Musterstadt";
                      const paymentsForMembership = membership.payments ?? [];
                      const primaryPayment = paymentsForMembership[0];
                      const openPayment = paymentsForMembership.find((payment) => (payment.status ?? "").toLowerCase() === "offen");
                      const openPaymentRef = openPayment?.ref;
                      const openPaymentsCount = paymentsForMembership.filter((payment) => (payment.status ?? "").toLowerCase() === "offen").length;
                      const totalPaidAmount = paymentsForMembership
                        .filter((payment) => (payment.status ?? "").toLowerCase() === "bezahlt")
                        .map((payment) => extractPaymentAmount(payment))
                        .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
                        .reduce((acc, value) => acc + value, 0);
                      const totalPaidDisplay = totalPaidAmount > 0 ? formatPrice(totalPaidAmount) : formatPrice(0);
                      const paymentStatusLabel = formatPaymentStatusLabel(primaryPayment?.status ?? membership.bezahlStatus);
                      const relevantPayment = openPayment ?? primaryPayment;
                      const outstandingAmount = extractPaymentAmount(relevantPayment);
                      const outstandingDisplay =
                        typeof outstandingAmount === "number" && Number.isFinite(outstandingAmount)
                          ? formatPrice(outstandingAmount)
                          : null;
                      const hasActiveBalance = membership.status === "aktiv" && startBalance !== null && startBalance > 0 && currentBalance !== null;
                      const balancePercent = hasActiveBalance
                        ? Math.min(100, Math.max(0, (currentBalance / startBalance) * 100))
                        : null;
                      const membershipSince = formatDateShort(membership.beantragungsDatum ?? membership.createdAt);
                      const headerMeta = isPrivat ? (validUntilFormatted !== "—" ? `gültig bis ${validUntilFormatted}` : null) : (membershipSince !== "—" ? `seit ${membershipSince}` : null);
                      return (
                        <Card
                          key={membership.id}
                          className={`relative overflow-hidden border-2 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${isPrivat
                            ? "bg-gradient-to-br from-[#2c3e2d] via-[#3a523b] to-[#4a6b4f] border-permdal-300"
                            : "bg-gradient-to-br from-[#4a3a5c] via-[#6b4a7a] to-[#8b5a9a] border-lilac-300"
                            }`}
                        >
                          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
                          <CardContent className="relative flex h-full flex-col gap-6 p-6">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-center gap-3">
                                <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/15">
                                  <img
                                    src="/img/agroforst_ff_icon_bg.png"
                                    alt="Permdal Mitgliedschaft"
                                    className="h-full w-full object-cover"
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
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-white/50">Mitglied</p>
                                  <p className="text-lg font-medium">{user.name ?? "Ihr Name"}</p>
                                </div>
                                {headerMeta && (
                                  <span className="text-xs text-white/70">{headerMeta}</span>
                                )}
                              </div>
                              {isPrivat ? (
                                <div className="space-y-4">
                                  {hasActiveBalance && balancePercent !== null ? (
                                    <div>
                                      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-white/50">
                                        <span>Guthaben</span>
                                        <span>
                                          {formatPrice(currentBalance)} / {formatPrice(startBalance)}
                                        </span>
                                      </div>
                                      <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-white via-white/90 to-white/60"
                                          style={{ width: `${balancePercent}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <Accordion type="single" collapsible className="w-full">
                                      <AccordionItem value="payment" className="border-none">
                                        <AccordionTrigger className="w-full flex-col items-start gap-2 rounded-lg bg-amber-50/80 px-4 py-3 text-left text-xs text-amber-900 shadow-sm hover:no-underline data-[state=open]:rounded-b-none data-[state=open]:shadow-inner sm:flex-row sm:items-center sm:gap-4 sm:text-sm">
                                          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="space-y-1">
                                              <p className="font-semibold uppercase tracking-wide text-amber-900/70">Offener Betrag</p>
                                              <p className="text-lg font-semibold">{outstandingDisplay ?? "wird berechnet…"}</p>
                                            </div>
                                            <span className="text-xs text-amber-900/70 sm:ml-auto">Details</span>
                                          </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-4 rounded-b-lg bg-white px-4 text-sm text-slate-900 shadow-inner sm:text-base">
                                          <div className="pt-3 text-xs text-slate-700 sm:text-sm">
                                            Bitte überweisen Sie den offenen Betrag. Nach Eingang aktivieren wir Ihre Mitgliedschaft und
                                            laden Ihr Guthaben auf.
                                          </div>
                                          <div className="space-y-2">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">IBAN</p>
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                              <span className="font-mono text-sm text-slate-900">{ibanPlaceholder}</span>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-full border-amber-200 text-xs text-amber-900 hover:bg-amber-50 sm:w-auto"
                                                onClick={() => handleCopyPaymentRef(`${membership.id}-iban`, ibanPlaceholder)}
                                              >
                                                <Copy className="mr-1 h-3.5 w-3.5" />
                                                {copiedPaymentRef === `${membership.id}-iban` ? "Kopiert!" : "Kopieren"}
                                              </Button>
                                            </div>
                                          </div>
                                          {openPaymentRef && (
                                            <div className="space-y-2">
                                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verwendungszweck</p>
                                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                                <span className="font-mono text-sm text-slate-900">{openPaymentRef}</span>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-8 w-full border-amber-200 text-xs text-amber-900 hover:bg-amber-50 sm:w-auto"
                                                  onClick={() => handleCopyPaymentRef(`${membership.id}-ref`, openPaymentRef)}
                                                >
                                                  <Copy className="mr-1 h-3.5 w-3.5" />
                                                  {copiedPaymentRef === `${membership.id}-ref` ? "Kopiert!" : "Kopieren"}
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                          <p className="text-xs text-slate-600">
                                            Verwenden Sie bitte exakt den angegebenen Verwendungszweck, damit wir Ihre Zahlung automatisch
                                            zuordnen können.
                                          </p>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  )}
                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/80">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold uppercase tracking-wide text-white/60">Zahlungsstatus:</span>
                                      <Badge
                                        variant={paymentStatusLabel === "Bezahlt" ? "secondary" : "outline"}
                                        className={paymentStatusLabel === "Offen" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-white/30 text-white"}
                                      >
                                        {paymentStatusLabel}
                                      </Badge>
                                    </div>
                                    {hasActiveBalance && balancePercent !== null && balancePercent <= 10 && (
                                      <span className="font-semibold text-amber-200">Nur noch wenig Guthaben</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-5 text-sm text-white/90">
                                  <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="address" className="border-none">
                                      <AccordionTrigger className="w-full rounded-lg bg-white/10 px-4 py-3 text-left text-xs uppercase tracking-wide hover:no-underline data-[state=open]:rounded-b-none">
                                        Rechnungsadresse
                                      </AccordionTrigger>
                                      <AccordionContent className="rounded-b-lg bg-white/90 px-4 py-3 text-sm text-slate-900 shadow-inner">
                                        <p className="whitespace-pre-line">{addressDisplay ?? "Noch keine Adresse hinterlegt."}</p>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                                    <div className="rounded-lg bg-white/10 px-4 py-3">
                                      <p className="uppercase tracking-wide text-white/60">Offene Rechnungen</p>
                                      <p className="mt-1 text-2xl font-semibold text-white">{openPaymentsCount}</p>
                                    </div>
                                    <div className="rounded-lg bg-white/10 px-4 py-3">
                                      <p className="uppercase tracking-wide text-white/60">Summe bezahlt</p>
                                      <p className="mt-1 text-2xl font-semibold text-white">{totalPaidDisplay}</p>
                                    </div>
                                  </div>
                                  {/* Additional details ... */}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {canAddMoreMemberships && showApplicationForm && (
                      <Card className="relative flex min-h-[220px] flex-col justify-between border border-dashed border-gray-300 bg-gray-50/80 text-gray-600 shadow-inner transition duration-200 hover:scale-[1.01] hover:border-gray-400 hover:shadow-lg">
                        <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/60">
                                <img
                                  src="/img/agroforst_ff_icon_bg.png"
                                  alt="AFF Mitgliedschaft"
                                  className="h-full w-full object-cover"
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
                              onClick={submitMembershipRequest}
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
              <Card className="border-2 border-permdal-200 bg-white/60 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl text-[#2c3e2d]">Dein Profil</CardTitle>
                  <CardDescription className="text-base text-[#5a5a5a]">
                    Persönliche Informationen und Kontoeinstellungen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                      <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-permdal-200 shadow-md">
                        <AvatarImage src="" alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-br from-permdal-400 to-permdal-600 text-2xl text-white font-bold">
                          {user.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-3 text-center sm:text-left">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-[#5a5a5a] font-semibold">Mitglied</p>
                          <p className="text-2xl font-bold text-[#2c3e2d] break-words">{user.name}</p>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-sm text-[#5a5a5a] sm:justify-start">
                          <span className="break-all sm:break-normal">{user.email}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyEmail}
                            className="h-8 w-8 hover:bg-permdal-100"
                          >
                            {copiedEmail ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                            <span className="sr-only">E-Mail kopieren</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:w-auto md:justify-end">
                      <Badge
                        variant={isEmailVerified ? "default" : "secondary"}
                        className={
                          isEmailVerified
                            ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
                            : "border border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
                        }
                      >
                        {isEmailVerified ? "Verifiziert" : "E-Mail bestätigen"}
                      </Badge>
                      {primaryMembership && membershipStatusStyle && membershipTypeLabel && (
                        <Badge
                          className={`${membershipStatusStyle.className} font-semibold`}
                        >
                          {membershipTypeLabel} • {membershipStatusStyle.label}
                        </Badge>
                      )}
                      {roleLabels.map((label) => (
                        <Badge key={label} className="bg-permdal-600 text-white text-xs capitalize border-permdal-700">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator className="bg-permdal-200" />
                  <Tabs defaultValue="security" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2 bg-permdal-50 border border-permdal-200 rounded-full p-1">
                      <TabsTrigger value="security" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Sicherheit</TabsTrigger>
                      <TabsTrigger value="preferences" className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">Präferenzen</TabsTrigger>
                    </TabsList>
                    {/* <TabsContent value="overview" className="space-y-4 pt-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-lg border bg-muted/20 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                          <p className="mt-2 font-medium text-foreground break-words">{user.name}</p>
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">E-Mail</p>
                          <p className="mt-2 font-medium text-foreground break-words">{user.email}</p>
                        </div>
                        {primaryMembership && membershipStatusStyle && membershipTypeLabel && (
                          <div className="rounded-lg border bg-muted/20 p-4 sm:col-span-2">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Aktive Mitgliedschaft</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">{membershipTypeLabel}</span>
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${membershipStatusStyle.className}`}
                              >
                                {membershipStatusStyle.label}
                              </span>
                            </div>
                            {primaryMembership.createdAt && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                Erstellt am {formatDateShort(primaryMembership.createdAt)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent> */}
                    <TabsContent value="security" className="space-y-4 pt-4">
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">E-Mail-Bestätigung</p>
                            <p className="text-sm text-muted-foreground">
                              {isEmailVerified
                                ? "Ihre E-Mail-Adresse ist bestätigt."
                                : "Bitte bestätigen Sie Ihre E-Mail-Adresse, um alle Funktionen nutzen zu können."}
                            </p>
                          </div>
                          <Badge
                            variant={isEmailVerified ? "default" : "secondary"}
                            className={
                              isEmailVerified
                                ? undefined
                                : "border border-amber-500/40 bg-amber-100 text-amber-900"
                            }
                          >
                            {isEmailVerified ? "Aktiv" : "Offen"}
                          </Badge>
                        </div>
                        {!isEmailVerified && (
                          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={sendVerificationEmail}
                              disabled={verificationStatus.state === "loading"}
                            >
                              {verificationStatus.state === "loading" ? "Sende…" : "E-Mail verifizieren"}
                            </Button>
                            {verificationStatus.message && (
                              <span
                                className={`text-xs ${verificationStatus.state === "error" ? "text-destructive" : "text-muted-foreground"
                                  }`}
                              >
                                {verificationStatus.message}
                              </span>
                            )}
                          </div>
                        )}
                        {isEmailVerified && verificationStatus.message && (
                          <p className="mt-3 text-xs text-muted-foreground">{verificationStatus.message}</p>
                        )}
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Sitzung</p>
                            <p className="text-sm text-muted-foreground">
                              Melden Sie sich ab, um diese Sitzung zu beenden.
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={logout}>
                            Abmelden
                          </Button>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Weitere Sicherheitsoptionen werden bald direkt hier verfügbar sein.
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="preferences" className="space-y-4 pt-4">
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Designmodus</p>
                            <p className="text-sm text-muted-foreground">
                              {themePreference === "dark"
                                ? "Bevorzugt dunkles Erscheinungsbild."
                                : themePreference === "system"
                                  ? "Folgt den Systemeinstellungen."
                                  : "Bevorzugt helles Erscheinungsbild."}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="uppercase">
                              {themeLabel}
                            </Badge>
                            <Switch checked={themePreference === "dark"} disabled aria-readonly />
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Die Anpassung des Erscheinungsbildes direkt im Konto folgt in Kürze.
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Community-Updates</p>
                            <p className="text-sm text-muted-foreground">
                              Steuern Sie, ob Sie über neue Permdal-Inhalte informiert werden möchten.
                            </p>
                          </div>
                          <Switch checked={newsletterOptIn} disabled aria-readonly />
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Diese Einstellung wird zurzeit durch das Permdal-Team verwaltet.
                        </p>
                      </div>
                      {contextualLabels.length > 0 && (
                        <div className="rounded-lg border bg-muted/20 p-4">
                          <p className="text-sm font-medium text-foreground">Weitere Labels</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {contextualLabels.map((label) => (
                              <Badge key={label} variant="secondary" className="capitalize">
                                {label.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                        Selbstverwaltung für weitere Präferenzen ist in Vorbereitung. Bei Änderungen wenden Sie sich bitte an das AFF-Team.
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="border-2 border-permdal-200 bg-white/60 backdrop-blur-sm shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl text-[#2c3e2d]">Benachrichtigungen</CardTitle>
                  <CardDescription className="text-base text-[#5a5a5a]">
                    Verwalte deine Einstellungen für E-Mail-Benachrichtigungen
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Bestellbestätigungen</p>
                        <p className="text-sm text-muted-foreground">Erhalte E-Mails bei neuen Bestellungen</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-300">Aktiviert</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Marktplatz-Updates</p>
                        <p className="text-sm text-muted-foreground">Benachrichtigungen über neue Angebote</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-300">Aktiviert</Badge>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">Newsletter</p>
                        <p className="text-sm text-muted-foreground">Regelmäßige Updates über Permdal</p>
                      </div>
                      <Badge variant="outline" className="border-gray-300 text-gray-600">Deaktiviert</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-6">
              <Card className="border-2 border-permdal-200 bg-white/60 backdrop-blur-sm shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl text-[#2c3e2d]">Deine Bestellungen</CardTitle>
                      <CardDescription className="text-base text-[#5a5a5a]">
                        Übersicht deiner aktuellen und vergangenen Bestellungen
                      </CardDescription>
                    </div>
                    {!loadingOrders && orders && (
                      <Badge className="shrink-0 bg-permdal-100 text-permdal-800 border-permdal-300">
                        {orders.length} {orders.length === 1 ? "Bestellung" : "Bestellungen"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingOrders ? (
                    <div className="text-center py-12 text-[#5a5a5a]">Lädt Bestellungen…</div>
                  ) : orders && orders.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {orders.map((o) => {
                        const mengeNum = Number(o.menge);
                        const unitRaw = (o.einheit || '').toString().toLowerCase();
                        const isGram = unitRaw === 'gramm' || unitRaw === 'g';
                        const displayAsKg = isGram && Number.isFinite(mengeNum) && Math.round(mengeNum) === 1000;
                        return (
                          <Card key={o.id} className="border-2 border-permdal-200 bg-white hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <CardTitle className="text-base font-semibold text-[#2c3e2d]">
                                    {o.produktName || `Bestellung ${o.id.slice(0, 6)}`}
                                  </CardTitle>
                                  <CardDescription className="text-sm text-[#5a5a5a]">
                                    {formatDate(o.createdAt)}
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
                                    {displayAsKg ? '1' : (Number.isFinite(mengeNum) ? mengeNum : o.menge)} {displayAsKg ? 'kg' : o.einheit}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Preis pro Einheit</span>
                                  <span className="font-medium">
                                    {formatPrice(o.preisEinheit)} / {displayAsKg ? 'kg' : o.einheit}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Gesamt</span>
                                  <span className="font-semibold">{formatPrice(o.preisGesamt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Abholung</span>
                                  <span className="font-medium">{o.abholung ? "Selbstabholung" : "Lieferung/Absprache"}</span>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">Angebot</span>
                                  <Button asChild variant="outline" size="sm">
                                    <Link to="/angebote/$id" params={{ id: String(o.angebotId) }}>Details</Link>
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
                        <Link to="/marktplatz">Zum Marktplatz</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
