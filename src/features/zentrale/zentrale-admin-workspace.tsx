"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  ArrowRightLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  ImagePlus,
  Plus,
  ReceiptText,
  Save,
  Sprout,
  Pencil,
  ShoppingCart,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  bieteSucheToFormState,
  displayProductName,
  displayUnitLabel,
  displayValueLabel,
  emptyBieteSucheForm,
  emptyOfferForm,
  emptyProductForm,
  formatCurrency,
  formatTeilungPreviewLabel,
  lebensdauerValues,
  offerUnits,
  offerToFormState,
  productToFormState,
  slugifyProduktId,
  splitMonths,
  type FunctionStatus,
  type PreisStaffelFormState,
  type ProductFormState,
  unterkategorieValues,
  hauptkategorieValues,
} from "@/features/zentrale/admin-domain";
import { formatHarvestRange, getOfferPriceSummary } from "@/features/catalog/catalog";
import { useZentraleAdmin } from "@/features/zentrale/use-zentrale-admin";
import { listAdminMembershipPayments, listAdminMemberships, type MembershipPayment, type MembershipRecord } from "@/lib/appwrite/appwriteMemberships";
import { listBackofficeEvents } from "@/lib/appwrite/appwriteEvents";
import { verifyPayment, manageMembership, manageOrder } from "@/lib/appwrite/appwriteFunctions";
import { getPickupConfig, upsertPickupConfig } from "@/lib/appwrite/appwritePickupConfig";
import { createDefaultPickupConfig, pickupWeekdayLabel } from "@/features/pickup/pickup-schedule";
import { cn } from "@/lib/utils";
import { listAlleProdukte, listStaffeln } from "@/lib/appwrite/appwriteProducts";
import { listBieteSucheEintraege } from "@/lib/appwrite/appwriteExchange";
import { listBestellungen } from "@/lib/appwrite/appwriteOrders";

type PaymentFilter = "alle" | "offen" | "warten" | "teilbezahlt" | "bezahlt" | "fehlgeschlagen" | "storniert";
type AdminOrderRecord = Awaited<ReturnType<typeof listBestellungen>>[number];

type ProductWorkflowState = "clean" | "dirty" | "draftSaved" | "livePublished";
type ProductDraftMeta = {
  workflowState: ProductWorkflowState;
  isVisible: boolean;
  seasonalActive: boolean;
  readyToPublish: boolean;
  draftUpdatedAt?: string;
  publishedAt?: string;
};
type ProductDraftRecord = {
  form: ProductFormState;
  meta: ProductDraftMeta;
};
type AsyncState = { state: "idle" | "loading" | "success" | "error"; message?: string };
type PickupConfigFormState = {
  horizonDays: string;
  location: string;
  note: string;
  weeklySlots: Array<{ weekday: PickupWeeklySlotRule["weekday"]; startTime: string; endTime: string; active: boolean }>;
};
type ProductTarget = { kind: "new" } | { kind: "existing"; id: string };
type OfferTarget = { kind: "new" } | { kind: "existing"; id: string };
type ExchangeTarget = { kind: "new" } | { kind: "existing"; id: string };
type ActiveSheet =
  | { kind: "product"; target: ProductTarget }
  | { kind: "offer"; target: OfferTarget }
  | { kind: "exchange"; target: ExchangeTarget }
  | { kind: "payment"; id: string }
  | { kind: "office"; id: string }
  | null;

const PRODUCT_DRAFT_STORAGE_KEY = "zentrale-product-drafts-v1";
const NEW_PRODUCT_KEY = "__new_product__";

function formatAdminDate(value?: string | null, withTime = false) {
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

function paymentStatusMeta(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "offen" || normalized === "open") return { label: "Offen", className: "border-amber-300/80 bg-amber-100 text-amber-900" };
  if (normalized === "warten" || normalized === "pending") return { label: "Wartet", className: "border-yellow-300/80 bg-yellow-100 text-yellow-900" };
  if (normalized === "teilbezahlt" || normalized === "partial") return { label: "Teilbezahlt", className: "border-lime-300/80 bg-lime-100 text-lime-900" };
  if (normalized === "bezahlt" || normalized === "paid") return { label: "Bezahlt", className: "border-emerald-300/80 bg-emerald-100 text-emerald-900" };
  if (normalized === "fehlgeschlagen" || normalized === "failed") return { label: "Fehlgeschlagen", className: "border-rose-300/80 bg-rose-100 text-rose-900" };
  if (normalized === "storniert" || normalized === "cancelled") return { label: "Storniert", className: "border-stone-300/80 bg-stone-100 text-stone-800" };
  return { label: value || "Unbekannt", className: "border-border bg-muted text-foreground" };
}

function backofficeEventTypeMeta(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized.includes("payment") || normalized.includes("bezahl")) return { label: "Bezahlung", className: "border-emerald-300/80 bg-emerald-100 text-emerald-900" };
  if (normalized.includes("order") || normalized.includes("bestell")) return { label: "Bestellung", className: "border-sky-300/80 bg-sky-100 text-sky-900" };
  if (normalized.includes("mail") || normalized.includes("email") || normalized.includes("nachricht")) return { label: "Nachricht", className: "border-amber-300/80 bg-amber-100 text-amber-900" };
  if (normalized.includes("error") || normalized.includes("fehl")) return { label: "Fehler", className: "border-rose-300/80 bg-rose-100 text-rose-900" };
  if (normalized.includes("cancel") || normalized.includes("storno")) return { label: "Storno", className: "border-stone-300/80 bg-stone-100 text-stone-800" };
  return { label: "Sonstiges", className: "border-border bg-muted text-foreground" };
}

function deliveryStatusMeta(delivered: boolean) {
  return delivered
    ? { label: "Zugestellt", className: "border-emerald-300/80 bg-emerald-100 text-emerald-900" }
    : { label: "Offen", className: "border-amber-300/80 bg-amber-100 text-amber-900" };
}

function paymentAmount(payment: MembershipPayment) {
  if (typeof payment.betragEur === "number" && Number.isFinite(payment.betragEur)) return payment.betragEur;
  if (typeof payment.betrag === "number" && Number.isFinite(payment.betrag)) return payment.betrag;
  return null;
}

function membershipTypeLabel(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "privat" || normalized === "private") return "Privat";
  if (normalized === "betrieb" || normalized === "business") return "Betrieb";
  return value || "—";
}

function membershipStatusMeta(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "aktiv" || normalized === "active") return { label: "Aktiv", className: "border-emerald-300/80 bg-emerald-100 text-emerald-900" };
  if (normalized === "beantragt" || normalized === "pending") return { label: "Beantragt", className: "border-amber-300/80 bg-amber-100 text-amber-900" };
  if (normalized === "abgelaufen" || normalized === "expired") return { label: "Abgelaufen", className: "border-slate-300/80 bg-slate-100 text-slate-900" };
  if (normalized === "storniert" || normalized === "cancelled") return { label: "Storniert", className: "border-rose-300/80 bg-rose-100 text-rose-900" };
  return { label: value || "Unbekannt", className: "border-border bg-muted text-foreground" };
}

function orderStatusMeta(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "angefragt") return { label: "Angefragt", className: "border-sky-300/80 bg-sky-100 text-sky-900" };
  if (normalized === "bestaetigt" || normalized === "bestätigt") return { label: "Bestätigt", className: "border-emerald-300/80 bg-emerald-100 text-emerald-900" };
  if (normalized === "erfuellt") return { label: "Erfüllt", className: "border-lime-300/80 bg-lime-100 text-lime-900" };
  if (normalized === "storniert") return { label: "Storniert", className: "border-rose-300/80 bg-rose-100 text-rose-900" };
  return { label: value || "Unbekannt", className: "border-border bg-muted text-foreground" };
}

function canAdminActivateMembership(membership: MembershipRecord) {
  const status = (membership.status ?? "").toLowerCase();
  const type = (membership.typ ?? "").toLowerCase();
  const paymentStatus = (membership.bezahlStatus ?? "").toLowerCase();

  if (status !== "beantragt") {
    return false;
  }

  return type === "betrieb" || paymentStatus === "bezahlt" || paymentStatus === "paid";
}

function canAdminCancelMembership(membership: MembershipRecord) {
  const status = (membership.status ?? "").toLowerCase();
  return status === "beantragt" || status === "aktiv";
}

function canAdminConfirmOrder(order: AdminOrderRecord) {
  return (order.status ?? "").toLowerCase() === "angefragt";
}

function canAdminMarkPickedUp(order: AdminOrderRecord) {
  return (order.status ?? "").toLowerCase() === "bestaetigt";
}

function canAdminCancelOrder(order: AdminOrderRecord) {
  return ["angefragt", "bestaetigt"].includes((order.status ?? "").toLowerCase());
}

function eventReferenceLabel(event: BackofficeEvent) {
  const entries = [
    event.bestellungId ? `Best. ${event.bestellungId.slice(0, 8)}` : null,
    event.angebotId ? `Ang. ${event.angebotId.slice(0, 8)}` : null,
    event.benutzerEmail ?? (event.benutzerId ? `User ${event.benutzerId.slice(0, 8)}` : null),
  ].filter(Boolean);

  return entries.length > 0 ? entries.join(" · ") : "—";
}

function createDefaultMeta(product?: Produkt, form?: ProductFormState): ProductDraftMeta {
  const productForm = form ?? (product ? productToFormState(product) : emptyProductForm());
  return {
    workflowState: "clean",
    isVisible: true,
    seasonalActive: splitMonths(productForm.saisonalitaet).length > 0,
    readyToPublish: false,
  };
}

function formsEqual(left: ProductFormState, right: ProductFormState) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function deriveWorkflowState(
  liveForm: ProductFormState,
  form: ProductFormState,
  meta: ProductDraftMeta,
  preferred?: ProductWorkflowState,
): ProductWorkflowState {
  const hasDraftChanges =
    !formsEqual(form, liveForm) ||
    meta.isVisible !== true ||
    meta.seasonalActive !== (splitMonths(liveForm.saisonalitaet).length > 0) ||
    meta.readyToPublish;

  if (!hasDraftChanges) {
    return preferred === "livePublished" ? "livePublished" : "clean";
  }

  if (preferred === "draftSaved") return "draftSaved";
  return "dirty";
}

function getProductStatusTone(workflowState: ProductWorkflowState) {
  switch (workflowState) {
    case "dirty":
      return { label: "Ungespeichert", variant: "secondary" as const };
    case "draftSaved":
      return { label: "Entwurf", variant: "outline" as const };
    case "livePublished":
    case "clean":
    default:
      return { label: "Live", variant: "default" as const };
  }
}

function formatTimestamp(value?: string) {
  if (!value) return "Noch nicht gesetzt";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Noch nicht gesetzt";

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusMessage({ status }: { status: FunctionStatus }) {
  if (!status.message) return null;

  return (
    <p className={cn("text-sm", status.state === "success" ? "text-emerald-700" : "text-rose-700")}>
      {status.message}
    </p>
  );
}

function readStoredDrafts(): Record<string, ProductDraftRecord> {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(PRODUCT_DRAFT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function updatePreisStaffelAt(
  staffeln: PreisStaffelFormState[],
  index: number,
  patch: Partial<PreisStaffelFormState>,
) {
  return staffeln.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry));
}

function pickupConfigToFormState(config: PickupConfig | null): PickupConfigFormState {
  const resolved = config ?? {
    id: "global",
    createdAt: new Date(0).toISOString(),
    ...createDefaultPickupConfig(),
  };

  return {
    horizonDays: String(resolved.horizonDays),
    location: resolved.location ?? "",
    note: resolved.note ?? "",
    weeklySlots: resolved.weeklySlots.map((slot) => ({
      weekday: slot.weekday,
      startTime: slot.startTime,
      endTime: slot.endTime,
      active: slot.active,
    })),
  };
}

function CompactSection({
  id,
  title,
  description,
  actions,
  children,
}: {
  id: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card
      id={id}
      className="border-border/60 bg-[color-mix(in_srgb,var(--color-background)_78%,white_22%)] shadow-[0_10px_32px_-22px_rgba(0,0,0,0.28)]"
    >
      <CardHeader className="gap-2 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto pt-0">{children}</CardContent>
    </Card>
  );
}

function TableActionButton({
  children,
  onClick,
  variant = "outline",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "outline" | "secondary" | "default";
  disabled?: boolean;
}) {
  return (
    <Button size="sm" variant={variant} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

function ProductSheetEditor({
  state,
  drafts,
  setDrafts,
  activeSheet,
  setActiveSheet,
}: {
  state: ReturnType<typeof useZentraleAdmin>;
  drafts: Record<string, ProductDraftRecord>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, ProductDraftRecord>>>;
  activeSheet: ActiveSheet;
  setActiveSheet: React.Dispatch<React.SetStateAction<ActiveSheet>>;
}) {
  const isProductSheet = activeSheet?.kind === "product";
  const selectedProduct = state.selectedProduct;
  const activeTarget = isProductSheet ? activeSheet.target : null;
  const activeDraftKey =
    activeTarget?.kind === "new" ? NEW_PRODUCT_KEY : activeTarget?.kind === "existing" ? activeTarget.id : null;
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const liveForm =
    activeTarget?.kind === "new"
      ? emptyProductForm()
      : selectedProduct
        ? productToFormState(selectedProduct)
        : emptyProductForm();
  const activeDraft = activeDraftKey ? drafts[activeDraftKey] : undefined;
  const activeMeta = activeTarget
    ? {
        ...(activeDraft?.meta ?? createDefaultMeta(selectedProduct ?? undefined, state.productForm)),
        workflowState: deriveWorkflowState(liveForm, state.productForm, activeDraft?.meta ?? createDefaultMeta(selectedProduct ?? undefined, state.productForm), activeDraft?.meta?.workflowState),
      }
    : null;

  useEffect(() => {
    if (!isProductSheet || !activeDraftKey) return;

    const nextForm = activeDraft?.form ?? liveForm;
    if (!formsEqual(state.productForm, nextForm)) {
      state.setProductForm(nextForm);
    }
  }, [activeDraft?.form, activeDraftKey, isProductSheet, liveForm, state.productForm, state.setProductForm]);

  function persistDraft(
    draftKey: string,
    nextForm: ProductFormState,
    metaPatch: Partial<ProductDraftMeta> = {},
    preferred?: ProductWorkflowState,
  ) {
    const currentLiveForm =
      draftKey === NEW_PRODUCT_KEY
        ? emptyProductForm()
        : (() => {
            const product = state.produkte.find((entry) => entry.id === draftKey);
            return product ? productToFormState(product) : emptyProductForm();
          })();

    setDrafts((current) => {
      const previous = current[draftKey];
      const baseMeta =
        previous?.meta ??
        createDefaultMeta(
          draftKey === NEW_PRODUCT_KEY ? undefined : state.produkte.find((entry) => entry.id === draftKey),
          nextForm,
        );
      const nextMeta = {
        ...baseMeta,
        ...metaPatch,
      };

      nextMeta.workflowState = deriveWorkflowState(currentLiveForm, nextForm, nextMeta, preferred);

      return {
        ...current,
        [draftKey]: {
          form: nextForm,
          meta: nextMeta,
        },
      };
    });
  }

  function updateProductField<K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) {
    if (!activeDraftKey) return;

    state.setProductForm((current) => {
      const next = { ...current, [field]: value };
      if (activeDraftKey === NEW_PRODUCT_KEY && (field === "name" || field === "sorte")) {
        next.id = slugifyProduktId(
          field === "name" ? String(value) : next.name,
          field === "sorte" ? String(value) : next.sorte,
        );
      }
      persistDraft(activeDraftKey, next, { draftUpdatedAt: new Date().toISOString() }, "dirty");
      return next;
    });
  }

  function updateMeta(patch: Partial<ProductDraftMeta>, preferred?: ProductWorkflowState) {
    if (!activeDraftKey) return;
    persistDraft(activeDraftKey, state.productForm, patch, preferred);
  }

  async function publishProduct() {
    if (!activeMeta?.readyToPublish) return;

    const saved = await state.publishProduct();
    if (!saved) return;

    const savedForm = productToFormState(saved);
    const savedKey = saved.id;

    setDrafts((current) => {
      const existingMeta = current[activeDraftKey ?? savedKey]?.meta ?? createDefaultMeta(saved, savedForm);
      const nextMeta = {
        ...existingMeta,
        readyToPublish: false,
        publishedAt: new Date().toISOString(),
      };
      nextMeta.workflowState = deriveWorkflowState(savedForm, savedForm, nextMeta, "livePublished");

      const nextDrafts = {
        ...current,
        [savedKey]: {
          form: savedForm,
          meta: nextMeta,
        },
      };

      if (activeDraftKey === NEW_PRODUCT_KEY) {
        delete nextDrafts[NEW_PRODUCT_KEY];
      }

      return nextDrafts;
    });

    setActiveSheet(null);
    state.selectProduct(saved.id);
    window.location.reload();
  }

  function saveDraft() {
    if (!activeDraftKey) return;
    persistDraft(
      activeDraftKey,
      state.productForm,
      {
        draftUpdatedAt: new Date().toISOString(),
      },
      "draftSaved",
    );
  }

  function closeSheet() {
    if (activeMeta?.workflowState === "dirty" && !window.confirm("Es gibt ungespeicherte Änderungen. Wirklich schließen?")) {
      return;
    }
    setActiveSheet(null);
  }

  if (!isProductSheet || !activeTarget || !activeMeta) return null;

  return (
    <Sheet
      open={isProductSheet}
      onOpenChange={(open) => {
        if (!open) closeSheet();
      }}
    >
      <SheetContent side="right" className="sm:!max-w-sm lg:!max-w-md">
        <ScrollArea className="h-full pr-4">
          <div className="flex h-full flex-col gap-5 p-4">
            <SheetHeader className="px-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getProductStatusTone(activeMeta.workflowState).variant}>
                  {getProductStatusTone(activeMeta.workflowState).label}
                </Badge>
                {state.productForm.hauptkategorie ? <Badge variant="outline">{displayValueLabel(state.productForm.hauptkategorie)}</Badge> : null}
              </div>
              <SheetTitle>{selectedProduct ? "Produkt bearbeiten" : "Neues Produkt"}</SheetTitle>
              <SheetDescription>
                Produktstammdaten kompakt pflegen. Änderungen bleiben lokal, bis du sie bewusst veröffentlichst.
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="produkt-name">Name</Label>
                <Input id="produkt-name" value={state.productForm.name} onChange={(event) => updateProductField("name", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produkt-sorte">Sorte</Label>
                <Input id="produkt-sorte" value={state.productForm.sorte} onChange={(event) => updateProductField("sorte", event.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produkt-id">Produkt-ID</Label>
                <Input id="produkt-id" value={state.productForm.id} readOnly className="font-mono text-sm" />
              </div>

              <div className="grid gap-2">
                <Label>Hauptkategorie</Label>
                <Select value={state.productForm.hauptkategorie} onValueChange={(value) => updateProductField("hauptkategorie", value ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategorie wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {hauptkategorieValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {displayValueLabel(value)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Unterkategorie</Label>
                <Select
                  value={state.productForm.unterkategorie || "__empty__"}
                  onValueChange={(value) => updateProductField("unterkategorie", value && value !== "__empty__" ? value : "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">Keine</SelectItem>
                    {unterkategorieValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {displayValueLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="overflow-hidden rounded-lg border border-border/70 bg-background/70">
                  {state.productImagePreviewUrl ? (
                    <img
                      src={state.productImagePreviewUrl}
                      alt={state.productForm.name || "Produktbild"}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-muted-foreground">
                      <ImagePlus />
                    </div>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="produkt-image">Bild-Datei-ID</Label>
                  <Input
                    id="produkt-image"
                    value={state.productForm.imageId}
                    onChange={(event) => updateProductField("imageId", event.target.value)}
                    placeholder="z. B. 67fd2f4f0012abcd1234"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/avif"
                    className="hidden"
                    onChange={(event) => state.setProductImageFile(event.target.files?.[0] ?? null)}
                  />
                  <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()}>
                    Bild wählen
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {state.productImageFileName || "Keine neue Datei gewählt"}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Lebensdauer</Label>
                <Select value={state.productForm.lebensdauer} onValueChange={(value) => updateProductField("lebensdauer", value ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {lebensdauerValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {displayValueLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="produkt-saison">Saisonmonate</Label>
                <Input
                  id="produkt-saison"
                  value={state.productForm.saisonalitaet}
                  onChange={(event) => updateProductField("saisonalitaet", event.target.value)}
                  placeholder="z. B. 5, 6, 7, 8"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="produkt-fruchtfolge-vor">Fruchtfolge davor</Label>
                <Textarea
                  id="produkt-fruchtfolge-vor"
                  value={state.productForm.fruchtfolgeVor}
                  onChange={(event) => updateProductField("fruchtfolgeVor", event.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produkt-fruchtfolge-nach">Fruchtfolge danach</Label>
                <Textarea
                  id="produkt-fruchtfolge-nach"
                  value={state.productForm.fruchtfolgeNach}
                  onChange={(event) => updateProductField("fruchtfolgeNach", event.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produkt-boden">Bodenansprüche</Label>
                <Textarea
                  id="produkt-boden"
                  value={state.productForm.bodenansprueche}
                  onChange={(event) => updateProductField("bodenansprueche", event.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produkt-begleitpflanzen">Begleitpflanzen</Label>
                <Textarea
                  id="produkt-begleitpflanzen"
                  value={state.productForm.begleitpflanzen}
                  onChange={(event) => updateProductField("begleitpflanzen", event.target.value)}
                  className="min-h-24"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produkt-notizen">Notizen</Label>
                <Textarea
                  id="produkt-notizen"
                  value={state.productForm.notes}
                  onChange={(event) => updateProductField("notes", event.target.value)}
                  className="min-h-24"
                />
              </div>

              <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Sichtbar</span>
                  <Button
                    type="button"
                    variant={activeMeta.isVisible ? "default" : "outline"}
                    onClick={() =>
                      updateMeta({
                        isVisible: !activeMeta.isVisible,
                        draftUpdatedAt: new Date().toISOString(),
                      }, "dirty")
                    }
                  >
                    {activeMeta.isVisible ? "Ja" : "Nein"}
                  </Button>
                </div>
                <div className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Saisonal aktiv</span>
                  <Button
                    type="button"
                    variant={activeMeta.seasonalActive ? "default" : "outline"}
                    onClick={() =>
                      updateMeta({
                        seasonalActive: !activeMeta.seasonalActive,
                        draftUpdatedAt: new Date().toISOString(),
                      }, "dirty")
                    }
                  >
                    {activeMeta.seasonalActive ? "Ja" : "Nein"}
                  </Button>
                </div>
                <div className="grid gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Freigabe</span>
                  <Button
                    type="button"
                    variant={activeMeta.readyToPublish ? "default" : "outline"}
                    onClick={() =>
                      updateMeta({
                        readyToPublish: !activeMeta.readyToPublish,
                        draftUpdatedAt: new Date().toISOString(),
                      }, activeMeta.readyToPublish ? "dirty" : "draftSaved")
                    }
                  >
                    {activeMeta.readyToPublish ? "Bereit" : "Noch offen"}
                  </Button>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div>Entwurf gespeichert: {formatTimestamp(activeMeta.draftUpdatedAt)}</div>
                  <div>Zuletzt veröffentlicht: {formatTimestamp(activeMeta.publishedAt)}</div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={closeSheet}>
                Schließen
              </Button>
              <Button type="button" variant="secondary" onClick={saveDraft}>
                <Save data-icon="inline-start" />
                Entwurf speichern
              </Button>
              <Button type="button" onClick={publishProduct} disabled={!activeMeta.readyToPublish}>
                <CheckCircle2 data-icon="inline-start" />
                Veröffentlichen
              </Button>
            </div>

            <StatusMessage status={state.productStatus} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function OfferSheetEditor({
  state,
  activeSheet,
  setActiveSheet,
}: {
  state: ReturnType<typeof useZentraleAdmin>;
  activeSheet: ActiveSheet;
  setActiveSheet: React.Dispatch<React.SetStateAction<ActiveSheet>>;
}) {
  const isOfferSheet = activeSheet?.kind === "offer";
  const selectedOffer = state.selectedOffer;
  const current = state.offerForm;
  const activeTarget = isOfferSheet ? activeSheet.target : null;

  useEffect(() => {
    if (!isOfferSheet) return;
    if (activeTarget?.kind === "existing" && selectedOffer && state.offerForm.id !== selectedOffer.id) {
      state.setOfferForm(offerToFormState(selectedOffer));
      return;
    }
    if (activeTarget?.kind === "new") {
      state.setOfferForm(emptyOfferForm(state.selectedProductId ?? state.produkte[0]?.id ?? ""));
    }
  }, [activeTarget?.kind, activeTarget?.kind === "existing" ? activeTarget.id : null, isOfferSheet, selectedOffer?.id]);

  async function saveOffer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await state.saveOffer(event);
  }

  if (!isOfferSheet) return null;

  return (
    <Sheet open={isOfferSheet} onOpenChange={(open) => !open && setActiveSheet(null)}>
      <SheetContent side="right" className="sm:!max-w-sm lg:!max-w-md">
        <ScrollArea className="h-full pr-4">
          <div className="flex h-full flex-col gap-5 p-4">
            <SheetHeader className="px-0">
              <SheetTitle>{selectedOffer ? "Angebot bearbeiten" : "Neues Angebot"}</SheetTitle>
              <SheetDescription>Das Formular bleibt bewusst knapp und speichert direkt ins Backend.</SheetDescription>
            </SheetHeader>

            <form className="grid gap-4" onSubmit={saveOffer}>
              <div className="grid gap-2">
                <Label>Offer-ID</Label>
                <Input value={current.id} onChange={(event) => state.setOfferForm((entry) => ({ ...entry, id: event.target.value }))} placeholder="Leer lassen für Auto-ID" />
              </div>
              <div className="grid gap-2">
                <Label>Produkt</Label>
                <Select value={current.produktId} onValueChange={(value) => state.setOfferForm((entry) => ({ ...entry, produktId: value ?? "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Produkt wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {state.produkte
                        .slice()
                        .sort((left, right) => displayProductName(left).localeCompare(displayProductName(right), "de"))
                        .map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {displayProductName(product)}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Jahr</Label>
                <Input type="number" min="2000" max="2100" value={current.year} onChange={(event) => state.setOfferForm((entry) => ({ ...entry, year: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Einheit</Label>
                <Select value={current.einheit} onValueChange={(value) => state.setOfferForm((entry) => ({ ...entry, einheit: value ?? "kilogramm" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Einheit wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {offerUnits.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Geplante Menge</Label>
                <Input type="number" min="0" value={current.menge} onChange={(event) => state.setOfferForm((entry) => ({ ...entry, menge: event.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label>Verfügbar</Label>
                <Input type="number" min="0" value={current.mengeVerfuegbar} onChange={(event) => state.setOfferForm((entry) => ({ ...entry, mengeVerfuegbar: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Reserviert</Label>
                <Input type="number" min="0" value={current.mengeAbgeholt} onChange={(event) => state.setOfferForm((entry) => ({ ...entry, mengeAbgeholt: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Erwarteter Umsatz</Label>
                <Input type="number" min="0" step="0.01" value={current.expectedRevenue} onChange={(event) => state.setOfferForm((entry) => ({ ...entry, expectedRevenue: event.target.value }))} />
              </div>

              <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-medium">Preisstaffeln</div>
                    <div className="text-xs text-muted-foreground">Mindestens eine Staffel ist erforderlich.</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      state.setOfferForm((entry) => ({
                        ...entry,
                        preisStaffeln: [...entry.preisStaffeln, { teilung: "", paketPreisEur: "" }],
                      }))
                    }
                  >
                    <Plus data-icon="inline-start" />
                    Staffel
                  </Button>
                </div>

                <div className="grid gap-3">
                  {current.preisStaffeln.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-sm text-muted-foreground">
                      Noch keine Preisstaffeln angelegt.
                    </div>
                  ) : (
                    current.preisStaffeln.map((staffel, index) => {
                      const teilung = Number(staffel.teilung);
                      const paketPreis = Number(staffel.paketPreisEur);
                      const hasPreview = Number.isFinite(teilung) && teilung > 0 && Number.isFinite(paketPreis) && paketPreis >= 0;

                      return (
                        <div key={index} className="grid gap-3 rounded-lg border border-border/70 p-3">
                          <div className="grid gap-2">
                            <Label>Teilung</Label>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              value={staffel.teilung}
                              onChange={(event) =>
                                state.setOfferForm((entry) => ({
                                  ...entry,
                                  preisStaffeln: updatePreisStaffelAt(entry.preisStaffeln, index, { teilung: event.target.value }),
                                }))
                              }
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label>Paketpreis</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={staffel.paketPreisEur}
                              onChange={(event) =>
                                state.setOfferForm((entry) => ({
                                  ...entry,
                                  preisStaffeln: updatePreisStaffelAt(entry.preisStaffeln, index, { paketPreisEur: event.target.value }),
                                }))
                              }
                            />
                          </div>
                          <div className="rounded-md bg-background/70 p-3 text-sm">
                            <div className="font-medium">
                              {hasPreview ? formatTeilungPreviewLabel(teilung, current.einheit) : "Vorschau folgt"}
                            </div>
                            <div className="text-muted-foreground">
                              {hasPreview
                                ? `${formatCurrency(paketPreis)} gesamt · ${formatCurrency(paketPreis / teilung)} / ${displayUnitLabel(current.einheit)}`
                                : "Werte eingeben"}
                            </div>
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                state.setOfferForm((entry) => ({
                                  ...entry,
                                  preisStaffeln: entry.preisStaffeln.filter((_, entryIndex) => entryIndex !== index),
                                }))
                              }
                            >
                              Entfernen
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Saat-/Pflanzdatum</Label>
                <Input type="date" value={current.saatPflanzDatum} onChange={(event) => state.setOfferForm((entry) => ({ ...entry, saatPflanzDatum: event.target.value }))} />
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                <div className="font-medium text-foreground">Abholung</div>
                <div className="mt-1">Verwendet globale Abholfenster aus zentraler Abholkonfiguration.</div>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Ernteprojektion</Label>
                  <div className="grid gap-2 rounded-lg border border-border/70 bg-background/70 p-3">
                    {(current.ernteProjektion.length > 0 ? current.ernteProjektion : [""]).map((value, index) => (
                      <div key={`${index}-${value || "empty"}`} className="flex items-end gap-2">
                        <Input
                          type="date"
                          value={value}
                          onChange={(event) =>
                            state.setOfferForm((entry) => ({
                              ...entry,
                              ernteProjektion: entry.ernteProjektion.map((entryValue, entryIndex) =>
                                entryIndex === index ? event.target.value : entryValue,
                              ),
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            state.setOfferForm((entry) => ({
                              ...entry,
                              ernteProjektion: entry.ernteProjektion.filter((_, entryIndex) => entryIndex !== index),
                            }))
                          }
                        >
                          -
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        state.setOfferForm((entry) => ({
                          ...entry,
                          ernteProjektion: [...entry.ernteProjektion, ""],
                        }))
                      }
                    >
                      <Plus data-icon="inline-start" />
                      Termin
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Beschreibung</Label>
                  <Textarea value={current.beschreibung} onChange={(event) => state.setOfferForm((entry) => ({ ...entry, beschreibung: event.target.value }))} className="min-h-24" />
                </div>
                <div className="grid gap-2">
                  <Label>Tags</Label>
                  <Input value={current.tags} onChange={(event) => state.setOfferForm((entry) => ({ ...entry, tags: event.target.value }))} placeholder="z. B. frisch, lagerbar" />
                </div>
              </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit">
                <Save data-icon="inline-start" />
                Speichern
              </Button>
                <Button type="button" variant="outline" onClick={() => setActiveSheet(null)}>
                  Schließen
                </Button>
              <Button type="button" variant="secondary" onClick={() => state.resetOfferForm()}>
                Zurücksetzen
              </Button>
            </div>

            <StatusMessage status={state.offerStatus} />
          </form>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function ExchangeSheetEditor({
  state,
  activeSheet,
  setActiveSheet,
}: {
  state: ReturnType<typeof useZentraleAdmin>;
  activeSheet: ActiveSheet;
  setActiveSheet: React.Dispatch<React.SetStateAction<ActiveSheet>>;
}) {
  const isExchangeSheet = activeSheet?.kind === "exchange";
  const current = state.bieteSucheForm;
  const selected = state.selectedBieteSuche;

  useEffect(() => {
    if (!isExchangeSheet) return;
    if (selected) {
      state.setBieteSucheForm(bieteSucheToFormState(selected));
      return;
    }
    state.setBieteSucheForm(emptyBieteSucheForm());
  }, [isExchangeSheet, selected?.id]);

  async function saveExchange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await state.saveBieteSuche(event);
  }

  if (!isExchangeSheet) return null;

  return (
    <Sheet open={isExchangeSheet} onOpenChange={(open) => !open && setActiveSheet(null)}>
      <SheetContent side="right" className="sm:!max-w-sm lg:!max-w-md">
        <ScrollArea className="h-full pr-4">
          <div className="flex h-full flex-col gap-5 p-4">
            <SheetHeader className="px-0">
              <SheetTitle>{selected ? "Eintrag bearbeiten" : "Neuer Eintrag"}</SheetTitle>
              <SheetDescription>Ein kleiner Datensatz-Editor für Biete/Suche.</SheetDescription>
            </SheetHeader>

            <form className="grid gap-4" onSubmit={saveExchange}>
              <div className="grid gap-2">
                <Label>Eintrags-ID</Label>
                <Input value={current.id} onChange={(event) => state.setBieteSucheForm((entry) => ({ ...entry, id: event.target.value }))} placeholder="Leer lassen für Auto-ID" />
              </div>
              <div className="grid gap-2">
                <Label>Modus</Label>
                <Select value={current.modus} onValueChange={(value) => state.setBieteSucheForm((entry) => ({ ...entry, modus: value === "suche" ? "suche" : "biete" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Modus wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="biete">Biete</SelectItem>
                    <SelectItem value="suche">Suche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Titel</Label>
                <Input value={current.titel} onChange={(event) => state.setBieteSucheForm((entry) => ({ ...entry, titel: event.target.value }))} />
              </div>

              <div className="grid gap-2">
                <Label>Beschreibung</Label>
                <Textarea value={current.beschreibung} onChange={(event) => state.setBieteSucheForm((entry) => ({ ...entry, beschreibung: event.target.value }))} className="min-h-28" />
              </div>

              <div className="grid gap-2">
                <Label>Tags</Label>
                <Input value={current.tags} onChange={(event) => state.setBieteSucheForm((entry) => ({ ...entry, tags: event.target.value }))} placeholder="z. B. Maschinen, Verleih" />
              </div>

              <div className="grid gap-2">
                <Label>Hinweis / Kontakt</Label>
                <Input value={current.hinweis} onChange={(event) => state.setBieteSucheForm((entry) => ({ ...entry, hinweis: event.target.value }))} />
              </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit">
                <Save data-icon="inline-start" />
                Speichern
              </Button>
                <Button type="button" variant="outline" onClick={() => setActiveSheet(null)}>
                  Schließen
                </Button>
              <Button type="button" variant="secondary" onClick={() => state.resetBieteSucheForm()}>
                Zurücksetzen
              </Button>
            </div>

            <StatusMessage status={state.bieteSucheStatus} />
          </form>
        </div>
      </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function PaymentSheet({
  activeSheet,
  setActiveSheet,
  payment,
  membership,
  onConfirmPayment,
}: {
  activeSheet: ActiveSheet;
  setActiveSheet: React.Dispatch<React.SetStateAction<ActiveSheet>>;
  payment: MembershipPayment | null;
  membership?: MembershipRecord;
  onConfirmPayment: (payment: MembershipPayment) => Promise<void>;
}) {
  const isOpen = activeSheet?.kind === "payment";

  if (!isOpen || !payment) return null;

  const status = paymentStatusMeta(payment.status);
  const isPaid = (payment.status ?? "").toLowerCase() === "bezahlt";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && setActiveSheet(null)}>
      <SheetContent side="right" className="sm:!max-w-sm lg:!max-w-md">
        <ScrollArea className="h-full pr-4">
          <div className="flex h-full flex-col gap-5 p-4">
            <SheetHeader className="px-0">
              <SheetTitle>Zahlung {payment.id}</SheetTitle>
              <SheetDescription>Mitgliedschaft prüfen und bei Bedarf direkt bestätigen.</SheetDescription>
            </SheetHeader>

            <div className="grid gap-3 text-sm">
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Mitgliedschaft</span>
                <span className="font-medium">{membership?.membershipNumber || payment.membershipId || "—"}</span>
                <span className="text-muted-foreground">{membership ? membershipTypeLabel(membership.typ) : "Ohne Zuordnung"}</span>
              </div>
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Status</span>
                <Badge className={status.className} variant="outline">{status.label}</Badge>
              </div>
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Betrag</span>
                <span>{formatCurrency(paymentAmount(payment) ?? undefined)}</span>
              </div>
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Fällig</span>
                <span>{formatAdminDate(payment.faelligAm)}</span>
              </div>
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Referenz</span>
                <span className="break-all">{payment.ref || "—"}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setActiveSheet(null)}>
                Schließen
              </Button>
              {!isPaid ? (
                <Button type="button" onClick={() => void onConfirmPayment(payment)}>
                  Als bezahlt markieren
                </Button>
              ) : null}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function OfficeSheet({
  activeSheet,
  setActiveSheet,
  event,
}: {
  activeSheet: ActiveSheet;
  setActiveSheet: React.Dispatch<React.SetStateAction<ActiveSheet>>;
  event: BackofficeEvent | null;
}) {
  const isOpen = activeSheet?.kind === "office";
  if (!isOpen || !event) return null;

  const type = backofficeEventTypeMeta(event.ereignistyp);
  const delivery = deliveryStatusMeta(event.zugestellt);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && setActiveSheet(null)}>
      <SheetContent side="right" className="sm:!max-w-sm lg:!max-w-md">
        <ScrollArea className="h-full pr-4">
          <div className="flex h-full flex-col gap-5 p-4">
            <SheetHeader className="px-0">
              <SheetTitle>Office-Ereignis</SheetTitle>
              <SheetDescription>Reines Detailfenster für die jüngsten Backoffice-Einträge.</SheetDescription>
            </SheetHeader>

            <div className="grid gap-3 text-sm">
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Zeit</span>
                <span>{formatAdminDate(event.createdAt, true)}</span>
              </div>
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Typ</span>
                <Badge className={type.className} variant="outline">{type.label}</Badge>
              </div>
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Betreff</span>
                <span>{event.betreff || "Ohne Betreff"}</span>
              </div>
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Text</span>
                <span className="whitespace-pre-wrap">{event.nachricht}</span>
              </div>
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Bezug</span>
                <span>{eventReferenceLabel(event)}</span>
              </div>
              <div className="grid gap-1 rounded-lg border border-border/70 bg-muted/20 p-3">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Zustand</span>
                <Badge className={delivery.className} variant="outline">{delivery.label}</Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => setActiveSheet(null)}>
                Schließen
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export function ZentraleAdminWorkspace({
  initialProdukte,
  initialStaffeln,
  initialBieteSucheEintraege,
  initialPayments,
  initialMemberships,
  initialOrders,
  initialBackofficeEvents,
}: {
  initialProdukte: Produkt[];
  initialStaffeln: Staffel[];
  initialBieteSucheEintraege: BieteSucheEintrag[];
  initialPayments: MembershipPayment[];
  initialMemberships: MembershipRecord[];
  initialOrders: AdminOrderRecord[];
  initialBackofficeEvents: BackofficeEvent[];
}) {
  const state = useZentraleAdmin({
    initialProdukte,
    initialStaffeln,
    initialBieteSucheEintraege,
  });
  const [drafts, setDrafts] = useState<Record<string, ProductDraftRecord>>({});
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [activePanel, setActivePanel] = useState<"produkte" | "angebote" | "biete-suche" | "zahlungen" | "mitgliedschaften" | "bestellungen" | "office">("produkte");
  const [payments, setPayments] = useState<MembershipPayment[]>(initialPayments);
  const [memberships, setMemberships] = useState<MembershipRecord[]>(initialMemberships);
  const [orders, setOrders] = useState<AdminOrderRecord[]>(initialOrders);
  const [backofficeEvents] = useState<BackofficeEvent[]>(initialBackofficeEvents);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("alle");
  const [paymentActionState, setPaymentActionState] = useState<{ paymentId: string | null; message?: string; tone?: "success" | "error" }>({
    paymentId: null,
  });
  const [membershipActionState, setMembershipActionState] = useState<{ membershipId: string | null; message?: string; tone?: "success" | "error" }>({
    membershipId: null,
  });
  const [orderActionState, setOrderActionState] = useState<{ orderId: string | null; message?: string; tone?: "success" | "error" }>({
    orderId: null,
  });
  const [pickupConfigForm, setPickupConfigForm] = useState<PickupConfigFormState>(pickupConfigToFormState(null));
  const [pickupConfigState, setPickupConfigState] = useState<AsyncState>({ state: "idle" });

  useEffect(() => {
    let active = true;

    async function loadPickup() {
      setPickupConfigState({ state: "loading" });

      try {
        const config = await getPickupConfig();
        if (!active) {
          return;
        }

        setPickupConfigForm(pickupConfigToFormState(config));
        setPickupConfigState({ state: "idle" });
      } catch (error) {
        if (!active) {
          return;
        }

        setPickupConfigForm(pickupConfigToFormState(null));
        setPickupConfigState({
          state: "error",
          message: error instanceof Error ? error.message : "Abholkonfiguration konnte nicht geladen werden.",
        });
      }
    }

    void loadPickup();

    return () => {
      active = false;
    };
  }, []);

  const membershipsById = useMemo(
    () => new Map(memberships.map((membership) => [membership.id, membership])),
    [memberships],
  );

  const paymentCounts = useMemo(() => {
    const counts: Record<PaymentFilter, number> = {
      alle: payments.length,
      offen: 0,
      warten: 0,
      teilbezahlt: 0,
      bezahlt: 0,
      fehlgeschlagen: 0,
      storniert: 0,
    };

    for (const payment of payments) {
      const normalized = (payment.status ?? "").toLowerCase() as PaymentFilter;
      if (normalized in counts && normalized !== "alle") {
        counts[normalized] += 1;
      }
    }

    return counts;
  }, [payments]);

  const visiblePayments = useMemo(() => {
    if (paymentFilter === "alle") return payments;
    return payments.filter((payment) => (payment.status ?? "").toLowerCase() === paymentFilter);
  }, [payments, paymentFilter]);

  useEffect(() => {
    setDrafts(readStoredDrafts());
  }, []);

  useEffect(() => {
    window.localStorage.setItem(PRODUCT_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts]);

  function openProductSheet(productId?: string) {
    if (productId) {
      state.selectProduct(productId);
      setActiveSheet({ kind: "product", target: { kind: "existing", id: productId } });
      return;
    }

    state.createProductDraft();
    setActiveSheet({ kind: "product", target: { kind: "new" } });
  }

  function openOfferSheet(offerId?: string) {
    if (offerId) {
      state.selectOffer(offerId);
      setActiveSheet({ kind: "offer", target: { kind: "existing", id: offerId } });
      return;
    }

    const defaultProductId = state.selectedProductId ?? state.produkte[0]?.id ?? "";
    state.createOfferDraft(defaultProductId);
    setActiveSheet({ kind: "offer", target: { kind: "new" } });
  }

  function openExchangeSheet(entryId?: string) {
    if (entryId) {
      state.selectBieteSuche(entryId);
      setActiveSheet({ kind: "exchange", target: { kind: "existing", id: entryId } });
      return;
    }

    state.createBieteSucheDraft();
    setActiveSheet({ kind: "exchange", target: { kind: "new" } });
  }

  async function reloadCommerceData() {
    const [paymentsResponse, membershipsResponse, ordersResponse] = await Promise.all([
      listAdminMembershipPayments({ limit: 200 }),
      listAdminMemberships({ limit: 200 }),
      listBestellungen({ limit: 200 }),
    ]);

    setPayments(paymentsResponse);
    setMemberships(membershipsResponse);
    setOrders(ordersResponse);
  }

  async function handleConfirmPayment(payment: MembershipPayment) {
    setPaymentActionState({ paymentId: payment.id });

    try {
      await verifyPayment({
        paymentId: payment.id,
        status: "bezahlt",
        membershipId: payment.membershipId,
        amount: paymentAmount(payment) ?? undefined,
      });

      await reloadCommerceData();
      setPaymentActionState({
        paymentId: null,
        tone: "success",
        message: `Zahlung ${payment.id} wurde bestätigt.`,
      });
    } catch (error) {
      setPaymentActionState({
        paymentId: null,
        tone: "error",
        message: error instanceof Error ? error.message : "Die Zahlung konnte nicht bestätigt werden.",
      });
    }
  }

  async function handleMembershipAction(
    membership: MembershipRecord,
    action: "activate_by_admin" | "cancel_by_admin",
  ) {
    setMembershipActionState({ membershipId: membership.id });

    try {
      await manageMembership({
        membershipId: membership.id,
        action,
      });
      await reloadCommerceData();
      setMembershipActionState({
        membershipId: null,
        tone: "success",
        message:
          action === "activate_by_admin"
            ? `Mitgliedschaft ${membership.membershipNumber || membership.id} wurde aktiviert.`
            : `Mitgliedschaft ${membership.membershipNumber || membership.id} wurde storniert.`,
      });
    } catch (error) {
      setMembershipActionState({
        membershipId: null,
        tone: "error",
        message: error instanceof Error ? error.message : "Mitgliedschaft konnte nicht geändert werden.",
      });
    }
  }

  async function handleOrderAction(
    order: AdminOrderRecord,
    action: "cancel_by_admin" | "confirm" | "mark_picked_up",
  ) {
    setOrderActionState({ orderId: order.id });

    try {
      await manageOrder({
        orderId: order.id,
        action,
      });
      await reloadCommerceData();
      setOrderActionState({
        orderId: null,
        tone: "success",
        message:
          action === "confirm"
            ? `Bestellung ${order.id} wurde bestätigt.`
            : action === "mark_picked_up"
              ? `Bestellung ${order.id} wurde als abgeholt markiert.`
              : `Bestellung ${order.id} wurde storniert.`,
      });
    } catch (error) {
      setOrderActionState({
        orderId: null,
        tone: "error",
        message: error instanceof Error ? error.message : "Bestellung konnte nicht geändert werden.",
      });
    }
  }

  function selectPayment(payment: MembershipPayment) {
    setActiveSheet({ kind: "payment", id: payment.id });
  }

  function selectOfficeEvent(event: BackofficeEvent) {
    setActiveSheet({ kind: "office", id: event.id });
  }

  async function savePickupConfig() {
    setPickupConfigState({ state: "loading" });

    try {
      const horizonDays = Number(pickupConfigForm.horizonDays);
      if (!Number.isInteger(horizonDays) || horizonDays <= 0) {
        throw new Error("Horizont muss eine ganze Zahl größer als 0 sein.");
      }

      for (const slot of pickupConfigForm.weeklySlots) {
        if (!/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime)) {
          throw new Error("Jeder Abholslot braucht Start- und Endzeit im Format HH:MM.");
        }
      }

      const saved = await upsertPickupConfig({
        horizonDays,
        location: pickupConfigForm.location.trim() || undefined,
        note: pickupConfigForm.note.trim() || undefined,
        weeklySlots: pickupConfigForm.weeklySlots,
      });

      setPickupConfigForm(pickupConfigToFormState(saved));
      setPickupConfigState({ state: "success", message: "Abholkonfiguration gespeichert." });
    } catch (error) {
      setPickupConfigState({
        state: "error",
        message: error instanceof Error ? error.message : "Abholkonfiguration konnte nicht gespeichert werden.",
      });
    }
  }

  const selectedPayment =
    activeSheet?.kind === "payment" ? payments.find((payment) => payment.id === activeSheet.id) ?? null : null;
  const selectedMembership = selectedPayment?.membershipId ? membershipsById.get(selectedPayment.membershipId) : undefined;
  const selectedOfficeEvent =
    activeSheet?.kind === "office" ? backofficeEvents.find((event) => event.id === activeSheet.id) ?? null : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(182,209,164,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(190,176,235,0.12),transparent_22%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-surface-soft)_40%,white_60%))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <Tabs
          value={activePanel}
          onValueChange={(value) => setActivePanel(value as typeof activePanel)}
          className="flex flex-col gap-4"
        >
          <div className="sticky top-3 z-20 rounded-2xl border border-border/60 bg-white/90 px-3 py-3 shadow-[0_10px_30px_-22px_rgba(0,0,0,0.22)] backdrop-blur-sm">
            <TabsList variant="pill" className="flex w-full justify-start gap-1 overflow-x-auto rounded-full p-1">
              <TabsTrigger value="produkte">
                <Sprout data-icon="inline-start" />
                Produkte
              </TabsTrigger>
              <TabsTrigger value="angebote">
                <Boxes data-icon="inline-start" />
                Angebote
              </TabsTrigger>
              <TabsTrigger value="biete-suche">
                <ArrowRightLeft data-icon="inline-start" />
                Biete/Suche
              </TabsTrigger>
              <TabsTrigger value="zahlungen">
                <ReceiptText data-icon="inline-start" />
                Zahlungen
              </TabsTrigger>
              <TabsTrigger value="mitgliedschaften">
                <Users data-icon="inline-start" />
                Mitgliedschaften
              </TabsTrigger>
              <TabsTrigger value="bestellungen">
                <ShoppingCart data-icon="inline-start" />
                Bestellungen
              </TabsTrigger>
              <TabsTrigger value="office">
                <BriefcaseBusiness data-icon="inline-start" />
                Office
              </TabsTrigger>
            </TabsList>
          </div>

          {paymentActionState.message ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                paymentActionState.tone === "success"
                  ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
                  : "border-rose-300/70 bg-rose-50 text-rose-900",
              )}
            >
              {paymentActionState.message}
            </div>
          ) : null}

          {membershipActionState.message ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                membershipActionState.tone === "success"
                  ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
                  : "border-rose-300/70 bg-rose-50 text-rose-900",
              )}
            >
              {membershipActionState.message}
            </div>
          ) : null}

          {orderActionState.message ? (
            <div
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                orderActionState.tone === "success"
                  ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
                  : "border-rose-300/70 bg-rose-50 text-rose-900",
              )}
            >
              {orderActionState.message}
            </div>
          ) : null}

          <TabsContent value="produkte" className="mt-0 w-full">
            <CompactSection
              id="zentrale-produkte"
              title="Produkte"
              description="Alle Produkte in einer dichten Tabelle. Ein Klick öffnet den Editor in der Seitenleiste."
              actions={
                <Button size="sm" onClick={() => openProductSheet()}>
                  <Plus data-icon="inline-start" />
                  Neu
                </Button>
              }
            >
          <div className="mb-3 max-w-sm">
            <Input
              value={state.productFilter}
              onChange={(event) => state.setProductFilter(event.target.value)}
              placeholder="Produkte filtern"
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[11rem]">Produkt</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Saison</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[10rem] text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.visibleProducts.map((product) => {
                const draft = drafts[product.id];
                const liveProductForm = productToFormState(product);
                const meta = draft?.meta ?? createDefaultMeta(product, draft?.form ?? liveProductForm);
                const workflowState = deriveWorkflowState(liveProductForm, draft?.form ?? liveProductForm, meta, meta.workflowState);
                const statusTone = getProductStatusTone(workflowState);

                return (
                  <TableRow key={product.id} className="cursor-pointer" onClick={() => openProductSheet(product.id)}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{displayProductName(product)}</span>
                        <span className="font-mono text-xs text-muted-foreground">{product.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{displayValueLabel(product.hauptkategorie)}</Badge>
                        {product.unterkategorie ? <Badge variant="secondary">{displayValueLabel(product.unterkategorie)}</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>{(product.saisonalitaet ?? []).length > 0 ? product.saisonalitaet.join(", ") : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusTone.variant}>{statusTone.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <TableActionButton onClick={() => openProductSheet(product.id)}>
                        <Pencil data-icon="inline-start" />
                        Bearbeiten
                      </TableActionButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
            </CompactSection>
          </TabsContent>

          <TabsContent value="angebote" className="mt-0 w-full">
            <CompactSection
              id="zentrale-angebote"
              title="Angebote"
              description="Saisonfenster, Mengen und Preisstaffeln."
              actions={
                <Button size="sm" onClick={() => openOfferSheet()}>
                  <Plus data-icon="inline-start" />
                  Neu
                </Button>
              }
            >
          <div className="mb-4 rounded-2xl border border-border/70 bg-background/80 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">Globale Abholfenster</div>
                <div className="text-sm text-muted-foreground">Diese Termine gelten für alle Bestellungen.</div>
              </div>
              <Button size="sm" onClick={() => void savePickupConfig()} disabled={pickupConfigState.state === "loading"}>
                {pickupConfigState.state === "loading" ? "Speichert..." : "Abholung speichern"}
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-[8rem_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="grid gap-2">
                <Label>Horizont</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={pickupConfigForm.horizonDays}
                  onChange={(event) => setPickupConfigForm((current) => ({ ...current, horizonDays: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Abholort</Label>
                <Input
                  value={pickupConfigForm.location}
                  onChange={(event) => setPickupConfigForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="z. B. Agroforst FF, Wittstock"
                />
              </div>
              <div className="grid gap-2">
                <Label>Hinweis</Label>
                <Input
                  value={pickupConfigForm.note}
                  onChange={(event) => setPickupConfigForm((current) => ({ ...current, note: event.target.value }))}
                  placeholder="z. B. bitte pünktlich abholen"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {pickupConfigForm.weeklySlots.map((slot, index) => (
                <div key={`${slot.weekday}-${index}`} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{pickupWeekdayLabel(slot.weekday)}</div>
                    <Button
                      type="button"
                      size="sm"
                      variant={slot.active ? "default" : "outline"}
                      onClick={() =>
                        setPickupConfigForm((current) => ({
                          ...current,
                          weeklySlots: current.weeklySlots.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, active: !entry.active } : entry,
                          ),
                        }))
                      }
                    >
                      {slot.active ? "Aktiv" : "Inaktiv"}
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label>Von</Label>
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) =>
                          setPickupConfigForm((current) => ({
                            ...current,
                            weeklySlots: current.weeklySlots.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, startTime: event.target.value } : entry,
                            ),
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Bis</Label>
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) =>
                          setPickupConfigForm((current) => ({
                            ...current,
                            weeklySlots: current.weeklySlots.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, endTime: event.target.value } : entry,
                            ),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {pickupConfigState.message ? (
              <div className={cn("mt-3 text-sm", pickupConfigState.state === "error" ? "text-rose-700" : "text-emerald-700")}>
                {pickupConfigState.message}
              </div>
            ) : null}
          </div>

          <div className="mb-3 max-w-sm">
            <Input value={state.offerFilter} onChange={(event) => state.setOfferFilter(event.target.value)} placeholder="Angebote filtern" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Angebot</TableHead>
                <TableHead>Produkt</TableHead>
                <TableHead>Jahr</TableHead>
                <TableHead>Preis</TableHead>
                <TableHead>Verfügbar</TableHead>
                <TableHead className="w-[10rem] text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.visibleOffers.map((offer) => {
                const product = state.productById.get(offer.produktId);
                return (
                  <TableRow key={offer.id} className="cursor-pointer" onClick={() => openOfferSheet(offer.id)}>
                    <TableCell className="font-mono text-xs">{offer.id}</TableCell>
                    <TableCell className="font-medium">{displayProductName(product)}</TableCell>
                    <TableCell>{offer.year ?? "—"}</TableCell>
                    <TableCell>{getOfferPriceSummary(offer)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={offer.mengeVerfuegbar > 0 ? "default" : "secondary"}>
                          {offer.mengeVerfuegbar} {displayUnitLabel(offer.einheit)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Ernte: {formatHarvestRange(offer.ernteProjektion)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <TableActionButton onClick={() => openOfferSheet(offer.id)}>
                        <Pencil data-icon="inline-start" />
                        Bearbeiten
                      </TableActionButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
            </CompactSection>
          </TabsContent>

          <TabsContent value="biete-suche" className="mt-0 w-full">
            <CompactSection
              id="zentrale-biete-suche"
              title="Biete / Suche"
              description="Knappe Erfassungsansicht für freie Einträge."
              actions={
                <Button size="sm" onClick={() => openExchangeSheet()}>
                  <Plus data-icon="inline-start" />
                  Neu
                </Button>
              }
            >
          <div className="mb-3 max-w-sm">
            <Input value={state.bieteSucheFilter} onChange={(event) => state.setBieteSucheFilter(event.target.value)} placeholder="Einträge filtern" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titel</TableHead>
                <TableHead>Modus</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Hinweis</TableHead>
                <TableHead className="w-[10rem] text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {state.visibleBieteSucheEintraege.map((entry) => (
                <TableRow key={entry.id} className="cursor-pointer" onClick={() => openExchangeSheet(entry.id)}>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{entry.titel}</span>
                      <span className="font-mono text-xs text-muted-foreground">{entry.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.modus === "biete" ? "default" : "secondary"}>{entry.modus === "biete" ? "Biete" : "Suche"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {entry.tags.length > 0 ? entry.tags.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>) : "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{entry.hinweis ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <TableActionButton onClick={() => openExchangeSheet(entry.id)}>
                      <Pencil data-icon="inline-start" />
                      Bearbeiten
                    </TableActionButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </CompactSection>
          </TabsContent>

          <TabsContent value="zahlungen" className="mt-0 w-full">
            <CompactSection
              id="zentrale-zahlungen"
              title="Zahlungen"
              description="Mitgliedschaftszahlungen mit direkter Freigabe."
            >
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="outline">Alle {paymentCounts.alle}</Badge>
            {(["offen", "warten", "teilbezahlt", "bezahlt", "fehlgeschlagen", "storniert"] as PaymentFilter[]).map((status) => (
              <Button key={status} type="button" size="sm" variant={paymentFilter === status ? "default" : "outline"} onClick={() => setPaymentFilter(status)}>
                {status}
                <span className="ml-2 rounded-full bg-background/20 px-2 py-0.5 text-xs">{paymentCounts[status]}</span>
              </Button>
            ))}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zahlung</TableHead>
                <TableHead>Mitgliedschaft</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Betrag</TableHead>
                <TableHead>Fällig</TableHead>
                <TableHead>Referenz</TableHead>
                <TableHead className="w-[10rem] text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiblePayments.map((payment) => {
                const membership = payment.membershipId ? membershipsById.get(payment.membershipId) : undefined;
                const status = paymentStatusMeta(payment.status);
                const isPaid = (payment.status ?? "").toLowerCase() === "bezahlt";
                const isPending = paymentActionState.paymentId === payment.id;

                return (
                  <TableRow key={payment.id} className="cursor-pointer" onClick={() => selectPayment(payment)}>
                    <TableCell className="font-mono text-xs">{payment.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{membership?.membershipNumber || payment.membershipId || "—"}</span>
                        <span className="text-xs text-muted-foreground">{membership ? membershipTypeLabel(membership.typ) : "Ohne Zuordnung"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className} variant="outline">{status.label}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(paymentAmount(payment) ?? undefined)}</TableCell>
                    <TableCell>{formatAdminDate(payment.faelligAm)}</TableCell>
                    <TableCell className="max-w-[14rem] truncate">{payment.ref || "—"}</TableCell>
                    <TableCell className="text-right">
                      {isPaid ? (
                        <TableActionButton onClick={() => selectPayment(payment)} variant="secondary">
                          <Eye data-icon="inline-start" />
                          Details
                        </TableActionButton>
                      ) : (
                        <Button size="sm" disabled={isPending} onClick={() => void handleConfirmPayment(payment)}>
                          {isPending ? "Bestätige..." : "Als bezahlt"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
            </CompactSection>
          </TabsContent>

          <TabsContent value="mitgliedschaften" className="mt-0 w-full">
            <CompactSection
              id="zentrale-mitgliedschaften"
              title="Mitgliedschaften"
              description="Anträge aktivieren oder stoppen. Privat erst nach bestätigter Zahlung."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mitgliedschaft</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Zahlung</TableHead>
                    <TableHead>Guthaben</TableHead>
                    <TableHead className="w-[15rem] text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberships.map((membership) => {
                    const status = membershipStatusMeta(membership.status);
                    const payment = paymentStatusMeta(membership.bezahlStatus);
                    const isPending = membershipActionState.membershipId === membership.id;

                    return (
                      <TableRow key={membership.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{membership.membershipNumber || membership.id}</span>
                            <span className="text-xs text-muted-foreground">{formatAdminDate(membership.beantragungsDatum, true)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{membershipTypeLabel(membership.typ)}</TableCell>
                        <TableCell>
                          <Badge className={status.className} variant="outline">{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={payment.className} variant="outline">{payment.label}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(membership.kontingentAktuell ?? membership.kontingentStart ?? undefined)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canAdminActivateMembership(membership) ? (
                              <Button
                                size="sm"
                                disabled={isPending}
                                onClick={() => void handleMembershipAction(membership, "activate_by_admin")}
                              >
                                {isPending ? "Aktiviert..." : "Aktivieren"}
                              </Button>
                            ) : null}
                            {canAdminCancelMembership(membership) ? (
                              <TableActionButton
                                variant="secondary"
                                disabled={isPending}
                                onClick={() => void handleMembershipAction(membership, "cancel_by_admin")}
                              >
                                {isPending ? "Speichert..." : "Stornieren"}
                              </TableActionButton>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CompactSection>
          </TabsContent>

          <TabsContent value="bestellungen" className="mt-0 w-full">
            <CompactSection
              id="zentrale-bestellungen"
              title="Bestellungen"
              description="Strikte Freigabe: anfragen bestätigen, Abholung markieren oder vor Abholung stornieren."
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bestellung</TableHead>
                    <TableHead>Produkt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Abholung</TableHead>
                    <TableHead>Betrag</TableHead>
                    <TableHead className="w-[18rem] text-right">Aktion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const status = orderStatusMeta(order.status);
                    const isPending = orderActionState.orderId === order.id;

                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-mono text-xs">{order.id}</span>
                            <span className="text-xs text-muted-foreground">{order.userId || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{order.produktName || "—"}</TableCell>
                        <TableCell>
                          <Badge className={status.className} variant="outline">{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span>{formatAdminDate(order.pickupSlotStart, true)}</span>
                            {order.cancelDeadlineAt ? (
                              <span className="text-xs text-muted-foreground">Storno bis {formatAdminDate(order.cancelDeadlineAt, true)}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(order.preisGesamt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canAdminConfirmOrder(order) ? (
                              <Button size="sm" disabled={isPending} onClick={() => void handleOrderAction(order, "confirm")}>
                                {isPending ? "Bestätigt..." : "Bestätigen"}
                              </Button>
                            ) : null}
                            {canAdminMarkPickedUp(order) ? (
                              <Button size="sm" variant="secondary" disabled={isPending} onClick={() => void handleOrderAction(order, "mark_picked_up")}>
                                {isPending ? "Speichert..." : "Abgeholt"}
                              </Button>
                            ) : null}
                            {canAdminCancelOrder(order) ? (
                              <TableActionButton
                                variant="outline"
                                disabled={isPending}
                                onClick={() => void handleOrderAction(order, "cancel_by_admin")}
                              >
                                {isPending ? "Speichert..." : "Stornieren"}
                              </TableActionButton>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CompactSection>
          </TabsContent>

          <TabsContent value="office" className="mt-0 w-full">
            <CompactSection
              id="zentrale-office"
              title="Office"
              description="Backoffice-Log mit Zustell- und Bezugshinweisen."
            >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeit</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Betreff</TableHead>
                <TableHead>Text</TableHead>
                <TableHead>Bezug</TableHead>
                <TableHead>Zustand</TableHead>
                <TableHead className="w-[10rem] text-right">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backofficeEvents.map((event) => {
                const type = backofficeEventTypeMeta(event.ereignistyp);
                const delivery = deliveryStatusMeta(event.zugestellt);

                return (
                  <TableRow key={event.id} className="cursor-pointer" onClick={() => selectOfficeEvent(event)}>
                    <TableCell className="whitespace-nowrap">{formatAdminDate(event.createdAt, true)}</TableCell>
                    <TableCell><Badge className={type.className} variant="outline">{type.label}</Badge></TableCell>
                    <TableCell className="max-w-[14rem] truncate font-medium">{event.betreff || "Ohne Betreff"}</TableCell>
                    <TableCell className="max-w-[20rem] truncate text-sm text-muted-foreground">{event.nachricht}</TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">{eventReferenceLabel(event)}</TableCell>
                    <TableCell><Badge className={delivery.className} variant="outline">{delivery.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <TableActionButton onClick={() => selectOfficeEvent(event)} variant="secondary">
                        <Eye data-icon="inline-start" />
                        Details
                      </TableActionButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
            </CompactSection>
          </TabsContent>
        </Tabs>
      </div>

      <ProductSheetEditor state={state} drafts={drafts} setDrafts={setDrafts} activeSheet={activeSheet} setActiveSheet={setActiveSheet} />
      <OfferSheetEditor state={state} activeSheet={activeSheet} setActiveSheet={setActiveSheet} />
      <ExchangeSheetEditor state={state} activeSheet={activeSheet} setActiveSheet={setActiveSheet} />
      <PaymentSheet
        activeSheet={activeSheet}
        setActiveSheet={setActiveSheet}
        payment={selectedPayment}
        membership={selectedMembership}
        onConfirmPayment={handleConfirmPayment}
      />
      <OfficeSheet activeSheet={activeSheet} setActiveSheet={setActiveSheet} event={selectedOfficeEvent} />
    </main>
  );
}

export function loadZentraleAdminData() {
  return Promise.all([
    listAlleProdukte(),
    listStaffeln(),
    listBieteSucheEintraege(),
    listAdminMembershipPayments({ limit: 200 }),
    listAdminMemberships({ limit: 200 }),
    listBestellungen({ limit: 200 }),
    listBackofficeEvents({ limit: 100 }),
  ]);
}
