import { Link } from "@tanstack/react-router";
import { ArrowRight, Download } from "lucide-react";

import { PageHeader, PageShell, SurfaceSection } from "@/components/base/page-shell";
import { Button } from "@/components/ui/button";

const certificatePdfUrl = encodeURI("/img/statut_Permdal_öko.pdf");
const certificateImageUrl = encodeURI("/img/statut_Permdal_öko.png");

export default function PermdalPage() {
  return (
    <PageShell>
      <PageHeader
        title="Permdal"
        badge="Statut und Zertifikat"
        description="Kurz, was das Permdal-Statut für unseren Betrieb bedeutet."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/ueber-aff">
                Über uns
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild>
              <a href={certificatePdfUrl} download target="_blank" rel="noreferrer">
                <Download className="size-4" />
                PDF öffnen
              </a>
            </Button>
          </div>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SurfaceSection className="p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Was Permdal hier bedeutet</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
            Permdal ist für uns ein klarer Rahmen: vielfältig anbauen, Boden langfristig
            aufbauen und Produkte so entwickeln, dass sie zu Hof und Landschaft passen.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
            Das Statut beschreibt diesen Ansatz. Wer verstehen will, wie wir arbeiten,
            findet dort die Grundlage.
          </p>
        </SurfaceSection>

        <SurfaceSection className="overflow-hidden p-0">
          <img
            src={certificateImageUrl}
            alt="Permdal-Statut"
            className="h-full min-h-[22rem] w-full bg-background object-contain p-4"
          />
        </SurfaceSection>
      </div>

      <SurfaceSection className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Zertifikat separat öffnen</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground sm:text-base">
              Das PDF kannst du direkt herunterladen oder im Browser ansehen.
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full">
            <a href={certificatePdfUrl} download target="_blank" rel="noreferrer">
              <Download className="size-4" />
              Zertifikat herunterladen
            </a>
          </Button>
        </div>
      </SurfaceSection>
    </PageShell>
  );
}
