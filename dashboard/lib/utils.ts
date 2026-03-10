import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// Parse Brazilian date DD/MM/YYYY to Date object
export function parseBrDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
}

// Format Date to YYYY-MM-DD for API calls
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format Date to DD/MM/YYYY for display
export function toBrDate(date: Date): string {
  return date.toLocaleDateString("pt-BR");
}

export function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end };
}

// ─── Fuzzy name matching ──────────────────────────────────────────────────────

/**
 * Normalize a string for fuzzy comparison:
 * - Remove diacritics (ã→a, ô→o, é→e, etc.)
 * - Lowercase
 * - Strip non-alphanumeric (except spaces)
 * - Collapse whitespace
 */
export function normalizeStr(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")       // symbols → space
    .replace(/\s+/g, " ")
    .trim();
}

/** Word overlap score between two normalized strings (0–1) */
function wordOverlap(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / Math.max(wa.size, wb.size, 1);
}

/**
 * Find the best matching string from a list using normalized comparison.
 * Returns the best match and its score (0–1). Score ≥ 0.5 is considered a match.
 */
export function findBestMatch(
  target: string,
  candidates: string[]
): { match: string | null; score: number } {
  const normTarget = normalizeStr(target);
  let best: string | null = null;
  let bestScore = 0;

  for (const c of candidates) {
    const normC = normalizeStr(c);
    // Exact match after normalization
    if (normC === normTarget) return { match: c, score: 1 };
    // Substring match
    let score = 0;
    if (normC.includes(normTarget) || normTarget.includes(normC)) {
      score = Math.min(normC.length, normTarget.length) / Math.max(normC.length, normTarget.length);
    }
    // Word overlap
    const overlap = wordOverlap(normTarget, normC);
    score = Math.max(score, overlap);

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return { match: bestScore >= 0.45 ? best : null, score: bestScore };
}
