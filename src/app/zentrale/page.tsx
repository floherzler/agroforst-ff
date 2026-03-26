"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, PencilLine, Plus, Sparkles, Sprout, Upload, Boxes } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { ProductCard } from "@/features/zentrale/product-card";
import {
  displayProductName,
  displayValueLabel,
  emptyProductForm,
  hauptkategorieValues,
  lebensdauerValues,
  productToFormState,
  splitMonths,
  type ProductFormState,
  unterkategorieValues,
} from "@/features/zentrale/admin-domain";
import { useZentraleAdmin } from "@/features/zentrale/use-zentrale-admin";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listAlleProdukte, listStaffeln } from "@/lib/appwrite/appwriteProducts";
import { cn } from "@/lib/utils";

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

function AdminLoading() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
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
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-destructive/40 bg-card/95 shadow-brand-strong">
        <CardHeader>
          <CardTitle className="text-destructive">Fehler beim Laden</CardTitle>
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
        "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {children}
    </button>
  );
}

function EmptyCategoryState({ categoryLabel }: { categoryLabel: string }) {
  return (
    <Card className="border-dashed border-border/80 bg-background/70">
      <CardHeader>
        <CardTitle className="text-base text-earth-700">Keine Produkte in {categoryLabel}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
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
        checked ? "border-earth-500 bg-earth-50/70" : "border-border/70 bg-background/60",
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
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background/60 px-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{title}</span>
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
  form,
  meta,
  productStatusMessage,
  isPublishing,
  onCancel,
  onSaveDraft,
  onPublishIntent,
  onFieldChange,
  onMetaChange,
}: {
  title: string;
  description: string;
  form: ProductFormState;
  meta: ProductDraftMeta;
  productStatusMessage?: string;
  isPublishing: boolean;
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublishIntent: () => void;
  onFieldChange: <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => void;
  onMetaChange: (patch: Partial<ProductDraftMeta>, preferred?: ProductWorkflowState) => void;
}) {
  const canPublish = meta.readyToPublish && (meta.workflowState === "dirty" || meta.workflowState === "draftSaved");

  return (
    <Card className="border-earth-500/20 bg-card/95 shadow-brand-soft">
      <CardHeader className="gap-4 border-b border-border/70">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getProductStatusTone(meta.workflowState).variant}>
                {getProductStatusTone(meta.workflowState).label}
              </Badge>
              {form.hauptkategorie ? <Badge variant="outline">{displayValueLabel(form.hauptkategorie)}</Badge> : null}
            </div>
            <div>
              <CardTitle className="text-xl text-earth-700">{title}</CardTitle>
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

        <Alert variant={meta.workflowState === "dirty" ? "destructive" : "default"}>
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

      <CardContent className="grid gap-5 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="produkt-id">Produkt-ID</Label>
            <Input id="produkt-id" value={form.id} onChange={(event) => onFieldChange("id", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="produkt-name">Name</Label>
            <Input id="produkt-name" value={form.name} onChange={(event) => onFieldChange("name", event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="produkt-sorte">Sorte</Label>
            <Input id="produkt-sorte" value={form.sorte} onChange={(event) => onFieldChange("sorte", event.target.value)} />
          </div>
        </div>

        <Accordion type="multiple" defaultValue={["klassifikation", "veroeffentlichung"]} className="w-full rounded-[1.25rem] border border-border/70 bg-background/50 px-4">
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
                    onValueChange={(value) => onFieldChange("unterkategorie", value === "__empty__" ? "" : value)}
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
}: {
  initialProdukte: Produkt[];
  initialStaffeln: Staffel[];
}) {
  const state = useZentraleAdmin({
    initialProdukte,
    initialStaffeln,
  });
  const [drafts, setDrafts] = useState<Record<string, ProductDraftRecord>>({});
  const [editorTarget, setEditorTarget] = useState<EditorTarget>(null);
  const [publishOpen, setPublishOpen] = useState(false);

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
    if (state.activePanel !== "produkte") {
      state.setActivePanel("produkte");
    }
  }, [state.activePanel, state.setActivePanel]);

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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.6)),linear-gradient(130deg,rgba(245,250,245,0.88),rgba(243,239,226,0.88))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <RowButton active>
            <Sprout className="size-4" />
            Produkte
          </RowButton>
          <RowButton active={false} disabled>
            <Boxes className="size-4" />
            Angebote
          </RowButton>
          <RowButton active={false} disabled>
            <Sparkles className="size-4" />
            Mitgliedschaften
          </RowButton>
        </div>

        <div className="flex justify-start">
          <Button onClick={openNewProductEditor}>
            <Plus data-icon="inline-start" />
            Neues Produkt
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
            {editorTarget?.kind === "new" && activeMeta ? (
              <div className="md:col-span-2">
                <InlineProductEditor
                  title={editorTitle}
                  description={editorDescription}
                  form={state.productForm}
                  meta={activeMeta}
                  productStatusMessage={state.productStatus.message}
                  isPublishing={state.productStatus.state === "loading"}
                  onCancel={closeEditor}
                  onSaveDraft={saveDraft}
                  onPublishIntent={() => setPublishOpen(true)}
                  onFieldChange={updateProductField}
                  onMetaChange={updateMeta}
                />
              </div>
            ) : null}

            {productsForActiveCategory.map((product) => {
              const statusTone = productStatusForCard(product);
              const showEditor = editorTarget?.kind === "existing" && editorTarget.id === product.id && activeMeta;

              return (
                <div key={product.id} className="contents">
                  <ProductCard
                    product={product}
                    selected={editorTarget?.kind === "existing" && editorTarget.id === product.id}
                    statusLabel={statusTone.label}
                    statusVariant={statusTone.variant}
                    onSelect={() => state.selectProduct(product.id)}
                    onEdit={() => openExistingEditor(product.id)}
                  />

                  {showEditor ? (
                    <div className="md:col-span-2">
                      <InlineProductEditor
                        title={editorTitle}
                        description={editorDescription}
                        form={state.productForm}
                        meta={activeMeta}
                        productStatusMessage={state.productStatus.message}
                        isPublishing={state.productStatus.state === "loading"}
                        onCancel={closeEditor}
                        onSaveDraft={saveDraft}
                        onPublishIntent={() => setPublishOpen(true)}
                        onFieldChange={updateProductField}
                        onMetaChange={updateMeta}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [produkteResponse, staffelnResponse] = await Promise.all([listAlleProdukte(), listStaffeln()]);

        if (!active) {
          return;
        }

        setProdukte(produkteResponse as unknown as Produkt[]);
        setStaffeln(staffelnResponse as unknown as Staffel[]);
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

  if (!produkte || !staffeln) {
    return <AdminLoading />;
  }

  return <ZentraleWorkspace initialProdukte={produkte} initialStaffeln={staffeln} />;
}
