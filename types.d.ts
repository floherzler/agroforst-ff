interface Angebot {
  id: string;
  createdAt: string;
  produktId: string;
  year?: number;
  saatPflanzDatum: string;
  ernteProjektion: string[];
  einheit: string;
  euroPreis: number;
  menge: number;
  mengeVerfuegbar: number;
  mengeAbgeholt: number;
  producerPreis?: number;
  standardPreis?: number;
  memberPreis?: number;
  expectedRevenue?: number;
  pickupAt?: string;
  createdByUserId?: string;
  updatedByUserId?: string;
  beschreibung?: string;
}

type Staffel = Angebot;

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
  notes?: string;
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
