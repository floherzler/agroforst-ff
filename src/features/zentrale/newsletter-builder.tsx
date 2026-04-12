"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Mail,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatHarvestRange, getOfferPriceSummary } from "@/features/catalog/catalog";
import { displayProductName, displayUnitLabel } from "@/features/zentrale/admin-domain";
import { sendNewsletterMessage } from "@/lib/appwrite/appwriteFunctions";
import { toast } from "sonner";

type NewsletterTextBlock = {
  id: string;
  type: "text";
  heading: string;
  html: string;
};

type NewsletterOfferBlock = {
  id: string;
  type: "offer";
  heading: string;
  intro: string;
  offerId: string;
};

type NewsletterBlock = NewsletterTextBlock | NewsletterOfferBlock;

type NewsletterDraft = {
  subject: string;
  preheader: string;
  introHeading: string;
  introText: string;
  blocks: NewsletterBlock[];
};

type NewsletterOfferOption = {
  id: string;
  label: string;
  productLabel: string;
  priceLabel: string;
  quantityLabel: string;
  harvestLabel: string;
  description: string;
};

type NewsletterSendState = {
  state: "idle" | "loading" | "success" | "error";
  message?: string;
};

type RichTextComposerProps = {
  value: string;
  onChange: (value: string) => void;
};

const NEWSLETTER_DRAFT_STORAGE_KEY = "zentrale-newsletter-draft-v1";

function createBlockId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultDraft(offers: NewsletterOfferOption[]): NewsletterDraft {
  const firstOfferId = offers[0]?.id ?? "";

  return {
    subject: "Wochenbrief aus dem Hof",
    preheader: "Neue Angebote, kurze Hinweise und frische Erntefenster.",
    introHeading: "Neue Angebote für diese Woche",
    introText: "Kurzer Überblick aus Hof, Feld und Abholung. Darunter stehen aktuelle Angebote und wichtige Hinweise.",
    blocks: [
      {
        id: createBlockId("text"),
        type: "text",
        heading: "Aus der Woche",
        html: "<p>Hier Platz für freie Redaktion, kleine Hinweise und wichtige Termine.</p>",
      },
      {
        id: createBlockId("offer"),
        type: "offer",
        heading: "Sonderangebot",
        intro: "Dieses Angebot soll diese Woche besonders sichtbar sein.",
        offerId: firstOfferId,
      },
    ],
  };
}

function readStoredDraft(offers: NewsletterOfferOption[]) {
  if (typeof window === "undefined") {
    return createDefaultDraft(offers);
  }

  try {
    const raw = window.localStorage.getItem(NEWSLETTER_DRAFT_STORAGE_KEY);
    if (!raw) {
      return createDefaultDraft(offers);
    }

    const parsed = JSON.parse(raw) as Partial<NewsletterDraft>;
    const fallback = createDefaultDraft(offers);

    return {
      subject: typeof parsed.subject === "string" ? parsed.subject : fallback.subject,
      preheader: typeof parsed.preheader === "string" ? parsed.preheader : fallback.preheader,
      introHeading: typeof parsed.introHeading === "string" ? parsed.introHeading : fallback.introHeading,
      introText: typeof parsed.introText === "string" ? parsed.introText : fallback.introText,
      blocks: Array.isArray(parsed.blocks)
        ? parsed.blocks
            .map((block) => {
              if (!block || typeof block !== "object" || typeof (block as { id?: string }).id !== "string") {
                return null;
              }

              if ((block as { type?: string }).type === "text") {
                const textBlock = block as Partial<NewsletterTextBlock>;
                return {
                  id: textBlock.id ?? createBlockId("text"),
                  type: "text" as const,
                  heading: typeof textBlock.heading === "string" ? textBlock.heading : "",
                  html: typeof textBlock.html === "string" ? textBlock.html : "<p></p>",
                };
              }

              if ((block as { type?: string }).type === "offer") {
                const offerBlock = block as Partial<NewsletterOfferBlock>;
                return {
                  id: offerBlock.id ?? createBlockId("offer"),
                  type: "offer" as const,
                  heading: typeof offerBlock.heading === "string" ? offerBlock.heading : "",
                  intro: typeof offerBlock.intro === "string" ? offerBlock.intro : "",
                  offerId: typeof offerBlock.offerId === "string" ? offerBlock.offerId : offers[0]?.id ?? "",
                };
              }

              return null;
            })
            .filter((block): block is NewsletterBlock => block !== null)
        : fallback.blocks,
    };
  } catch {
    return createDefaultDraft(offers);
  }
}

function cleanHtml(html: string) {
  return html.trim().length > 0 ? html : "<p></p>";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildNewsletterEmailHtml(draft: NewsletterDraft, offerOptions: NewsletterOfferOption[]) {
  const bodyBlocks = draft.blocks
    .map((block) => {
      if (block.type === "text") {
        return `
          <section style="margin-top:24px;padding:24px;border:1px solid rgba(120,106,56,0.14);border-radius:20px;background:#f7f4ea;">
            ${block.heading ? `<h3 style="margin:0 0 12px;font-size:20px;line-height:1.2;color:#2c2a1f;">${escapeHtml(block.heading)}</h3>` : ""}
            <div style="font-size:15px;line-height:1.7;color:#343126;">${block.html}</div>
          </section>
        `;
      }

      const offer = offerOptions.find((entry) => entry.id === block.offerId);
      if (!offer) {
        return `
          <section style="margin-top:24px;padding:24px;border:1px dashed rgba(120,106,56,0.24);border-radius:20px;background:#f7f4ea;color:#6a6655;font-size:14px;line-height:1.6;">
            Noch kein Angebot gewählt.
          </section>
        `;
      }

      return `
        <section style="margin-top:24px;padding:24px;border:1px solid rgba(120,106,56,0.14);border-radius:20px;background:#f7f4ea;">
          ${block.heading ? `<h3 style="margin:0 0 8px;font-size:20px;line-height:1.2;color:#2c2a1f;">${escapeHtml(block.heading)}</h3>` : ""}
          ${block.intro ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#5f5b50;">${escapeHtml(block.intro)}</p>` : ""}
          <div style="padding:18px;border-radius:18px;border:1px solid rgba(106,168,114,0.16);background:linear-gradient(180deg,rgba(250,251,247,0.96),rgba(239,246,235,0.92));">
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
              <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#dcead6;color:#35523a;font-size:12px;font-weight:600;">${escapeHtml(offer.productLabel)}</span>
              <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#f2eadb;color:#574c31;font-size:12px;font-weight:600;">${escapeHtml(offer.priceLabel)}</span>
              <span style="display:inline-block;padding:6px 10px;border-radius:999px;background:#eef0e2;color:#3f4b30;font-size:12px;font-weight:600;">${escapeHtml(offer.quantityLabel)}</span>
            </div>
            <div style="margin-top:14px;font-size:18px;line-height:1.3;font-weight:700;color:#2f3a21;">${escapeHtml(offer.label)}</div>
            <div style="margin-top:4px;font-size:14px;line-height:1.6;color:#5f5b50;">Ernte: ${escapeHtml(offer.harvestLabel || "noch offen")}</div>
            ${offer.description ? `<p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:#343126;">${escapeHtml(offer.description)}</p>` : ""}
          </div>
        </section>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="de">
  <body style="margin:0;padding:0;background:#f7f3ea;color:#2a281f;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:700px;margin:0 auto;padding:24px;">
      <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(draft.preheader)}</div>
      <div style="padding:28px;border-radius:28px;border:1px solid rgba(120,106,56,0.16);background:linear-gradient(180deg,#fbfaf4,#f1f5ea);">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#5e6b45;">${escapeHtml(draft.preheader || "Newsletter")}</div>
        <h1 style="margin:10px 0 0;font-size:32px;line-height:1.1;">${escapeHtml(draft.subject || "Newsletter")}</h1>
        <p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#4f4c40;">${escapeHtml(draft.introText)}</p>
        <section style="margin-top:24px;padding:24px;border-radius:22px;border:1px solid rgba(120,106,56,0.14);background:#fffdf7;">
          <h2 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#2c2a1f;">${escapeHtml(draft.introHeading || "Intro")}</h2>
          <div style="font-size:15px;line-height:1.7;color:#343126;">${escapeHtml(draft.introText)}</div>
        </section>
        ${bodyBlocks}
      </div>
    </div>
  </body>
</html>`;
}

function RichTextComposer({ value, onChange }: RichTextComposerProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorId = useId();

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML === value) return;
    editorRef.current.innerHTML = value;
  }, [value]);

  function runCommand(command: string, commandValue?: string) {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, commandValue);
    onChange(cleanHtml(editorRef.current.innerHTML));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Fett"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("bold");
          }}
        >
          <Type data-icon="inline-start" />
          Fett
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Zwischenüberschrift"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("formatBlock", "h2");
          }}
        >
          <Heading2 data-icon="inline-start" />
          H2
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Kleine Überschrift"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("formatBlock", "h3");
          }}
        >
          <Heading3 data-icon="inline-start" />
          H3
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Liste"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("insertUnorderedList");
          }}
        >
          <List data-icon="inline-start" />
          Liste
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Nummerierte Liste"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("insertOrderedList");
          }}
        >
          <ListOrdered data-icon="inline-start" />
          Nummern
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Format entfernen"
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand("removeFormat");
          }}
        >
          <RotateCcw data-icon="inline-start" />
          Reset
        </Button>
      </div>

      <div
        id={editorId}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-40 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:min-h-[1.5rem] [&_ul]:list-disc [&_ul]:pl-4"
        onInput={(event) => onChange(cleanHtml(event.currentTarget.innerHTML))}
      />
    </div>
  );
}

export function NewsletterBuilder({
  offers,
  productById,
}: {
  offers: Staffel[];
  productById: Map<string, Produkt>;
}) {
  const offerOptions = offers.map((offer) => {
    const product = productById.get(offer.produktId);

    return {
      id: offer.id,
      label: `${displayProductName(product)} · ${offer.year ?? "ohne Jahr"}`,
      productLabel: displayProductName(product),
      priceLabel: getOfferPriceSummary(offer),
      quantityLabel: `${offer.mengeVerfuegbar} ${displayUnitLabel(offer.einheit)}`,
      harvestLabel: formatHarvestRange(offer.ernteProjektion),
      description: offer.beschreibung ?? "",
    } satisfies NewsletterOfferOption;
  });

  const [draft, setDraft] = useState<NewsletterDraft>(() => readStoredDraft(offerOptions));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(() => readStoredDraft(offerOptions).blocks[0]?.id ?? null);
  const [sendState, setSendState] = useState<NewsletterSendState>({ state: "idle" });

  useEffect(() => {
    window.localStorage.setItem(NEWSLETTER_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (draft.blocks.some((block) => block.id === selectedBlockId)) return;
    setSelectedBlockId(draft.blocks[0]?.id ?? null);
  }, [draft.blocks, selectedBlockId]);

  function updateDraft(patch: Partial<NewsletterDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function updateBlock(blockId: string, updater: (block: NewsletterBlock) => NewsletterBlock) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
    }));
  }

  function addTextBlock() {
    const block: NewsletterTextBlock = {
      id: createBlockId("text"),
      type: "text",
      heading: "Neuer Textblock",
      html: "<p>Text hier eingeben.</p>",
    };

    setDraft((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setSelectedBlockId(block.id);
  }

  function addOfferBlock() {
    const block: NewsletterOfferBlock = {
      id: createBlockId("offer"),
      type: "offer",
      heading: "Angebotsblock",
      intro: "",
      offerId: offerOptions[0]?.id ?? "",
    };

    setDraft((current) => ({ ...current, blocks: [...current.blocks, block] }));
    setSelectedBlockId(block.id);
  }

  function removeBlock(blockId: string) {
    setDraft((current) => ({
      ...current,
      blocks: current.blocks.filter((block) => block.id !== blockId),
    }));
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    setDraft((current) => {
      const index = current.blocks.findIndex((block) => block.id === blockId);
      if (index < 0) return current;

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.blocks.length) return current;

      const blocks = [...current.blocks];
      const [block] = blocks.splice(index, 1);
      blocks.splice(nextIndex, 0, block);
      return { ...current, blocks };
    });
  }

  function resetDraft() {
    const freshDraft = createDefaultDraft(offerOptions);
    setDraft(freshDraft);
    setSelectedBlockId(freshDraft.blocks[0]?.id ?? null);
  }

  async function sendNewsletter() {
    try {
      setSendState({ state: "loading", message: "Sende Newsletter an Admin-Topic." });
      const result = await sendNewsletterMessage({
        subject: draft.subject,
        preheader: draft.preheader,
        content: buildNewsletterEmailHtml(draft, offerOptions),
      });
      setSendState({ state: "success", message: `Gesendet an Topic ${result.topicId ?? "Newsletter"}.` });
      toast.success("Newsletter in Topic Newsletter erstellt.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Newsletter konnte nicht gesendet werden.";
      setSendState({ state: "error", message });
      toast.error(message);
    }
  }

  const selectedBlock = draft.blocks.find((block) => block.id === selectedBlockId) ?? null;

  return (
    <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)_minmax(0,1.05fr)]">
      <Card className="border-border/60 bg-[color-mix(in_srgb,var(--color-background)_78%,white_22%)] shadow-[0_10px_32px_-22px_rgba(0,0,0,0.28)]">
        <CardHeader className="gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">Newsletter-Aufbau</CardTitle>
              <CardDescription>Blöcke sortieren, duplizieren im Kopf, dann rechts feinjustieren.</CardDescription>
            </div>
            <Badge variant="outline">{draft.blocks.length} Blöcke</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={addTextBlock}>
              <Plus data-icon="inline-start" />
              Text
            </Button>
            <Button size="sm" variant="outline" onClick={addOfferBlock}>
              <Sparkles data-icon="inline-start" />
              Angebot
            </Button>
          </div>

          <Separator />

          <ScrollArea className="h-[34rem]">
            <div className="flex flex-col gap-3 pr-4">
              {draft.blocks.map((block, index) => (
                <button
                  key={block.id}
                  type="button"
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${
                    selectedBlockId === block.id
                      ? "border-primary bg-primary/6"
                      : "border-border/70 bg-background/80 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={block.type === "text" ? "secondary" : "outline"}>
                          {block.type === "text" ? "Text" : "Angebot"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                      </div>
                      <div className="font-medium text-foreground">{block.heading || "Ohne Überschrift"}</div>
                      <div className="text-sm text-muted-foreground">
                        {block.type === "text"
                          ? "Freier Text mit Rich-Text-Toolbar"
                          : offerOptions.find((offer) => offer.id === block.offerId)?.label ?? "Noch kein Angebot gewählt"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveBlock(block.id, "up");
                        }}
                      >
                        <ArrowUp />
                        <span className="sr-only">Nach oben</span>
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === draft.blocks.length - 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveBlock(block.id, "down");
                        }}
                      >
                        <ArrowDown />
                        <span className="sr-only">Nach unten</span>
                      </Button>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[color-mix(in_srgb,var(--color-background)_78%,white_22%)] shadow-[0_10px_32px_-22px_rgba(0,0,0,0.28)]">
        <CardHeader className="gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">Editor</CardTitle>
              <CardDescription>Betreff, Intro und ausgewählten Block bearbeiten.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={resetDraft}>
                <RotateCcw data-icon="inline-start" />
                Reset
              </Button>
              <Button size="sm" onClick={sendNewsletter} disabled={sendState.state === "loading"}>
                <Mail data-icon="inline-start" />
                {sendState.state === "loading" ? "Senden..." : "An Admins senden"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="kampagne" className="flex flex-col gap-4">
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="kampagne">Kampagne</TabsTrigger>
              <TabsTrigger value="block" disabled={!selectedBlock}>
                Block
              </TabsTrigger>
            </TabsList>

            <TabsContent value="kampagne" className="mt-0">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="newsletter-subject">
                    Betreff
                  </label>
                  <Input
                    id="newsletter-subject"
                    value={draft.subject}
                    onChange={(event) => updateDraft({ subject: event.target.value })}
                    placeholder="Betreff für Mail"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="newsletter-preheader">
                    Preheader
                  </label>
                  <Input
                    id="newsletter-preheader"
                    value={draft.preheader}
                    onChange={(event) => updateDraft({ preheader: event.target.value })}
                    placeholder="Kurzer Vorschautext"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="newsletter-intro-heading">
                    Intro-Überschrift
                  </label>
                  <Input
                    id="newsletter-intro-heading"
                    value={draft.introHeading}
                    onChange={(event) => updateDraft({ introHeading: event.target.value })}
                    placeholder="Titel im Header"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="newsletter-intro-text">
                    Intro-Text
                  </label>
                  <Textarea
                    id="newsletter-intro-text"
                    value={draft.introText}
                    onChange={(event) => updateDraft({ introText: event.target.value })}
                    placeholder="Einleitung für Newsletter"
                    className="min-h-28"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="block" className="mt-0">
              {selectedBlock ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant={selectedBlock.type === "text" ? "secondary" : "outline"}>
                      {selectedBlock.type === "text" ? "Textblock" : "Angebotsblock"}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => removeBlock(selectedBlock.id)}>
                      <Trash2 data-icon="inline-start" />
                      Löschen
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="newsletter-block-heading">
                      Überschrift
                    </label>
                    <Input
                      id="newsletter-block-heading"
                      value={selectedBlock.heading}
                      onChange={(event) =>
                        updateBlock(selectedBlock.id, (block) => ({ ...block, heading: event.target.value }))
                      }
                      placeholder="Blocktitel"
                    />
                  </div>

                  {selectedBlock.type === "text" ? (
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">Text</span>
                      <RichTextComposer
                        value={selectedBlock.html}
                        onChange={(html) =>
                          updateBlock(selectedBlock.id, (block) =>
                            block.type === "text" ? { ...block, html } : block,
                          )
                        }
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="newsletter-offer-select">
                          Angebot
                        </label>
                        <Select
                          value={selectedBlock.offerId}
                          onValueChange={(value) => {
                            if (!value) return;
                            updateBlock(selectedBlock.id, (block) =>
                              block.type === "offer" ? { ...block, offerId: value } : block,
                            );
                          }}
                        >
                          <SelectTrigger id="newsletter-offer-select" className="w-full">
                            <SelectValue placeholder="Angebot wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>Aktuelle Angebote</SelectLabel>
                              {offerOptions.map((offer) => (
                                <SelectItem key={offer.id} value={offer.id}>
                                  {offer.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="newsletter-offer-intro">
                          Einleitung
                        </label>
                        <Textarea
                          id="newsletter-offer-intro"
                          value={selectedBlock.intro}
                          onChange={(event) =>
                            updateBlock(selectedBlock.id, (block) =>
                              block.type === "offer" ? { ...block, intro: event.target.value } : block,
                            )
                          }
                          placeholder="Kurzer erklärender Text zum Angebot"
                          className="min-h-24"
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
                  Noch kein Block ausgewählt.
                </div>
              )}
            </TabsContent>
          </Tabs>
          {sendState.message ? (
            <p
              className={`mt-4 text-sm ${
                sendState.state === "error" ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {sendState.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[color-mix(in_srgb,var(--color-background)_78%,white_22%)] shadow-[0_10px_32px_-22px_rgba(0,0,0,0.28)]">
        <CardHeader className="gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-base">Vorschau</CardTitle>
              <CardDescription>Mail-ähnliche Vorschau für Aufbau und Blockreihenfolge.</CardDescription>
            </div>
            <Badge variant="outline">
              <Mail data-icon="inline-start" />
              HTML-ready
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mx-auto flex max-w-[42rem] flex-col gap-5 rounded-[2rem] border border-border/70 bg-background p-5 shadow-[0_24px_50px_-36px_rgba(0,0,0,0.32)] sm:p-7">
            <div className="rounded-[1.5rem] border border-earth-500/15 bg-[radial-gradient(circle_at_top_left,rgba(106,168,114,0.16),transparent_35%),linear-gradient(180deg,color-mix(in_srgb,var(--color-background)_86%,white_14%),color-mix(in_srgb,var(--color-surface-soft)_62%,white_38%))] p-5">
              <div className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-earth-500">
                {draft.preheader || "Preheader"}
              </div>
              <div className="text-sm font-medium text-earth-500">{draft.subject || "Ohne Betreff"}</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-earth-700">{draft.introHeading || "Ohne Überschrift"}</h2>
              <p className="mt-3 text-sm leading-6 text-earth-600">{draft.introText}</p>
            </div>

            {draft.blocks.map((block) => {
              if (block.type === "text") {
                return (
                  <section key={block.id} className="rounded-[1.4rem] border border-border/70 bg-background/90 p-5">
                    {block.heading ? <h3 className="mb-3 text-xl font-semibold text-foreground">{block.heading}</h3> : null}
                    <div
                      className="prose prose-sm max-w-none text-sm leading-6 text-foreground [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{ __html: block.html }}
                    />
                  </section>
                );
              }

              const offer = offerOptions.find((entry) => entry.id === block.offerId);

              return (
                <section key={block.id} className="rounded-[1.4rem] border border-border/70 bg-background/90 p-5">
                  {block.heading ? <h3 className="text-xl font-semibold text-foreground">{block.heading}</h3> : null}
                  {block.intro ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{block.intro}</p> : null}

                  {offer ? (
                    <div className="mt-4 rounded-[1.2rem] border border-earth-500/15 bg-earth-50/55 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{offer.productLabel}</Badge>
                        <Badge variant="outline">{offer.priceLabel}</Badge>
                        <Badge variant="secondary">{offer.quantityLabel}</Badge>
                      </div>
                      <div className="mt-3 text-lg font-semibold text-earth-700">{offer.label}</div>
                      <div className="mt-1 text-sm text-earth-600">Ernte: {offer.harvestLabel || "noch offen"}</div>
                      {offer.description ? <p className="mt-3 text-sm leading-6 text-foreground">{offer.description}</p> : null}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                      Noch kein Angebot gewählt.
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
