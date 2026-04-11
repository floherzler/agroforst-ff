import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PageHeader, PageShell, SurfaceSection } from "@/components/base/page-shell";
import { Button } from "@/components/ui/button";

export default function UeberAffPage() {
  return (
    <PageShell>
      <PageHeader
        title="Über Agroforst Frank Fege"
        badge="Hof, Team und Idee"
        description="Kurz, wer wir sind, wie wir arbeiten und warum Agroforst für uns mehr ist als nur ein Schlagwort."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/permdal">
                Permdal
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild>
              <Link to="/produkte">
                Produkte
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        )}
      />

      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <SurfaceSection className="overflow-hidden border-border/80 p-0 shadow-brand-soft">
          <img
            src="/img/kartoffel-hänger.jpeg"
            alt="Agroforst Frank Fege auf dem Hof"
            className="h-full min-h-[22rem] w-full object-cover"
          />
        </SurfaceSection>

        <div className="grid gap-6">
          <SurfaceSection className="p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Das Team</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              Wir sind ein Familienbetrieb aus der Ostprignitz. Auf dem Hof arbeiten wir
              mit kurzen Wegen, klaren Abläufen und dem Anspruch, Landwirtschaft
              nachvollziehbar zu machen.
            </p>
          </SurfaceSection>

          <SurfaceSection className="p-6">
            <h2 className="text-2xl font-semibold tracking-tight">Was ist ein Agroforst?</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              Agroforst verbindet Ackerbau, Gehölze und weitere Kulturen auf derselben Fläche.
              Bäume und Sträucher sind dabei Teil des Systems, nicht nur Randbegrenzung.
            </p>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              Für uns heißt das: mehr Vielfalt auf der Fläche, langfristiger gedacht und eng
              mit dem verbunden, was wir später anbieten.
            </p>
          </SurfaceSection>
        </div>
      </div>

      <SurfaceSection className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight">Permdal in kurz</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
              Permdal ist für uns der Rahmen, in dem wir unsere Haltung sichtbar machen:
              vielfältig anbauen, Boden aufbauen und Produkte so denken, dass Hof,
              Landschaft und Gemeinschaft zusammenpassen.
            </p>
          </div>

          <Button asChild variant="outline" className="rounded-full">
            <Link to="/permdal">
              Zum Permdal-Statut
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </SurfaceSection>
    </PageShell>
  );
}
