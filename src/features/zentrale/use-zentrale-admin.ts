"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  subscribeToProdukte,
  subscribeToStaffeln,
  upsertProdukt,
  upsertStaffel,
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
  parseOptionalNumberField,
  parseRequiredNumber,
  productToFormState,
  splitList,
  splitMonths,
  type FunctionStatus,
  type OfferFormState,
  type ProductFormState,
} from "@/features/zentrale/admin-domain";

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

  const productById = new Map(produkte.map((product) => [product.id, product]));
  const selectedProduct =
    selectedProductId === null
      ? null
      : produkte.find((product) => product.id === selectedProductId) ?? null;
  const selectedOffer =
    selectedOfferId === null
      ? null
      : staffeln.find((offer) => offer.id === selectedOfferId) ?? null;

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
    (sum, offer) => sum + (offer.expectedRevenue ?? offer.euroPreis * offer.mengeVerfuegbar),
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
      return;
    }

    setProductForm(emptyProductForm());
  }, [selectedProduct]);

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

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProductStatus({ state: "loading" });

    try {
      const name = productForm.name.trim();
      const hauptkategorie = productForm.hauptkategorie.trim();

      if (!name) {
        throw new Error("Produktname ist erforderlich.");
      }

      if (!hauptkategorie) {
        throw new Error("Hauptkategorie ist erforderlich.");
      }

      const saved = await upsertProdukt({
        id: productForm.id.trim() || undefined,
        name,
        sorte: productForm.sorte.trim() || undefined,
        hauptkategorie,
        unterkategorie: productForm.unterkategorie.trim() || undefined,
        lebensdauer: productForm.lebensdauer.trim() || undefined,
        fruchtfolgeVor: splitList(productForm.fruchtfolgeVor),
        fruchtfolgeNach: splitList(productForm.fruchtfolgeNach),
        bodenansprueche: splitList(productForm.bodenansprueche),
        begleitpflanzen: splitList(productForm.begleitpflanzen),
        saisonalitaet: splitMonths(productForm.saisonalitaet),
        notes: productForm.notes.trim() || undefined,
      });

      setSelectedProductId(saved.id);
      setActivePanel("produkte");
      setProductStatus({
        state: "success",
        message: selectedProductId ? "Produkt wurde aktualisiert." : "Produkt wurde angelegt und kann sofort für Angebote verwendet werden.",
      });
    } catch (rawError) {
      const message =
        rawError instanceof Error
          ? rawError.message
          : String(rawError ?? "Produkt konnte nicht gespeichert werden.");
      setProductStatus({ state: "error", message });
    }
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
      const euroPreis = parseRequiredNumber(offerForm.euroPreis, "Preis");
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
        euroPreis,
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
    setProductForm,
    setOfferForm,
    setProductFilter,
    setOfferFilter,
    setActivePanel,
    saveProduct,
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
