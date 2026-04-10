"use client";

import React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { getPickupConfig } from "@/lib/appwrite/appwritePickupConfig";
import { placeOrderRequest } from "@/lib/appwrite/appwriteFunctions";
import { formatPickupSlotRange, generateUpcomingPickupSlots } from "@/features/pickup/pickup-schedule";
import { listMembershipsByUserId, type MembershipRecord } from "@/lib/appwrite/appwriteMemberships";
import { useAuthStore } from "@/store/Auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  angebot: Angebot;
};

type StaffelSelection = Record<string, number>;

function parseDisplayNumber(value: string) {
  return Number(value.replace(",", "."));
}

function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
  } catch {
    return `${value.toFixed(2)} €`;
  }
}

function getPendingMembership(memberships: MembershipRecord[]) {
  return memberships.find((membership) => (membership.status ?? "").toLowerCase() === "beantragt") ?? null;
}

export default function OrderDialog({ angebot }: Props) {
  const { user, hydrated } = useAuthStore();
  const navigate = useNavigate();
  const [displayedAmount, setDisplayedAmount] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [staffelSelection, setStaffelSelection] = React.useState<StaffelSelection>({});
  const [memberships, setMemberships] = React.useState<MembershipRecord[]>([]);
  const [membershipsLoading, setMembershipsLoading] = React.useState(false);
  const [membershipsError, setMembershipsError] = React.useState<string | null>(null);
  const [pickupConfig, setPickupConfig] = React.useState<PickupConfig | null>(null);
  const [pickupConfigLoading, setPickupConfigLoading] = React.useState(false);
  const [pickupConfigError, setPickupConfigError] = React.useState<string | null>(null);
  const [selectedPickupSlotId, setSelectedPickupSlotId] = React.useState<string>("");

  const userMail = user?.email ?? "";
  const hasPreisStaffeln = angebot.preisStaffeln.length > 0;

  React.useEffect(() => {
    setError(null);
    setDisplayedAmount("1");
    setStaffelSelection(
      Object.fromEntries(angebot.preisStaffeln.map((staffel) => [String(staffel.teilung), 0])),
    );
  }, [angebot]);

  React.useEffect(() => {
    if (!user?.id) {
      setMemberships([]);
      setMembershipsError(null);
      setMembershipsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMemberships() {
      setMembershipsLoading(true);
      setMembershipsError(null);

      try {
        const records = await listMembershipsByUserId({ userId: user.id, limit: 10 });
        if (!cancelled) {
          setMemberships(records);
        }
      } catch (err) {
        if (!cancelled) {
          setMembershipsError(err instanceof Error ? err.message : "Mitgliedschaften konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setMembershipsLoading(false);
        }
      }
    }

    void loadMemberships();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  React.useEffect(() => {
    if (!user?.id) {
      setPickupConfig(null);
      setPickupConfigError(null);
      setPickupConfigLoading(false);
      setSelectedPickupSlotId("");
      return;
    }

    let cancelled = false;

    async function loadPickupConfig() {
      setPickupConfigLoading(true);
      setPickupConfigError(null);

      try {
        const config = await getPickupConfig();
        if (!cancelled) {
          if (!config) {
            setPickupConfig(null);
            setPickupConfigError("Abholfenster sind noch nicht eingerichtet.");
            return;
          }

          setPickupConfig(config);
        }
      } catch (err) {
        if (!cancelled) {
          setPickupConfig(null);
          setPickupConfigError(err instanceof Error ? err.message : "Abholfenster konnten nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setPickupConfigLoading(false);
        }
      }
    }

    void loadPickupConfig();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const activeMembership = React.useMemo(
    () => memberships.find((membership) => (membership.status ?? "").toLowerCase() === "aktiv") ?? null,
    [memberships],
  );

  const pendingMembership = React.useMemo(() => getPendingMembership(memberships), [memberships]);

  const legacyRequestedAmount = React.useMemo(() => {
    const value = parseDisplayNumber(displayedAmount);
    return Number.isFinite(value) && value > 0 ? value : null;
  }, [displayedAmount]);

  const staffelSummary = React.useMemo(() => {
    const selected = angebot.preisStaffeln
      .map((staffel) => ({
        ...staffel,
        anzahl: staffelSelection[String(staffel.teilung)] ?? 0,
      }))
      .filter((staffel) => staffel.anzahl > 0);

    const gesamtMenge = selected.reduce((sum, staffel) => sum + staffel.teilung * staffel.anzahl, 0);
    const gesamtPreis = selected.reduce((sum, staffel) => sum + staffel.paketPreisEur * staffel.anzahl, 0);

    return { selected, gesamtMenge, gesamtPreis };
  }, [angebot.preisStaffeln, staffelSelection]);

  const availableAmount = Number(angebot.mengeVerfuegbar ?? 0);
  const requestedAmount = hasPreisStaffeln ? staffelSummary.gesamtMenge : legacyRequestedAmount;
  const exceedsAvailable = requestedAmount !== null && Number.isFinite(availableAmount) && requestedAmount > availableAmount;
  const pickupSlots = React.useMemo(
    () => (pickupConfig ? generateUpcomingPickupSlots(pickupConfig) : []),
    [pickupConfig],
  );
  const selectedPickupSlot = React.useMemo(
    () => pickupSlots.find((slot) => slot.id === selectedPickupSlotId) ?? null,
    [pickupSlots, selectedPickupSlotId],
  );
  const pickupBlocked = pickupConfigLoading || Boolean(pickupConfigError) || pickupSlots.length === 0;

  React.useEffect(() => {
    if (pickupSlots.length === 0) {
      setSelectedPickupSlotId("");
      return;
    }

    setSelectedPickupSlotId((current) =>
      pickupSlots.some((slot) => slot.id === current) ? current : pickupSlots[0]!.id,
    );
  }, [pickupSlots]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!user) {
      setError("Bitte melde dich an, um eine Bestellung anzufragen.");
      return;
    }

    if (!activeMembership) {
      setError("Für eine Bestellung wird eine aktive Mitgliedschaft benötigt.");
      return;
    }

    if (hasPreisStaffeln) {
      if (staffelSummary.selected.length === 0) {
        setError("Bitte mindestens eine Preisstaffel auswählen.");
        return;
      }
    } else if (!legacyRequestedAmount || legacyRequestedAmount <= 0) {
      setError("Bitte eine gültige Menge > 0 eingeben.");
      return;
    }

    if (exceedsAvailable) {
      setError("Die gewählte Menge überschreitet die verfügbare Menge.");
      return;
    }

    if (!selectedPickupSlot) {
      setError("Bitte ein Abholfenster auswählen.");
      return;
    }

    setSubmitting(true);
    try {
      await placeOrderRequest({
        angebotId: angebot.id,
        membershipId: activeMembership.id,
        menge: hasPreisStaffeln ? undefined : legacyRequestedAmount ?? undefined,
        staffeln: hasPreisStaffeln
          ? staffelSummary.selected.map((staffel) => ({
              teilung: staffel.teilung,
              anzahl: staffel.anzahl,
            }))
          : undefined,
        pickupSlot: {
          start: selectedPickupSlot.start,
          end: selectedPickupSlot.end,
          label: selectedPickupSlot.label,
        },
        userMail,
      });

      setDisplayedAmount(hasPreisStaffeln ? "1" : "");
      setStaffelSelection(
        Object.fromEntries(angebot.preisStaffeln.map((staffel) => [String(staffel.teilung), 0])),
      );
      toast.success("Bestellung erfolgreich angefragt. Du wirst zum Produktkatalog weitergeleitet.");
      await navigate({ to: "/produkte" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler beim Senden.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-[var(--color-soil-900)]/10 bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(245,239,230,0.98))] p-6 shadow-[0_28px_70px_-40px_rgba(35,22,15,0.35)] sm:p-8">
      <div className="flex flex-col gap-2 border-b border-[var(--color-soil-900)]/8 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-soil-600)]">
          Bestellung
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-soil-900)] sm:text-[2rem]">
          Direkt aus diesem Angebot anfragen
        </h2>
        <p className="max-w-2xl text-sm text-[var(--color-soil-700)] sm:text-base">
          Wähle deine Menge hier auf der Seite. Wenn du eingeloggt bist und eine aktive Mitgliedschaft hast,
          geht die Anfrage ohne zusätzlichen Zwischenschritt raus.
        </p>
      </div>

      {!hydrated ? (
        <div className="mt-6 rounded-[1.6rem] border border-[var(--color-soil-900)]/8 bg-white/80 p-5 text-sm text-[var(--color-soil-700)]">
          Anmeldestatus wird geprüft…
        </div>
      ) : !user ? (
        <div className="mt-6 rounded-[1.6rem] border border-[var(--color-soil-900)]/8 bg-white/85 p-5">
          <p className="text-base font-medium text-[var(--color-soil-900)]">
            Melde dich an, um dieses Angebot direkt zu bestellen.
          </p>
          <p className="mt-2 text-sm text-[var(--color-soil-700)]">
            Danach kannst du deine Anfrage hier auf der Seite absenden.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/login" search={{ redirect: `/angebote/${angebot.id}` }}>
                Zum Login
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/signup" search={{ redirect: `/angebote/${angebot.id}` }}>
                Konto erstellen
              </Link>
            </Button>
          </div>
        </div>
      ) : membershipsLoading ? (
        <div className="mt-6 rounded-[1.6rem] border border-[var(--color-soil-900)]/8 bg-white/80 p-5 text-sm text-[var(--color-soil-700)]">
          Mitgliedschaften werden geladen…
        </div>
      ) : membershipsError ? (
        <div className="mt-6 rounded-[1.6rem] border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {membershipsError}
        </div>
      ) : !activeMembership ? (
        <div className="mt-6 rounded-[1.6rem] border border-[var(--color-soil-900)]/8 bg-white/85 p-5">
          <p className="text-base font-medium text-[var(--color-soil-900)]">
            Für Bestellungen brauchst du eine aktive Mitgliedschaft.
          </p>
          <p className="mt-2 text-sm text-[var(--color-soil-700)]">
            {pendingMembership
              ? "Deine Mitgliedschaft ist bereits beantragt, aber noch nicht freigeschaltet."
              : "Aktuell ist keine aktive Mitgliedschaft für dein Konto hinterlegt."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/konto">Mitgliedschaft verwalten</Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-3">
              {hasPreisStaffeln ? (
                angebot.preisStaffeln.map((staffel) => {
                  const count = staffelSelection[String(staffel.teilung)] ?? 0;

                  return (
                    <div
                      key={`${staffel.teilung}-${staffel.paketPreisEur}`}
                      className="flex items-center justify-between gap-3 rounded-[1.8rem] border border-[var(--color-soil-900)]/8 bg-[rgba(255,251,245,0.92)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                    >
                      <div>
                        <div className="text-[1.05rem] font-semibold text-[var(--color-soil-900)]">{staffel.label}</div>
                        <div className="text-sm text-[var(--color-soil-700)]">
                          {formatCurrency(staffel.paketPreisEur)} gesamt
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-lg"
                          className="border-[var(--color-soil-900)]/8 bg-[rgba(255,251,245,0.98)] text-[var(--color-soil-900)] shadow-none hover:bg-white"
                          onClick={() =>
                            setStaffelSelection((current) => ({
                              ...current,
                              [String(staffel.teilung)]: Math.max(0, count - 1),
                            }))
                          }
                        >
                          -
                        </Button>
                        <div className="min-w-8 text-center text-[1.05rem] font-semibold text-[var(--color-soil-900)]">{count}</div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-lg"
                          className="border-[var(--color-soil-900)]/8 bg-[rgba(255,251,245,0.98)] text-[var(--color-soil-900)] shadow-none hover:bg-white"
                          onClick={() =>
                            setStaffelSelection((current) => ({
                              ...current,
                              [String(staffel.teilung)]: count + 1,
                            }))
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[1.8rem] border border-[var(--color-soil-900)]/8 bg-[rgba(255,251,245,0.92)] p-5">
                  <label htmlFor="menge" className="mb-2 block text-sm font-medium text-[var(--color-soil-900)]">
                    Wunschmenge
                  </label>
                  <Input
                    id="menge"
                    type="number"
                    min={0}
                    step={0.1}
                    inputMode="decimal"
                    placeholder="z. B. 10"
                    value={displayedAmount}
                    onChange={(event) => setDisplayedAmount(event.target.value)}
                    required
                    className="border-[var(--color-soil-900)]/10 bg-[rgba(255,251,245,0.9)]"
                  />
                </div>
              )}

              <div className="rounded-[1.8rem] border border-[var(--color-soil-900)]/8 bg-[rgba(255,251,245,0.92)] p-5">
                <div className="mb-3">
                  <div className="text-[1.05rem] font-semibold text-[var(--color-soil-900)]">Abholung</div>
                  <div className="mt-1 text-sm text-[var(--color-soil-700)]">
                    Wähle dein verbindliches Zeitfenster.
                  </div>
                </div>

                {pickupConfigLoading ? (
                  <p className="text-sm text-[var(--color-soil-700)]">Abholfenster werden geladen…</p>
                ) : pickupConfigError ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {pickupConfigError}
                  </p>
                ) : pickupSlots.length === 0 ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Aktuell sind keine zukünftigen Abholfenster verfügbar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pickupConfig?.location ? (
                      <p className="text-sm text-[var(--color-soil-700)]">Ort: {pickupConfig.location}</p>
                    ) : null}
                    {pickupConfig?.note ? (
                      <p className="text-sm text-[var(--color-soil-700)]">{pickupConfig.note}</p>
                    ) : null}
                    <div className="grid gap-3">
                      {pickupSlots.map((slot) => {
                        const selected = selectedPickupSlotId === slot.id;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => setSelectedPickupSlotId(slot.id)}
                            className={`rounded-[1.35rem] border px-4 py-3 text-left transition ${
                              selected
                                ? "border-[var(--color-permdal-700)] bg-[rgba(227,240,229,0.92)]"
                                : "border-[var(--color-soil-900)]/8 bg-white/70 hover:bg-white"
                            }`}
                          >
                            <div className="font-medium text-[var(--color-soil-900)]">{slot.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="rounded-[1.8rem] border border-[var(--color-soil-900)]/8 bg-[rgba(255,251,245,0.94)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--color-soil-700)]">Mitgliedschaft</span>
                  <span className="font-semibold text-[var(--color-soil-900)]">
                    {(activeMembership.typ ?? "aktiv").toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--color-soil-700)]">Verfügbar</span>
                  <span className="font-semibold text-[var(--color-soil-900)]">
                    {angebot.mengeVerfuegbar} {angebot.einheit}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--color-soil-700)]">Gewählt</span>
                  <span className="font-semibold text-[var(--color-soil-900)]">
                    {requestedAmount ?? 0} {angebot.einheit}
                  </span>
                </div>
                {hasPreisStaffeln ? (
                  <div className="flex items-center justify-between gap-3 border-t border-[var(--color-soil-900)]/8 pt-3">
                    <span className="text-[var(--color-soil-700)]">Gesamtpreis</span>
                    <span className="text-lg font-semibold text-[var(--color-soil-900)]">
                      {formatCurrency(staffelSummary.gesamtPreis)}
                    </span>
                  </div>
                ) : null}
                <div className="border-t border-[var(--color-soil-900)]/8 pt-3">
                  <div className="text-[var(--color-soil-700)]">Abholung</div>
                  <div className="mt-1 font-semibold text-[var(--color-soil-900)]">
                    {selectedPickupSlot
                      ? formatPickupSlotRange(
                          selectedPickupSlot.start,
                          selectedPickupSlot.end,
                          selectedPickupSlot.label,
                        )
                      : "Noch nicht gewählt"}
                  </div>
                  {pickupConfig?.location ? (
                    <div className="mt-1 text-sm text-[var(--color-soil-700)]">{pickupConfig.location}</div>
                  ) : null}
                </div>
              </div>

              {exceedsAvailable ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Die gewählte Menge überschreitet die verfügbare Menge.
                </p>
              ) : null}

              {error ? (
                <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" aria-live="assertive">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={submitting || exceedsAvailable || pickupBlocked}
                className="mt-5 w-full rounded-full border border-[var(--color-permdal-800)]/10 bg-[var(--color-permdal-700)] px-6 text-white shadow-[0_18px_44px_-26px_rgba(35,58,42,0.55)] hover:bg-[var(--color-permdal-800)] hover:text-white focus-visible:ring-[var(--color-permdal-400)]"
              >
                {submitting ? (
                  <>
                    <Spinner data-icon="inline-start" />
                    Sende Anfrage...
                  </>
                ) : (
                  "Bestellung senden"
                )}
              </Button>
            </aside>
          </div>
        </form>
      )}
    </section>
  );
}
