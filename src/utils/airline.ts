/**
 * Airline Utilities
 *
 * Thin helpers for airline display concerns. Kept separate from time utils
 * to respect the Single Responsibility Principle and make each utility file
 * trivially tree-shakeable.
 */

/**
 * Returns the Kiwi.com CDN URL for an airline's 64×64px logo image.
 * The CDN is public and requires no authentication.
 *
 * GRACEFUL DEGRADATION: callers should attach an `onError` handler that
 * hides the image element when the CDN returns a 404 for unknown airlines.
 */
export function logoUrl(airlineCode: string): string {
  return `https://images.kiwi.com/airlines/64/${airlineCode.toUpperCase()}.png`
}
