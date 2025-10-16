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
  const membershipFunctionId = env.appwrite.membership_function_id;

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
      await functions.createExecution(
        membershipFunctionId,
        JSON.stringify({ type: membershipType })
      );
      setMembershipStatus({
        state: "success",
        message: "Ihre Anfrage wurde versendet. Wir melden uns schnellstmöglich.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Die Anfrage konnte nicht gesendet werden.";
      setMembershipStatus({ state: "error", message });
    }
  }, [membershipFunctionId, membershipType, user]);

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
                <CardTitle>Mitglied werden</CardTitle>
                <CardDescription>
                  Wählen Sie den passenden Mitgliedschaftstyp und senden Sie Ihre Anfrage.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={membershipType === "privat" ? "default" : "outline"}
                    onClick={() => selectMembershipType("privat")}
                    disabled={membershipStatus.state === "loading"}
                  >
                    Privat
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={membershipType === "business" ? "default" : "outline"}
                    onClick={() => selectMembershipType("business")}
                    disabled={membershipStatus.state === "loading"}
                  >
                    Business
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {membershipType === "privat"
                    ? "Für Privatpersonen mit einer Laufzeit von einem Jahr."
                    : "Für Unternehmen und Organisationen – wir melden uns zur weiteren Abstimmung."}
                </p>
                {!user.emailVerification && (
                  <p className="text-sm text-muted-foreground">
                    Bitte verifizieren Sie Ihre Email-Adresse, bevor Sie eine Mitgliedschaft beantragen.
                  </p>
                )}
                <Button
                  variant="default"
                  size="lg"
                  onClick={requestMembership}
                  disabled={!user.emailVerification || membershipStatus.state === "loading"}
                >
                  {membershipStatus.state === "loading" ? "Sende…" : "Mitgliedschaft beantragen"}
                </Button>
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
