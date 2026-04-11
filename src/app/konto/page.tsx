"use client";

import React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Copy,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sprout,
} from "lucide-react";

import { useAuthStore } from "@/features/auth/auth-store";
import { formatPickupSlotRange } from "@/features/pickup/pickup-schedule";
import { sendVerificationEmail as sendVerificationEmailRequest } from "@/lib/appwrite/appwriteAuth";
import { listBestellungen } from "@/lib/appwrite/appwriteOrders";
import {
  listMembershipsByUserId,
  type MembershipPayment,
  type MembershipRecord,
} from "@/lib/appwrite/appwriteMemberships";
import { requestMembership as requestMembershipAction } from "@/lib/appwrite/appwriteFunctions";
import { legalConfig } from "@/lib/legal";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type OrderRecord = Awaited<ReturnType<typeof listBestellungen>>[number];
type MembershipKind = "privat" | "betrieb";
type AsyncState = { state: "idle" | "loading" | "success" | "error"; message?: string };

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMoney(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function membershipTypeLabel(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "privat" || normalized === "private") return "Privat";
  if (normalized === "betrieb" || normalized === "business") return "Betrieb";
  return value || "Unbekannt";
}

function paymentStatusLabel(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "offen" || normalized === "open") return "Offen";
  if (normalized === "warten" || normalized === "pending") return "Wartet";
  if (normalized === "teilbezahlt" || normalized === "partial") return "Teilbezahlt";
  if (normalized === "bezahlt" || normalized === "paid") return "Bezahlt";
  if (normalized === "fehlgeschlagen" || normalized === "failed") return "Fehlgeschlagen";
  return value || "Unbekannt";
}

function membershipStatusMeta(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();

  if (normalized === "aktiv" || normalized === "active") {
    return {
      label: "Aktiv",
      className: "border-emerald-300/60 bg-emerald-100 text-emerald-900",
    };
  }

  if (normalized === "beantragt" || normalized === "pending") {
    return {
      label: "Beantragt",
      className: "border-amber-300/70 bg-amber-100 text-amber-900",
    };
  }

  if (normalized === "abgelaufen" || normalized === "expired") {
    return {
      label: "Abgelaufen",
      className: "border-slate-300/80 bg-slate-100 text-slate-800",
    };
  }

  if (normalized === "storniert" || normalized === "cancelled") {
    return {
      label: "Beendet",
      className: "border-rose-300/70 bg-rose-100 text-rose-900",
    };
  }

  return {
    label: value || "Unbekannt",
    className: "border-border bg-muted text-foreground",
  };
}

function orderStatusMeta(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();

  if (normalized === "angefragt") return { label: "Angefragt", variant: "secondary" as const };
  if (normalized === "bestaetigt" || normalized === "bestätigt") {
    return { label: "Bestätigt", variant: "default" as const };
  }
  if (normalized === "erfuellt") return { label: "Erfüllt", variant: "success" as const };
  if (normalized === "storniert") return { label: "Storniert", variant: "destructive" as const };

  return { label: value || "Unbekannt", variant: "outline" as const };
}

function translateMembershipError(message: string) {
  const lowered = message.toLowerCase();

  if (lowered.includes("no permissions provided for action 'execute'")) {
    return "Der Antrag kann gerade nicht gestartet werden. In Appwrite fehlt der Function `createMembership` die Execute-Berechtigung für eingeloggte Nutzer.";
  }
  if (lowered.includes("already have an active or pending membership")) {
    return "Für diesen Typ existiert bereits eine aktive oder ausstehende Mitgliedschaft.";
  }
  if (lowered.includes("unauthenticated")) {
    return "Die Sitzung ist abgelaufen. Bitte melde dich erneut an.";
  }
  if (lowered.includes("forbidden") && lowered.includes("email")) {
    return "Bitte verifiziere zuerst deine E-Mail-Adresse.";
  }
  if (lowered.includes("missing agb")) {
    return "Bitte bestätige zuerst die AGB für den Mitgliedschaftsantrag.";
  }
  if (lowered.includes("not configured")) {
    return "Die Mitgliedschaften sind derzeit noch nicht vollständig konfiguriert.";
  }
  if (lowered.includes("failed to create membership")) {
    return "Die Mitgliedschaft konnte gerade nicht angelegt werden.";
  }

  return message || "Die Mitgliedschaft konnte nicht verarbeitet werden.";
}

function paymentAmount(payment: MembershipPayment) {
  if (typeof payment.betragEur === "number" && Number.isFinite(payment.betragEur)) {
    return payment.betragEur;
  }

  if (typeof payment.betrag === "number" && Number.isFinite(payment.betrag)) {
    return payment.betrag;
  }

  return null;
}

function AccountGuestView() {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const searchStr = useLocation({ select: (state) => state.searchStr });
  const redirectTo = new URLSearchParams(searchStr).get("redirect") || "/konto";
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      setError("Bitte fülle E-Mail und Passwort aus.");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await login(String(email), String(password));

    if (!result.success) {
      setError(result.error?.message || "Die Anmeldung ist fehlgeschlagen.");
      setIsLoading(false);
      return;
    }

    void navigate({ to: redirectTo, replace: true });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(214,194,156,0.22),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(181,205,182,0.28),transparent_22%),linear-gradient(180deg,#fcfaf6_0%,#f3eee5_100%)] text-[var(--color-soil-900)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(34,48,38,0.08),transparent)]" />
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
        <section className="relative flex items-center">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(72,89,66,0.18)] bg-white/70 px-3 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-[var(--color-soil-700)] backdrop-blur">
              <Sprout className="size-3.5" />
              Agroforst Konto
            </div>
            <h1 className="font-display text-[clamp(3rem,8vw,6rem)] leading-[0.9] tracking-[-0.06em] text-[var(--color-soil-900)]">
              Ein Zugang für
              <br />
              Mitgliedschaft,
              <br />
              Bestellungen und
              <br />
              Übersicht.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[var(--color-soil-700)] sm:text-lg">
              Auf dieser Seite meldest du dich direkt an. Sobald du eingeloggt bist,
              wechselt die Ansicht in deinen Mitgliederbereich mit Kontoangaben,
              Statusübersicht und allen vorhandenen Mitgliedschaften.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ["Direkter Login", "Ohne Umweg über eine separate Route."],
                ["Mitgliedschaften", "Privat und Betrieb sauber getrennt im Blick."],
                ["Kontostand", "E-Mail, Rollen und letzte Bestellungen auf einen Blick."],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  className="rounded-[1.6rem] border border-[rgba(72,89,66,0.12)] bg-white/65 p-4 shadow-[0_20px_60px_-42px_rgba(39,33,24,0.38)] backdrop-blur"
                >
                  <p className="font-accent text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-soil-500)]">
                    {title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-soil-700)]">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center lg:justify-end">
          <Card className="w-full max-w-xl rounded-[2rem] border-white/70 bg-[linear-gradient(180deg,rgba(33,46,37,0.96),rgba(24,34,28,0.98))] py-0 text-white shadow-[0_40px_120px_-52px_rgba(18,25,21,0.72)] ring-1 ring-white/10">
            <CardHeader className="gap-3 border-b border-white/10 px-6 py-7 sm:px-8">
              <p className="font-accent text-[0.72rem] uppercase tracking-[0.24em] text-[rgba(241,228,204,0.78)]">
                Anmeldung
              </p>
              <CardTitle className="font-display text-4xl leading-[0.92] tracking-[-0.05em] text-white">
                Willkommen zurück
              </CardTitle>
              <CardDescription className="max-w-md text-[rgba(245,239,228,0.76)]">
                Melde dich an, um deine Mitgliedschaften zu verwalten und deine
                Kontoinformationen an einem Ort zu sehen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-7 sm:px-8">
              {error ? (
                <div className="rounded-[1.1rem] border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="konto-email" className="text-white/88">
                    E-Mail
                  </Label>
                  <Input
                    id="konto-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="mail@beispiel.de"
                    className="border-white/12 bg-white/7 text-white placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="konto-password" className="text-white/88">
                    Passwort
                  </Label>
                  <Input
                    id="konto-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="border-white/12 bg-white/7 text-white placeholder:text-white/40"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-12 w-full rounded-full bg-[rgba(240,227,195,0.98)] text-[var(--color-soil-900)] hover:bg-[rgba(247,238,214,1)]"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      Anmeldung läuft…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Anmelden
                      <ArrowRight className="size-4" />
                    </span>
                  )}
                </Button>
              </form>

              <Separator className="bg-white/10" />

              <div className="flex flex-col gap-3 text-sm text-white/76 sm:flex-row sm:items-center sm:justify-between">
                <p>Kein Konto vorhanden?</p>
                <Button asChild variant="outline" className="rounded-full border-white/18 bg-white/6 text-white hover:bg-white/10">
                  <Link to="/signup" search={{ redirect: redirectTo }}>
                    Registrieren
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function AccountSignedInView() {
  const { user, logout } = useAuthStore();
  const [memberships, setMemberships] = React.useState<MembershipRecord[]>([]);
  const [orders, setOrders] = React.useState<OrderRecord[]>([]);
  const [membershipLoadError, setMembershipLoadError] = React.useState<string | null>(null);
  const [isMembershipsLoading, setIsMembershipsLoading] = React.useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = React.useState(true);
  const [membershipType, setMembershipType] = React.useState<MembershipKind>("privat");
  const [agbAccepted, setAgbAccepted] = React.useState(false);
  const [membershipRequestState, setMembershipRequestState] = React.useState<AsyncState>({ state: "idle" });
  const [verificationState, setVerificationState] = React.useState<AsyncState>({ state: "idle" });
  const [copiedRef, setCopiedRef] = React.useState<string | null>(null);

  const hasPrivateMembership = React.useMemo(
    () => memberships.some((entry) => (entry.typ ?? "").toLowerCase() === "privat"),
    [memberships],
  );
  const hasBusinessMembership = React.useMemo(
    () => memberships.some((entry) => ["betrieb", "business"].includes((entry.typ ?? "").toLowerCase())),
    [memberships],
  );
  const availableMembershipTypes = React.useMemo<MembershipKind[]>(() => {
    const next: MembershipKind[] = [];
    if (!hasPrivateMembership) next.push("privat");
    if (!hasBusinessMembership) next.push("betrieb");
    return next;
  }, [hasBusinessMembership, hasPrivateMembership]);
  const primaryMembership = React.useMemo(() => {
    return memberships.find((entry) => (entry.status ?? "").toLowerCase() === "aktiv") ?? memberships[0] ?? null;
  }, [memberships]);

  const loadMemberships = React.useCallback(async () => {
    if (!user) return;

    setIsMembershipsLoading(true);
    setMembershipLoadError(null);

    try {
      const data = await listMembershipsByUserId({ userId: user.id, limit: 10 });
      setMemberships(data);
      setMembershipType((current) => {
        if (data.some((entry) => (entry.typ ?? "").toLowerCase() === current)) {
          return current === "privat" ? "betrieb" : "privat";
        }
        return current;
      });
    } catch (error) {
      setMembershipLoadError(
        error instanceof Error
          ? translateMembershipError(error.message)
          : "Die Mitgliedschaften konnten nicht geladen werden.",
      );
      setMemberships([]);
    } finally {
      setIsMembershipsLoading(false);
    }
  }, [user]);

  const loadOrders = React.useCallback(async () => {
    if (!user) return;

    setIsOrdersLoading(true);

    try {
      const data = await listBestellungen({ userId: user.id, limit: 6 });
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setIsOrdersLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void loadMemberships();
    void loadOrders();
  }, [loadMemberships, loadOrders]);

  React.useEffect(() => {
    if (availableMembershipTypes.length === 0) return;
    if (!availableMembershipTypes.includes(membershipType)) {
      setMembershipType(availableMembershipTypes[0]);
    }
  }, [availableMembershipTypes, membershipType]);

  const sendVerificationEmail = React.useCallback(async () => {
    if (!user || user.emailVerification || verificationState.state === "loading") return;

    setVerificationState({ state: "loading" });
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      if (!origin) throw new Error("Die Basis-URL konnte nicht ermittelt werden.");

      await sendVerificationEmailRequest({ verificationUrl: `${origin}/verify-email` });
      setVerificationState({
        state: "success",
        message: "Die Verifizierungs-Mail wurde versendet.",
      });
    } catch (error) {
      setVerificationState({
        state: "error",
        message: error instanceof Error ? error.message : "Die E-Mail konnte nicht versendet werden.",
      });
    }
  }, [user, verificationState.state]);

  const requestMembership = React.useCallback(async () => {
    if (!user) return;
    if (!user.emailVerification) {
      setMembershipRequestState({
        state: "error",
        message: "Bitte verifiziere zuerst deine E-Mail-Adresse.",
      });
      return;
    }
    if (!agbAccepted) {
      setMembershipRequestState({
        state: "error",
        message: "Bitte bestätige zuerst die AGB für den Mitgliedschaftsantrag.",
      });
      return;
    }

    setMembershipRequestState({ state: "loading" });
    try {
      const response = await requestMembershipAction({
        type: membershipType,
        agbVersion: legalConfig.agbVersion,
        agbAcceptedAt: new Date().toISOString(),
      });

      if (response.membership) {
        setMemberships((current) => {
          const next = current.filter((entry) => entry.id !== response.membership?.id);
          return [response.membership as MembershipRecord, ...next];
        });
      } else {
        await loadMemberships();
      }

      setMembershipRequestState({
        state: "success",
        message: `${membershipTypeLabel(membershipType)}-Mitgliedschaft wurde beantragt.`,
      });
    } catch (error) {
      setMembershipRequestState({
        state: "error",
        message: error instanceof Error ? translateMembershipError(error.message) : "Der Antrag ist fehlgeschlagen.",
      });
    }
  }, [agbAccepted, loadMemberships, membershipType, user]);

  const handleCopy = React.useCallback(async (value: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopiedRef(value);
      window.setTimeout(() => {
        setCopiedRef((current) => (current === value ? null : current));
      }, 1800);
    } catch {
      setCopiedRef(null);
    }
  }, []);

  if (!user) return null;

  const labels = Array.isArray(user.labels) ? user.labels : [];
  const displayName = user.name || "Mitglied";
  const accountBadges = labels.length > 0 ? labels : ["konto"];
  const primaryStatus = primaryMembership ? membershipStatusMeta(primaryMembership.status) : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(227,214,184,0.26),transparent_24%),radial-gradient(circle_at_82%_14%,rgba(188,213,189,0.28),transparent_22%),linear-gradient(180deg,#fbf8f1_0%,#f4eee3_52%,#efe8da_100%)] text-[var(--color-soil-900)]">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <section className="relative overflow-hidden rounded-[2.2rem] border border-white/60 bg-[linear-gradient(135deg,rgba(35,47,39,0.96),rgba(24,33,28,0.98))] px-6 py-7 text-white shadow-[0_40px_120px_-56px_rgba(18,25,21,0.7)] sm:px-8 lg:px-10">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_30%,rgba(236,223,192,0.18),transparent_0_34%),radial-gradient(circle_at_78%_72%,rgba(158,194,160,0.18),transparent_0_28%)]" />
          <div className="relative flex flex-col gap-8">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[0.72rem] uppercase tracking-[0.2em] text-white/72">
                <ShieldCheck className="size-3.5" />
                Kontoübersicht
              </div>
              <h1 className="font-display text-[clamp(2.8rem,6vw,5.4rem)] leading-[0.9] tracking-[-0.06em] text-white">
                {displayName}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/72">
                Hier verwaltest du deine Mitgliedschaften, prüfst deinen Status
                und siehst die wichtigsten Kontoinformationen ohne Umwege.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {accountBadges.map((label) => (
                  <Badge
                    key={label}
                    className="rounded-full border-white/12 bg-white/8 px-3 py-1 text-white/88"
                    variant="outline"
                  >
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Badge className="h-auto rounded-full border-white/12 bg-white/8 px-4 py-2 text-sm text-white/88" variant="outline">
                {memberships.length} Mitgliedschaften
              </Badge>
              <Badge className="h-auto rounded-full border-white/12 bg-white/8 px-4 py-2 text-sm text-white/88" variant="outline">
                {orders.length} Bestellungen
              </Badge>
              <Badge className="h-auto rounded-full border-white/12 bg-white/8 px-4 py-2 text-sm text-white/88" variant="outline">
                {primaryStatus?.label || "Noch keine Mitgliedschaft"}
              </Badge>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6">
            <Card className="rounded-[1.8rem] border-white/70 bg-white/75 shadow-[0_28px_90px_-60px_rgba(45,34,20,0.45)] backdrop-blur">
              <CardHeader className="gap-2">
                <CardTitle className="font-display text-3xl tracking-[-0.04em]">Kontoinformationen</CardTitle>
                <CardDescription>Dein Profil, Verifizierung und direkte Aktionen.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4">
                  <div className="grid gap-4">
                    <div className="rounded-[1.3rem] border border-border/70 bg-background/80 p-4">
                      <p className="font-accent text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">E-Mail</p>
                      <p className="mt-2 break-all text-lg leading-snug font-medium text-foreground sm:text-xl">
                        {user.email || "—"}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-[1.3rem] border border-border/70 bg-background/80 p-4">
                        <p className="font-accent text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Name</p>
                        <p className="mt-2 text-lg font-medium text-foreground">{displayName}</p>
                      </div>
                      <div className="rounded-[1.3rem] border border-border/70 bg-background/80 p-4">
                        <p className="font-accent text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Konto</p>
                        <p className="mt-2 text-lg font-medium text-foreground">{labels.join(", ") || "Standardkonto"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-border/70 bg-background/80 p-4">
                    <p className="font-accent text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Aktionen</p>
                    <div className="mt-3 flex flex-col gap-3">
                      {!user.emailVerification ? (
                        <Button
                          onClick={sendVerificationEmail}
                          disabled={verificationState.state === "loading"}
                          className="w-full rounded-full"
                        >
                          {verificationState.state === "loading" ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin" />
                              Wird versendet…
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Mail className="size-4" />
                              Verifizierungs-Mail senden
                            </span>
                          )}
                        </Button>
                      ) : (
                        <Badge
                          variant="outline"
                          className="h-auto min-h-10 justify-start rounded-full border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900"
                        >
                          Deine E-Mail-Adresse ist bestätigt.
                        </Badge>
                      )}
                      <Button onClick={logout} variant="outline" className="w-full rounded-full">
                        <span className="flex items-center gap-2">
                          <LogOut className="size-4" />
                          Abmelden
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-border/70 bg-background/75 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-accent text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge
                          variant={user.emailVerification ? "success" : "warning"}
                          className="h-auto rounded-full px-3 py-1.5 text-sm"
                        >
                          {user.emailVerification ? "E-Mail verifiziert" : "Verifizierung ausstehend"}
                        </Badge>
                        {(labels.length > 0 ? labels : ["Standardkonto"]).map((label) => (
                          <Badge key={label} variant="secondary" className="h-auto rounded-full px-3 py-1.5 text-sm">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {verificationState.message ? (
                      <p
                        className={cn(
                          "max-w-md text-sm leading-6 md:text-right",
                          verificationState.state === "error" ? "text-destructive" : "text-emerald-700",
                        )}
                      >
                        {verificationState.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] border-white/70 bg-white/78 shadow-[0_28px_90px_-60px_rgba(45,34,20,0.45)] backdrop-blur">
              <CardHeader className="gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="font-display text-3xl tracking-[-0.04em]">Mitgliedschaften</CardTitle>
                  <CardDescription>
                    Vorhandene Mitgliedschaften, Zahlungsreferenzen und neue Anträge.
                  </CardDescription>
                </div>
                <Button onClick={() => void loadMemberships()} variant="outline" size="sm" className="rounded-full">
                  <span className="flex items-center gap-2">
                    <RefreshCw className={cn("size-4", isMembershipsLoading && "animate-spin")} />
                    Aktualisieren
                  </span>
                </Button>
              </CardHeader>
              <CardContent className="space-y-5">
                {membershipLoadError ? (
                  <div className="rounded-[1.2rem] border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                    {membershipLoadError}
                  </div>
                ) : null}

                {isMembershipsLoading ? (
                  <div className="rounded-[1.3rem] border border-border/70 bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                    Mitgliedschaften werden geladen…
                  </div>
                ) : memberships.length === 0 ? (
                  <div className="rounded-[1.3rem] border border-dashed border-border bg-background/70 px-5 py-8">
                    <p className="font-display text-2xl tracking-[-0.03em] text-foreground">
                      Noch keine Mitgliedschaft vorhanden
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                      Lege hier deinen ersten Antrag an. Nach dem Login bleibt diese
                      Seite dein zentraler Bereich für Privat- und Betriebsmitgliedschaften.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {memberships.map((membership) => {
                      const status = membershipStatusMeta(membership.status);
                      return (
                        <div
                          key={membership.id}
                          className="rounded-[1.55rem] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(249,245,236,0.92))] p-5 shadow-[0_18px_44px_-38px_rgba(30,24,18,0.35)]"
                        >
                          <div className="flex flex-col gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-display text-[1.8rem] leading-none tracking-[-0.04em] text-foreground">
                                  {membershipTypeLabel(membership.typ)}
                                </p>
                                <Badge className={cn("rounded-full border px-3 py-1", status.className)} variant="outline">
                                  {status.label}
                                </Badge>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                {membership.membershipNumber
                                  ? `Mitgliedsnummer ${membership.membershipNumber}`
                                  : "Mitgliedsnummer wird nach Freigabe vergeben."}
                              </p>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <div className="rounded-[1.15rem] border border-border/60 bg-background/75 px-4 py-3">
                                  <p className="font-accent text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Beantragt am</p>
                                  <p className="mt-2 text-base font-medium text-foreground">{formatDate(membership.beantragungsDatum)}</p>
                                </div>
                                <div className="rounded-[1.15rem] border border-border/60 bg-background/75 px-4 py-3">
                                  <p className="font-accent text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Startguthaben</p>
                                  <p className="mt-2 text-base font-medium text-foreground">{formatMoney(membership.kontingentStart)}</p>
                                </div>
                                <div className="rounded-[1.15rem] border border-border/60 bg-background/75 px-4 py-3">
                                  <p className="font-accent text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Aktuelles Guthaben</p>
                                  <p className="mt-2 text-base font-medium text-foreground">{formatMoney(membership.kontingentAktuell)}</p>
                                </div>
                                <div className="rounded-[1.15rem] border border-border/60 bg-background/75 px-4 py-3">
                                  <p className="font-accent text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground">Laufzeit</p>
                                  <p className="mt-2 text-base font-medium text-foreground">
                                    {membership.dauerJahre ? `${membership.dauerJahre} Jahr${membership.dauerJahre > 1 ? "e" : ""}` : "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {membership.payments.length > 0 ? (
                            <>
                              <Separator className="my-4" />
                              <div className="grid gap-3">
                                {membership.payments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="flex flex-col gap-3 rounded-[1.2rem] border border-border/60 bg-background/78 p-4"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary" className="rounded-full">
                                          {paymentStatusLabel(payment.status)}
                                        </Badge>
                                        <p className="text-sm font-medium text-foreground">
                                          {formatMoney(paymentAmount(payment))}
                                        </p>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        Fällig: {formatDate(payment.faelligAm)} · Erfasst: {formatDate(payment.createdAt, true)}
                                      </p>
                                      <p className="font-mono text-xs break-all text-muted-foreground">
                                        Referenz: {payment.ref || "—"}
                                      </p>
                                    </div>
                                    {payment.ref ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full"
                                        onClick={() => void handleCopy(payment.ref!)}
                                      >
                                        <span className="flex items-center gap-2">
                                          {copiedRef === payment.ref ? <Check className="size-4" /> : <Copy className="size-4" />}
                                          {copiedRef === payment.ref ? "Kopiert" : "Referenz kopieren"}
                                        </span>
                                      </Button>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="rounded-[1.5rem] border border-[rgba(82,95,74,0.12)] bg-[linear-gradient(135deg,rgba(241,236,226,0.95),rgba(236,231,219,0.9))] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                              <p className="font-accent text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-soil-500)]">
                                Neuer Antrag
                              </p>
                      <h3 className="mt-2 font-display text-[2rem] leading-[0.95] tracking-[-0.04em] text-[var(--color-soil-900)]">
                        Weitere Mitgliedschaft anlegen
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-soil-700)]">
                        Wenn ein Typ noch fehlt, kannst du ihn direkt hier beantragen.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(["privat", "betrieb"] as MembershipKind[]).map((value) => {
                        const unavailable = !availableMembershipTypes.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            disabled={unavailable}
                            onClick={() => setMembershipType(value)}
                            className={cn(
                              "rounded-full border px-4 py-2 text-sm font-medium transition",
                              membershipType === value
                                ? "border-[var(--color-soil-900)] bg-[var(--color-soil-900)] text-white"
                                : "border-border bg-white text-foreground",
                              unavailable && "cursor-not-allowed opacity-45",
                            )}
                          >
                            {membershipTypeLabel(value)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-[var(--color-soil-700)]">
                      {availableMembershipTypes.length === 0
                        ? "Privat- und Betriebsmitgliedschaft sind bereits vorhanden."
                        : user.emailVerification
                          ? "Anträge werden mit deinem bestehenden Konto verknüpft."
                          : "Vor dem Antrag muss zuerst die E-Mail-Adresse bestätigt werden."}
                    </div>
                    <Button
                      onClick={requestMembership}
                      disabled={availableMembershipTypes.length === 0 || membershipRequestState.state === "loading"}
                      className="rounded-full"
                    >
                      {membershipRequestState.state === "loading" ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Antrag läuft…
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Sprout className="size-4" />
                          {membershipTypeLabel(membershipType)} beantragen
                        </span>
                        )}
                    </Button>
                  </div>

                  <label className="mt-4 flex items-start gap-3 rounded-[1.1rem] border border-border/70 bg-background/70 px-4 py-3 text-sm text-[var(--color-soil-700)]">
                    <input
                      type="checkbox"
                      checked={agbAccepted}
                      onChange={(event) => setAgbAccepted(event.target.checked)}
                      className="mt-1 size-4 rounded border-border"
                    />
                    <span>
                      Ich habe die{" "}
                      <Link to="/agbs" className="font-medium text-foreground underline underline-offset-4">
                        AGB
                      </Link>{" "}
                      in Version {legalConfig.agbVersion} gelesen und akzeptiere
                      sie für diesen Mitgliedschaftsantrag.
                    </span>
                  </label>

                  {membershipRequestState.message ? (
                    <p
                      className={cn(
                        "mt-3 text-sm",
                        membershipRequestState.state === "error" ? "text-destructive" : "text-emerald-700",
                      )}
                    >
                      {membershipRequestState.message}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] border-white/70 bg-white/75 shadow-[0_28px_90px_-60px_rgba(45,34,20,0.45)] backdrop-blur">
              <CardHeader className="gap-2">
                <CardTitle className="font-display text-3xl tracking-[-0.04em]">Zusammenfassung</CardTitle>
                <CardDescription>Der aktuelle Stand deines Kontos in ruhiger, kompakter Form.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[1.3rem] border border-border/70 bg-background/80 p-4">
                  <p className="font-accent text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Primäre Mitgliedschaft</p>
                  <p className="mt-2 text-lg font-medium text-foreground">
                    {primaryMembership ? membershipTypeLabel(primaryMembership.typ) : "Keine vorhanden"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {primaryMembership ? primaryStatus?.label : "Noch kein Antrag gestellt"}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-border/70 bg-background/80 p-4">
                  <p className="font-accent text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Letzte Aktivität</p>
                  <p className="mt-2 text-lg font-medium text-foreground">
                    {orders[0] ? formatDate(orders[0].createdAt, true) : "Noch keine Bestellung"}
                  </p>
                </div>
                <div className="rounded-[1.3rem] border border-border/70 bg-background/80 p-4">
                  <p className="font-accent text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">Offene Zahlungsreferenzen</p>
                  <p className="mt-2 text-lg font-medium text-foreground">
                    {
                      memberships.flatMap((membership) => membership.payments).filter((payment) =>
                        ["offen", "warten", "pending", "open"].includes((payment.status ?? "").toLowerCase()),
                      ).length
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[1.8rem] border-white/70 bg-white/75 shadow-[0_28px_90px_-60px_rgba(45,34,20,0.45)] backdrop-blur">
              <CardHeader className="gap-2">
                <CardTitle className="font-display text-3xl tracking-[-0.04em]">Bestellungen</CardTitle>
                <CardDescription>Die letzten Bestellungen deines Kontos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isOrdersLoading ? (
                  <div className="rounded-[1.2rem] border border-border/70 bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                    Bestellungen werden geladen…
                  </div>
                ) : orders.length === 0 ? (
                  <div className="rounded-[1.2rem] border border-dashed border-border bg-background/70 px-4 py-8 text-center text-sm text-muted-foreground">
                    Für dieses Konto gibt es noch keine Bestellungen.
                  </div>
                ) : (
                  orders.map((order) => {
                    const status = orderStatusMeta(order.status);
                    return (
                      <div
                        key={order.id}
                        className="rounded-[1.2rem] border border-border/70 bg-background/76 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-medium text-foreground">
                              {order.produktName || "Produkt"}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatDate(order.createdAt, true)}
                            </p>
                          </div>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                          <span>Menge: {Number.isFinite(order.menge) ? `${order.menge} ${order.einheit}` : "—"}</span>
                          <span>Gesamt: {formatMoney(order.preisGesamt)}</span>
                        </div>
                        <div className="mt-3 rounded-[1rem] border border-border/60 bg-background/72 px-3 py-3 text-sm text-muted-foreground">
                          <p className="font-medium text-foreground">
                            {formatPickupSlotRange(
                              order.pickupSlotStart,
                              order.pickupSlotEnd,
                              order.pickupSlotLabel,
                            )}
                          </p>
                          {order.pickupLocation ? <p className="mt-1">{order.pickupLocation}</p> : null}
                          {order.pickupNote ? <p className="mt-1">{order.pickupNote}</p> : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
        </section>
      </div>
    </main>
  );
}

export default function AccountPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <AccountGuestView />;
  }

  return <AccountSignedInView />;
}
