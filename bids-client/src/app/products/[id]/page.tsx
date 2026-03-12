/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  getProductById,
  placeBid,
  type PlaceBidResponse,
  type ProductDetailsResponse,
} from "@/lib/api";
import { formatCurrency, formatDateTime, formatTimeLeft, resolveImageUrl } from "@/lib/format";

type BidFeedback = {
  tone: "green" | "red" | "amber";
  text: string;
};

export default function ProductDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const productId = Number(params.id);

  const [product, setProduct] = useState<ProductDetailsResponse | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [bidAmount, setBidAmount] = useState<string>("");
  const [feedback, setFeedback] = useState<BidFeedback | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setLoading(false);
      setApiError("Invalid product id.");
      return;
    }

    let isMounted = true;

    async function loadProduct() {
      setLoading(true);
      setApiError(null);

      try {
        const response = await getProductById(productId);

        if (!isMounted) {
          return;
        }

        setProduct(response);
        setCurrentPrice(response.currentPrice);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setApiError(error instanceof ApiError ? error.message : "Unable to load product details.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const timeLeft = product ? formatTimeLeft(product.endTime, nowMs) : "N/A";
  const isAuctionEnded = timeLeft === "Ended";

  const minimumBid = useMemo(() => {
    if (!Number.isFinite(currentPrice)) {
      return 0;
    }

    return Number((currentPrice + 0.01).toFixed(2));
  }, [currentPrice]);

  async function handlePlaceBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!product) {
      return;
    }

    if (isAuctionEnded) {
      setFeedback({ tone: "red", text: "Auction has ended." });
      return;
    }

    const numericBid = Number(bidAmount);

    if (!Number.isFinite(numericBid) || numericBid <= 0) {
      setFeedback({ tone: "red", text: "Enter a valid bid amount." });
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const response = await placeBid({
        productId: product.id,
        maxAmount: numericBid,
      });

      setCurrentPrice(response.currentPrice);
      setFeedback(parseBidFeedback(response));

      if (response.minRequiredMax !== null && response.status.toUpperCase() === "REJECT_TOO_LOW") {
        setBidAmount(String(response.minRequiredMax));
      } else {
        setBidAmount("");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push(`/auth?redirect=${encodeURIComponent(`/products/${product.id}`)}`);
        return;
      }

      setApiError(error instanceof ApiError ? error.message : "Unable to place bid right now.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="aspect-[4/3] animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div className="lg:col-span-5">
              <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light px-4">
        <div className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-semibold">{apiError ?? "Product not found."}</p>
          <Link className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white" href="/">
            Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light font-display text-slate-900">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 flex items-center gap-2 text-sm font-medium text-slate-500">
          <Link className="transition-colors hover:text-primary" href="/">
            Home
          </Link>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-slate-900">{product.category}</span>
        </nav>

        {apiError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-7">
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img alt={product.name} className="h-full w-full object-cover" src={resolveImageUrl(product.imageUrl)} />
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 lg:text-4xl">{product.name}</h1>
              <p className="mt-2 text-sm text-slate-500">Category: {product.category}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-lg font-bold">Description</h3>
              <p className="leading-relaxed text-slate-600">{product.description || ""}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Delivery Location</p>
                <p className="mt-1 font-medium text-slate-900">{product.deliveryLocation}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Auction Ends</p>
                <p className="mt-1 font-medium text-slate-900">{formatDateTime(product.endTime)}</p>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-5">
            <div className="sticky top-24 space-y-4">
              {feedback && (
                <div
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${feedback.tone === "green"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : feedback.tone === "red"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {feedback.tone === "green" ? "check_circle" : feedback.tone === "red" ? "error" : "warning"}
                  </span>
                  <p>{feedback.text}</p>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xl">
                <div className="p-8">
                  <p className="mb-1 text-sm font-medium text-slate-500">Current Price</p>
                  <h3 className="text-5xl font-black tracking-tight text-slate-900">{formatCurrency(currentPrice)}</h3>

                  <div className="mt-6 flex items-center justify-between border-y border-slate-100 py-3 text-sm">
                    <span className="text-slate-500">Time Left</span>
                    <span className="font-bold text-slate-900">{timeLeft}</span>
                  </div>

                  <form className="mt-6 space-y-4" onSubmit={handlePlaceBid}>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="bid">
                        Your Max Bid
                      </label>
                      <div className="relative">
                        <span className="absolute top-1/2 left-4 -translate-y-1/2 font-bold text-slate-400">$</span>
                        <input
                          className="h-14 w-full rounded-xl border-2 border-slate-200 bg-slate-50 pl-8 pr-4 text-lg font-bold transition-colors focus:border-primary focus:ring-0"
                          id="bid"
                          min={minimumBid}
                          name="bid"
                          onChange={(event) => {
                            setBidAmount(event.target.value);
                          }}
                          placeholder={minimumBid.toFixed(2)}
                          step="0.01"
                          type="number"
                          value={bidAmount}
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">Minimum: {formatCurrency(minimumBid)}</p>
                    </div>

                    <button
                      className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-lg font-bold text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={submitting || isAuctionEnded}
                      type="submit"
                    >
                      <span className="material-symbols-outlined">payments</span>
                      {submitting ? "Submitting..." : "Place Bid"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function parseBidFeedback(response: PlaceBidResponse): BidFeedback {
  const status = response.status.toUpperCase();

  if (status === "WINNING") {
    return {
      tone: "green",
      text: response.message || status,
    };
  }

  if (status === "OUTBID") {
    return {
      tone: "red",
      text: response.message || status,
    };
  }

  if (status === "REJECT_TOO_LOW") {
    const closestAllowedText =
      response.minRequiredMax !== null
        ? `Closest allowed bid: ${formatCurrency(response.minRequiredMax)}`
        : "Bid is too low.";
    return {
      tone: "amber",
      text: response.message ? `${response.message} ${closestAllowedText}` : closestAllowedText,
    };
  }

  return {
    tone: "amber",
    text: response.message || status,
  };
}
