"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BadgeEuro,
  Boxes,
  CheckCheck,
  ClipboardList,
  CreditCard,
  PackagePlus,
  Receipt,
  Search,
  Sprout,
} from "lucide-react";

import { OfferEditor, ProductEditor } from "@/features/zentrale/admin-ui";
import { displayProductName, displayValueLabel, formatCurrency } from "@/features/zentrale/admin-domain";
import { useZentraleAdmin } from "@/features/zentrale/use-zentrale-admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, type AuthUser } from "@/lib/appwrite/appwriteAuth";
import { listAdminMembershipPayments, type MembershipPayment } from "@/lib/appwrite/appwriteMemberships";
import { listBestellungen, subscribeToBestellungen } from "@/lib/appwrite/appwriteOrders";
import { listAlleProdukte, listStaffeln } from "@/lib/appwrite/appwriteProducts";
import { cn } from "@/lib/utils";

type ZentraleSection = "produkte" | "angebote" | "pruefungen" | "bestellungen" | "zahlungen";

const sectionMeta: Record<ZentraleSection, { title: string; description: string }> = {
  produkte: {
    title: "Katalogpflege",
    description: "Produkte lesen, auswählen und direkt in einer ruhigen Arbeitsfläche pflegen.",
  },
  angebote: {
    title: "Angebote und Saisonfenster",
    description: "Verfügbarkeiten, Mengen und Preislogik am Produktkontext ausrichten.",
  },
  pruefungen: {
    title: "Prüfungen",
    description: "Hinweise zu fehlenden Saisonangaben, Angeboten und leeren Beständen bündeln.",
  },
  bestellungen: {
    title: "Bestellungsübersicht",
    description: "Die jüngsten Bestellungen, Statuswechsel und Abholtermine als Queue beobachten.",
  },
  zahlungen: {
    title: "Offene Zahlungen",
    description: "Mitgliedsbeiträge priorisieren und offene oder wartende Zahlungen im Blick behalten.",
  },
};

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("de-DE", {
    dateStyle: "medium",
  });
}

function orderStatusClasses(status?: string) {
  switch ((status ?? "").toLowerCase()) {
    case "angefragt":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "bestaetigt":
      return "border-blue-200 bg-blue-50 text-blue-900";
    case "erfuellt":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "storniert":
      return "border-rose-200 bg-rose-50 text-rose-900";
    default:
      return "border-earth-500/15 bg-white/70 text-earth-500";
  }
}

function paymentStatusClasses(status?: string) {
  switch ((status ?? "").toLowerCase()) {
    case "offen":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "warten":
      return "border-blue-200 bg-blue-50 text-blue-900";
    case "teilbezahlt":
      return "border-violet-200 bg-violet-50 text-violet-900";
    case "bezahlt":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    default:
      return "border-earth-500/15 bg-white/70 text-earth-500";
  }
}

function AdminLoading() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <Skeleton className="h-24 rounded-[2rem]" />
        <Skeleton className="h-[48rem] rounded-[2rem]" />
      </div>
    </main>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-destructive/40 bg-card/95 shadow-brand-strong">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle />
            Fehler beim Laden
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function ProductCatalog({
  state,
  onNewProduct,
}: {
  state: ReturnType<typeof useZentraleAdmin>;
  onNewProduct: () => void;
}) {
  return (
    <Card className="zentrale-panel border-0">
      <CardHeader className="gap-3 border-b border-earth-500/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-earth-700">Produkte</CardTitle>
            <CardDescription>Katalogliste mit schneller Auswahl und Live-Filter.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onNewProduct}>
            <PackagePlus data-icon="inline-start" />
            Neu
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={state.productFilter}
            onChange={(event) => state.setProductFilter(event.target.value)}
            placeholder="Nach Name, Sorte oder Kategorie filtern"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[32rem]">
          <div className="flex flex-col gap-2 p-3">
            {state.visibleProducts.map((product) => {
              const selected = product.id === state.selectedProductId;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => state.selectProduct(product.id)}
                  className={cn(
                    "rounded-[1.4rem] border px-4 py-3 text-left transition",
                    selected
                      ? "border-permdal-300 bg-permdal-50 shadow-brand-soft"
                      : "border-earth-500/10 bg-white/70 hover:bg-white",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-earth-700">{displayProductName(product)}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{product.id}</div>
                    </div>
                    <Badge variant="outline">{displayValueLabel(product.hauptkategorie)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{displayValueLabel(product.unterkategorie) || "Ohne Unterkategorie"}</span>
                    <span>•</span>
                    <span>
                      {(product.saisonalitaet ?? []).length > 0
                        ? `Saison ${product.saisonalitaet.join(", ")}`
                        : "Keine Saison"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function RelatedOffersPanel({
  state,
  onCreateOffer,
}: {
  state: ReturnType<typeof useZentraleAdmin>;
  onCreateOffer: () => void;
}) {
  const selectedProduct = state.selectedProduct;

  return (
    <Card className="zentrale-panel border-0">
      <CardHeader className="gap-3 border-b border-earth-500/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-earth-700">Zugehörige Angebote</CardTitle>
            <CardDescription>
              {selectedProduct
                ? `Saisonangebote für ${displayProductName(selectedProduct)}`
                : "Wähle ein Produkt, um die zugehörigen Angebote zu sehen."}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateOffer}
            disabled={!selectedProduct}
          >
            <PackagePlus data-icon="inline-start" />
            Angebot
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {state.offersForSelectedProduct.length === 0 ? (
          <div className="p-5 text-sm text-muted-foreground">Noch kein Angebot für dieses Produkt angelegt.</div>
        ) : (
          <ScrollArea className="h-[19rem]">
            <div className="flex flex-col gap-2 p-3">
              {state.offersForSelectedProduct.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => state.selectOffer(offer.id)}
                  className={cn(
                    "rounded-[1.2rem] border px-4 py-3 text-left transition",
                    offer.id === state.selectedOfferId
                      ? "border-permdal-300 bg-permdal-50"
                      : "border-earth-500/10 bg-white/70 hover:bg-white",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-earth-700">{offer.year ?? "Ohne Jahr"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{offer.id}</div>
                    </div>
                    <Badge className={offer.mengeVerfuegbar > 0 ? "" : "bg-earth-100 text-earth-500"}>
                      {offer.mengeVerfuegbar} {offer.einheit}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>{formatCurrency(offer.euroPreis)}</span>
                    <span>{formatDateTime(offer.pickupAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function SelectedProductSnapshot({ state }: { state: ReturnType<typeof useZentraleAdmin> }) {
  const selectedProduct = state.selectedProduct;

  return (
    <Card className="zentrale-panel border-0">
      <CardHeader className="gap-2">
        <CardTitle className="text-earth-700">Produktkontext</CardTitle>
        <CardDescription>Kurzer Überblick für das aktuell gewählte Produkt.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {selectedProduct ? (
          <>
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-earth-400">Produkt</div>
              <div className="mt-1 font-medium text-earth-700">{displayProductName(selectedProduct)}</div>
              <div className="text-muted-foreground">{selectedProduct.id}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{displayValueLabel(selectedProduct.hauptkategorie)}</Badge>
              {selectedProduct.unterkategorie ? <Badge variant="secondary">{displayValueLabel(selectedProduct.unterkategorie)}</Badge> : null}
              {selectedProduct.lebensdauer ? <Badge variant="outline">{displayValueLabel(selectedProduct.lebensdauer)}</Badge> : null}
            </div>
            <div className="rounded-[1.2rem] border border-earth-500/10 bg-white/65 p-3 text-muted-foreground">
              {selectedProduct.notes?.trim() || "Keine internen Notizen hinterlegt."}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground">Kein Produkt gewählt.</div>
        )}
      </CardContent>
    </Card>
  );
}

function OrdersPreview({ orders }: { orders: Bestellung[] }) {
  return (
    <Card className="zentrale-panel border-0">
      <CardHeader className="gap-2">
        <CardTitle className="text-earth-700">Bestellungs-Queue</CardTitle>
        <CardDescription>Die letzten Vorgänge und anstehende Abholtermine im Blick behalten.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {orders.length === 0 ? (
          <div className="text-sm text-muted-foreground">Noch keine Bestellungen vorhanden.</div>
        ) : (
          orders.slice(0, 5).map((order) => (
            <div key={order.id} className="rounded-[1.2rem] border border-earth-500/10 bg-white/65 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-earth-700">{order.produktName || order.angebotId}</div>
                  <div className="text-xs text-muted-foreground">{order.id}</div>
                </div>
                <Badge className={orderStatusClasses(order.status)} variant="outline">
                  {order.status || "offen"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  {order.menge} {order.einheit}
                </span>
                <span>{formatCurrency(order.preisGesamt)}</span>
                <span>{order.abholung ? "Abholung geplant" : "Keine Abholung"}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PaymentPreview({ payments }: { payments: MembershipPayment[] }) {
  return (
    <Card className="zentrale-panel border-0">
      <CardHeader className="gap-2">
        <CardTitle className="text-earth-700">Mitgliedszahlungen</CardTitle>
        <CardDescription>Offene oder wartende Beiträge als zukünftige Operations-Säule.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {payments.length === 0 ? (
          <div className="text-sm text-muted-foreground">Keine Zahlungen gefunden.</div>
        ) : (
          payments.slice(0, 5).map((payment) => (
            <div key={payment.id} className="rounded-[1.2rem] border border-earth-500/10 bg-white/65 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-earth-700">{payment.ref || payment.id}</div>
                  <div className="text-xs text-muted-foreground">{payment.membershipId || "Ohne Mitgliedschaft"}</div>
                </div>
                <Badge className={paymentStatusClasses(payment.status)} variant="outline">
                  {payment.status || "unbekannt"}
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>{formatCurrency(payment.betragEur ?? payment.betrag)}</span>
                <span>Fällig {formatDate(payment.faelligAm)}</span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function KPIBar({
  state,
  orders,
  openPaymentsCount,
}: {
  state: ReturnType<typeof useZentraleAdmin>;
  orders: Bestellung[];
  openPaymentsCount: number;
}) {
  const cards = [
    {
      label: "Produkte",
      value: String(state.produkte.length),
      icon: Sprout,
    },
    {
      label: "Angebote",
      value: String(state.staffeln.length),
      icon: Boxes,
    },
    {
      label: "Bestellungen",
      value: String(orders.length),
      icon: ClipboardList,
    },
    {
      label: "Offene Zahlungen",
      value: String(openPaymentsCount),
      icon: CreditCard,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="zentrale-panel border-0">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-earth-400">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-earth-700">{card.value}</div>
            </div>
            <div className="rounded-[1.2rem] bg-white/75 p-3 text-earth-500">
              <card.icon />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ZentraleWorkspace({
  initialProdukte,
  initialStaffeln,
  initialOrders,
  initialPayments,
  currentUser,
}: {
  initialProdukte: Produkt[];
  initialStaffeln: Staffel[];
  initialOrders: Bestellung[];
  initialPayments: MembershipPayment[];
  currentUser: AuthUser | null;
}) {
  const state = useZentraleAdmin({
    initialProdukte,
    initialStaffeln,
  });
  const [section, setSection] = useState<ZentraleSection>("produkte");
  const [orders, setOrders] = useState<Bestellung[]>(initialOrders);
  const payments = initialPayments;

  useEffect(() => {
    const unsubscribe = subscribeToBestellungen(({ type, record }) => {
      setOrders((current) => {
        if (type === "delete") {
          return current.filter((entry) => entry.id !== record.id);
        }

        const existing = current.findIndex((entry) => entry.id === record.id);
        if (existing === -1) {
          return [record, ...current].slice(0, 40);
        }

        return current.map((entry) => (entry.id === record.id ? record : entry));
      });
    });

    return unsubscribe;
  }, []);

  const productsWithoutSeason = useMemo(
    () => state.produkte.filter((product) => (product.saisonalitaet ?? []).length === 0),
    [state.produkte],
  );
  const productsWithoutOffers = useMemo(
    () => state.produkte.filter((product) => !state.staffeln.some((offer) => offer.produktId === product.id)),
    [state.produkte, state.staffeln],
  );
  const offersWithoutPrice = useMemo(
    () => state.staffeln.filter((offer) => (offer.euroPreis ?? 0) <= 0),
    [state.staffeln],
  );
  const emptyOffers = useMemo(
    () => state.staffeln.filter((offer) => (offer.mengeVerfuegbar ?? 0) <= 0),
    [state.staffeln],
  );
  const openPayments = useMemo(
    () =>
      payments.filter((payment) =>
        ["offen", "warten", "teilbezahlt"].includes((payment.status ?? "").toLowerCase()),
      ),
    [payments],
  );
  const pendingOrders = useMemo(
    () => orders.filter((order) => ["angefragt", "bestaetigt"].includes((order.status ?? "").toLowerCase())),
    [orders],
  );

  const hintsCount =
    productsWithoutSeason.length + productsWithoutOffers.length + offersWithoutPrice.length + emptyOffers.length;

  const selectedSectionMeta = sectionMeta[section];

  function jumpToNewProduct() {
    state.createProductDraft();
    setSection("produkte");
  }

  function jumpToNewOffer() {
    state.createOfferDraft();
    setSection("angebote");
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <div className="rounded-[1.6rem] border border-white/70 bg-white/80 px-4 py-4 shadow-brand-soft">
            <div className="text-[0.68rem] uppercase tracking-[0.28em] text-earth-400">Zentrale</div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-earth-700">Agroforst FF</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {state.activeSeasonOffers} aktive Saisonangebote
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={jumpToNewProduct}>
              <PackagePlus data-icon="inline-start" />
              Produkt
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={jumpToNewOffer}>
              <Receipt data-icon="inline-start" />
              Angebot
            </Button>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Katalog</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={section === "produkte"} onClick={() => setSection("produkte")}>
                    <Sprout />
                    <span>Produkte</span>
                    <SidebarMenuBadge>{state.produkte.length}</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={section === "angebote"} onClick={() => setSection("angebote")}>
                    <Receipt />
                    <span>Angebote</span>
                    <SidebarMenuBadge>{state.staffeln.length}</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Kontrolle</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={section === "pruefungen"} onClick={() => setSection("pruefungen")}>
                    <CheckCheck />
                    <span>Prüfungen</span>
                    <SidebarMenuBadge>{hintsCount}</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Betrieb</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={section === "bestellungen"} onClick={() => setSection("bestellungen")}>
                    <ClipboardList />
                    <span>Bestellungen</span>
                    <SidebarMenuBadge>{pendingOrders.length}</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={section === "zahlungen"} onClick={() => setSection("zahlungen")}>
                    <BadgeEuro />
                    <span>Zahlungen</span>
                    <SidebarMenuBadge>{openPayments.length}</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="rounded-[1.4rem] border border-white/70 bg-white/80 p-4 shadow-brand-soft">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium text-earth-700">{currentUser?.name || "Admin Farmer"}</div>
                <div className="truncate text-xs text-muted-foreground">{currentUser?.email || "angemeldet"}</div>
              </div>
              <Badge variant="outline">Live</Badge>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {openPayments.length} offene Zahlungen, {pendingOrders.length} Vorgänge mit Handlungsbedarf.
            </div>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.42)),linear-gradient(130deg,rgba(245,250,245,0.78),rgba(243,239,226,0.86))]">
        <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
            <header className="zentrale-shell rounded-[2rem] p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-start gap-3">
                  <SidebarTrigger className="mt-1" />
                  <div>
                    <div className="text-[0.68rem] uppercase tracking-[0.26em] text-earth-400">Farmer Cockpit</div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-earth-700">
                      {selectedSectionMeta.title}
                    </div>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-earth-500">{selectedSectionMeta.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{formatCurrency(state.totalExpectedRevenue)} Umsatzpotenzial</Badge>
                  <Badge variant="outline">{state.totalAvailableQuantity} verfügbar</Badge>
                  <Badge variant={hintsCount > 0 ? "secondary" : "outline"}>{hintsCount} Hinweise</Badge>
                </div>
              </div>
            </header>

            <KPIBar state={state} orders={orders} openPaymentsCount={openPayments.length} />

            {section === "produkte" ? (
              <div className="grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1.15fr)_380px]">
                <ProductCatalog state={state} onNewProduct={jumpToNewProduct} />
                <ProductEditor state={state} compact />
                <div className="flex flex-col gap-4">
                  <SelectedProductSnapshot state={state} />
                  <RelatedOffersPanel
                    state={state}
                    onCreateOffer={() => {
                      state.createOfferDraft();
                      setSection("angebote");
                    }}
                  />
                  <OrdersPreview orders={orders} />
                </div>
              </div>
            ) : null}

            {section === "angebote" ? (
              <div className="grid items-start gap-4 xl:grid-cols-[340px_minmax(0,1.1fr)_360px]">
                <Card className="zentrale-panel border-0">
                  <CardHeader className="gap-3 border-b border-earth-500/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-earth-700">Angebotsfokus</CardTitle>
                        <CardDescription>Gefilterte Angebotsliste mit direktem Sprung in den Editor.</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={jumpToNewOffer}>
                        <PackagePlus data-icon="inline-start" />
                        Neu
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        value={state.offerFilter}
                        onChange={(event) => state.setOfferFilter(event.target.value)}
                        placeholder="Nach Produkt, Jahr oder Angebots-ID filtern"
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[40rem]">
                      <div className="flex flex-col gap-2 p-3">
                        {state.visibleOffers.map((offer) => (
                          <button
                            key={offer.id}
                            type="button"
                            onClick={() => state.selectOffer(offer.id)}
                            className={cn(
                              "rounded-[1.3rem] border px-4 py-3 text-left transition",
                              offer.id === state.selectedOfferId
                                ? "border-permdal-300 bg-permdal-50"
                                : "border-earth-500/10 bg-white/70 hover:bg-white",
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate font-medium text-earth-700">
                                  {displayProductName(state.productById.get(offer.produktId))}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {offer.year ?? "Ohne Jahr"} · {offer.id}
                                </div>
                              </div>
                              <Badge className={offer.mengeVerfuegbar > 0 ? "" : "bg-earth-100 text-earth-500"}>
                                {offer.mengeVerfuegbar} {offer.einheit}
                              </Badge>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                              <span>{formatCurrency(offer.euroPreis)}</span>
                              <span>{formatDateTime(offer.pickupAt)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <OfferEditor state={state} compact />

                <div className="flex flex-col gap-4">
                  <SelectedProductSnapshot state={state} />
                  <RelatedOffersPanel
                    state={state}
                    onCreateOffer={() => {
                      state.createOfferDraft();
                    }}
                  />
                  <PaymentPreview payments={openPayments} />
                </div>
              </div>
            ) : null}

            {section === "pruefungen" ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="zentrale-panel border-0">
                  <CardHeader>
                    <CardTitle className="text-earth-700">Kataloghinweise</CardTitle>
                    <CardDescription>Produkte, die noch nicht vollständig operationalisiert sind.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="rounded-[1.4rem] border border-earth-500/10 bg-white/70 p-4">
                      <div className="font-medium text-earth-700">Produkte ohne Saison</div>
                      <div className="mt-1 text-sm text-muted-foreground">{productsWithoutSeason.length} Einträge</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {productsWithoutSeason.slice(0, 8).map((product) => (
                          <Badge key={product.id} variant="outline">
                            {displayProductName(product)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-earth-500/10 bg-white/70 p-4">
                      <div className="font-medium text-earth-700">Produkte ohne Angebot</div>
                      <div className="mt-1 text-sm text-muted-foreground">{productsWithoutOffers.length} Einträge</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {productsWithoutOffers.slice(0, 8).map((product) => (
                          <Badge key={product.id} variant="outline">
                            {displayProductName(product)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="zentrale-panel border-0">
                  <CardHeader>
                    <CardTitle className="text-earth-700">Angebotshinweise</CardTitle>
                    <CardDescription>Preise und Mengen, die aktuell nach Aufmerksamkeit verlangen.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="rounded-[1.4rem] border border-earth-500/10 bg-white/70 p-4">
                      <div className="font-medium text-earth-700">Angebote ohne Preis</div>
                      <div className="mt-1 text-sm text-muted-foreground">{offersWithoutPrice.length} Einträge</div>
                      <div className="mt-3 flex flex-col gap-2">
                        {offersWithoutPrice.slice(0, 6).map((offer) => (
                          <button
                            key={offer.id}
                            type="button"
                            onClick={() => {
                              state.selectOffer(offer.id);
                              setSection("angebote");
                            }}
                            className="flex items-center justify-between rounded-[1rem] border border-earth-500/10 bg-white px-3 py-2 text-left hover:bg-earth-50"
                          >
                            <span className="truncate font-medium text-earth-700">
                              {displayProductName(state.productById.get(offer.produktId))}
                            </span>
                            <ArrowUpRight className="size-4 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-earth-500/10 bg-white/70 p-4">
                      <div className="font-medium text-earth-700">Leere Angebote</div>
                      <div className="mt-1 text-sm text-muted-foreground">{emptyOffers.length} Einträge</div>
                      <div className="mt-3 flex flex-col gap-2">
                        {emptyOffers.slice(0, 6).map((offer) => (
                          <button
                            key={offer.id}
                            type="button"
                            onClick={() => {
                              state.selectOffer(offer.id);
                              setSection("angebote");
                            }}
                            className="flex items-center justify-between rounded-[1rem] border border-earth-500/10 bg-white px-3 py-2 text-left hover:bg-earth-50"
                          >
                            <span className="truncate font-medium text-earth-700">
                              {displayProductName(state.productById.get(offer.produktId))}
                            </span>
                            <Badge variant="outline">{offer.mengeVerfuegbar} {offer.einheit}</Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {section === "bestellungen" ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="zentrale-panel border-0">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-earth-400">Offene Queue</div>
                      <div className="mt-2 text-3xl font-semibold text-earth-700">{pendingOrders.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="zentrale-panel border-0">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-earth-400">Mit Abholung</div>
                      <div className="mt-2 text-3xl font-semibold text-earth-700">
                        {orders.filter((order) => order.abholung).length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="zentrale-panel border-0">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-earth-400">Gesamtvolumen</div>
                      <div className="mt-2 text-3xl font-semibold text-earth-700">
                        {formatCurrency(orders.reduce((sum, order) => sum + (order.preisGesamt ?? 0), 0))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="zentrale-panel border-0">
                  <CardHeader>
                    <CardTitle className="text-earth-700">Letzte Bestellungen</CardTitle>
                    <CardDescription>Queue-Ansicht mit Status, Menge und geplanten Abholungen.</CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produkt</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Menge</TableHead>
                          <TableHead>Preis</TableHead>
                          <TableHead>Abholung</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.slice(0, 16).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{order.produktName || order.angebotId}</span>
                                <span className="text-xs text-muted-foreground">{order.id}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={orderStatusClasses(order.status)} variant="outline">
                                {order.status || "offen"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {order.menge} {order.einheit}
                            </TableCell>
                            <TableCell>{formatCurrency(order.preisGesamt)}</TableCell>
                            <TableCell>{order.abholung ? "Ja" : "Nein"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {section === "zahlungen" ? (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="zentrale-panel border-0">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-earth-400">Offen oder wartend</div>
                      <div className="mt-2 text-3xl font-semibold text-earth-700">{openPayments.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="zentrale-panel border-0">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-earth-400">Bereits bezahlt</div>
                      <div className="mt-2 text-3xl font-semibold text-earth-700">
                        {payments.filter((payment) => (payment.status ?? "").toLowerCase() === "bezahlt").length}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="zentrale-panel border-0">
                    <CardContent className="p-5">
                      <div className="text-xs uppercase tracking-[0.2em] text-earth-400">Offenes Volumen</div>
                      <div className="mt-2 text-3xl font-semibold text-earth-700">
                        {formatCurrency(openPayments.reduce((sum, payment) => sum + (payment.betragEur ?? payment.betrag ?? 0), 0))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="zentrale-panel border-0">
                  <CardHeader>
                    <CardTitle className="text-earth-700">Mitgliedszahlungen</CardTitle>
                    <CardDescription>
                      Monitoring-Fläche für offene Beiträge. Verifikation bleibt künftig funktionsbasiert.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Referenz</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Betrag</TableHead>
                          <TableHead>Fällig am</TableHead>
                          <TableHead>Mitgliedschaft</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.slice(0, 16).map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="font-medium">{payment.ref || payment.id}</span>
                                <span className="text-xs text-muted-foreground">{payment.id}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={paymentStatusClasses(payment.status)} variant="outline">
                                {payment.status || "unbekannt"}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(payment.betragEur ?? payment.betrag)}</TableCell>
                            <TableCell>{formatDate(payment.faelligAm)}</TableCell>
                            <TableCell>{payment.membershipId || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Page() {
  const [produkte, setProdukte] = useState<Produkt[] | null>(null);
  const [staffeln, setStaffeln] = useState<Staffel[] | null>(null);
  const [orders, setOrders] = useState<Bestellung[] | null>(null);
  const [payments, setPayments] = useState<MembershipPayment[] | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [produkteResponse, staffelnResponse, ordersResponse, paymentsResponse, userResponse] = await Promise.all([
          listAlleProdukte(),
          listStaffeln(),
          listBestellungen({ limit: 40 }),
          listAdminMembershipPayments({ limit: 40 }),
          getCurrentUser().catch(() => null),
        ]);

        if (!active) {
          return;
        }

        setProdukte(produkteResponse as unknown as Produkt[]);
        setStaffeln(staffelnResponse as unknown as Staffel[]);
        setOrders(ordersResponse as unknown as Bestellung[]);
        setPayments(paymentsResponse);
        setCurrentUser(userResponse);
      } catch (rawError) {
        if (!active) {
          return;
        }

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

  if (!produkte || !staffeln || !orders || !payments) {
    return <AdminLoading />;
  }

  return (
    <ZentraleWorkspace
      initialProdukte={produkte}
      initialStaffeln={staffeln}
      initialOrders={orders}
      initialPayments={payments}
      currentUser={currentUser}
    />
  );
}
