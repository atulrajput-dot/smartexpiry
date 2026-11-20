import "server-only";
import { isPerishableCategory } from "@/lib/products/catalog";

/**
 * Looks a barcode up in free public product databases (Open Food Facts for
 * food & drink, Open Beauty Facts for cosmetics/personal care). Only the
 * barcode number is sent. Results are partial by nature — the admin reviews
 * and completes them in the form.
 */

export type LookedUpProduct = {
  name: string | null;
  brand: string | null;
  category: string | null;
  productType: "PERISHABLE" | "NON_PERISHABLE" | null;
  packageSize: string | null;
  imageUrl: string | null;
  ingredients: string | null;
  storageInfo: string | null;
  description: string | null;
};

export type ExternalSource = "open_food_facts" | "open_beauty_facts";

const SOURCES: { source: ExternalSource; base: string; fallbackCategory: string | null }[] = [
  { source: "open_food_facts", base: "https://world.openfoodfacts.org", fallbackCategory: null },
  { source: "open_beauty_facts", base: "https://world.openbeautyfacts.org", fallbackCategory: "Personal care" },
];

const FIELDS = [
  "product_name",
  "product_name_en",
  "generic_name",
  "brands",
  "categories_tags",
  "quantity",
  "image_front_url",
  "image_url",
  "ingredients_text",
  "ingredients_text_en",
  "conservation_conditions",
].join(",");

/**
 * Open Food Facts category tags → our categories. Tags run from general
 * ("plant-based-foods-and-beverages") to specific ("breakfast-cereals"), so we
 * check the MOST specific tag first and match whole words, never substrings.
 */
const CATEGORY_RULES: [RegExp, string][] = [
  [/\bfrozen\b/, "Frozen"],
  [/\b(dairies|dairy|milks?|cheeses?|yogurts?|yoghurts?|butters?|creams?|paneer|curds?|ghee)\b/, "Dairy"],
  [/\b(breads?|cakes?|pastries|viennoiseries|buns|bakery)\b/, "Bakery"],
  [/\b(meats?|poultry|chickens?|fishes|fish|seafood|eggs?|rillettes|sausages?|hams?)\b/, "Meat, fish & eggs"],
  [/\b(fruits?|vegetables?|salads?)\b/, "Fruits & vegetables"],
  [/\b(beverages|drinks|juices|waters|sodas|teas|coffees|colas)\b/, "Beverages"],
  [/\b(snacks|chips|crisps|biscuits|cookies|chocolates?|confectioneries|candies|sweets|nuts)\b/, "Snacks"],
  [/\b(cereals?|mueslis?|pastas?|rices?|noodles|sauces?|condiments|spreads|oils?|flours?|spices|canned|legumes|groceries|jams?|honeys?)\b/, "Pantry"],
  [/\b(supplements|medicines|vitamins)\b/, "Medicines"],
  [/\b(cosmetics|hygiene|shampoos?|soaps?|toothpastes?|deodorants?)\b/, "Personal care"],
  [/\b(cleaning|detergents?|household)\b/, "Household"],
];

function mapCategory(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  for (const tag of [...tags].reverse()) {
    if (typeof tag !== "string") continue;
    const words = tag.replace(/^[a-z]{2}:/, "").replace(/-/g, " ").toLowerCase();
    const hit = CATEGORY_RULES.find(([re]) => re.test(words));
    if (hit) return hit[1];
  }
  return null;
}

const clean = (v: unknown, max: number) => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};

export async function lookupBarcodeExternally(
  gtin: string,
): Promise<{ source: ExternalSource; product: LookedUpProduct } | null> {
  for (const { source, base, fallbackCategory } of SOURCES) {
    try {
      const res = await fetch(`${base}/api/v2/product/${encodeURIComponent(gtin)}.json?fields=${FIELDS}`, {
        // Generic client name: no personal data goes to the external service.
        headers: { "User-Agent": "SmartExpiry/0.1 (inventory app)", Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { status?: number; product?: Record<string, unknown> };
      const p = data.product;
      if (data.status !== 1 || !p) continue;

      const name = clean(p.product_name, 160) ?? clean(p.product_name_en, 160) ?? clean(p.generic_name, 160);
      if (!name) continue; // a record without a name isn't useful

      const category = mapCategory(p.categories_tags) ?? fallbackCategory;
      const image = clean(p.image_front_url, 500) ?? clean(p.image_url, 500);
      return {
        source,
        product: {
          name,
          brand: clean(typeof p.brands === "string" ? p.brands.split(",")[0] : null, 120),
          category,
          productType: category ? (isPerishableCategory(category) ? "PERISHABLE" : "NON_PERISHABLE") : null,
          // Drop the EU "℮" (estimated quantity) mark: "400 g e" → "400 g".
          packageSize: clean(typeof p.quantity === "string" ? p.quantity.replace(/\s*(℮|\be)\s*$/u, "") : null, 40),
          imageUrl: image && image.startsWith("https://") ? image : null,
          ingredients: clean(p.ingredients_text, 2000) ?? clean(p.ingredients_text_en, 2000),
          storageInfo: clean(p.conservation_conditions, 300),
          description: clean(p.generic_name, 1000),
        },
      };
    } catch (error) {
      console.warn(`[product-lookup] ${source} unavailable for ${gtin}:`, (error as Error).message);
    }
  }
  return null;
}
