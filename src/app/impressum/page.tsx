import { legalConfig, legalConfigStatus, missingLegalFields } from "@/lib/legal";

export default function Impressum() {
  const registerInfo =
    legalConfig.registerCourt && legalConfig.registerNumber
      ? `${legalConfig.registerCourt}, ${legalConfig.registerNumber}`
      : legalConfig.registerCourt || legalConfig.registerNumber;
  const todoBadgeClassName =
    "inline-flex items-center rounded-full border border-rose-500 bg-rose-600 px-2 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(214,194,156,0.18),transparent_26%),radial-gradient(circle_at_82%_12%,rgba(181,205,182,0.22),transparent_20%),linear-gradient(180deg,#fcfaf6_0%,#f3eee5_100%)] px-4 py-10 text-[var(--color-soil-900)]">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-border/70 bg-background/90 p-6 shadow-[0_28px_90px_-60px_rgba(45,34,20,0.45)] backdrop-blur sm:p-8">
          <header className="space-y-3">
            <p className="font-accent text-[0.72rem] uppercase tracking-[0.2em] text-[var(--color-soil-500)]">
              Rechtliches
            </p>
            <h1 className="font-display text-4xl tracking-[-0.04em] sm:text-5xl">
              Impressum
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Angaben gemäß § 5 DDG.
            </p>
          </header>

          {!legalConfigStatus.hasAddress ? (
            <div className="mt-6 rounded-[1.4rem] border-2 border-rose-500 bg-rose-50 px-4 py-4 text-sm text-rose-950">
              <div className="flex items-center gap-2">
                <span className={todoBadgeClassName}>TODO</span>
                <span className="font-semibold">
                  Für eine veröffentlichungsreife Fassung fehlen noch:
                </span>
              </div>
              <p className="mt-2">
                {missingLegalFields || "Pflichtangaben"}.
              </p>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4">
            <section className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
              <h2 className="text-xl font-semibold">Anbieter</h2>
              <div className="mt-3 space-y-1 text-muted-foreground">
                <p>{legalConfig.businessName}</p>
                {legalConfig.addressLines.length > 0 ? (
                  legalConfig.addressLines.map((line) => <p key={line}>{line}</p>)
                ) : (
                  <p className="font-semibold text-rose-700">
                    <span className={todoBadgeClassName}>TODO</span>
                    <span className="ml-2">Ladungsfähige Anschrift ergänzen</span>
                  </p>
                )}
                {legalConfig.ownerName ? <p>Inhaber: {legalConfig.ownerName}</p> : null}
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
              <h2 className="text-xl font-semibold">Kontakt</h2>
              <div className="mt-3 space-y-1 text-muted-foreground">
                {legalConfig.email ? (
                  <p>
                    E-Mail:{" "}
                    <a
                      href={`mailto:${legalConfig.email}`}
                      className="text-primary underline underline-offset-4"
                    >
                      {legalConfig.email}
                    </a>
                  </p>
                ) : null}
                {legalConfig.phone ? <p>Telefon: {legalConfig.phone}</p> : null}
              </div>
            </section>

            {registerInfo ? (
              <section className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
                <h2 className="text-xl font-semibold">Registereintrag</h2>
                <p className="mt-3 text-muted-foreground">{registerInfo}</p>
              </section>
            ) : legalConfigStatus.hasRegisterEntry ? null : (
              <section className="rounded-[1.5rem] border-2 border-dashed border-rose-400 bg-rose-50/80 p-5">
                <h2 className="text-xl font-semibold text-rose-900">
                  <span className={todoBadgeClassName}>TODO</span>
                  <span className="ml-2">Registereintrag prüfen</span>
                </h2>
                <p className="mt-3 text-sm text-rose-800">
                  Falls ein Handels-, Vereins-, Partnerschafts- oder Genossenschaftsregistereintrag
                  besteht, hier Gericht und Registernummer ergänzen.
                </p>
              </section>
            )}

            {legalConfig.vatId ? (
              <section className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
                <h2 className="text-xl font-semibold">Umsatzsteuer-ID</h2>
                <p className="mt-3 text-muted-foreground">{legalConfig.vatId}</p>
              </section>
            ) : (
              <section className="rounded-[1.5rem] border-2 border-dashed border-rose-400 bg-rose-50/80 p-5">
                <h2 className="text-xl font-semibold text-rose-900">
                  <span className={todoBadgeClassName}>TODO</span>
                  <span className="ml-2">USt-IdNr. prüfen</span>
                </h2>
                <p className="mt-3 text-sm text-rose-800">
                  Falls vorhanden, Umsatzsteuer-Identifikationsnummer ergänzen.
                </p>
              </section>
            )}

            {legalConfig.supervisoryAuthority ? (
              <section className="rounded-[1.5rem] border border-border/70 bg-background/70 p-5">
                <h2 className="text-xl font-semibold">Aufsichtsbehörde</h2>
                <p className="mt-3 text-muted-foreground">
                  {legalConfig.supervisoryAuthority}
                </p>
              </section>
            ) : (
              <section className="rounded-[1.5rem] border-2 border-dashed border-rose-400 bg-rose-50/80 p-5">
                <h2 className="text-xl font-semibold text-rose-900">
                  <span className={todoBadgeClassName}>TODO</span>
                  <span className="ml-2">Aufsichtsbehörde prüfen</span>
                </h2>
                <p className="mt-3 text-sm text-rose-800">
                  Nur ergänzen, wenn für den Betrieb tatsächlich eine zuständige
                  Aufsichtsbehörde anzugeben ist.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
