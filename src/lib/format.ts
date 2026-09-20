const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatPrice(value: number): string {
  return priceFormatter.format(value);
}

export function formatCategory(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}
