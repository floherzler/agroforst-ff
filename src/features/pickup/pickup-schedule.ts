import { z } from "zod";

export const PICKUP_TIMEZONE = "Europe/Berlin";
export const PICKUP_CONFIG_DOCUMENT_ID = "global";
export const DEFAULT_PICKUP_HORIZON_DAYS = 21;
const weekdayLabelMap: Record<PickupWeeklySlotRule["weekday"], string> = {
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
  6: "Samstag",
  7: "Sonntag",
};

export const pickupWeeklySlotRuleSchema = z.object({
  weekday: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
  ]),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  active: z.boolean().default(true),
});

export const pickupConfigSchema = z.object({
  id: z.string().trim().min(1),
  createdAt: z.string().trim().min(1),
  horizonDays: z.number().int().min(1).max(90),
  location: z.string().trim().optional(),
  note: z.string().trim().optional(),
  weeklySlots: z.array(pickupWeeklySlotRuleSchema),
});

const shortDateFormatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: PICKUP_TIMEZONE,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("de-DE", {
  timeZone: PICKUP_TIMEZONE,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function parseTime(value: string) {
  const [hours, minutes] = value.split(":").map((entry) => Number(entry));
  return { hours, minutes };
}

function formatOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  }).formatToParts(date);
  return parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+0";
}

function getOffsetMilliseconds(date: Date, timeZone: string) {
  const raw = formatOffset(date, timeZone);
  const match = raw.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/i);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] ?? 0);
  const minutes = Number(match[3] ?? 0);
  return sign * ((hours * 60) + minutes) * 60 * 1000;
}

function zonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: valueOf("year"),
    month: valueOf("month"),
    day: valueOf("day"),
    hour: valueOf("hour"),
    minute: valueOf("minute"),
    second: valueOf("second"),
  };
}

function berlinLocalToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
) {
  let guess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);

  for (let index = 0; index < 3; index += 1) {
    const offset = getOffsetMilliseconds(new Date(guess), PICKUP_TIMEZONE);
    const nextGuess = Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - offset;
    if (nextGuess === guess) {
      break;
    }
    guess = nextGuess;
  }

  return new Date(guess);
}

function isoWeekdayFromLocalDate(year: number, month: number, day: number) {
  const weekday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function formatPickupSlotLabel(slot: PickUpSlotLike) {
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  const startText = dateTimeFormatter.format(start);
  const endText = new Intl.DateTimeFormat("de-DE", {
    timeZone: PICKUP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(end);
  return `${startText} bis ${endText} Uhr`;
}

export function pickupWeekdayLabel(weekday: PickupWeeklySlotRule["weekday"]) {
  return weekdayLabelMap[weekday];
}

export function formatPickupSlotRange(
  start?: string | null,
  end?: string | null,
  fallbackLabel?: string | null,
) {
  if (fallbackLabel?.trim()) {
    return fallbackLabel.trim();
  }

  if (!start) {
    return "—";
  }

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return start;
  }

  if (!end) {
    return dateTimeFormatter.format(startDate);
  }

  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) {
    return dateTimeFormatter.format(startDate);
  }

  return `${shortDateFormatter.format(startDate)}, ${new Intl.DateTimeFormat("de-DE", {
    timeZone: PICKUP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(startDate)} bis ${new Intl.DateTimeFormat("de-DE", {
    timeZone: PICKUP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(endDate)} Uhr`;
}

type PickUpSlotLike = { start: string; end: string };

export function generateUpcomingPickupSlots(
  config: PickUpConfigLike,
  now = new Date(),
): PickupSlot[] {
  const parsed = pickupConfigSchema.parse({
    id: config.id ?? PICKUP_CONFIG_DOCUMENT_ID,
    createdAt: config.createdAt ?? new Date(0).toISOString(),
    horizonDays: config.horizonDays,
    location: config.location,
    note: config.note,
    weeklySlots: config.weeklySlots,
  });
  const nowTime = now.getTime();
  const today = zonedDateParts(now, PICKUP_TIMEZONE);
  const result: PickupSlot[] = [];

  for (let dayOffset = 0; dayOffset < parsed.horizonDays; dayOffset += 1) {
    const anchor = new Date(Date.UTC(today.year, today.month - 1, today.day + dayOffset, 12, 0, 0, 0));
    const local = zonedDateParts(anchor, PICKUP_TIMEZONE);
    const weekday = isoWeekdayFromLocalDate(local.year, local.month, local.day);

    for (const rule of parsed.weeklySlots) {
      if (!rule.active || rule.weekday !== weekday) {
        continue;
      }

      const startTime = parseTime(rule.startTime);
      const endTime = parseTime(rule.endTime);
      const start = berlinLocalToUtc(local.year, local.month, local.day, startTime.hours, startTime.minutes);
      const end = berlinLocalToUtc(local.year, local.month, local.day, endTime.hours, endTime.minutes);

      if (end.getTime() <= start.getTime() || end.getTime() <= nowTime) {
        continue;
      }

      const slot: PickupSlot = {
        id: `${start.toISOString()}__${end.toISOString()}`,
        start: start.toISOString(),
        end: end.toISOString(),
        label: "",
        weekday,
      };
      slot.label = formatPickupSlotLabel(slot);
      result.push(slot);
    }
  }

  return result.sort((left, right) => left.start.localeCompare(right.start));
}

type PickUpConfigLike = {
  id?: string;
  createdAt?: string;
  horizonDays: number;
  location?: string;
  note?: string;
  weeklySlots: PickupWeeklySlotRule[];
};

export function findMatchingPickupSlot(
  config: PickUpConfigLike,
  slot: { start: string; end: string },
  now = new Date(),
) {
  return generateUpcomingPickupSlots(config, now).find(
    (entry) => entry.start === slot.start && entry.end === slot.end,
  ) ?? null;
}

export function createDefaultPickupConfig(): Omit<PickupConfig, "id" | "createdAt"> {
  return {
    horizonDays: DEFAULT_PICKUP_HORIZON_DAYS,
    location: "",
    note: "",
    weeklySlots: [
      { weekday: 3, startTime: "17:00", endTime: "18:00", active: true },
      { weekday: 5, startTime: "17:00", endTime: "18:00", active: true },
    ],
  };
}
