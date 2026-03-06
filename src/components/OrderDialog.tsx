"use client"

import React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { functions, databases } from "@/models/client/config"
import env from "@/app/env"
import { useAuthStore } from "@/store/Auth";
import { Models } from "appwrite";

type Props = {
  angebotId: string
}

export default function OrderDialog({ angebotId }: Props) {
  const [open, setOpen] = React.useState(false)
  // displayedAmount is what the user edits: for weight units we show kilograms, for count units we show integer count
  const [displayedAmount, setDisplayedAmount] = React.useState<string>("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const { user } = useAuthStore();
  const user_mail = user?.email ?? "";

  type AngebotDoc = Models.Document & {
    einheit?: string;
    mengeVerfuegbar?: number;
    euroPreis?: number;
    menge?: number;
  };

  const [angebot, setAngebot] = React.useState<AngebotDoc | null>(null)

  React.useEffect(() => {
    let mounted = true
    async function fetchAngebot() {
      try {
        const doc = await databases.getDocument(
          env.appwrite.db,
          env.appwrite.angebote_collection_id,
          angebotId
        )
        if (mounted) setAngebot(doc)
      } catch (err) {
        console.error('Failed to fetch angebot', err)
      }
    }
    fetchAngebot()
    return () => { mounted = false }
  }, [angebotId])

  // When dialog opens, set sensible defaults (10 kg for weight units, 1 for count units)
  React.useEffect(() => {
    if (!open) return
    setError(null)
    setSuccess(null)
    if (!angebot) {
      // default to 1 kg display (will be converted internally to grams)
      setDisplayedAmount("1")
      return
    }
    const unitRaw = (angebot.einheit || '').toString().toLowerCase()
    if (unitRaw === 'gramm' || unitRaw === 'g' || unitRaw === 'kg' || unitRaw === 'kilogramm') {
      setDisplayedAmount("1")
    } else {
      // count-like units (Stück, Bund, etc.) default to 1
      setDisplayedAmount("1")
    }
  }, [open, angebot])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // compute internal numeric menge depending on angebot.einheit
    const displayParsed = Number(displayedAmount)
    if (!Number.isFinite(displayParsed) || displayParsed <= 0) {
      setError("Bitte eine gültige Menge > 0 eingeben.")
      return
    }

    const unitRaw = (angebot?.einheit || '').toString().toLowerCase()
    let internalMenge: number
    // weight units: display in kg, internal in grams
    if (unitRaw === 'gramm' || unitRaw === 'g') {
      // displayParsed is in kilograms
      internalMenge = Math.round(displayParsed * 1000)
    } else if (unitRaw === 'kg' || unitRaw === 'kilogramm') {
      // assume displayParsed in kilograms, internal still use grams for consistency
      internalMenge = Math.round(displayParsed * 1000)
    } else {
      // count-like units: must be integer
      if (!Number.isInteger(displayParsed)) {
        setError('Bitte eine ganze Zahl für diese Einheit eingeben.')
        return
      }
      internalMenge = displayParsed
    }

    setSubmitting(true)
    try {
      const payload = {
        angebotID: angebotId,
        menge: internalMenge,
        user_mail: user_mail, // Pass user_mail to the function
      }

      await functions.createExecution(
        env.appwrite.order_function_id,
        JSON.stringify(payload)
      )

      setSuccess("Anfrage gesendet. Wir melden uns zeitnah!")
      setTimeout(() => {
        setOpen(false)
        setDisplayedAmount("")
        setSuccess(null)
      }, 1200)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Senden."
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  // helpers for preview
  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value)
    } catch {
      return `${value.toFixed(2)} €`
    }
  }

  const computePreview = (): { label: string; total?: string } => {
    if (!angebot) return { label: '' }
    const unitRaw = (angebot.einheit || '').toString().toLowerCase()
    const price = Number(angebot.euroPreis) || 0
    const displayParsed = parseDisplayNumber(displayedAmount)
    if (!Number.isFinite(displayParsed) || displayParsed <= 0) return { label: '' }

    if (unitRaw === 'gramm' || unitRaw === 'g' || unitRaw === 'kg' || unitRaw === 'kilogramm') {
      // display is kilograms
      const kg = displayParsed
      const grams = kg * 1000
      const total = (grams / 1000) * price // price assumed per kg
      return { label: `${kg} kg`, total: formatCurrency(total) }
    }

    // count-like
    const total = displayParsed * price
    return { label: `${displayParsed} ${angebot.einheit}`, total: formatCurrency(total) }
  }

  // Accept German decimal comma in user input
  const parseDisplayNumber = (s: string) => {
    if (typeof s !== 'string') return NaN
    const norm = s.replace(',', '.')
    return Number(norm)
  }

  // compute internal requested amount (grams or count) from displayedAmount
  const computeInternalRequested = (): number | null => {
    const displayParsed = parseDisplayNumber(displayedAmount)
    if (!Number.isFinite(displayParsed) || displayParsed <= 0 || !angebot) return null
    const unitRaw = (angebot.einheit || '').toString().toLowerCase()
    if (['gramm', 'g', 'kg', 'kilogramm'].includes(unitRaw)) {
      // displayed in kilograms -> internal in grams
      return Math.round(displayParsed * 1000)
    }
    // count-like
    return Math.round(displayParsed)
  }

  const availableInternal = (() => {
    if (!angebot) return Infinity
    const v = Number(angebot.mengeVerfuegbar)
    return Number.isFinite(v) ? v : Infinity
  })()

  const internalRequested = computeInternalRequested()
  const isOverAvailable = internalRequested !== null && internalRequested > availableInternal

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-permdal-600 hover:bg-permdal-700">
          Jetzt bestellen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bestellung anfragen</DialogTitle>
          <DialogDescription>
            Gib die gewünschte Menge ein und sende deine Anfrage.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="menge" className="block text-sm font-medium mb-1">
              Menge
            </label>
            {/* determine if the angebot unit is weight-like */}
            {/** compute isWeight from angebot */}
            <div className="flex items-center gap-2 mb-2">
              {/* suggestion buttons */}
              {(() => {
                const unitRaw = (angebot?.einheit || '').toString().toLowerCase()
                const isWeight = ['gramm', 'g', 'kg', 'kilogramm'].includes(unitRaw)
                // build suggestions dynamically from availability; always include 1kg basis for weight
                let suggestions: number[] = []
                if (isWeight) {
                  const avail = Number(angebot?.mengeVerfuegbar ?? 0)
                  const availKg = Number.isFinite(avail) ? avail / 1000 : Infinity
                  // prefer 1,3,5 but filter by availability; if avail < 1kg, suggest avail rounded to 0.1
                  const base = [1, 3, 5]
                  suggestions = base.filter((b) => !Number.isFinite(availKg) || b <= Math.max(1, Math.floor(availKg)))
                  if (suggestions.length === 0 && Number.isFinite(availKg) && availKg > 0) {
                    // push available rounded to 0.1
                    suggestions = [Math.round(availKg * 10) / 10]
                  }
                } else {
                  suggestions = [1, 3, 5]
                }
                return (
                  <div className="flex gap-2">
                    {suggestions.map((s) => {
                      const would = (['gramm', 'g', 'kg', 'kilogramm'].includes((angebot?.einheit || '').toString().toLowerCase())) ? Math.round(s * 1000) : Math.round(s)
                      const wouldExceed = !!(angebot && Number.isFinite(Number(angebot.mengeVerfuegbar)) && would > Number(angebot.mengeVerfuegbar))
                      const clickInternal = (val: number) => {
                        if (wouldExceed) return
                        setDisplayedAmount(String(val))
                      }
                      return (
                        <Button
                          key={s}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => clickInternal(s)}
                          className="text-xs"
                          disabled={wouldExceed}
                        >
                          {s}{isWeight ? ' kg' : ` ${angebot?.einheit ?? ''}`}
                        </Button>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            <Input
              id="menge"
              type="number"
              min={0}
              step={(angebot && ['gramm', 'g', 'kg', 'kilogramm'].includes((angebot.einheit || '').toString().toLowerCase())) ? 0.1 : 1}
              inputMode={(angebot && ['gramm', 'g', 'kg', 'kilogramm'].includes((angebot.einheit || '').toString().toLowerCase())) ? 'decimal' : 'numeric'}
              placeholder={angebot && ['gramm', 'g', 'kg', 'kilogramm'].includes((angebot.einheit || '').toString().toLowerCase()) ? 'z. B. 10' : 'z. B. 1'}
              value={displayedAmount}
              onChange={(e) => {
                const v = e.target.value
                const unitRaw = (angebot?.einheit || '').toString().toLowerCase()
                const isWeight = ['gramm', 'g', 'kg', 'kilogramm'].includes(unitRaw)
                if (!isWeight) {
                  // only allow integers for count-like units
                  if (v.includes('.') || v.includes(',')) return
                }
                setDisplayedAmount(v)
              }}
              required
            />
          </div>

          {/* Live price preview */}
          <div className="text-sm text-muted-foreground">
            {(() => {
              const p = computePreview()
              if (!p || !p.label || !p.total) return null
              return (
                <div>
                  <div className="text-xs">Voraussichtlicher Gesamtpreis für {p.label}:</div>
                  <div className="text-sm font-semibold">{p.total}</div>
                </div>
              )
            })()}
          </div>

          {error && (
            <p className="text-sm text-red-600" aria-live="assertive">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-700" aria-live="polite">
              {success}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={submitting || isOverAvailable}>
              {submitting ? "Senden…" : "Anfrage senden"}
            </Button>
          </DialogFooter>
        </form>
        {isOverAvailable && (
          <p className="text-sm text-red-600 mt-2">Es sind nur {angebot?.mengeVerfuegbar} {angebot?.einheit} verfügbar — reduziere die Menge.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
