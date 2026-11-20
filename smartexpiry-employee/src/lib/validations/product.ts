import * as z from "zod";
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from "@/lib/products/catalog";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} must be ${max} characters or fewer.` })
    .transform((v) => v || null);

/** Optional price per unit: "", "12", "12.5", "12.50" (max 99,999,999.99). */
const price = (label: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/[,₹\s]/g, ""))
    .refine((v) => v === "" || /^\d{1,8}(\.\d{1,2})?$/.test(v), { error: `${label}: enter an amount like 45 or 45.50.` })
    .transform((v) => (v === "" ? null : Number(v)));

const dateOnly = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), { error: "Enter a valid date." })
  .transform((v) => v || null);

/** Product details + the batch details shared by every selected store (quantity is per store). */
export const AddStockSchema = z
  .object({
    barcode: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, ""))
      .refine((v) => v === "" || /^[0-9A-Za-z\-.]{4,32}$/.test(v), { error: "Enter a valid barcode." })
      .transform((v) => v || null),
    name: z.string().trim().min(2, { error: "Product name is required." }).max(160),
    brand: optionalText(120, "Brand"),
    category: z.enum(PRODUCT_CATEGORIES, { error: "Choose a category." }),
    productType: z.enum(["PERISHABLE", "NON_PERISHABLE"]),
    unit: z.enum(PRODUCT_UNITS, { error: "Choose a unit." }),
    packageSize: optionalText(40, "Package size"),
    description: optionalText(1000, "Description"),
    storageInfo: optionalText(300, "Storage info"),
    ingredients: optionalText(2000, "Ingredients"),
    imageUrl: z
      .string()
      .trim()
      .refine((v) => v === "" || (/^https:\/\//.test(v) && v.length <= 500), { error: "Image must be an https URL." })
      .transform((v) => v || null),
    tracksExpiry: z.boolean(),
    source: z.enum(["MANUAL", "BARCODE_LOOKUP"]),
    costPrice: price("Cost price"),
    sellingPrice: price("Selling price"),

    batchNumber: optionalText(40, "Batch number"),
    manufacturingDate: dateOnly,
    expiryDate: dateOnly,
  });

export type AddStockField = keyof z.input<typeof AddStockSchema>;

/**
 * Rules that compare fields. Kept outside the schema on purpose: Zod skips
 * object-level refinements while any single field is invalid, which would hide
 * "Expiry date is required" until everything else was fixed.
 */
function crossFieldErrors(raw: { tracksExpiry: boolean; expiryDate: string; manufacturingDate: string }) {
  const errors: Partial<Record<AddStockField, string[]>> = {};
  const expiry = raw.expiryDate.trim();
  const mfg = raw.manufacturingDate.trim();
  if (raw.tracksExpiry && !expiry) errors.expiryDate = ["Expiry date is required."];
  if (mfg && expiry && expiry < mfg) errors.expiryDate = ["Expiry can't be before the manufacturing date."];
  if (mfg && mfg > new Date().toISOString().slice(0, 10)) errors.manufacturingDate = ["Manufacturing date can't be in the future."];
  return errors;
}

/** Raw form values: plain strings (plus the expiry toggle) before validation. */
export type AddStockRaw = Record<Exclude<AddStockField, "tracksExpiry">, string> & { tracksExpiry: boolean };

/** One selected store and the quantity typed for it. */
export type StoreAllocation = { storeId: string; quantity: string };

const QUANTITY_RE = /^\d{1,8}(\.\d{1,2})?$/;
export const QUANTITY_ERROR = "Enter a number above 0 (max 2 decimals).";

/** Fields that can carry an error: product/batch fields, the store picker, and each store's quantity. */
export type AddStockErrors = Partial<Record<AddStockField | "storeIds", string[]>> & { quantities?: Record<string, string> };

/**
 * Validates the add-product form, reporting every problem at once:
 * product + shared batch details, at least one store, and a valid quantity per store.
 */
export function validateAddStock(raw: AddStockRaw, allocations: StoreAllocation[]) {
  const parsed = AddStockSchema.safeParse(raw);
  const cross = crossFieldErrors(raw);
  const errors: AddStockErrors = parsed.success ? {} : parsed.error.flatten().fieldErrors;
  for (const [k, v] of Object.entries(cross) as [AddStockField, string[]][]) errors[k] = [...(errors[k] ?? []), ...v];

  if (allocations.length === 0) errors.storeIds = ["Choose at least one store."];
  const quantities: Record<string, string> = {};
  for (const a of allocations) {
    const q = a.quantity.trim();
    if (!QUANTITY_RE.test(q) || Number(q) <= 0) quantities[a.storeId] = QUANTITY_ERROR;
  }
  if (Object.keys(quantities).length) errors.quantities = quantities;

  if (parsed.success && Object.keys(errors).length === 0) {
    return {
      ok: true as const,
      data: parsed.data,
      allocations: allocations.map((a) => ({ storeId: a.storeId, quantity: Number(a.quantity.trim()) })),
    };
  }
  return { ok: false as const, errors };
}

export type AddStockResult =
  | {
      ok: true;
      productName: string;
      unit: string;
      expiryDate: string | null;
      isNewProduct: boolean;
      /** Where it was added, in the order chosen. */
      stores: { name: string; quantity: number }[];
    }
  | { ok: false; message?: string; errors?: AddStockErrors };

/** Fields the form can be pre-filled with after a scan. */
export type ProductPrefill = {
  barcode: string | null;
  name: string | null;
  brand: string | null;
  category: string | null;
  productType: "PERISHABLE" | "NON_PERISHABLE" | null;
  unit: string | null;
  packageSize: string | null;
  description: string | null;
  storageInfo: string | null;
  ingredients: string | null;
  imageUrl: string | null;
  tracksExpiry: boolean | null;
  /** From your own catalog only (public databases don't know your prices). */
  costPrice: string | null;
  sellingPrice: string | null;
  batchNumber: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
};

export type LookupResult =
  | {
      ok: true;
      /** catalog = you added this barcode before; external = public database; not_found = type it in. */
      found: "catalog" | "open_food_facts" | "open_beauty_facts" | "not_found";
      /** True when expiry/batch/mfg came from a GS1 code. */
      fromGs1: boolean;
      prefill: ProductPrefill;
      /** Names of the fields that were filled automatically. */
      filled: string[];
    }
  | { ok: false; message: string };

/* ───────────────────────────── Edit stock ───────────────────────────── */

/** Edit one stock batch (and the shared catalog details of its product). */
export const UpdateStockSchema = AddStockSchema.pick({
  name: true,
  brand: true,
  category: true,
  unit: true,
  tracksExpiry: true,
  costPrice: true,
  sellingPrice: true,
  batchNumber: true,
  manufacturingDate: true,
  expiryDate: true,
}).extend({
  batchId: z.string().min(1),
  quantity: z
    .string()
    .trim()
    .refine((v) => QUANTITY_RE.test(v) && Number(v) > 0, { error: "Enter a quantity greater than 0 (up to 2 decimals)." })
    .transform(Number),
});

export type UpdateStockField = keyof z.input<typeof UpdateStockSchema>;
export type UpdateStockRaw = Record<Exclude<UpdateStockField, "tracksExpiry">, string> & { tracksExpiry: boolean };

export function validateUpdateStock(raw: UpdateStockRaw) {
  const parsed = UpdateStockSchema.safeParse(raw);
  const cross = crossFieldErrors(raw);
  if (parsed.success && Object.keys(cross).length === 0) return { ok: true as const, data: parsed.data };
  const fieldErrors: Partial<Record<UpdateStockField, string[]>> = parsed.success ? {} : parsed.error.flatten().fieldErrors;
  for (const [k, v] of Object.entries(cross) as [UpdateStockField, string[]][]) fieldErrors[k] = [...(fieldErrors[k] ?? []), ...v];
  return { ok: false as const, errors: fieldErrors };
}

export type UpdateStockResult =
  | { ok: true; productName: string }
  | { ok: false; message?: string; errors?: Partial<Record<UpdateStockField, string[]>> };

export type DeleteStockResult = { ok: true; deleted: number } | { ok: false; message: string };
