/**
 * Barcode helpers shared by the scanner (browser) and server actions.
 *
 * - EAN-13 / EAN-8 / UPC-A / UPC-E carry ONLY the product number (GTIN).
 * - GS1 DataMatrix / GS1-128 / GS1 QR can also carry, as "Application
 *   Identifiers": (17) expiry, (15) best before, (11) manufacturing date,
 *   (10) batch/lot. Medicines and some fresh food use these.
 */

export type ScannedCode = {
  /** Normalized GTIN used as the product's barcode, or null if none found. */
  gtin: string | null;
  /** True when the code was a GS1 element string with Application Identifiers. */
  isGs1: boolean;
  /** "YYYY-MM-DD" from AI 17 (expiry) or, failing that, AI 15 (best before). */
  expiryDate: string | null;
  /** "YYYY-MM-DD" from AI 11. */
  manufacturingDate: string | null;
  /** From AI 10. */
  batchNumber: string | null;
};

/**
 * Normalizes a product number so the same product always matches:
 * GTIN-14 with a leading 0 → EAN-13, UPC-A (12) → EAN-13 with a leading 0.
 */
export function normalizeGtin(code: string): string | null {
  const digits = code.replace(/\D/g, "");
  if (digits.length === 14 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 12) return `0${digits}`;
  if ([8, 13, 14].includes(digits.length)) return digits;
  return null;
}

const GS = String.fromCharCode(29); // FNC1 separator in GS1 element strings

/** Fixed-length GS1 Application Identifiers (data length after the AI). */
const FIXED: Record<string, number> = {
  "00": 18, "01": 14, "02": 14, "11": 6, "12": 6, "13": 6, "15": 6, "16": 6, "17": 6, "20": 2,
};
/** Variable-length AIs we may meet on retail/pharma codes (end at GS or end of data). */
const VARIABLE = ["10", "21", "22", "30", "37", "90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "240", "241", "250", "251", "400"];

/** GS1 date YYMMDD → "YYYY-MM-DD" (DD = 00 means the last day of the month). */
function gs1Date(value: string | undefined): string | null {
  if (!value || !/^\d{6}$/.test(value)) return null;
  const year = 2000 + Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  let day = Number(value.slice(4, 6));
  if (month < 1 || month > 12) return null;
  if (day === 0) day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1) return null;
  return date.toISOString().slice(0, 10);
}

function parseElementString(data: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < data.length) {
    if (data[i] === GS) {
      i++;
      continue;
    }
    const two = data.slice(i, i + 2);
    const three = data.slice(i, i + 3);
    if (FIXED[two] !== undefined) {
      out[two] = data.slice(i + 2, i + 2 + FIXED[two]);
      i += 2 + FIXED[two];
    } else if (VARIABLE.includes(three)) {
      const end = data.indexOf(GS, i + 3);
      out[three] = data.slice(i + 3, end === -1 ? undefined : end);
      i = end === -1 ? data.length : end + 1;
    } else if (VARIABLE.includes(two)) {
      const end = data.indexOf(GS, i + 2);
      out[two] = data.slice(i + 2, end === -1 ? undefined : end);
      i = end === -1 ? data.length : end + 1;
    } else {
      return Object.keys(out).length ? out : null; // unknown AI: keep what we have
    }
  }
  return out;
}

/** Parses whatever the scanner (or a person) produced into product + batch data. */
export function parseScannedCode(raw: string): ScannedCode {
  const empty: ScannedCode = { gtin: null, isGs1: false, expiryDate: null, manufacturingDate: null, batchNumber: null };
  // Drop a symbology identifier like "]d2" (DataMatrix) or "]C1" (GS1-128).
  const value = raw.trim().replace(/^\][A-Za-z]\d/, "");
  if (!value) return empty;

  let ais: Record<string, string> | null = null;
  if (value.includes("(")) {
    // Human-readable form: (01)05012345678900(17)261231(10)ABC
    ais = {};
    for (const m of value.matchAll(/\((\d{2,4})\)([^(]*)/g)) ais[m[1]!] = m[2]!.trim();
  } else if (/^\d+$/.test(value) && [8, 12, 13, 14].includes(value.length)) {
    return { ...empty, gtin: normalizeGtin(value) };
  } else if (value.startsWith("01") || value.includes(GS)) {
    ais = parseElementString(value);
  }

  if (!ais || !ais["01"]) {
    // Not GS1: maybe a store/internal code (Code 128) — keep digits-only codes as-is.
    return { ...empty, gtin: normalizeGtin(value) };
  }

  return {
    gtin: normalizeGtin(ais["01"]),
    isGs1: true,
    expiryDate: gs1Date(ais["17"]) ?? gs1Date(ais["15"]),
    manufacturingDate: gs1Date(ais["11"]),
    batchNumber: ais["10"]?.slice(0, 40) || null,
  };
}
