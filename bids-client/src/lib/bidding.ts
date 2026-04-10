import { formatCurrency } from "@/lib/format";

export function formatRaiseMaxBidMessage(currentMaxBid: number): string {
  return `New max bid must be higher than your current max bid.\nYour current max bid: ${formatCurrency(currentMaxBid)}`;
}

export function formatMinRequiredBidMessage(currentPrice: number, minRequiredMax: number | null): string {
  if (minRequiredMax === null || !Number.isFinite(minRequiredMax)) {
    return "Your bid is too low.";
  }

  return `Your bid does not meet the required increment.\nCurrent price: ${formatCurrency(currentPrice)}\nMinimum allowed bid: ${formatCurrency(minRequiredMax)}`;
}
