function parseFlexibleDate(value?: string | null): Date | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) {
    return direct;
  }

  const germanMatch = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (germanMatch) {
    const [, dayRaw, monthRaw, yearRaw] = germanMatch;
    const day = Number(dayRaw);
    const month = Number(monthRaw);
    const year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw);
    const normalized = new Date(year, month - 1, day);

    if (
      normalized.getFullYear() === year
      && normalized.getMonth() === month - 1
      && normalized.getDate() === day
    ) {
      return normalized;
    }
  }

  return null;
}

export function formatOfferDate(value?: string | null, fallback = "—") {
  const parsed = parseFlexibleDate(value);
  if (!parsed) {
    return fallback;
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}
