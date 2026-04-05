"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, ImagePlus, Link2, Plus, ReceiptText, Sprout, Upload, Boxes } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductCard } from "@/features/zentrale/product-card";
import { OfferEditor, OfferTable } from "@/features/zentrale/admin-ui";
import {
  displayProductName,
  displayValueLabel,
  emptyProductForm,
  hauptkategorieValues,
  lebensdauerValues,
  productToFormState,
  slugifyProduktId,
  splitMonths,
  type ProductFormState,
  unterkategorieValues,
} from "@/features/zentrale/admin-domain";
import { useZentraleAdmin } from "@/features/zentrale/use-zentrale-admin";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listAlleProdukte, listStaffeln } from "@/lib/appwrite/appwriteProducts";
import {
  listAdminMembershipPayments,
  listAdminMemberships,
  type MembershipPayment,
  type MembershipRecord,
} from "@/lib/appwrite/appwriteMemberships";
import { verifyPayment } from "@/lib/appwrite/appwriteFunctions";
import { cn } from "@/lib/utils";
import { statusToneRecipes, surfaceRecipes, textRecipes } from "@/theme/recipes";

const PRODUCT_DRAFT_STORAGE_KEY = "zentrale-product-drafts-v1";
const NEW_PRODUCT_KEY = "__new_product__";

type ProductWorkflowState = "clean" | "dirty" | "draftSaved" | "livePublished";
type EditorTarget = { kind: "existing"; id: string } | { kind: "new" } | null;

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

type ProductStatusTone = {
  label: string;
  variant: "default" | "secondary" | "outline";
};

type AdminPanel = "produkte" | "angebote" | "zahlungen";
type PaymentFilter = "alle" | "offen" | "warten" | "teilbezahlt" | "bezahlt" | "fehlgeschlagen" | "storniert";

function formatAdminDate(value?: string | null, withTime = false) {
  if (!value) {
    return "—";
  }

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

function formatAdminMoney(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function paymentStatusMeta(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();

  if (normalized === "offen" || normalized === "open") {
    return {
      label: "Offen",
      className: "border-amber-300/80 bg-amber-100 text-amber-900",
    };
  }
  if (normalized === "warten" || normalized === "pending") {
    return {
      label: "Wartet",
      className: "border-yellow-300/80 bg-yellow-100 text-yellow-900",
    };
  }
  if (normalized === "teilbezahlt" || normalized === "partial") {
    return {
      label: "Teilbezahlt",
      className: "border-lime-300/80 bg-lime-100 text-lime-900",
    };
  }
  if (normalized === "bezahlt" || normalized === "paid") {
    return {
      label: "Bezahlt",
      className: "border-emerald-300/80 bg-emerald-100 text-emerald-900",
    };
  }
  if (normalized === "fehlgeschlagen" || normalized === "failed") {
    return {
      label: "Fehlgeschlagen",
      className: "border-rose-300/80 bg-rose-100 text-rose-900",
    };
  }
  if (normalized === "storniert" || normalized === "cancelled") {
    return {
      label: "Storniert",
      className: "border-stone-300/80 bg-stone-100 text-stone-800",
    };
  }

  return {
    label: value || "Unbekannt",
    className: "border-border bg-muted text-foreground",
  };
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

function membershipTypeLabel(value?: string | null) {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "privat" || normalized === "private") return "Privat";
  if (normalized === "betrieb" || normalized === "business") return "Betrieb";
  return value || "—";
}

function PaymentsTable({
  payments,
  membershipsById,
  activePaymentId,
  onConfirmPayment,
}: {
  payments: MembershipPayment[];
  membershipsById: Map<string, MembershipRecord>;
  activePaymentId: string | null;
  onConfirmPayment: (payment: MembershipPayment) => Promise<void>;
}) {
  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-surface-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zahlung</TableHead>
            <TableHead>Mitgliedschaft</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Betrag</TableHead>
            <TableHead>Fällig</TableHead>
            <TableHead>Erfasst</TableHead>
            <TableHead>Referenz</TableHead>
            <TableHead className="text-right">Aktion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length > 0 ? (
            payments.map((payment) => {
              const membership = payment.membershipId ? membershipsById.get(payment.membershipId) : undefined;
              const status = paymentStatusMeta(payment.status);
              const isPaid = (payment.status ?? "").toLowerCase() === "bezahlt";
              const isPending = activePaymentId === payment.id;

              return (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{payment.id}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {membership?.membershipNumber || payment.membershipId || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {membership ? membershipTypeLabel(membership.typ) : "Ohne Zuordnung"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={status.className} variant="outline">{status.label}</Badge>
                  </TableCell>
                  <TableCell>{formatAdminMoney(paymentAmount(payment))}</TableCell>
                  <TableCell>{formatAdminDate(payment.faelligAm)}</TableCell>
                  <TableCell>{formatAdminDate(payment.createdAt, true)}</TableCell>
                  <TableCell className="max-w-[14rem] truncate">{payment.ref || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={isPaid ? "outline" : "default"}
                      disabled={isPending}
                      onClick={() => void onConfirmPayment(payment)}
                    >
                      {isPending ? "Synchronisiere..." : isPaid ? "Guthaben synchronisieren" : "Als bezahlt markieren"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                Keine Zahlungen für diesen Status gefunden.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function AdminLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(182,209,164,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(190,176,235,0.14),transparent_22%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-surface-soft)_42%,white_58%))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <Skeleton className="h-20 rounded-[1.5rem]" />
        <Skeleton className="h-10 rounded-full" />
        <Skeleton className="h-[32rem] rounded-[1.5rem]" />
      </div>
    </main>
  );
}

function AdminError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(182,209,164,0.18),transparent_26%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-surface-soft)_42%,white_58%))] px-4 py-8">
      <Card className={cn("w-full max-w-lg border-destructive/40 shadow-brand-strong", surfaceRecipes({ tone: "strong" }))}>
        <CardHeader>
          <CardTitle className={cn(textRecipes({ role: "title" }), "text-destructive")}>Fehler beim Laden</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function RowButton({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium shadow-sm transition",
        active
          ? cn(statusToneRecipes({ tone: "seasonal" }), "border-transparent")
          : "border-border bg-surface-card text-foreground hover:bg-surface-soft",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function EmptyCategoryState({ categoryLabel }: { categoryLabel: string }) {
  return (
    <Card className={cn("border-dashed border-border/80", surfaceRecipes({ tone: "default" }))}>
      <CardHeader>
        <CardTitle className={cn(textRecipes({ role: "title" }), "text-base")}>Keine Produkte in {categoryLabel}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl border border-border/60 bg-surface-soft px-3 py-2">
      <span className={cn(textRecipes({ role: "meta" }), "text-[11px] uppercase tracking-[0.16em]")}>{label}</span>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function RadioOption({
  value,
  label,
  checked,
}: {
  value: string;
  label: string;
  checked: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition",
        checked
          ? "border-transparent bg-accent text-accent-foreground shadow-brand-soft"
          : "border-border/70 bg-surface-soft",
      )}
    >
      <RadioGroupItem value={value} />
      <span>{label}</span>
    </label>
  );
}

function SwitchRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-surface-soft px-4 py-3">
      <div className="flex flex-col gap-1">
        <span className={cn(textRecipes({ role: "label" }), "text-sm text-foreground")}>{title}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
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

  if (preferred === "draftSaved") {
    return "draftSaved";
  }

  return "dirty";
}

function getProductStatusTone(workflowState: ProductWorkflowState): ProductStatusTone {
  switch (workflowState) {
    case "dirty":
      return { label: "Ungespeicherte Änderungen", variant: "secondary" };
    case "draftSaved":
      return { label: "Entwurf", variant: "outline" };
    case "livePublished":
    case "clean":
    default:
      return { label: "Live", variant: "default" };
  }
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Noch nicht gesetzt";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Noch nicht gesetzt";
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function readStoredDrafts(): Record<string, ProductDraftRecord> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(PRODUCT_DRAFT_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function InlineProductEditor({
  title,
  description,
  idMode,
  form,
  meta,
  imagePreviewUrl,
  imageFileName,
  productStatusMessage,
  isPublishing,
  onCancel,
  onSaveDraft,
  onPublishIntent,
  onFieldChange,
  onImageFileChange,
  onMetaChange,
}: {
  title: string;
  description: string;
  idMode: "auto" | "fixed";
  form: ProductFormState;
  meta: ProductDraftMeta;
  imagePreviewUrl?: string;
  imageFileName?: string;
  productStatusMessage?: string;
  isPublishing: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublishIntent: () => void;
  onFieldChange: <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => void;
  onImageFileChange: (file: File | null) => void;
  onMetaChange: (patch: Partial<ProductDraftMeta>, preferred?: ProductWorkflowState) => void;
}) {
  const canPublish = meta.readyToPublish && (meta.workflowState === "dirty" || meta.workflowState === "draftSaved");
  const [showImageControls, setShowImageControls] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Card className={cn("border-0 shadow-none", surfaceRecipes({ tone: "default" }))}>
      <CardHeader className="gap-4 border-b border-border/70 bg-surface-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getProductStatusTone(meta.workflowState).variant}>
                {getProductStatusTone(meta.workflowState).label}
              </Badge>
              {form.hauptkategorie ? <Badge variant="outline">{displayValueLabel(form.hauptkategorie)}</Badge> : null}
            </div>
            <div>
              <CardTitle className={cn(textRecipes({ role: "headline" }), "text-xl")}>{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
            <Button variant="secondary" onClick={onSaveDraft}>
              Entwurf speichern
            </Button>
            <Button onClick={onPublishIntent} disabled={!canPublish || isPublishing}>
              <Upload data-icon="inline-start" />
              Veröffentlichen
            </Button>
          </div>
        </div>

        <Alert variant={meta.workflowState === "dirty" ? "destructive" : "default"} className="bg-surface-soft">
          {meta.workflowState === "dirty" ? <CircleAlert /> : <CheckCircle2 />}
          <AlertTitle>
            {meta.workflowState === "dirty"
              ? "Du bearbeitest einen Entwurf"
              : meta.workflowState === "draftSaved"
                ? "Entwurf gespeichert, noch nicht veröffentlicht"
                : "Öffentliche Ansicht ist live"}
          </AlertTitle>
          <AlertDescription>
            {meta.workflowState === "dirty"
              ? "Die öffentliche Produktansicht bleibt unverändert, bis du ausdrücklich veröffentlichst."
              : meta.workflowState === "draftSaved"
                ? "Der Entwurf ist gespeichert. Erst mit Veröffentlichen werden die Änderungen öffentlich."
                : "Aktuell entspricht die öffentliche Ansicht dem veröffentlichten Stand."}
            {productStatusMessage ? ` ${productStatusMessage}` : ""}
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="grid gap-5 bg-surface-plain p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="produkt-name">Name</Label>
            <Input id="produkt-name" value={form.name} onChange={(event) => onFieldChange("name", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="produkt-sorte">Sorte</Label>
            <Input id="produkt-sorte" value={form.sorte} onChange={(event) => onFieldChange("sorte", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="produkt-id">Produkt-ID</Label>
            <Input
              id="produkt-id"
              value={form.id}
              readOnly
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {idMode === "auto"
                ? "Auto: wird beim Tippen aus Name und Sorte abgeleitet."
                : "Bestehende Produkte behalten ihre aktuelle Dokument-ID."}
            </p>
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-border/70 bg-surface-soft p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setShowImageControls((current) => !current)}
                className="cursor-pointer rounded-full"
              >
                <Avatar className="size-18 border border-border/70 bg-muted/35 shadow-sm">
                  {imagePreviewUrl ? (
                    <AvatarImage src={imagePreviewUrl} alt={form.name || "Produktbild"} className="rounded-full object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-muted/60 text-muted-foreground">
                    <ImagePlus className="size-6" />
                  </AvatarFallback>
                </Avatar>
              </button>

              <div className="min-w-0">
                <h3 className="text-sm font-medium text-foreground">Produktbild</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Avatar anklicken oder mit den Aktionen unten Bild hochladen, ersetzen oder eine Datei-ID verknüpfen.
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {imageFileName
                    ? `Ausgewählt: ${imageFileName}`
                    : form.imageId.trim()
                      ? `Verknüpfte Datei-ID: ${form.imageId.trim()}`
                      : "Aktuell ist noch kein Bild verknüpft."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                ref={imageInputRef}
                id="produkt-image-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(event) => onImageFileChange(event.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload data-icon="inline-start" />
                {imagePreviewUrl || imageFileName || form.imageId.trim() ? "Bild ersetzen" : "Bild hochladen"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowImageControls((current) => !current)}
              >
                <Link2 data-icon="inline-start" />
                Datei-ID
              </Button>
            </div>
          </div>

          {showImageControls ? (
            <div className="mt-4 grid gap-3 rounded-[1rem] border border-dashed border-border/70 bg-surface-plain p-3">
              <div className="grid gap-2">
                <Label htmlFor="produkt-image-id">Appwrite Datei-ID manuell verknüpfen</Label>
                <Input
                  id="produkt-image-id"
                  value={form.imageId}
                  onChange={(event) => onFieldChange("imageId", event.target.value)}
                  placeholder="z. B. 67fd2f4f0012abcd1234"
                />
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Upload funktioniert über den Button
                {" "}
                <span className="font-medium text-foreground">Bild hochladen</span>
                {" "}
                und wird beim nächsten Speichern in den Bucket
                {" "}
                <span className="font-mono text-foreground">produkt_bilder</span>
                {" "}
                hochgeladen.
              </p>
            </div>
          ) : null}
        </div>

        <Accordion type="multiple" defaultValue={["sichtbarkeit", "freigabe", "klassifikation", "veroeffentlichung"]} className="w-full rounded-[1.25rem] border border-border/70 bg-surface-soft px-4">
          <AccordionItem value="sichtbarkeit">
            <AccordionTrigger>Marktplatzsichtbarkeit</AccordionTrigger>
            <AccordionContent className="pt-2">
              <SwitchRow
                title="Für Marktplatz sichtbar"
                description="Signalisiert, dass dieses Produkt öffentlich sichtbar sein soll."
                checked={meta.isVisible}
                onCheckedChange={(checked) =>
                  onMetaChange(
                    {
                      isVisible: checked,
                      draftUpdatedAt: new Date().toISOString(),
                    },
                    "dirty",
                  )
                }
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="saisonal_aktiv">
            <AccordionTrigger>Saisonale Hervorhebung</AccordionTrigger>
            <AccordionContent className="pt-2">
              <SwitchRow
                title="Als saisonal aktiv markieren"
                description="Zeigt an, dass der Entwurf aktuell saisonal hervorgehoben werden soll."
                checked={meta.seasonalActive}
                onCheckedChange={(checked) =>
                  onMetaChange(
                    {
                      seasonalActive: checked,
                      draftUpdatedAt: new Date().toISOString(),
                    },
                    "dirty",
                  )
                }
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="freigabe">
            <AccordionTrigger>Freigabe zur Veröffentlichung</AccordionTrigger>
            <AccordionContent className="pt-2">
              <SwitchRow
                title="Zur Veröffentlichung vormerken"
                description="Ohne diese bewusste Freigabe bleibt Veröffentlichen gesperrt."
                checked={meta.readyToPublish}
                onCheckedChange={(checked) =>
                  onMetaChange(
                    {
                      readyToPublish: checked,
                      draftUpdatedAt: new Date().toISOString(),
                    },
                    checked ? "draftSaved" : "dirty",
                  )
                }
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="klassifikation">
            <AccordionTrigger>Klassifikation</AccordionTrigger>
            <AccordionContent className="grid gap-4 pt-2">
              <div className="grid gap-2">
                <Label>Hauptkategorie</Label>
                <RadioGroup
                  value={form.hauptkategorie}
                  onValueChange={(value) => onFieldChange("hauptkategorie", value)}
                  className="md:grid-cols-2 xl:grid-cols-3"
                >
                  {hauptkategorieValues.map((value) => (
                    <RadioOption
                      key={value}
                      value={value}
                      label={displayValueLabel(value)}
                      checked={form.hauptkategorie === value}
                    />
                  ))}
                </RadioGroup>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="produkt-unterkategorie">Unterkategorie</Label>
                  <Select
                    value={form.unterkategorie || "__empty__"}
                    onValueChange={(value) => onFieldChange("unterkategorie", value && value !== "__empty__" ? value : "")}
                  >
                    <SelectTrigger id="produkt-unterkategorie">
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

                <div className="grid gap-2">
                  <Label>Lebensdauer</Label>
                  <RadioGroup
                    value={form.lebensdauer}
                    onValueChange={(value) => onFieldChange("lebensdauer", value)}
                  >
                    {lebensdauerValues.map((value) => (
                      <RadioOption
                        key={value}
                        value={value}
                        label={displayValueLabel(value)}
                        checked={form.lebensdauer === value}
                      />
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="saison">
            <AccordionTrigger>Saison</AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="grid gap-2">
                <Label htmlFor="produkt-saison">Saisonmonate</Label>
                <Input
                  id="produkt-saison"
                  value={form.saisonalitaet}
                  onChange={(event) => onFieldChange("saisonalitaet", event.target.value)}
                  placeholder="z. B. 5, 6, 7, 8"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="anbau">
            <AccordionTrigger>Anbau &amp; Fruchtfolge</AccordionTrigger>
            <AccordionContent className="grid gap-3 pt-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="produkt-fruchtfolge-vor">Fruchtfolge davor</Label>
                <Textarea
                  id="produkt-fruchtfolge-vor"
                  value={form.fruchtfolgeVor}
                  onChange={(event) => onFieldChange("fruchtfolgeVor", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produkt-fruchtfolge-nach">Fruchtfolge danach</Label>
                <Textarea
                  id="produkt-fruchtfolge-nach"
                  value={form.fruchtfolgeNach}
                  onChange={(event) => onFieldChange("fruchtfolgeNach", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produkt-boden">Bodenansprüche</Label>
                <Textarea
                  id="produkt-boden"
                  value={form.bodenansprueche}
                  onChange={(event) => onFieldChange("bodenansprueche", event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="produkt-begleitpflanzen">Begleitpflanzen</Label>
                <Textarea
                  id="produkt-begleitpflanzen"
                  value={form.begleitpflanzen}
                  onChange={(event) => onFieldChange("begleitpflanzen", event.target.value)}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="hinweise">
            <AccordionTrigger>Interne Hinweise</AccordionTrigger>
            <AccordionContent className="grid gap-3 pt-2 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="produkt-notizen">Notizen</Label>
                <Textarea
                  id="produkt-notizen"
                  value={form.notes}
                  onChange={(event) => onFieldChange("notes", event.target.value)}
                  placeholder="z. B. lagerfähig, beliebt auf dem Wochenmarkt"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="veroeffentlichung">
            <AccordionTrigger>Veröffentlichungsstatus</AccordionTrigger>
            <AccordionContent className="grid gap-3 pt-2 md:grid-cols-2 xl:grid-cols-4">
              <SummaryRow label="Freigabe" value={meta.readyToPublish ? "Zur Veröffentlichung vorgemerkt" : "Noch nicht freigegeben"} />
              <SummaryRow label="Sichtbarkeit" value={meta.isVisible ? "Sichtbar" : "Nicht sichtbar"} />
              <SummaryRow label="Entwurf gespeichert" value={formatTimestamp(meta.draftUpdatedAt)} />
              <SummaryRow label="Zuletzt veröffentlicht" value={formatTimestamp(meta.publishedAt)} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function ZentraleWorkspace({
  initialProdukte,
  initialStaffeln,
  initialPayments,
  initialMemberships,
}: {
  initialProdukte: Produkt[];
  initialStaffeln: Staffel[];
  initialPayments: MembershipPayment[];
  initialMemberships: MembershipRecord[];
}) {
  const state = useZentraleAdmin({
    initialProdukte,
    initialStaffeln,
  });
  const [drafts, setDrafts] = useState<Record<string, ProductDraftRecord>>({});
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<AdminPanel>("produkte");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("alle");
  const [payments, setPayments] = useState<MembershipPayment[]>(initialPayments);
  const [memberships, setMemberships] = useState<MembershipRecord[]>(initialMemberships);
  const [paymentActionState, setPaymentActionState] = useState<{
    paymentId: string | null;
    message?: string;
    tone?: "success" | "error";
  }>({ paymentId: null });

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
    if (paymentFilter === "alle") {
      return payments;
    }

    return payments.filter((payment) => (payment.status ?? "").toLowerCase() === paymentFilter);
  }, [payments, paymentFilter]);

  const paymentFilterOptions = [
    { value: "offen" as PaymentFilter, label: "Offen", count: paymentCounts.offen },
    { value: "warten" as PaymentFilter, label: "Wartet", count: paymentCounts.warten },
    { value: "teilbezahlt" as PaymentFilter, label: "Teilbezahlt", count: paymentCounts.teilbezahlt },
    { value: "bezahlt" as PaymentFilter, label: "Bezahlt", count: paymentCounts.bezahlt },
    { value: "fehlgeschlagen" as PaymentFilter, label: "Fehlgeschlagen", count: paymentCounts.fehlgeschlagen },
    { value: "storniert" as PaymentFilter, label: "Storniert", count: paymentCounts.storniert },
  ];

  async function reloadPaymentData() {
    const [paymentsResponse, membershipsResponse] = await Promise.all([
      listAdminMembershipPayments({ limit: 200 }),
      listAdminMemberships({ limit: 200 }),
    ]);

    setPayments(paymentsResponse);
    setMemberships(membershipsResponse);
  }

  async function handleConfirmPayment(payment: MembershipPayment) {
    setPaymentActionState({ paymentId: payment.id });
    const wasPaid = (payment.status ?? "").toLowerCase() === "bezahlt";

    try {
      await verifyPayment({
        paymentId: payment.id,
        status: "bezahlt",
        membershipId: payment.membershipId,
        amount: paymentAmount(payment) ?? undefined,
        force: wasPaid,
      });

      await reloadPaymentData();
      setPaymentActionState({
        paymentId: null,
        tone: "success",
        message: wasPaid
          ? `Zahlung ${payment.id} wurde erneut synchronisiert. Guthaben und Mitgliedschaftsdaten sind aktualisiert.`
          : `Zahlung ${payment.id} wurde bestätigt. Die Mitgliedschaft ist jetzt freigeschaltet.`,
      });
    } catch (error) {
      setPaymentActionState({
        paymentId: null,
        tone: "error",
        message: error instanceof Error ? error.message : "Die Zahlung konnte nicht bestätigt werden.",
      });
    }
  }

  const availableCategories = useMemo(
    () =>
      hauptkategorieValues.filter((category) =>
        state.produkte.some((product) => product.hauptkategorie === category),
      ),
    [state.produkte],
  );

  const defaultCategory = availableCategories[0] ?? hauptkategorieValues[0];
  const [activeCategory, setActiveCategory] = useState<string>(defaultCategory);

  useEffect(() => {
    setDrafts(readStoredDrafts());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PRODUCT_DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    }
  }, [drafts]);

  useEffect(() => {
    const isKnown = hauptkategorieValues.includes(activeCategory as (typeof hauptkategorieValues)[number]);
    if (!isKnown) {
      setActiveCategory(defaultCategory);
      return;
    }

    if (availableCategories.length > 0) {
      const stillAvailable = availableCategories.includes(activeCategory as (typeof hauptkategorieValues)[number]);
      if (!stillAvailable) {
        setActiveCategory(defaultCategory);
      }
    }
  }, [activeCategory, availableCategories, defaultCategory]);

  useEffect(() => {
    if (!editorTarget) {
      return;
    }

    if (editorTarget.kind === "new") {
      state.createProductDraft();
      return;
    }

    if (state.selectedProductId !== editorTarget.id) {
      state.selectProduct(editorTarget.id);
    }
  }, [editorTarget, state]);

  const selectedProduct = editorTarget?.kind === "existing" ? state.selectedProduct : null;
  const activeDraftKey = editorTarget?.kind === "new" ? NEW_PRODUCT_KEY : editorTarget?.kind === "existing" ? editorTarget.id : null;
  const liveForm =
    editorTarget?.kind === "new"
      ? emptyProductForm()
      : selectedProduct
        ? productToFormState(selectedProduct)
        : emptyProductForm();
  const activeDraft = activeDraftKey ? drafts[activeDraftKey] : undefined;

  useEffect(() => {
    if (!editorTarget || !activeDraftKey) {
      return;
    }

    const nextForm = activeDraft?.form ?? liveForm;
    if (!formsEqual(state.productForm, nextForm)) {
      state.setProductForm(nextForm);
    }
  }, [activeDraft, activeDraftKey, editorTarget, liveForm, state.productForm, state.setProductForm]);

  const activeMeta = useMemo(() => {
    if (!editorTarget) {
      return null;
    }

    const baseMeta = activeDraft?.meta ?? createDefaultMeta(selectedProduct ?? undefined, state.productForm);
    return {
      ...baseMeta,
      workflowState: deriveWorkflowState(liveForm, state.productForm, baseMeta, baseMeta.workflowState),
    };
  }, [activeDraft, editorTarget, liveForm, selectedProduct, state.productForm]);

  const productsForActiveCategory = useMemo(
    () => state.visibleProducts.filter((product) => product.hauptkategorie === activeCategory),
    [activeCategory, state.visibleProducts],
  );

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
    if (!activeDraftKey) {
      return;
    }

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
    if (!activeDraftKey) {
      return;
    }

    persistDraft(activeDraftKey, state.productForm, patch, preferred);
  }

  function openNewProductEditor() {
    setPublishOpen(false);
    setEditorTarget({ kind: "new" });
  }

  function openOfferWorkspace() {
    setPublishOpen(false);
    setEditorTarget(null);
    state.createOfferDraft();
  }

  function openExistingEditor(productId: string) {
    setPublishOpen(false);
    setEditorTarget({ kind: "existing", id: productId });
  }

  function closeEditor() {
    if (activeMeta?.workflowState === "dirty") {
      const shouldLeave = window.confirm(
        "Es gibt ungespeicherte Änderungen. Der Entwurf bleibt lokal erhalten. Editor trotzdem schließen?",
      );
      if (!shouldLeave) {
        return;
      }
    }

    setPublishOpen(false);
    setEditorTarget(null);
  }

  function saveDraft() {
    if (!activeDraftKey) {
      return;
    }

    persistDraft(
      activeDraftKey,
      state.productForm,
      {
        draftUpdatedAt: new Date().toISOString(),
      },
      "draftSaved",
    );
  }

  async function publishProduct() {
    if (!activeMeta?.readyToPublish) {
      return;
    }

    const saved = await state.publishProduct();
    if (!saved) {
      return;
    }

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

    setPublishOpen(false);
    setEditorTarget(null);
    state.selectProduct(saved.id);

    // Force a fresh read after publish so the grid immediately reflects the
    // canonical Appwrite document even if local draft state is stale.
    window.location.reload();
  }

  function productStatusForCard(product: Produkt): ProductStatusTone {
    const draft = drafts[product.id];
    const liveProductForm = productToFormState(product);
    const meta = draft?.meta ?? createDefaultMeta(product, draft?.form ?? liveProductForm);
    const workflowState = deriveWorkflowState(liveProductForm, draft?.form ?? liveProductForm, meta, meta.workflowState);
    return getProductStatusTone(workflowState);
  }

  const editorTitle =
    editorTarget?.kind === "new"
      ? "Neues Produkt"
      : selectedProduct
        ? displayProductName(selectedProduct)
        : "Produkt bearbeiten";

  const editorDescription =
    editorTarget?.kind === "new"
      ? "Produkt zuerst als Entwurf anlegen, dann bewusst veröffentlichen."
      : "Änderungen bleiben intern, bis du sie ausdrücklich veröffentlichst.";

  const editorOpen = editorTarget !== null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(182,209,164,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(190,176,235,0.14),transparent_22%),linear-gradient(180deg,var(--color-background),color-mix(in_srgb,var(--color-surface-soft)_44%,white_56%))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className={cn("flex flex-wrap items-center gap-3 rounded-[1.6rem] px-4 py-4", surfaceRecipes({ tone: "band" }))}>
          <RowButton active={activePanel === "produkte"} onClick={() => setActivePanel("produkte")}>
            <Sprout className="size-4" />
            Produkte
          </RowButton>
          <RowButton active={activePanel === "angebote"} onClick={() => {
            setActivePanel("angebote");
            openOfferWorkspace();
          }}>
            <Boxes className="size-4" />
            Angebote
          </RowButton>
          <RowButton active={activePanel === "zahlungen"} onClick={() => setActivePanel("zahlungen")}>
            <ReceiptText className="size-4" />
            Zahlungen
          </RowButton>
        </div>

        {activePanel === "produkte" ? (
          <>
            <div className="flex justify-start">
              <Button onClick={openNewProductEditor}>
                <Plus data-icon="inline-start" />
                Neues Produkt
              </Button>
            </div>

            <div className={cn("flex flex-wrap items-center gap-3 rounded-[1.4rem] px-4 py-3", surfaceRecipes({ tone: "default" }))}>
              {availableCategories.map((category) => (
                <RowButton
                  key={category}
                  active={activeCategory === category}
                  onClick={() => setActiveCategory(category)}
                >
                  {displayValueLabel(category)}
                </RowButton>
              ))}
            </div>

            {productsForActiveCategory.length === 0 ? (
              <EmptyCategoryState categoryLabel={displayValueLabel(activeCategory)} />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {productsForActiveCategory.map((product) => {
                  const statusTone = productStatusForCard(product);

                  return (
                    <div key={product.id}>
                      <ProductCard
                        product={product}
                        selected={editorTarget?.kind === "existing" && editorTarget.id === product.id}
                        statusLabel={statusTone.label}
                        statusVariant={statusTone.variant}
                        onSelect={() => openExistingEditor(product.id)}
                        onEdit={() => openExistingEditor(product.id)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : activePanel === "angebote" ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-border/70 bg-surface-card px-4 py-3">
              <div>
                <div className={cn(textRecipes({ role: "label" }), "text-sm text-foreground")}>Angebote</div>
              </div>
              <Button onClick={() => state.createOfferDraft()}>
                <Plus data-icon="inline-start" />
                Neues Angebot
              </Button>
            </div>

            <OfferTable state={state} caption="Angebote nach Produkt, Jahr, Preis und Verfügbarkeit." />
            <OfferEditor state={state} />
          </>
        ) : (
          <section className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryRow label="Zahlungen gesamt" value={paymentCounts.alle} />
              <SummaryRow label="Offen" value={paymentCounts.offen} />
              <SummaryRow label="Wartet" value={paymentCounts.warten} />
              <SummaryRow label="Bezahlt" value={paymentCounts.bezahlt} />
            </div>

            <Card className="border-border/80 bg-card/95 shadow-brand-soft">
              <CardHeader className="gap-2">
                <CardTitle>Zahlungsübersicht</CardTitle>
                <CardDescription>
                  Alle Mitgliedschaftszahlungen mit Statusfilter. "Als bezahlt markieren" ruft `verifyPayment` auf und schaltet die Mitgliedschaft frei.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* TODO: E-Mail-Adressen bei Bedarf serverseitig on demand per benutzer_id aufloesen,
                    statt sie dauerhaft in Mitgliedschaften zu speichern. */}
                {paymentActionState.message ? (
                  <div
                    className={cn(
                      "mb-4 rounded-2xl border px-4 py-3 text-sm",
                      paymentActionState.tone === "success"
                        ? "border-emerald-300/70 bg-emerald-50 text-emerald-900"
                        : "border-rose-300/70 bg-rose-50 text-rose-900",
                    )}
                  >
                    {paymentActionState.message}
                  </div>
                ) : null}
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentFilter("alle")}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                      paymentFilter === "alle"
                        ? "border-transparent bg-foreground text-background shadow-sm"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    <span>Alle</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        paymentFilter === "alle" ? "bg-background/15 text-inherit" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {paymentCounts.alle}
                    </span>
                  </button>

                  <Select
                    value={paymentFilter === "alle" ? undefined : paymentFilter}
                    onValueChange={(value) => setPaymentFilter(value as PaymentFilter)}
                  >
                    <SelectTrigger className="w-full sm:w-[18rem]">
                      <SelectValue placeholder="Status auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {paymentFilterOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label} ({option.count})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <PaymentsTable
                  payments={visiblePayments}
                  membershipsById={membershipsById}
                  activePaymentId={paymentActionState.paymentId}
                  onConfirmPayment={handleConfirmPayment}
                />
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditor();
          }
        }}
      >
        <DialogContent className={cn("w-[min(1320px,calc(100vw-2rem))] !bg-surface-plain [background:var(--color-surface-plain)] [backdrop-filter:none] sm:max-w-[min(1320px,calc(100vw-2rem))] overflow-hidden p-0 shadow-[0_32px_90px_-32px_rgba(0,0,0,0.38)]", textRecipes({ role: "label" }))}>
          <div className="max-h-[92vh] overflow-y-auto">
            {activeMeta ? (
              <InlineProductEditor
                title={editorTitle}
                description={editorDescription}
                idMode={editorTarget?.kind === "new" ? "auto" : "fixed"}
                form={state.productForm}
                meta={activeMeta}
                imagePreviewUrl={state.productImagePreviewUrl}
                imageFileName={state.productImageFileName}
                productStatusMessage={state.productStatus.message}
                isPublishing={state.productStatus.state === "loading"}
                onCancel={closeEditor}
                onSaveDraft={saveDraft}
                onPublishIntent={() => setPublishOpen(true)}
                onFieldChange={updateProductField}
                onImageFileChange={state.setProductImageFile}
                onMetaChange={updateMeta}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Entwurf jetzt öffentlich machen?</DialogTitle>
            <DialogDescription>
              Erst mit diesem Schritt wird die öffentliche Produktansicht aktualisiert.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 text-sm">
            <SummaryRow label="Produkt" value={state.productForm.name || "Unbenanntes Produkt"} />
            <SummaryRow label="Kategorie" value={displayValueLabel(state.productForm.hauptkategorie) || "Nicht gesetzt"} />
            <SummaryRow label="Saison" value={state.productForm.saisonalitaet || "Keine Saison gepflegt"} />
            <SummaryRow label="Freigabe" value={activeMeta?.readyToPublish ? "Zur Veröffentlichung vorgemerkt" : "Noch nicht freigegeben"} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>
              Zurück
            </Button>
            <Button
              onClick={publishProduct}
              disabled={!activeMeta?.readyToPublish || state.productStatus.state === "loading"}
            >
              {state.productStatus.state === "loading" ? "Veröffentlicht..." : "Jetzt veröffentlichen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default function Page() {
  const [produkte, setProdukte] = useState<Produkt[] | null>(null);
  const [staffeln, setStaffeln] = useState<Staffel[] | null>(null);
  const [payments, setPayments] = useState<MembershipPayment[] | null>(null);
  const [memberships, setMemberships] = useState<MembershipRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [produkteResponse, staffelnResponse, paymentsResponse, membershipsResponse] = await Promise.all([
          listAlleProdukte(),
          listStaffeln(),
          listAdminMembershipPayments({ limit: 200 }),
          listAdminMemberships({ limit: 200 }),
        ]);

        if (!active) {
          return;
        }

        setProdukte(produkteResponse as unknown as Produkt[]);
        setStaffeln(staffelnResponse as unknown as Staffel[]);
        setPayments(paymentsResponse);
        setMemberships(membershipsResponse);
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

  if (!produkte || !staffeln || !payments || !memberships) {
    return <AdminLoading />;
  }

  return (
    <ZentraleWorkspace
      initialProdukte={produkte}
      initialStaffeln={staffeln}
      initialPayments={payments}
      initialMemberships={memberships}
    />
  );
}
