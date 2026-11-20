import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names. Later classes win over earlier conflicting ones, so a
 * component's default styles can be overridden by the `className` prop:
 *   cn("px-4 bg-primary", "bg-danger") → "px-4 bg-danger"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
