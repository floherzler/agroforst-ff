interface Staffel {
  id: string;
  createdAt: string;
  produktId: string;
  saatPflanzDatum: string;
  ernteProjektion: string[];
  einheit: string;
  euroPreis: number;
  menge: number;
  mengeVerfuegbar: number;
  mengeAbgeholt: number;
  beschreibung?: string;
}

interface Produkt {
  id: string;
  createdAt: string;
  name: string;
  sorte: string;
  hauptkategorie: string;
  unterkategorie: string;
  lebensdauer: string;
  fruchtfolgeVor: string[];
  fruchtfolgeNach: string[];
  bodenansprueche: string[];
  begleitpflanzen: string[];
  saisonalitaet: number[];
  imageId?: string;
}

interface BlogPost {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  writtenBy: string;
  writtenAt: string;
  updatedAt: string;
}

interface Bestellung {
  id: string;
  createdAt: string;
  angebotId: string;
  userId: string;
  mitgliedschaftId?: string;
  menge: number;
  einheit: string;
  abholung: boolean;
  produktName?: string;
  preisGesamt: number;
  preisEinheit: number;
  status: string;
}
