import {
  getProduktImagePreviewUrl,
  listProdukte,
  listProdukteMitStaffeln,
  listStaffeln,
  type ProduktMitAngeboten,
} from "@/lib/appwrite/appwriteProducts";

export const catalogCategories = [
  "Obst",
  "Gemüse",
  "Kräuter",
  "Maschine",
  "Sonstiges",
] as const;

export type CatalogCategory = (typeof catalogCategories)[number];
export type MarketplaceSortOption = "date" | "price" | "name" | "availability";
export type MarketplaceFilterOption = "all" | "available" | "low-stock";
export type OfferAvailabilityBadgeVariant =
  | "destructive"
  | "outline"
  | "secondary";
export type ProductOffer = Staffel & {
  produkt: Produkt;
};

export async function listMarketplaceOffers(): Promise<ProductOffer[]> {
  const productsWithOffers = await listProdukteMitStaffeln();

  return productsWithOffers.flatMap(mapProductOffers);
}

export async function listProductCatalog(input: {
  category: CatalogCategory;
  search?: string;
}): Promise<{ products: Produkt[]; offerCounts: Record<string, number> }> {
  const products = await listProdukte({
    hauptkategorie: input.category,
    search: input.search,
    limit: 200,
  });

  if (products.length === 0) {
    return { products, offerCounts: {} };
  }

  const offers = await listStaffeln({
    produktIds: products.map((product) => product.id),
    limit: 500,
  });

  return {
    products,
    offerCounts: offers.reduce<Record<string, number>>((counts, offer) => {
      counts[offer.produktId] = (counts[offer.produktId] ?? 0) + 1;
      return counts;
    }, {}),
  };
}

function mapProductOffers(entry: ProduktMitAngeboten): ProductOffer[] {
  return entry.angebote.map((offer) => ({
    ...offer,
    produkt: entry.produkt,
  }));
}

export function filterMarketplaceOffers(input: {
  offers: ProductOffer[];
  category: CatalogCategory;
  search: string;
  filterBy: MarketplaceFilterOption;
  sortBy: MarketplaceSortOption;
  sortOrder: "asc" | "desc";
}): ProductOffer[] {
  const searchTerm = input.search.trim().toLowerCase();

  const filteredOffers = input.offers.filter((offer) => {
    if (offer.produkt.hauptkategorie !== input.category) {
      return false;
    }

    if (searchTerm.length > 0) {
      const searchableValues = [
        offer.produkt.name,
        offer.produkt.sorte,
        offer.produkt.hauptkategorie,
      ]
        .join(" ")
        .toLowerCase();

      if (!searchableValues.includes(searchTerm)) {
        return false;
      }
    }

    if (input.filterBy === "available") {
      return offer.mengeVerfuegbar > 0;
    }

    if (input.filterBy === "low-stock") {
      return offer.mengeVerfuegbar > 0 && offer.mengeVerfuegbar <= 10;
    }

    return true;
  });

  return [...filteredOffers].sort((left, right) => {
    let comparison = 0;

    switch (input.sortBy) {
      case "date":
        comparison =
          new Date(left.saatPflanzDatum).getTime() -
          new Date(right.saatPflanzDatum).getTime();
        break;
      case "price":
        comparison = left.euroPreis - right.euroPreis;
        break;
      case "name":
        comparison = left.produkt.name.localeCompare(right.produkt.name, "de");
        break;
      case "availability":
        comparison = left.mengeVerfuegbar - right.mengeVerfuegbar;
        break;
    }

    return input.sortOrder === "asc" ? comparison : -comparison;
  });
}

export function getOfferAvailabilityText(amount: number) {
  if (amount <= 0) {
    return "Ausverkauft";
  }

  if (amount <= 10) {
    return "Nur noch wenig";
  }

  return "Verfügbar";
}

export function getOfferAvailabilityBadgeVariant(
  amount: number,
): OfferAvailabilityBadgeVariant {
  if (amount <= 0) {
    return "destructive";
  }

  if (amount <= 10) {
    return "outline";
  }

  return "secondary";
}

export function formatPricePerUnit(
  euroPreis: number,
  _menge: number,
  einheit: string,
) {
  if (!Number.isFinite(euroPreis)) {
    return "-";
  }

  return `${formatEuro(euroPreis)} / ${einheit}`;
}

export function formatHarvestRange(values: string[]) {
  if (values.length === 0) {
    return "Noch offen";
  }

  return values.join(" - ");
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function getProductImageUrl(imageId?: string) {
  if (!imageId) {
    return undefined;
  }

  return getProduktImagePreviewUrl({
    imageId,
    width: 160,
    height: 160,
  });
}
