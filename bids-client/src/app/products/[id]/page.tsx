/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  bidsHistory,
  getProductById,
  placeBid,
  type MyBidHistoryItem,
  type PlaceBidResponse,
  type ProductDetailsResponse,
} from "@/lib/api";
import { formatMinRequiredBidMessage, formatRaiseMaxBidMessage } from "@/lib/bidding";
import { formatDateTime, formatTimeLeft, resolveImageUrl } from "@/lib/format";
import { showBidStatusModal } from "@/lib/swal";
import { BiddingCard, type BidFeedback, type MyBidStatus } from "@/components/bidding-card";



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
  const [myBidEntry, setMyBidEntry] = useState<MyBidHistoryItem | null>(null);

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

  useEffect(() => {
    if (!Number.isFinite(productId)) {
      setMyBidEntry(null);
      return;
    }

    let isMounted = true;

    bidsHistory()
      .then((items) => {
        if (!isMounted) {
          return;
        }

        const item = items.find((entry) => entry.productId === productId) ?? null;
        setMyBidEntry(item);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setMyBidEntry(null);
          return;
        }

        setMyBidEntry(null);
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const timeLeft = product ? formatTimeLeft(product.endTime, nowMs) : "N/A";
  const isAuctionEnded = timeLeft === "Ended";
  const rawMyBidStatus = myBidEntry?.status?.toUpperCase() ?? "";
  const normalizedMyBidStatus =
    (rawMyBidStatus === "WINNING" ||
      rawMyBidStatus === "OUTBID" ||
      rawMyBidStatus === "WON" ||
      rawMyBidStatus === "LOST")
      ? (rawMyBidStatus as MyBidStatus)
      : null;

  const minimumBid = useMemo(() => {
    if (!product) {
      return 0;
    }

    if (normalizedMyBidStatus === "WINNING" && myBidEntry && Number.isFinite(myBidEntry.myMaxBid)) {
      return Number((myBidEntry.myMaxBid + 0.01).toFixed(2));
    }

    return Number.isFinite(product.minRequiredBid) ? product.minRequiredBid : (currentPrice + 0.01);
  }, [product, normalizedMyBidStatus, myBidEntry]);

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

      setCurrentPrice(response.currentPrice ?? 0);
      setProduct((prev) => (prev ? { ...prev, currentPrice: response.currentPrice ?? 0, minRequiredBid: response.nextMinRequiredBid ?? (response.currentPrice ?? 0) + 0.01 } : null));
      setFeedback(parseBidFeedback(response));
      const normalizedStatus = (response.status ?? "").toUpperCase();

      if (
        normalizedStatus === "WINNING" ||
        normalizedStatus === "OUTBID" ||
        normalizedStatus === "WON" ||
        normalizedStatus === "LOST"
      ) {
        setMyBidEntry((previous) => ({
          ...(previous || {}),
          productId: product.id,
          productName: product.name,
          myMaxBid: numericBid,
          currentPrice: response.currentPrice,
          endTime: product.endTime,
          deliveryLocation: product.deliveryLocation,
          imageUrl: product.imageUrl,
          status: normalizedStatus,
        }));
      }

      const isSuccessStatus = normalizedStatus === "WINNING" || normalizedStatus === "OUTBID";

      if (isSuccessStatus) {
        void showBidStatusModal({
          isWinning: normalizedStatus === "WINNING",
          isUpdateOnly: normalizedStatus === "WINNING" && normalizedMyBidStatus === "WINNING",
          currentPrice: response.currentPrice,
          onLearnMore: () => {
            router.push("/help");
          },
        });
      }

      if (response.minRequiredMax != null && response.status?.toUpperCase() === "REJECT_TOO_LOW") {
        setBidAmount(String(response.minRequiredMax));
      } else {
        setBidAmount("");
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push(`/auth?redirect=${encodeURIComponent(`/products/${product.id}`)}`);
        return;
      }

      let message = error instanceof ApiError ? error.message : "Unable to place bid right now.";
      let tone: "red" | "amber" = "red";

      if (message.includes("New max bid must be higher") && normalizedMyBidStatus === "WINNING" && Number.isFinite(myBidEntry?.myMaxBid)) {
        message = formatRaiseMaxBidMessage(myBidEntry!.myMaxBid);
        tone = "amber";
      }

      setFeedback({
        tone,
        text: message,
      });
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
              {resolveImageUrl(product.imageUrl) ? (
                <img alt={product.name} className="h-full w-full object-cover" src={resolveImageUrl(product.imageUrl)!} />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-slate-300">image</span>
                </div>
              )}
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

          <BiddingCard
            bidAmount={bidAmount}
            currentPrice={currentPrice}
            feedback={feedback}
            isAuctionEnded={isAuctionEnded}
            minimumBid={minimumBid}
            myBidEntry={myBidEntry}
            normalizedMyBidStatus={normalizedMyBidStatus}
            onBidAmountChange={setBidAmount}
            onSubmitBid={handlePlaceBid}
            submitting={submitting}
            timeLeft={timeLeft}
          />
        </div>
      </main>
    </div>
  );
}

function parseBidFeedback(response: PlaceBidResponse): BidFeedback {
  const status = (response.status ?? "").toUpperCase();

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
    return {
      tone: "amber",
      text: formatMinRequiredBidMessage(response.currentPrice, response.minRequiredMax),
    };
  }

  return {
    tone: "amber",
    text: response.message || status,
  };
}
