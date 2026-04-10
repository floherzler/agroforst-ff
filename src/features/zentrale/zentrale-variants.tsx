"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  ArrowRight,
  Boxes,
  CalendarRange,
  ClipboardList,
  Euro,
  KanbanSquare,
  LayoutDashboard,
  Layers3,
  Package2,
  Sprout,
  TableProperties,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OfferBoard,
  BieteSucheEditor,
  BieteSucheTable,
  OfferEditor,
  OfferTable,
  OperationsBoard,
  ProductEditor,
  ProductGallery,
  ProductQuickList,
  ProductTable,
  WorkbenchBrowser,
} from "@/features/zentrale/admin-ui";
import { useZentraleAdmin } from "@/features/zentrale/use-zentrale-admin";
import { listAlleProdukte, listStaffeln } from "@/lib/appwrite/appwriteProducts";
import { listBieteSucheEintraege } from "@/lib/appwrite/appwriteExchange";
import { cn } from "@/lib/utils";

type VariantSlug = "classic" | "operations" | "compact";

function ZentraleLoading() {
  return (
    <main className="min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="zentrale-shell mx-auto flex w-full max-w-[1600px] flex-col gap-6 rounded-[2rem] p-4 sm:p-6">
        <Skeleton className="h-48 w-full rounded-[1.75rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32 rounded-[1.5rem]" />
          <Skeleton className="h-32 rounded-[1.5rem]" />
          <Skeleton className="h-32 rounded-[1.5rem]" />
          <Skeleton className="h-32 rounded-[1.5rem]" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Skeleton className="h-[36rem] rounded-[1.75rem]" />
          <Skeleton className="h-[36rem] rounded-[1.75rem]" />
        </div>
      </div>
    </main>
  );
}

function ZentraleError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-destructive/40 bg-card/95 shadow-brand-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Activity />
            Fehler beim Laden
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function VariantHero({
  eyebrow,
  title,
  description,
  badge,
  actionHref = "/zentrale",
  actionLabel = "Zur Variantenwahl",
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className="zentrale-hero-card relative overflow-hidden rounded-[2rem] px-6 py-7 sm:px-8 sm:py-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(106,168,114,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(39,38,21,0.18),transparent_32%)]" />
      <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/35 blur-3xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="border-0 bg-earth-500 text-white">{eyebrow}</Badge>
            <Badge variant="outline" className="border-earth-500/20 bg-white/50 text-earth-500">
              {badge}
            </Badge>
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-earth-700 sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-earth-500 sm:text-base">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="bg-earth-500 text-white hover:bg-earth-600">
            <a href={actionHref}>
              <ArrowRight data-icon="inline-end" />
              {actionLabel}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Package2;
  accent: string;
}) {
  return (
    <Card className="zentrale-panel border-0">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.24em] text-earth-400">{label}</span>
          <span className="text-2xl font-semibold tracking-tight text-earth-700">{value}</span>
          <span className="text-sm text-earth-500">{detail}</span>
        </div>
        <div className={cn("rounded-[1.25rem] border border-white/70 p-3 text-white shadow-brand-soft", accent)}>
          <Icon />
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({
  title,
  description,
  badge,
  children,
  className,
}: {
  title: string;
  description: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("zentrale-panel border-0", className)}>
      <CardHeader className="gap-2 border-b border-earth-500/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-earth-700">{title}</CardTitle>
            <CardDescription className="text-earth-500">{description}</CardDescription>
          </div>
          {badge ? (
            <Badge variant="outline" className="border-earth-500/15 bg-white/60 text-earth-500">
              {badge}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn("pt-5", className)}>{children}</CardContent>
    </Card>
  );
}

function ClassicVariant({
  initialProdukte,
  initialStaffeln,
  initialBieteSucheEintraege,
}: {
  initialProdukte: Produkt[];
  initialStaffeln: Staffel[];
  initialBieteSucheEintraege: BieteSucheEintrag[];
}) {
  const state = useZentraleAdmin({ initialProdukte, initialStaffeln, initialBieteSucheEintraege });

  return (
    <main className="min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="zentrale-shell mx-auto flex w-full max-w-[1600px] flex-col gap-6 rounded-[2rem] p-4 sm:p-6">
        <VariantHero
          eyebrow="Agroforst FF"
          title="Katalogzentrale mit ruhiger, editorieller Arbeitsfläche."
          description="Die klassische Ansicht priorisiert Lesbarkeit, klare Signalstufen und entspannte Stammdatenpflege. Produktkatalog und Saisonangebote teilen sich denselben Datenfluss, aber jede Zone bekommt eine eigene visuelle Rolle."
          badge="Klassisch"
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Produkte"
            value={String(state.produkte.length)}
            detail="Katalogeinträge mit Realtime-Aktualisierung"
            icon={Package2}
            accent="bg-gradient-to-br from-permdal-500 to-permdal-700"
          />
          <StatCard
            label="Angebote"
            value={String(state.staffeln.length)}
            detail="Geplante Saisonfenster und Verfügbarkeiten"
            icon={CalendarRange}
            accent="bg-gradient-to-br from-earth-400 to-earth-600"
          />
          <StatCard
              label="Verfügbar"
            value={String(state.totalAvailableQuantity)}
              detail="Einheiten über alle aktiven Angebote"
            icon={Boxes}
            accent="bg-gradient-to-br from-lilac-500 to-lilac-700"
          />
          <StatCard
            label="Umsatz"
            value={state.formatCurrency(state.totalExpectedRevenue)}
            detail="Prognose auf Basis der Angebotsdaten"
            icon={Euro}
            accent="bg-gradient-to-br from-emerald-500 to-teal-700"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-6">
            <SectionCard
              title="Arbeitsmodus"
              description="Produktkartei und Angebotsplanung nutzen denselben Editorbereich."
              badge="Navigation"
            >
              <div className="flex flex-col gap-3">
                <Button
                  variant={state.activePanel === "produkte" ? "default" : "outline"}
                  className={cn(
                    "h-auto justify-start rounded-[1.2rem] px-4 py-3 text-left",
                    state.activePanel === "produkte" ? "bg-earth-500 text-white hover:bg-earth-600" : "",
                  )}
                  onClick={() => state.setActivePanel("produkte")}
                >
                  <Boxes data-icon="inline-start" />
                  Produktkartei
                </Button>
                <Button
                  variant={state.activePanel === "angebote" ? "default" : "outline"}
                  className={cn(
                    "h-auto justify-start rounded-[1.2rem] px-4 py-3 text-left",
                    state.activePanel === "angebote" ? "bg-earth-500 text-white hover:bg-earth-600" : "",
                  )}
                  onClick={() => state.setActivePanel("angebote")}
                >
                  <CalendarRange data-icon="inline-start" />
                  Saisonangebote
                </Button>
                <Button
                  variant={state.activePanel === "biete-suche" ? "default" : "outline"}
                  className={cn(
                    "h-auto justify-start rounded-[1.2rem] px-4 py-3 text-left",
                    state.activePanel === "biete-suche" ? "bg-earth-500 text-white hover:bg-earth-600" : "",
                  )}
                  onClick={() => state.setActivePanel("biete-suche")}
                >
                  <ArrowRightLeft data-icon="inline-start" />
                  Biete / Suche
                </Button>
              </div>
              <Separator className="my-5" />
              <div className="grid gap-3">
                <div className="rounded-[1.25rem] bg-white/70 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-earth-400">Aktives Produkt</div>
                  <div className="mt-2 text-sm font-medium text-earth-700">
                    {state.selectedProduct ? state.selectedProduct.name : "Noch nichts ausgewählt"}
                  </div>
                </div>
                <div className="rounded-[1.25rem] bg-white/70 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-earth-400">Aktives Angebot</div>
                  <div className="mt-2 text-sm font-medium text-earth-700">
                    {state.selectedOffer ? state.selectedOffer.id : "Kein Angebot im Fokus"}
                  </div>
                </div>
                <div className="rounded-[1.25rem] bg-white/70 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-earth-400">Aktiver Biete/Suche-Eintrag</div>
                  <div className="mt-2 text-sm font-medium text-earth-700">
                    {state.selectedBieteSuche ? state.selectedBieteSuche.titel : "Kein Eintrag im Fokus"}
                  </div>
                </div>
              </div>
            </SectionCard>

            <ProductQuickList state={state} />
          </aside>

          <div className="flex flex-col gap-6">
            {state.activePanel === "produkte" ? (
              <>
                <SectionCard
                  title="Produktfläche"
                  description="Kartenansicht für schnelle Auswahl, Sortenkontrolle und interne Hinweise."
                  badge={`${state.visibleProducts.length} sichtbar`}
                >
                  <ProductGallery state={state} className="border-0 bg-transparent shadow-none" />
                </SectionCard>
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <ProductEditor state={state} />
                  <ProductTable state={state} caption="Auswahl und Kontrolle im Tabellenformat" />
                </div>
              </>
            ) : state.activePanel === "angebote" ? (
              <>
                <SectionCard
                  title="Angebotslage"
                  description="Signalübersicht für verfügbar, knapp und leer. Ideal für den täglichen Betriebsblick."
                  badge={`${state.visibleOffers.length} sichtbar`}
                >
                  <OfferBoard state={state} className="border-0 bg-transparent shadow-none" />
                </SectionCard>
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <OfferEditor state={state} />
                  <OfferTable state={state} caption="Preis-, Mengen- und Terminprüfung" />
                </div>
              </>
            ) : (
              <>
                <SectionCard
                  title="Austauschfläche"
                  description="Frei gepflegte Gesuche und Angebote mit Tag-Logik für Maschinen, Nachbarschaftshilfe und ähnliche Themen."
                  badge={`${state.visibleBieteSucheEintraege.length} sichtbar`}
                >
                  <BieteSucheTable
                    state={state}
                    caption="Alle Biete/Suche-Einträge mit Modus, Hinweisen und Schlagworten."
                  />
                </SectionCard>
                <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                  <BieteSucheEditor state={state} />
                  <BieteSucheTable state={state} caption="Schneller Zugriff und Detailkontrolle" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function OperationsVariant({
  initialProdukte,
  initialStaffeln,
  initialBieteSucheEintraege,
}: {
  initialProdukte: Produkt[];
  initialStaffeln: Staffel[];
  initialBieteSucheEintraege: BieteSucheEintrag[];
}) {
  const state = useZentraleAdmin({ initialProdukte, initialStaffeln, initialBieteSucheEintraege });

  return (
    <main className="min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1650px] flex-col gap-6 rounded-[2rem] border border-white/10 bg-slate-950 px-4 py-4 text-slate-50 shadow-[0_32px_100px_-40px_rgba(0,0,0,0.75)] sm:px-6 sm:py-6">
        <section className="relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.03] px-6 py-7">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.16),transparent_30%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="border-0 bg-emerald-500/15 text-emerald-300">Live-Betrieb</Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
                Einsatzleitung für schnelle Engpass-Erkennung.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Diese Variante zieht Kennzahlen, Monitor und Editoren enger zusammen. Sie ist für kurze
                Kontrollzyklen gebaut: scannen, priorisieren, ändern.
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white">
              <a href="/zentrale">
                <KanbanSquare data-icon="inline-start" />
                Design wechseln
              </a>
            </Button>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Produkte",
              value: String(state.produkte.length),
              detail: "Im aktiven Katalog",
              icon: Package2,
              tone: "from-sky-500/30 to-sky-400/10 text-sky-200",
            },
            {
              label: "Angebote",
              value: String(state.staffeln.length),
              detail: "Live und geplant",
              icon: CalendarRange,
              tone: "from-indigo-500/30 to-indigo-400/10 text-indigo-200",
            },
            {
              label: "Verfügbar",
              value: String(state.totalAvailableQuantity),
              detail: "Sofort disponibel",
              icon: Boxes,
              tone: "from-amber-500/30 to-amber-400/10 text-amber-100",
            },
            {
              label: "Umsatzpotenzial",
              value: state.formatCurrency(state.totalExpectedRevenue),
              detail: "Erwartete Erlöse",
              icon: Euro,
              tone: "from-emerald-500/30 to-emerald-400/10 text-emerald-100",
            },
          ].map((stat) => (
            <Card key={stat.label} className="border-white/10 bg-white/[0.03] text-slate-50">
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="flex flex-col gap-1">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{stat.label}</div>
                  <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.detail}</div>
                </div>
                <div className={cn("rounded-[1.2rem] border border-white/10 bg-gradient-to-br p-3", stat.tone)}>
                  <stat.icon />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-white/[0.03] text-slate-50">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard />
                Überwachungsübersicht
              </CardTitle>
              <CardDescription className="text-slate-400">
                Die wichtigsten Auffälligkeiten direkt neben den operativen Übersichten.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pt-5">
              <OperationsBoard state={state} />
              <OfferBoard state={state} className="border-white/10 bg-white/[0.02]" />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="border-white/10 bg-white/[0.03] text-slate-50">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList />
                  Editorbereich
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Schnell zwischen Produkt- und Angebotsdaten wechseln.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <Tabs
                  value={state.activePanel}
                  onValueChange={(value) => state.setActivePanel(value as "produkte" | "angebote" | "biete-suche")}
                  className="gap-4"
                >
                  <TabsList className="grid w-full grid-cols-3 bg-white/5">
                    <TabsTrigger value="produkte">Produkte</TabsTrigger>
                    <TabsTrigger value="angebote">Angebote</TabsTrigger>
                    <TabsTrigger value="biete-suche">Biete / Suche</TabsTrigger>
                  </TabsList>
                  <TabsContent value="produkte" className="m-0">
                    <ProductEditor state={state} compact />
                  </TabsContent>
                  <TabsContent value="angebote" className="m-0">
                    <OfferEditor state={state} compact />
                  </TabsContent>
                  <TabsContent value="biete-suche" className="m-0">
                    <BieteSucheEditor state={state} compact />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03] text-slate-50">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <TableProperties />
                  Angebotsmonitor
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Tabellenansicht für Preis- und Mengenkontrolle.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <OfferTable state={state} caption="Preis- und Mengenkontrolle" />
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-white/[0.03] text-slate-50">
              <CardHeader className="border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft />
                  Biete/Suche-Monitor
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Freie Hofgesuche und Angebote mit Tags, Modus und Kurzdetails.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <BieteSucheTable state={state} caption="Austausch-Einträge im Überblick" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

function CompactVariant({
  initialProdukte,
  initialStaffeln,
  initialBieteSucheEintraege,
}: {
  initialProdukte: Produkt[];
  initialStaffeln: Staffel[];
  initialBieteSucheEintraege: BieteSucheEintrag[];
}) {
  const state = useZentraleAdmin({ initialProdukte, initialStaffeln, initialBieteSucheEintraege });

  return (
    <main className="min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="zentrale-shell mx-auto flex w-full max-w-[1750px] flex-col gap-4 rounded-[2rem] p-4 sm:p-5">
        <header className="zentrale-panel flex flex-col gap-4 rounded-[1.8rem] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-[1rem] bg-earth-500 p-3 text-white">
                <ClipboardList />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-earth-400">Kompakte Arbeitsfläche</div>
                <h1 className="text-2xl font-semibold tracking-tight text-earth-700">Dichte Oberfläche für schnelle Arbeit</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-earth-500">
              <Badge variant="outline" className="border-earth-500/15 bg-white/50 text-earth-500">
                {state.produkte.length} Produkte
              </Badge>
              <Badge variant="outline" className="border-earth-500/15 bg-white/50 text-earth-500">
                {state.staffeln.length} Angebote
              </Badge>
              <Badge variant="outline" className="border-earth-500/15 bg-white/50 text-earth-500">
                {state.bieteSucheEintraege.length} Biete/Suche
              </Badge>
              <Badge variant="outline" className="border-earth-500/15 bg-white/50 text-earth-500">
                {state.formatCurrency(state.totalExpectedRevenue)}
              </Badge>
            </div>
          </div>
          <Button asChild variant="outline">
            <a href="/zentrale">
              <ArrowRight data-icon="inline-end" />
              Zur Variantenwahl
            </a>
          </Button>
        </header>

        <div className="grid min-h-[78vh] gap-4 lg:grid-cols-12">
          <Card className="zentrale-panel lg:col-span-3">
            <CardHeader className="border-b border-earth-500/10">
              <CardTitle className="flex items-center gap-2 text-earth-700">
                <Sprout />
                Navigationsleiste
              </CardTitle>
              <CardDescription className="text-earth-500">
                Tastaturfreundliche Listen mit schneller Kontextumschaltung.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(78vh-7rem)] p-0">
              <ScrollArea className="h-full px-4 py-4">
                <WorkbenchBrowser state={state} className="border-0 bg-transparent shadow-none" />
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="zentrale-panel lg:col-span-4">
            <CardHeader className="border-b border-earth-500/10">
              <CardTitle className="text-earth-700">Bearbeitung</CardTitle>
              <CardDescription className="text-earth-500">
                Ein Bereich für Produkt- und Angebotsformular.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(78vh-7rem)] p-0">
              <Tabs
                value={state.activePanel}
                onValueChange={(value) => state.setActivePanel(value as "produkte" | "angebote" | "biete-suche")}
                className="flex h-full flex-col gap-0"
              >
                <div className="border-b border-earth-500/10 px-4 py-3">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="produkte">Produktbearbeitung</TabsTrigger>
                    <TabsTrigger value="angebote">Angebotsbearbeitung</TabsTrigger>
                    <TabsTrigger value="biete-suche">Biete / Suche</TabsTrigger>
                  </TabsList>
                </div>
                <ScrollArea className="h-full px-4 py-4">
                  <TabsContent value="produkte" className="m-0">
                    <ProductEditor state={state} compact />
                  </TabsContent>
                  <TabsContent value="angebote" className="m-0">
                    <OfferEditor state={state} compact />
                  </TabsContent>
                  <TabsContent value="biete-suche" className="m-0">
                    <BieteSucheEditor state={state} compact />
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 lg:col-span-5">
            <Card className="zentrale-panel flex-1">
              <CardHeader className="border-b border-earth-500/10">
                <CardTitle className="text-earth-700">Produktdatenbank</CardTitle>
                <CardDescription className="text-earth-500">
                  Tabellarische Kontrolle für Stammdaten und Auswahl.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(39vh-4rem)] overflow-auto pt-4">
                <ProductTable state={state} dense />
              </CardContent>
            </Card>

            <Card className="zentrale-panel flex-1">
              <CardHeader className="border-b border-earth-500/10">
                <CardTitle className="text-earth-700">Biete / Suche</CardTitle>
                <CardDescription className="text-earth-500">
                  Freie Gesuche und Angebote mit Tags und Kurzinfos.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[calc(39vh-4rem)] overflow-auto pt-4">
                <BieteSucheTable state={state} dense />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ZentraleVariantPage({ variant }: { variant: VariantSlug }) {
  const [produkte, setProdukte] = useState<Produkt[] | null>(null);
  const [staffeln, setStaffeln] = useState<Staffel[] | null>(null);
  const [bieteSucheEintraege, setBieteSucheEintraege] = useState<BieteSucheEintrag[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [produkteResponse, staffelnResponse, bieteSucheResponse] = await Promise.all([
          listAlleProdukte(),
          listStaffeln(),
          listBieteSucheEintraege(),
        ]);
        setProdukte(produkteResponse as unknown as Produkt[]);
        setStaffeln(staffelnResponse as unknown as Staffel[]);
        setBieteSucheEintraege(bieteSucheResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }

    load();
  }, []);

  if (error) {
    return <ZentraleError message={error} />;
  }

  if (!produkte || !staffeln || !bieteSucheEintraege) {
    return <ZentraleLoading />;
  }

  switch (variant) {
    case "classic":
      return <ClassicVariant initialProdukte={produkte} initialStaffeln={staffeln} initialBieteSucheEintraege={bieteSucheEintraege} />;
    case "operations":
      return <OperationsVariant initialProdukte={produkte} initialStaffeln={staffeln} initialBieteSucheEintraege={bieteSucheEintraege} />;
    case "compact":
      return <CompactVariant initialProdukte={produkte} initialStaffeln={staffeln} initialBieteSucheEintraege={bieteSucheEintraege} />;
    default:
      return <ClassicVariant initialProdukte={produkte} initialStaffeln={staffeln} initialBieteSucheEintraege={bieteSucheEintraege} />;
  }
}
