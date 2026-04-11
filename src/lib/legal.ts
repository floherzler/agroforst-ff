const readPublicEnv = (key: string): string => {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
};

const compactLines = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const legalConfig = {
  agbVersion: readPublicEnv("NEXT_PUBLIC_AGB_VERSION") || "2026-04-10",
  agbLastUpdated:
    readPublicEnv("NEXT_PUBLIC_AGB_LAST_UPDATED") ||
    new Intl.DateTimeFormat("de-DE").format(new Date()),
  businessName:
    readPublicEnv("NEXT_PUBLIC_LEGAL_BUSINESS_NAME") || "Agroforstbetrieb Frank Fege",
  ownerName: readPublicEnv("NEXT_PUBLIC_LEGAL_OWNER_NAME") || "Frank Fege",
  addressLines: compactLines(readPublicEnv("NEXT_PUBLIC_LEGAL_ADDRESS")),
  email:
    readPublicEnv("NEXT_PUBLIC_LEGAL_EMAIL") ||
    readPublicEnv("NEXT_PUBLIC_CONTACT_EMAIL") ||
    "info@permdal.de",
  phone: readPublicEnv("NEXT_PUBLIC_LEGAL_PHONE"),
  vatId: readPublicEnv("NEXT_PUBLIC_LEGAL_VAT_ID"),
  registerCourt: readPublicEnv("NEXT_PUBLIC_LEGAL_REGISTER_COURT"),
  registerNumber: readPublicEnv("NEXT_PUBLIC_LEGAL_REGISTER_NUMBER"),
  supervisoryAuthority: readPublicEnv("NEXT_PUBLIC_LEGAL_SUPERVISORY_AUTHORITY"),
};

export const legalConfigStatus = {
  hasAddress: legalConfig.addressLines.length > 0,
  hasRegisterEntry:
    legalConfig.registerCourt.length > 0 || legalConfig.registerNumber.length > 0,
  hasVatId: legalConfig.vatId.length > 0,
  hasSupervisoryAuthority: legalConfig.supervisoryAuthority.length > 0,
};

export const missingLegalFields = [
  !legalConfigStatus.hasAddress ? "ladungsfähige Anschrift" : null,
  !legalConfig.email ? "E-Mail" : null,
]
  .filter(Boolean)
  .join(", ");
