"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { legalConfig, legalConfigStatus } from "@/lib/legal";
import { Download, Printer } from "lucide-react";

const pdfUrl = process.env.NEXT_PUBLIC_AGB_PDF_URL ?? "";
const lastUpdated = legalConfig.agbLastUpdated;

export default function AgbPage() {
  const handlePrint = React.useCallback(() => {
    window.print();
  }, []);

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10 print:bg-white print:px-0 print:py-0">
      <div className="container mx-auto">
        <Card className="mx-auto max-w-4xl border-border/80 bg-background text-foreground shadow-md print:shadow-none print:border print:border-slate-300 print:bg-white print:text-black">
          <CardHeader className="space-y-6 pb-4">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <CardTitle className="text-3xl sm:text-4xl">
                  Allgemeine Geschäftsbedingungen (AGB)
                </CardTitle>
                <CardDescription className="text-base">
                  Mitgliedschaften &amp; Bestellungen
                </CardDescription>
                <p className="mt-2 text-sm text-muted-foreground">
                  Stand: {lastUpdated}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                {pdfUrl ? (
                  <Button asChild variant="outline">
                    <a
                      href={pdfUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="size-4" />
                      PDF herunterladen
                    </a>
                  </Button>
                ) : null}
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="size-4" />
                  Seite drucken
                </Button>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-8 text-left text-base leading-relaxed">
            <section className="space-y-3">
              <p className="font-semibold">
                Allgemeine Geschäftsbedingungen (AGB) – Mitgliedschaften &amp;
                Bestellungen
              </p>
              <p className="text-muted-foreground">
                Diese AGB regeln die Mitgliedschaften und Bestellungen bei
                Agroforstbetrieb Frank Fege (nachfolgend &quot;wir&quot;/&quot;uns&quot;/&quot;Agroforst&quot;).
                Abweichende Bedingungen der Kundinnen und Kunden finden keine
                Anwendung.
              </p>
              <p className="text-sm text-muted-foreground">
                AGB-Version: {legalConfig.agbVersion}
              </p>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                1. Geltungsbereich &amp; Vertragspartner
              </h2>
              <ul className="space-y-3 text-muted-foreground">
                <li>
                  Vertragspartner ist <strong>{legalConfig.businessName}</strong>.
                  Die aktuellen Anbieterangaben und Kontaktwege ergeben sich aus
                  dem{" "}
                  <a href="/impressum" className="text-primary underline underline-offset-4">
                    Impressum
                  </a>
                  .
                </li>
                <li>
                  Diese AGB gelten für:
                  <ul className="mt-2 space-y-1 pl-5">
                    <li className="list-disc">
                      Privatkunden-Mitgliedschaften als jährlicher Planungsbeitrag
                      mit internem Nutzungsguthaben,
                    </li>
                    <li className="list-disc">
                      Business-Kunden (Bestellung auf Rechnung),
                    </li>
                    <li className="list-disc">
                      Bestellungen von Produkten und Angeboten, die wir über
                      unsere Website oder Plattform bereitstellen.
                    </li>
                  </ul>
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">2. Leistungen &amp; Plattform</h2>
              <ul className="space-y-3 text-muted-foreground">
                <li>
                  Wir bieten saisonale landwirtschaftliche Produkte nach
                  Verfügbarkeit an. Die Mitgliedschaft dient der Absatz-, Ernte-
                  und Anbauplanung und verschafft Zugang zu verfügbaren Angeboten
                  innerhalb der Laufzeit.
                </li>
                <li>
                  Es besteht kein Anspruch auf eine jederzeitige Verfügbarkeit,
                  auf bestimmte Produkte, Sorten, Erntemengen oder bestimmte
                  Erntezeitpunkte.
                </li>
                <li>
                  Unsere Website bzw. Plattform wird unter Einsatz externer Dienste
                  betrieben (unter anderem Appwrite Cloud als Infrastruktur- bzw.
                  Backend-Dienst). Wir behalten uns Wartungsfenster, Updates und
                  technisch bedingte Unterbrechungen vor. Ein Anspruch auf ständige
                  Verfügbarkeit besteht nicht.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">3. Mitgliedschaften</h2>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold">
                  3.1 Privatkund:innen (Planungsbeitrag mit Nutzungsguthaben)
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    Privatkundinnen und -kunden schließen eine Jahres-Mitgliedschaft
                    ab. Die Aktivierung erfolgt ab Zahlungseingang.
                  </li>
                  <li>
                    Die Mitgliedschaft ist ein jährlicher Planungsbeitrag mit
                    internem Nutzungsguthaben. Das gewählte Guthaben (EUR) wird
                    der Mitgliedschaft gutgeschrieben und kann innerhalb der
                    Laufzeit für verfügbare Angebote eingesetzt werden.
                  </li>
                  <li>
                    Laufzeit: Standardmäßig 12 Monate ab Aktivierung. Wir behalten
                    uns vor, künftig auf Kalenderjahre umzustellen; bestehende
                    Mitgliedschaften bleiben unberührt.
                  </li>
                  <li>
                    Das Nutzungsguthaben ist nicht auszahlbar, nicht verzinslich
                    und nicht übertragbar.
                  </li>
                  <li>
                    Wir bemühen uns fortlaufend, verfügbare Produkte anzubieten.
                    Ein Anspruch auf bestimmte Produkte oder auf einen
                    durchgehenden Sortimentsumfang besteht nicht.
                  </li>
                  <li>Widerruf der Mitgliedschaft: siehe Ziffer 9.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold">
                  3.2 Business-Kund:innen (auf Rechnung)
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    Geschäftskundinnen und -kunden bestellen grundsätzlich auf
                    Rechnung.
                  </li>
                  <li>
                    Vorkasse-Regel: Für die ersten drei Rechnungen kann Vorkasse
                    verlangt werden.
                  </li>
                  <li>
                    Kreditlimit: Es gilt ein maximaler offener Betrag (&quot;Credit
                    Limit&quot;). Bei Überschreitung können wir Bestellungen ablehnen
                    oder nur gegen Vorkasse ausführen.
                  </li>
                  <li>
                    Fälligkeitsdatum bzw. Zahlungsziel wird auf der Rechnung
                    ausgewiesen (standardmäßig 14 Tage).
                  </li>
                  <li>
                    Adress- bzw. Unternehmensdaten: Für Rechnungen sind vollständige
                    Rechnungs- und Unternehmensangaben erforderlich (inkl. USt-ID,
                    sofern vorhanden).
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-semibold">
                  3.3 Verwaltung &amp; Identifikation
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    Die Mitgliedschaft ist personengebunden. Änderungen (Adresse,
                    E-Mail, Firmendaten) sind unverzüglich mitzuteilen.
                  </li>
                  <li>
                    Bei Beantragung der Mitgliedschaft wird die jeweils aktuelle
                    AGB-Version dokumentiert.
                  </li>
                  <li>
                    Wir können eine Mitgliedschaft aus wichtigem Grund (z.&nbsp;B.
                    Missbrauch) kündigen.
                  </li>
                </ul>
              </div>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                4. Bestellungen, Mindestbestellwert &amp; Logistik
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Verfügbare Angebote werden auf der Plattform angezeigt; sie können
                  Mindestbestellwerte enthalten.
                </li>
                <li>
                  Aktuell erfolgt die Ausgabe ausschließlich per Abholung. Eine
                  Lieferung ist derzeit nicht Vertragsbestandteil.
                </li>
                <li>
                  Verbindlich ist ausschließlich das bestätigte Abholfenster am
                  benannten Abholort. Bestellungen werden mit
                  Verfügbarkeitsprüfung bestätigt. Bei Privat-Mitgliedschaften
                  wird das Nutzungsguthaben entsprechend reserviert oder belastet.
                </li>
                <li>
                  Wird eine bestätigte Bestellung nicht im vereinbarten
                  Abholfenster abgeholt und wurde sie nicht rechtzeitig vorher
                  umgebucht oder storniert, verfällt das Bezugsrecht auf diese
                  Bestellung. Eine Erstattung oder Rückgutschrift erfolgt in
                  diesem Fall nicht.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                5. Preise, Zahlung &amp; Fälligkeit
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Alle Preise sind in EUR inkl. bzw. zzgl. Umsatzsteuer dargestellt
                  (konkrete Ausweisung gemäß rechtlicher Vorgabe).
                </li>
                <li>
                  Privatkundschaft: Zahlung des Planungsbeitrags im Voraus.
                  Nutzung des internen Guthabens für Bestellungen bis zur Höhe
                  des verfügbaren Saldos.
                </li>
                <li>
                  Business: Zahlung auf Rechnung bzw. nach individueller
                  Vereinbarung (ggf. Vorkasse).
                </li>
                <li>
                  Fälligkeit: gemäß Rechnung bzw. Bestellbestätigung. Verzug tritt
                  nach Fälligkeit und Mahnung oder gesetzlicher Frist ein;
                  Verzugszinsen und Mahnkosten können berechnet werden.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                6. Stornierung, Ausfälle &amp; höhere Gewalt
              </h2>
              <ul className="space-y-3 text-muted-foreground">
                <li>
                  Unvorhergesehene Gründe (z.&nbsp;B. Wetter- bzw. Ernteausfälle,
                  Schädlingsdruck, Lagerungsverluste, Verderb, logistische
                  Engpässe, betriebliche Priorisierung oder höhere Gewalt) können
                  zu Stornierungen, Mengenkürzungen oder Angebotslücken führen.
                </li>
                <li>
                  Folge:
                  <ul className="mt-1 space-y-1 pl-5">
                    <li className="list-disc">
                      Bei Privat-Mitgliedschaften: bereits belastetes oder
                      reserviertes Guthaben wird für nicht erfüllbare
                      Bestellungen wieder gutgeschrieben.
                    </li>
                    <li className="list-disc">
                      Bei Rechnung: bereits gezahlte Beträge werden erstattet bzw.
                      die Rechnung korrigiert.
                    </li>
                  </ul>
                </li>
                <li>
                  Weitergehende Ansprüche (z.&nbsp;B. entgangener Gewinn) sind im
                  Rahmen von Ziffer 10 (Haftung) beschränkt.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                7. Restguthaben, Ersatz- &amp; Alternativprodukte
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Am Laufzeitende einer Privat-Mitgliedschaft kann es sein, dass
                  nicht alle gewünschten Produkte verfügbar sind. Wir können
                  zumutbare Ersatz- oder Alternativprodukte anbieten
                  (z.&nbsp;B. saisonale Alternativen).
                </li>
                <li>
                  Nicht verbrauchtes Restguthaben verfällt grundsätzlich am
                  Laufzeitende ohne Auszahlung.
                </li>
                <li>
                  Wenn wir bis zum Laufzeitende jedoch keine zumutbare
                  Einlösungschance durch verfügbare Produkte oder Ersatzangebote
                  ermöglicht haben, verlängern wir die Einlösefrist einmalig
                  befristet oder gewähren ein entsprechendes Ersatzguthaben.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                8. Inhalte, Newsletter &amp; Community
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Redaktionelle Inhalte (z.&nbsp;B. Blog/Newsletter) dienen der
                  Information. Verlinkte Angebote können sich kurzfristig ändern.
                </li>
                <li>
                  Kundenwünsche bzw. Abstimmungen (Community-Funktionen) sind
                  unverbindlich; sie steuern unsere Planung, begründen aber keinen
                  Anspruch.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">
                9. Widerrufsrecht (Verbraucher:innen) &amp; Ausnahmen
              </h2>

              <div className="space-y-2 text-muted-foreground">
                <p className="font-medium">
                  Mitgliedschaft:
                </p>
                <ul className="space-y-2 pl-5">
                  <li className="list-disc">
                    Für die Mitgliedschaft gelten die gesetzlichen
                    Widerrufsrechte für Verbraucherinnen und Verbraucher. Ein
                    Widerruf kann ausgeschlossen oder vorzeitig erlöschen, wenn
                    wir mit der Ausführung der Leistung auf ausdrücklichen Wunsch
                    vor Ablauf der Widerrufsfrist beginnen und die gesetzlichen
                    Voraussetzungen hierfür erfüllt sind.
                  </li>
                  <li className="list-disc">
                    Wir bitten um Hinweis, wenn ein Widerruf gewünscht ist; Details
                    und Muster-Widerrufsformular stellen wir auf Anfrage bereit.
                  </li>
                </ul>
              </div>

              <div className="space-y-2 text-muted-foreground">
                <p className="font-medium">
                  Bestellungen von Lebensmitteln &amp; schnell verderblichen Waren:
                </p>
                <p>
                  Für konkrete Bestellungen versiegelter oder leicht verderblicher
                  Waren kann das
                  Widerrufsrecht ausgeschlossen sein (&sect;&nbsp;312g Abs. 2 BGB).
                </p>
              </div>

              <p className="text-muted-foreground">
                Gesetzliche Rechte bleiben unberührt.
              </p>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">10. Haftung</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie
                  bei Verletzung von Leben, Körper oder Gesundheit.
                </li>
                <li>
                  Bei einfacher Fahrlässigkeit haften wir nur bei Verletzung einer
                  wesentlichen Vertragspflicht (Kardinalpflicht), beschränkt auf den
                  vorhersehbaren, vertragstypischen Schaden.
                </li>
                <li>
                  Betriebs- bzw. Systemausfälle (z.&nbsp;B. durch Drittdienste/Hosting/
                  Appwrite Cloud, Wartung, höhere Gewalt) begründen keinen Anspruch
                  auf ständige Verfügbarkeit oder Schadensersatz, soweit gesetzlich
                  zulässig.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                11. Gewährleistung (Lebensmittel)
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>Gesetzliche Gewährleistungsrechte gelten.</li>
                <li>
                  Naturprodukte unterliegen natürlichen Schwankungen (Form, Farbe,
                  Größe, Ertrag). Leichte Abweichungen stellen keinen Mangel dar,
                  sofern die Gebrauchstauglichkeit nicht beeinträchtigt ist.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">12. Datenschutz</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Wir verarbeiten personenbezogene Daten gemäß unserer
                  Datenschutzerklärung (abrufbar unter ...).
                </li>
                <li>
                  Für Betrieb bzw. Hosting der Plattform nutzen wir
                  Auftragsverarbeiter (z.&nbsp;B. Appwrite Cloud). Es bestehen
                  Datenverarbeitungsverträge nach Art. 28 DSGVO.
                </li>
                <li>
                  Rechte der Betroffenen (Auskunft, Berichtigung, Löschung etc.)
                  können über unsere <a href="/datenschutz" className="text-primary underline underline-offset-4">Datenschutzerklärung</a> geltend gemacht werden.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                13. Urheberrechte &amp; Nutzung
              </h2>
              <p className="text-muted-foreground">
                Inhalte der Plattform (Texte, Bilder, Marken) sind urheberrechtlich
                geschützt. Eine Nutzung außerhalb des Vertragszwecks ist untersagt,
                sofern nicht ausdrücklich erlaubt.
              </p>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">
                14. Änderungen der AGB
              </h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Wir können diese AGB anpassen, soweit sachliche Gründe bestehen
                  (z.&nbsp;B. Gesetzesänderungen, Produkterweiterungen).
                </li>
                <li>
                  Bei wesentlichen Änderungen informieren wir vorab. Widerspricht
                  die Kundin oder der Kunde nicht innerhalb von 14 Tagen, gilt
                  dies nur für nicht wesentliche Anpassungen als Zustimmung.
                </li>
                <li>
                  Änderungen von Kernpunkten laufender Mitgliedschaften,
                  insbesondere von Leistung, Laufzeit, Preislogik oder
                  Verfallsregeln, gelten nur für neue Mitgliedschaften oder nach
                  ausdrücklicher Zustimmung.
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">15. Schlussbestimmungen</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  Anwendbares Recht: deutsches Recht unter Ausschluss des
                  UN-Kaufrechts.
                </li>
                <li>
                  Gerichtsstand:
                  <ul className="mt-1 space-y-1 pl-5">
                    <li className="list-disc">
                      Für Verbraucherinnen und Verbraucher gilt der gesetzliche
                      Gerichtsstand.
                    </li>
                    <li className="list-disc">
                      Für Kaufleute ist Gerichtsstand TODO: .
                    </li>
                  </ul>
                </li>
                <li>
                  Verbraucherstreitbeilegung: Wir sind nicht verpflichtet und nicht
                  bereit, an Streitbeilegungsverfahren vor einer
                  Verbraucherschlichtungsstelle teilzunehmen.
                </li>
                <li>
                  OS-Plattform: Die EU-Kommission stellt eine Plattform zur
                  Online-Streitbeilegung bereit:{" "}
                  <a
                    href="https://ec.europa.eu/consumers/odr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    https://ec.europa.eu/consumers/odr/
                  </a>
                </li>
              </ul>
            </section>

            <Separator className="print:opacity-60" />

            <section className="space-y-3">
              <h2 className="text-2xl font-semibold">16. Kontakt &amp; Impressum</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>
                  <strong>{legalConfig.businessName}</strong>
                  {legalConfigStatus.hasAddress
                    ? `, ${legalConfig.addressLines.join(", ")}.`
                    : "."}
                </li>
                <li>
                  E-Mail: {legalConfig.email}
                  {legalConfig.phone ? ` · Telefon: ${legalConfig.phone}` : ""}
                </li>
                <li>
                  Vertretungsberechtigte Person: {legalConfig.ownerName}
                </li>
                <a href="/impressum" className="text-primary underline underline-offset-4">
                  Impressum
                </a>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
