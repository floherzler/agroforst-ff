"use client";

import { AppwriteException } from "appwrite";
import { FormEvent, useEffect, useState } from "react";

import {
  subscribeToProdukte,
  subscribeToStaffeln,
  upsertProdukt,
  upsertStaffel,
  uploadProduktImage,
  getProduktImagePreviewUrl,
} from "@/lib/appwrite/appwriteProducts";

import {
  applyRealtimeRecord,
  canonicalUnit,
  displayProductName,
  emptyOfferForm,
  emptyProductForm,
  formatCurrency,
  fromDateTimeInput,
  offerToFormState,
  parsePreisStaffeln,
  parseOptionalNumberField,
  parseRequiredNumber,
  productToFormState,
  slugifyProduktId,
  splitList,
  splitMonths,
  type FunctionStatus,
  type OfferFormState,
  type ProductFormState,
} from "@/features/zentrale/admin-domain";
import { getOfferDisplayUnitPrice } from "@/features/catalog/catalog";

export function useZentraleAdmin({
  initialProdukte,
  initialStaffeln,
}: {
  initialProdukte: Produkt[];
  initialStaffeln: Staffel[];
}) {
  const [hasInitializedSelection, setHasInitializedSelection] = useState(false);
  const [produkte, setProdukte] = useState<Produkt[]>(initialProdukte);
  const [staffeln, setStaffeln] = useState<Staffel[]>(initialStaffeln);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm());
  const [offerForm, setOfferForm] = useState<OfferFormState>(emptyOfferForm());
  const [productStatus, setProductStatus] = useState<FunctionStatus>({ state: "idle" });
  const [offerStatus, setOfferStatus] = useState<FunctionStatus>({ state: "idle" });
  const [productFilter, setProductFilter] = useState("");
  const [offerFilter, setOfferFilter] = useState("");
  const [activePanel, setActivePanel] = useState<"produkte" | "angebote">("produkte");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImageObjectUrl, setProductImageObjectUrl] = useState<string | null>(null);

  const productById = new Map(produkte.map((product) => [product.id, product]));
  const selectedProduct =
    selectedProductId === null
      ? null
      : produkte.find((product) => product.id === selectedProductId) ?? null;
  const selectedOffer =
    selectedOfferId === null
      ? null
      : staffeln.find((offer) => offer.id === selectedOfferId) ?? null;
  const generatedProductId = selectedProduct?.id ?? slugifyProduktId(productForm.name, productForm.sorte);
  const productImagePreviewUrl = productImageObjectUrl
    ?? (productForm.imageId.trim()
      ? getProduktImagePreviewUrl({ imageId: productForm.imageId.trim(), width: 320, height: 320 })
      : undefined);

  const visibleProducts = [...produkte]
    .filter((product) => {
      const search = productFilter.trim().toLowerCase();
      if (!search) {
        return true;
      }

      return [product.id, product.name, product.sorte, product.hauptkategorie]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) =>
      displayProductName(left).localeCompare(displayProductName(right), "de"),
    );

  const visibleOffers = [...staffeln]
    .filter((offer) => {
      const search = offerFilter.trim().toLowerCase();
      if (!search) {
        return true;
      }

      const product = productById.get(offer.produktId);
      return [offer.id, offer.produktId, displayProductName(product), offer.year ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search);
    })
    .sort((left, right) => {
      const yearDelta = (right.year ?? 0) - (left.year ?? 0);
      if (yearDelta !== 0) {
        return yearDelta;
      }

      return displayProductName(productById.get(left.produktId)).localeCompare(
        displayProductName(productById.get(right.produktId)),
        "de",
      );
    });

  const offersForSelectedProduct = selectedProductId
    ? [...staffeln]
        .filter((offer) => offer.produktId === selectedProductId)
        .sort((left, right) => {
          const yearDelta = (right.year ?? 0) - (left.year ?? 0);
          if (yearDelta !== 0) {
            return yearDelta;
          }

          return left.id.localeCompare(right.id, "de");
        })
    : [];

  const totalProjectedQuantity = staffeln.reduce((sum, offer) => sum + (offer.menge ?? 0), 0);
  const totalAvailableQuantity = staffeln.reduce((sum, offer) => sum + (offer.mengeVerfuegbar ?? 0), 0);
  const totalExpectedRevenue = staffeln.reduce(
    (sum, offer) => sum + (offer.expectedRevenue ?? getOfferDisplayUnitPrice(offer) * offer.mengeVerfuegbar),
    0,
  );
  const activeSeasonOffers = staffeln.filter((offer) => (offer.year ?? 0) >= new Date().getFullYear()).length;

  useEffect(() => {
    if (hasInitializedSelection || selectedProductId || produkte.length === 0) {
      return;
    }

    setSelectedProductId(produkte[0]?.id ?? null);
    setHasInitializedSelection(true);
  }, [hasInitializedSelection, produkte, selectedProductId]);

  useEffect(() => {
    if (selectedProduct) {
      setProductForm(productToFormState(selectedProduct));
      setProductImageFile(null);
      return;
    }

    setProductForm(emptyProductForm());
    setProductImageFile(null);
  }, [selectedProduct]);

  useEffect(() => {
    if (!productImageFile) {
      setProductImageObjectUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(productImageFile);
    setProductImageObjectUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [productImageFile]);

  useEffect(() => {
    if (selectedProductId === null) {
      return;
    }

    const stillExists = produkte.some((product) => product.id === selectedProductId);
    if (stillExists) {
      return;
    }

    setSelectedProductId(produkte[0]?.id ?? null);
    setSelectedOfferId(null);
    setProductStatus({ state: "idle" });
  }, [produkte, selectedProductId]);

  useEffect(() => {
    if (selectedOfferId === null) {
      return;
    }

    const stillExists = staffeln.some((offer) => offer.id === selectedOfferId);
    if (stillExists) {
      return;
    }

    setSelectedOfferId(null);
    setOfferStatus({ state: "idle" });
  }, [staffeln, selectedOfferId]);

  useEffect(() => {
    if (selectedOffer) {
      setOfferForm(offerToFormState(selectedOffer));
      return;
    }

    setOfferForm(emptyOfferForm(selectedProductId ?? ""));
  }, [selectedOffer, selectedProductId]);

  useEffect(() => {
    const unsubscribeOffers = subscribeToStaffeln(({ type, record }) => {
      setStaffeln((current) => applyRealtimeRecord(current, type, record));
    });

    const unsubscribeProducts = subscribeToProdukte(({ type, record }) => {
      setProdukte((current) => applyRealtimeRecord(current, type, record));
    });

    return () => {
      unsubscribeOffers();
      unsubscribeProducts();
    };
  }, []);

  async function publishProduct() {
    setProductStatus({ state: "loading" });

    try {
      const name = productForm.name.trim();
      const sorte = productForm.sorte.trim();
      const hauptkategorie = productForm.hauptkategorie.trim();
      const isEditing = Boolean(selectedProduct);
      const documentId = isEditing ? selectedProduct?.id ?? "" : slugifyProduktId(name, sorte);

      if (!name) {
        throw new Error("Produktname ist erforderlich.");
      }

      if (!hauptkategorie) {
        throw new Error("Hauptkategorie ist erforderlich.");
      }

      if (!documentId) {
        throw new Error("Aus Name und Sorte konnte keine Produkt-ID erzeugt werden.");
      }

      const productPayload = {
        id: documentId,
        name,
        sorte: sorte || undefined,
        imageId: productForm.imageId.trim() || undefined,
        hauptkategorie,
        unterkategorie: productForm.unterkategorie.trim() || undefined,
        lebensdauer: productForm.lebensdauer.trim() || undefined,
        fruchtfolgeVor: splitList(productForm.fruchtfolgeVor),
        fruchtfolgeNach: splitList(productForm.fruchtfolgeNach),
        bodenansprueche: splitList(productForm.bodenansprueche),
        begleitpflanzen: splitList(productForm.begleitpflanzen),
        saisonalitaet: splitMonths(productForm.saisonalitaet),
        notes: productForm.notes.trim() || undefined,
      };

      let saved = await upsertProdukt({
        mode: isEditing ? "update" : "create",
        ...productPayload,
        imageId: productImageFile ? undefined : productPayload.imageId,
      });

      if (productImageFile) {
        try {
          const uploadedImageId = await uploadProduktImage(productImageFile);
          saved = await upsertProdukt({
            mode: "update",
            ...productPayload,
            imageId: uploadedImageId,
          });
        } catch (rawError) {
          setSelectedProductId(saved.id);
          setProductForm(productToFormState(saved));
          setProductStatus({
            state: "error",
            message: `Produkt wurde gespeichert, aber das Bild konnte nicht hochgeladen werden: ${toErrorMessage(rawError)}`,
          });
          return saved;
        }
      }

      setSelectedProductId(saved.id);
      setProductForm(productToFormState(saved));
      setProductImageFile(null);
      setActivePanel("produkte");
      setProductStatus({
        state: "success",
        message: selectedProduct
          ? "Produkt wurde veröffentlicht."
          : "Produkt wurde angelegt und veröffentlicht.",
      });
      return saved;
    } catch (rawError) {
      const message = formatProductSaveError(rawError, generatedProductId);
      setProductStatus({ state: "error", message });
      return null;
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await publishProduct();
  }

  async function saveOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOfferStatus({ state: "loading" });

    try {
      const produktId = offerForm.produktId.trim();
      if (!produktId) {
        throw new Error("Bitte zuerst ein Produkt für das Angebot wählen.");
      }

      const menge = parseRequiredNumber(offerForm.menge, "Projektionsmenge");
      const mengeVerfuegbar = offerForm.mengeVerfuegbar.trim()
        ? parseRequiredNumber(offerForm.mengeVerfuegbar, "Verfügbare Menge")
        : menge;
      const mengeAbgeholt = offerForm.mengeAbgeholt.trim()
        ? parseRequiredNumber(offerForm.mengeAbgeholt, "Reservierte Menge")
        : 0;
      const preisStaffeln = parsePreisStaffeln(
        offerForm.preisStaffeln,
        canonicalUnit(offerForm.einheit) || "kilogramm",
      );
      const year = offerForm.year.trim()
        ? parseRequiredNumber(offerForm.year, "Jahr")
        : undefined;

      const saved = await upsertStaffel({
        id: offerForm.id.trim() || undefined,
        produktId,
        year,
        menge,
        mengeVerfuegbar,
        mengeAbgeholt,
        einheit: canonicalUnit(offerForm.einheit) || "kilogramm",
        euroPreis: undefined,
        preisStaffeln: preisStaffeln.map(({ teilung, paketPreisEur }) => ({
          teilung,
          paketPreisEur,
        })),
        producerPreis: parseOptionalNumberField(offerForm.producerPreis),
        standardPreis: parseOptionalNumberField(offerForm.standardPreis),
        memberPreis: parseOptionalNumberField(offerForm.memberPreis),
        expectedRevenue: parseOptionalNumberField(offerForm.expectedRevenue),
        saatPflanzDatum: offerForm.saatPflanzDatum.trim() || undefined,
        ernteProjektion: splitList(offerForm.ernteProjektion),
        pickupAt: fromDateTimeInput(offerForm.pickupAt),
        beschreibung: offerForm.beschreibung.trim() || undefined,
      });

      setSelectedOfferId(saved.id);
      setActivePanel("angebote");
      setOfferStatus({
        state: "success",
        message: selectedOfferId ? "Angebot wurde aktualisiert." : "Angebot wurde angelegt und ist direkt in der Liste sichtbar.",
      });
    } catch (rawError) {
      const message =
        rawError instanceof Error
          ? rawError.message
          : String(rawError ?? "Angebot konnte nicht gespeichert werden.");
      setOfferStatus({ state: "error", message });
    }
  }

  function resetProductForm() {
    setSelectedProductId(null);
    setProductStatus({ state: "idle" });
    setProductForm(emptyProductForm());
    setProductImageFile(null);
  }

  function resetOfferForm() {
    setSelectedOfferId(null);
    setOfferStatus({ state: "idle" });
    setOfferForm(emptyOfferForm(selectedProductId ?? ""));
  }

  function selectProduct(productId: string) {
    setSelectedProductId(productId);
    setProductStatus({ state: "idle" });
    setActivePanel("produkte");
  }

  function selectOffer(offerId: string) {
    const offer = staffeln.find((entry) => entry.id === offerId);
    if (offer) {
      setSelectedProductId(offer.produktId);
    }
    setSelectedOfferId(offerId);
    setOfferStatus({ state: "idle" });
    setActivePanel("angebote");
  }

  function createProductDraft() {
    setSelectedProductId(null);
    setProductStatus({ state: "idle" });
    setProductForm(emptyProductForm());
    setProductImageFile(null);
    setActivePanel("produkte");
  }

  function createOfferDraft(productId = selectedProductId ?? "") {
    setSelectedOfferId(null);
    setOfferStatus({ state: "idle" });
    setOfferForm(emptyOfferForm(productId));
    setActivePanel("angebote");
  }

  return {
    produkte,
    staffeln,
    productById,
    selectedProductId,
    selectedOfferId,
    selectedProduct,
    selectedOffer,
    productForm,
    offerForm,
    productStatus,
    offerStatus,
    productFilter,
    offerFilter,
    activePanel,
    visibleProducts,
    visibleOffers,
    offersForSelectedProduct,
    totalProjectedQuantity,
    totalAvailableQuantity,
    totalExpectedRevenue,
    activeSeasonOffers,
    generatedProductId,
    productImageFileName: productImageFile?.name ?? "",
    productImagePreviewUrl,
    setProductForm,
    setOfferForm,
    setProductFilter,
    setOfferFilter,
    setActivePanel,
    setProductImageFile,
    saveProduct,
    publishProduct,
    saveOffer,
    resetProductForm,
    resetOfferForm,
    createProductDraft,
    createOfferDraft,
    selectProduct,
    selectOffer,
    formatCurrency,
  };
}

function toErrorMessage(rawError: unknown): string {
  if (rawError instanceof Error) {
    return rawError.message;
  }

  return String(rawError ?? "Unbekannter Fehler");
}

function formatProductSaveError(rawError: unknown, desiredId: string): string {
  if (rawError instanceof AppwriteException && rawError.code === 409) {
    return `Die Produkt-ID "${desiredId}" existiert bereits. Bitte Name oder Sorte anpassen oder den bestehenden Datensatz bearbeiten.`;
  }

  return toErrorMessage(rawError) || "Produkt konnte nicht gespeichert werden.";
}
