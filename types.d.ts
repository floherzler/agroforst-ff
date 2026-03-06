interface Staffel {
    $id: string;
    $createdAt: string;
    produktID: string;
    saatPflanzDatum: Date;
    ernteProjektion: Date[],
    einheit: string;
    euroPreis: number;
    menge: number;
    mengeVerfuegbar: number;
    mengeAbgeholt: number;
}

interface Produkt {
    $id: string;
    $createdAt: string;
    name: string;
    sorte: string;
    hauptkategorie: string;
    unterkategorie: string;
    lebensdauer: string;
    fruchtfolge_vor: string[];
    fruchtfolge_nach: string[];
    bodenansprueche: string;
    begleitpflanzen: string[];
}

interface BlogPost {
    $id: string;
    $createdAt: string;
    title: string;
    description: string;
    content: string;
    tags: string[];
    writtenBy: string;
    writtenAt: Date;
    updatedAt: Date;
}

interface Bestellung {
    $id: string;
    $createdAt: string;
    angebotID: string;
    userID: string;
    mitgliedschaftID: string;
    menge: string;
    einheit: string;
    abholung: boolean;
    produkt_name: string;
    preis_gesamt: number;
    preis_einheit: number;
    status: string;
}