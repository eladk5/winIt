import { getApiBaseUrl } from "@/lib/api";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "$0.00";
  }

  return currencyFormatter.format(value);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return dateTimeFormatter.format(parsed);
}

export function formatTimeLeft(
  value: string | null | undefined,
  nowMs: number = Date.now(),
): string {
  if (!value) {
    return "N/A";
  }

  const target = new Date(value).getTime();

  if (Number.isNaN(target)) {
    return "N/A";
  }

  const diffMs = target - nowMs;

  if (diffMs <= 0) {
    return "Ended";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function resolveImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  const normalizedPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  const baseUrl = getApiBaseUrl();

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function statusTone(status: string): "green" | "red" | "amber" | "slate" {
  const normalized = status.trim().toUpperCase();

  if (["WINNING", "ACTIVE", "WON", "LEADING", "SUCCESS"].includes(normalized)) {
    return "green";
  }

  if (["OUTBID", "LOST", "REJECT_TOO_LOW", "FAILED"].includes(normalized)) {
    return "red";
  }

  if (["PENDING", "SCHEDULED"].includes(normalized)) {
    return "amber";
  }

  return "slate";
}


