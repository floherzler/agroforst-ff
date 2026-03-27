export type YearWheelSeason = "winter" | "spring" | "summer" | "autumn";
export type YearWheelEventKind = "point" | "span";
export type YearWheelEventCategory =
  | "pflanzung"
  | "ernte"
  | "pflege"
  | "boden"
  | "planung"
  | "wasser";

export type YearWheelEvent = {
  id: string;
  title: string;
  kind: YearWheelEventKind;
  startDay: number;
  endDay?: number;
  category: YearWheelEventCategory;
  crop: string;
  summary: string;
  season: YearWheelSeason;
};

const monthOffsets = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

function dayOfYear(month: number, day: number) {
  return monthOffsets[month - 1] + day;
}

export const yearWheelEvents: YearWheelEvent[] = [
  { id: "winter-planung", title: "Anbauplan abstimmen", kind: "span", startDay: dayOfYear(1, 3), endDay: dayOfYear(1, 14), category: "planung", crop: "Hofsystem", summary: "Sortimente, Beetfolgen und Erntefenster werden für das Jahr festgezogen.", season: "winter" },
  { id: "obstbaumschnitt", title: "Obstbäume schneiden", kind: "span", startDay: dayOfYear(1, 15), endDay: dayOfYear(2, 8), category: "pflege", crop: "Obstgehölze", summary: "Winterschnitt schafft Luft, Licht und eine ruhige Kronenform.", season: "winter" },
  { id: "kompost-ausbringen", title: "Kompost ausbringen", kind: "span", startDay: dayOfYear(2, 10), endDay: dayOfYear(2, 18), category: "boden", crop: "Gemüseflächen", summary: "Reifer Kompost wird vor den ersten Kulturen flach eingearbeitet.", season: "winter" },
  { id: "fruehbeete-vorbereiten", title: "Frühbeete vorbereiten", kind: "span", startDay: dayOfYear(2, 19), endDay: dayOfYear(2, 28), category: "boden", crop: "Frühkulturen", summary: "Abdeckungen, Saatrillen und Wärmeinseln werden für den frühen Start eingerichtet.", season: "winter" },
  { id: "beete-lockern", title: "Beete lockern", kind: "span", startDay: dayOfYear(3, 1), endDay: dayOfYear(3, 12), category: "boden", crop: "Gemüsebeete", summary: "Die obere Bodenzone wird schonend geöffnet, ohne die Struktur zu stören.", season: "spring" },
  { id: "kartoffeln-legen", title: "Kartoffeln legen", kind: "span", startDay: dayOfYear(3, 20), endDay: dayOfYear(4, 4), category: "pflanzung", crop: "Kartoffeln", summary: "Pflanzkartoffeln kommen in erwärmte Dämme und werden anschließend angehäufelt.", season: "spring" },
  { id: "erdbeeren-pflanzen", title: "Neue Erdbeeren pflanzen", kind: "span", startDay: dayOfYear(3, 24), endDay: dayOfYear(4, 7), category: "pflanzung", crop: "Erdbeeren", summary: "Junge Pflanzen werden in gemulchte Reihen gesetzt und gleich gut angegossen.", season: "spring" },
  { id: "zwiebeln-stecken", title: "Zwiebeln stecken", kind: "span", startDay: dayOfYear(3, 28), endDay: dayOfYear(4, 9), category: "pflanzung", crop: "Zwiebeln", summary: "Steckzwiebeln gehen früh in den Boden, damit sie lang einwurzeln können.", season: "spring" },
  { id: "mulch-erneuern", title: "Mulchschicht erneuern", kind: "span", startDay: dayOfYear(4, 10), endDay: dayOfYear(4, 18), category: "pflege", crop: "Dauerkulturen", summary: "Mulch hält Feuchtigkeit im Boden und schützt junge Triebe vor Stress.", season: "spring" },
  { id: "erbsen-saat", title: "Erbsen aussäen", kind: "point", startDay: dayOfYear(4, 12), category: "pflanzung", crop: "Erbsen", summary: "Direktsaat in kühle, lockere Erde für einen frühen Sommerstart.", season: "spring" },
  { id: "bienenweiden", title: "Blühstreifen einsäen", kind: "span", startDay: dayOfYear(4, 20), endDay: dayOfYear(5, 2), category: "pflanzung", crop: "Blühstreifen", summary: "Nützlingsinseln werden zwischen den Flächen nachgesät.", season: "spring" },
  { id: "tomaten-pflanzen", title: "Tomaten auspflanzen", kind: "span", startDay: dayOfYear(5, 15), endDay: dayOfYear(5, 24), category: "pflanzung", crop: "Tomaten", summary: "Nach den kalten Nächten ziehen die Jungpflanzen in geschützte Reihen um.", season: "spring" },
  { id: "sommer-bewaesserung-start", title: "Bewässerung hochfahren", kind: "point", startDay: dayOfYear(5, 28), category: "wasser", crop: "Jungpflanzen", summary: "Leitungen, Tropfbänder und Routinen wechseln in den Sommermodus.", season: "spring" },
  { id: "erdbeeren-ernte-start", title: "Erdbeerernte beginnt", kind: "span", startDay: dayOfYear(6, 3), endDay: dayOfYear(6, 28), category: "ernte", crop: "Erdbeeren", summary: "Die ersten süßen Chargen gehen fast täglich frisch vom Feld.", season: "summer" },
  { id: "salate-ernten", title: "Schnittsalate ernten", kind: "span", startDay: dayOfYear(6, 5), endDay: dayOfYear(7, 12), category: "ernte", crop: "Salate", summary: "Junge Blätter werden in dichter Folge für frische Kisten geschnitten.", season: "summer" },
  { id: "johannisbeeren", title: "Johannisbeeren pflücken", kind: "span", startDay: dayOfYear(6, 20), endDay: dayOfYear(7, 9), category: "ernte", crop: "Johannisbeeren", summary: "Die Beerenernte läuft in mehreren Durchgängen, je nach Reifegrad der Reihen.", season: "summer" },
  { id: "tomaten-ausgeizen", title: "Tomaten ausgeizen", kind: "span", startDay: dayOfYear(6, 24), endDay: dayOfYear(8, 16), category: "pflege", crop: "Tomaten", summary: "Regelmäßige Pflege hält die Pflanzen luftig und lenkt Kraft in die Frucht.", season: "summer" },
  { id: "heu-mulch", title: "Sommermulch nachlegen", kind: "span", startDay: dayOfYear(7, 1), endDay: dayOfYear(7, 14), category: "pflege", crop: "Kürbis & Zucchini", summary: "Frischer Mulch schützt den Boden vor Hitze und hält die Feuchte länger.", season: "summer" },
  { id: "bohnenstart", title: "Buschbohnen erste Ernte", kind: "point", startDay: dayOfYear(7, 18), category: "ernte", crop: "Bohnen", summary: "Die ersten Reihen liefern junge Schoten für den Wochenrhythmus.", season: "summer" },
  { id: "kartoffelpflege", title: "Kartoffeldämme nachformen", kind: "span", startDay: dayOfYear(7, 20), endDay: dayOfYear(7, 29), category: "pflege", crop: "Kartoffeln", summary: "Dämme werden nachgezogen, damit Knollen geschützt und sauber bleiben.", season: "summer" },
  { id: "beerenpause-planen", title: "Spätsommerflächen planen", kind: "point", startDay: dayOfYear(8, 2), category: "planung", crop: "Freie Beete", summary: "Nach frühen Kulturen werden Folgesätze und Zwischenbegrünungen festgelegt.", season: "summer" },
  { id: "zwiebeln-ernten", title: "Zwiebeln roden", kind: "span", startDay: dayOfYear(8, 10), endDay: dayOfYear(8, 20), category: "ernte", crop: "Zwiebeln", summary: "Reife Bestände werden angetrocknet und für die Lagerung vorbereitet.", season: "summer" },
  { id: "kartoffeln-frueh", title: "Frühkartoffeln ernten", kind: "span", startDay: dayOfYear(8, 12), endDay: dayOfYear(9, 2), category: "ernte", crop: "Kartoffeln", summary: "Die ersten Dämme werden geöffnet und wandern direkt in die Vermarktung.", season: "summer" },
  { id: "gruenduengung", title: "Gründüngung einsäen", kind: "span", startDay: dayOfYear(9, 4), endDay: dayOfYear(9, 18), category: "boden", crop: "Freiflächen", summary: "Freie Beete werden mit Mischungen für Struktur, Wurzelmasse und Leben geschlossen.", season: "autumn" },
  { id: "kuerbisernte", title: "Kürbisse einholen", kind: "span", startDay: dayOfYear(9, 16), endDay: dayOfYear(10, 4), category: "ernte", crop: "Kürbis", summary: "Früchte werden sortiert, nachgereift und für die Einlagerung kontrolliert.", season: "autumn" },
  { id: "apfelernte", title: "Äpfel ernten", kind: "span", startDay: dayOfYear(9, 20), endDay: dayOfYear(10, 12), category: "ernte", crop: "Äpfel", summary: "Je nach Sorte laufen Pflückfenster gestaffelt durch den frühen Herbst.", season: "autumn" },
  { id: "bodenproben", title: "Bodenproben ziehen", kind: "point", startDay: dayOfYear(10, 6), category: "boden", crop: "Hofflächen", summary: "Nährstoffbild und organische Entwicklung werden für die nächste Planung geprüft.", season: "autumn" },
  { id: "knoblauch-setzen", title: "Knoblauch stecken", kind: "span", startDay: dayOfYear(10, 18), endDay: dayOfYear(11, 3), category: "pflanzung", crop: "Knoblauch", summary: "Zehen kommen in ruhige Herbstbeete, damit sie vor dem Winter anwachsen.", season: "autumn" },
  { id: "laubmulch", title: "Laubmulch verteilen", kind: "span", startDay: dayOfYear(11, 2), endDay: dayOfYear(11, 14), category: "pflege", crop: "Beerenreihen", summary: "Laub und organisches Material decken empfindliche Zonen vor Frost ab.", season: "autumn" },
  { id: "winterruhe-vorbereiten", title: "Winterruhe vorbereiten", kind: "span", startDay: dayOfYear(11, 20), endDay: dayOfYear(12, 5), category: "planung", crop: "Hofsystem", summary: "Werkzeuge, Wasserpunkte und Flächen gehen geordnet in die ruhige Phase.", season: "autumn" },
];
