/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  bidsHistory,
  listCategories,
  listProducts,
  placeBid,
  type MyBidHistoryItem,
  type ProductCardResponse,
} from "@/lib/api";
import { formatCurrency, formatTimeLeft, resolveImageUrl } from "@/lib/format";
import { showBidStatusModal } from "@/lib/swal";

const sortOptions = [
  { label: "Ending Soon", sortBy: "END_TIME", sortDir: "ASC" },
  { label: "Lowest Price", sortBy: "CURRENT_PRICE", sortDir: "ASC" },
  { label: "Highest Price", sortBy: "CURRENT_PRICE", sortDir: "DESC" },
] as const;

type QuickBidTone = "green" | "red" | "amber";
type MyBidStatus = "WINNING" | "OUTBID" | "WON" | "LOST";
const PRICE_MIN_BOUND = 0;
const PRICE_MAX_BOUND = 10000;

function categoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

function categoryIcon(category: string): string {
  const icons: Record<string, string> = {
    electronics: "devices",
    furniture: "chair",
    clothing: "checkroom",
    vehicles: "directions_car",
  };

  return icons[category.trim().toLowerCase()] ?? "category";
}

function parseBidFeedback(
  status: string,
  message: string,
  minRequiredMax: number | null,
  currentMax?: number,
): { tone: QuickBidTone; text: string } {
  const normalized = status.toUpperCase();

  if (normalized === "WINNING") {
    return { tone: "green", text: message || "WINNING" };
  }

  if (normalized === "OUTBID") {
    return { tone: "red", text: message || "OUTBID" };
  }

  if (normalized === "REJECT_TOO_LOW") {
    if (currentMax !== undefined && currentMax > 0) {
      return {
        tone: "amber",
        text: `New max bid must be higher than your current max bid\nyour max bid: ${formatCurrency(currentMax)}`,
      };
    }

    const closestAllowedText =
      minRequiredMax !== null ? `Closest allowed bid: ${formatCurrency(minRequiredMax)}` : "Bid is too low.";
    return {
      tone: "amber",
      text: message ? `${message} ${closestAllowedText}` : closestAllowedText,
    };
  }

  return { tone: "amber", text: message || normalized };
}

function bidStatusTone(status: MyBidStatus): string {
  if (status === "WINNING") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "OUTBID" || status === "LOST") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function ProductCard({
  product,
  myBidEntry,
  onBidStatusChange,
  nowMs,
}: {
  product: ProductCardResponse;
  myBidEntry?: MyBidHistoryItem;
  onBidStatusChange: (productId: number, item: MyBidHistoryItem) => void;
  nowMs: number;
}) {
  const router = useRouter();
  const [currentPrice, setCurrentPrice] = useState(product.currentPrice);
  const [bidAmount, setBidAmount] = useState("");
  const [quickBidMessage, setQuickBidMessage] = useState<{ tone: QuickBidTone; text: string } | null>(null);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  const timeLeft = formatTimeLeft(product.endTime, nowMs);
  const isEnded = timeLeft === "Ended";

  useEffect(() => {
    setCurrentPrice(product.currentPrice);
  }, [product.currentPrice]);

  const minimumBid = useMemo(() => Number((currentPrice + 0.01).toFixed(2)), [currentPrice]);

  async function handleQuickBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEnded) {
      setQuickBidMessage({ tone: "red", text: "Auction has ended." });
      return;
    }

    const numericBid = Number(bidAmount);

    if (!Number.isFinite(numericBid) || numericBid <= 0) {
      setQuickBidMessage({ tone: "red", text: "Enter a valid bid amount." });
      return;
    }

    setIsSubmittingBid(true);
    setQuickBidMessage(null);

    try {
      const response = await placeBid({
        productId: product.id,
        maxAmount: numericBid,
      });

      setCurrentPrice(response.currentPrice);
      setBidAmount("");
      setQuickBidMessage(parseBidFeedback(response.status, response.message, response.minRequiredMax, myBidEntry?.myMaxBid));
      if (response.status.toUpperCase() === "REJECT_TOO_LOW" && response.minRequiredMax !== null) {
        setBidAmount(String(response.minRequiredMax));
      }
      const normalized = response.status.toUpperCase();
      if (normalized === "WINNING" || normalized === "OUTBID" || normalized === "WON" || normalized === "LOST") {
        onBidStatusChange(product.id, {
          productId: product.id,
          productName: product.name,
          myMaxBid: numericBid,
          currentPrice: response.currentPrice,
          endTime: product.endTime,
          deliveryLocation: product.deliveryLocation,
          imageUrl: product.imageUrl,
          status: normalized,
        });
      }

      if (normalized === "WINNING" || normalized === "OUTBID") {
        void showBidStatusModal({
          isWinning: normalized === "WINNING",
          isUpdateOnly: normalized === "WINNING" && myBidEntry?.status.toUpperCase() === "WINNING",
          currentPrice: response.currentPrice,
          onLearnMore: () => {
            router.push("/help");
          },
        });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push(`/auth?redirect=${encodeURIComponent(`/products/${product.id}`)}`);
        return;
      }

      let message = error instanceof ApiError ? error.message : "Unable to place bid.";
      if (message.includes("New max bid must be higher") && myBidEntry?.myMaxBid) {
        message = `New max bid must be higher than your current max bid\nyour max bid: ${formatCurrency(myBidEntry.myMaxBid)}`;
      }

      setQuickBidMessage({
        tone: "red",
        text: message,
      });
    } finally {
      setIsSubmittingBid(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img alt={product.name} className="h-full w-full object-cover" src={resolveImageUrl(product.imageUrl)} />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-base font-semibold text-slate-900">{product.name}</h3>
        {myBidEntry && (
          <div className="mt-2 text-right">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${bidStatusTone(myBidEntry.status.toUpperCase() as MyBidStatus)}`}>
              Your Bid: {myBidEntry.status.toUpperCase()}
            </span>
          </div>
        )}

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Bid</p>
            <p className="mt-1 text-xl leading-none font-bold text-slate-900">{formatCurrency(currentPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Time Left</p>
            <p className={`mt-1 text-sm font-bold ${isEnded ? "text-slate-500" : "text-red-500"}`}>{timeLeft}</p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-slate-600">{product.description || ""}</p>

        <div className="mt-4 space-y-2.5">
          <form className="flex items-stretch gap-0 overflow-hidden rounded-xl border border-slate-200 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary" onSubmit={handleQuickBid}>
            <span className="flex items-center bg-slate-50 pl-3 pr-1 text-sm font-semibold text-slate-400 select-none">$</span>
            <input
              className="h-11 w-full min-w-0 bg-slate-50 px-2 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
              min={minimumBid}
              onChange={(event) => {
                setBidAmount(event.target.value);
              }}
              placeholder={minimumBid.toFixed(2)}
              step="0.01"
              type="number"
              value={bidAmount}
            />
            <button
              className="flex shrink-0 items-center gap-1.5 px-4 text-[13px] font-bold text-white transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmittingBid || isEnded}
              style={{ background: "linear-gradient(135deg, #135bec 0%, #6366f1 100%)" }}
              type="submit"
            >
              <span className="material-symbols-outlined text-[16px]">gavel</span>
              {isSubmittingBid ? "..." : "Bid"}
            </button>
          </form>

          <Link
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600 transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            href={`/products/${product.id}`}
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            View Auction
          </Link>
        </div>

        {quickBidMessage && (
          <div
            className={`mt-2.5 flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-pre-line ${quickBidMessage.tone === "green"
              ? "bg-emerald-50 text-emerald-600"
              : quickBidMessage.tone === "amber"
                ? "bg-amber-50 text-amber-600"
                : "bg-red-50 text-red-600"
              }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {quickBidMessage.tone === "green" ? "check_circle" : quickBidMessage.tone === "amber" ? "warning" : "error"}
            </span>
            {quickBidMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductCardResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSort, setSelectedSort] = useState<(typeof sortOptions)[number]>(sortOptions[0]);
  const [selectedMinPrice, setSelectedMinPrice] = useState<number>(PRICE_MIN_BOUND);
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number>(PRICE_MAX_BOUND);
  const [currentMaxBound, setCurrentMaxBound] = useState<number>(PRICE_MAX_BOUND);
  const currentMaxBoundRef = useRef<number>(PRICE_MAX_BOUND);

  const [sliderMinPrice, setSliderMinPrice] = useState<number>(PRICE_MIN_BOUND);
  const [sliderMaxPrice, setSliderMaxPrice] = useState<number>(PRICE_MAX_BOUND);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [myBidStatuses, setMyBidStatuses] = useState<Record<number, MyBidHistoryItem>>({});
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
    let isMounted = true;

    listCategories()
      .then((items) => {
        if (isMounted) {
          setCategories(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCategories([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    bidsHistory()
      .then((items: MyBidHistoryItem[]) => {
        if (!isMounted) {
          return;
        }

        const map: Record<number, MyBidHistoryItem> = {};
        for (const item of items) {
          map[item.productId] = item;
        }
        setMyBidStatuses(map);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          setMyBidStatuses({});
          return;
        }

        setMyBidStatuses({});
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleBidStatusChange(productId: number, item: MyBidHistoryItem) {
    setMyBidStatuses((previous) => ({
      ...previous,
      [productId]: item,
    }));
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const items = await listProducts({
          category: selectedCategory || undefined,
          search: search || undefined,
          minPrice: selectedMinPrice > PRICE_MIN_BOUND ? selectedMinPrice : undefined,
          maxPrice: selectedMaxPrice < currentMaxBoundRef.current ? selectedMaxPrice : undefined,
          sortBy: selectedSort.sortBy,
          sortDir: selectedSort.sortDir,
        });

        if (isMounted) {
          setProducts(items);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error instanceof ApiError ? error.message : "Unable to load product catalog.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [search, selectedCategory, selectedMaxPrice, selectedMinPrice, selectedSort]);

  // Effect to determine the absolute maximum price bound for the current category/search
  useEffect(() => {
    let isMounted = true;

    async function updateMaxBound() {
      try {
        const items = await listProducts({
          category: selectedCategory || undefined,
          search: search || undefined,
          // No price filters here!
        });

        if (isMounted) {
          const maxP = items.length > 0 ? Math.max(...items.map((p) => p.currentPrice)) : 0;
          const newMax = Math.max(PRICE_MAX_BOUND, maxP);

          setCurrentMaxBound((previousMaxBound) => {
            if (newMax === previousMaxBound) {
              return previousMaxBound;
            }
            currentMaxBoundRef.current = newMax;
            setSliderMaxPrice((previousSliderMaxPrice) =>
              previousSliderMaxPrice >= previousMaxBound - 1 ? newMax : previousSliderMaxPrice,
            );
            return newMax;
          });
        }
      } catch {
        // Ignore errors for max bound discovery
      }
    }

    updateMaxBound();

    return () => {
      isMounted = false;
    };
  }, [search, selectedCategory]);

  // Debounce price slider changes so we don't fire an API call on every drag tick
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedMinPrice(sliderMinPrice);
      setSelectedMaxPrice(sliderMaxPrice);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [sliderMinPrice, sliderMaxPrice]);

  const selectedCategoryLabel = selectedCategory ? categoryLabel(selectedCategory) : "All Categories";
  const minThumbPercent = ((sliderMinPrice - PRICE_MIN_BOUND) / (currentMaxBound - PRICE_MIN_BOUND)) * 100;
  const maxThumbPercent = ((sliderMaxPrice - PRICE_MIN_BOUND) / (currentMaxBound - PRICE_MIN_BOUND)) * 100;

  return (
    <div className="relative flex min-h-screen flex-col bg-background-light font-display text-slate-900">

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 lg:w-72 lg:p-4">
          <div
            className="sticky top-[5rem] flex flex-col gap-6 rounded-2xl border border-white/60 p-5"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(246,246,248,0.96) 100%)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: "0 4px 32px rgba(19, 91, 236, 0.06), 0 1.5px 6px rgba(0,0,0,0.04)",
            }}
          >
            {/* ── Sidebar Header ── */}
            <div className="flex items-center gap-2.5 pb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-md shadow-primary/25">
                <span className="material-symbols-outlined text-lg text-white">tune</span>
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-slate-800">Filters</h3>
                <p className="text-[11px] text-slate-400">Refine your search</p>
              </div>
            </div>

            {/* ── Categories ── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-primary/60">category</span>
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Categories</h4>
              </div>
              <ul className="flex flex-col gap-0.5">
                <li>
                  <button
                    className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all duration-200 ${selectedCategory === ""
                      ? "bg-gradient-to-r from-primary/12 to-primary/6 font-semibold text-primary shadow-sm shadow-primary/8"
                      : "font-medium text-slate-500 hover:bg-slate-100/70 hover:text-slate-700"
                      }`}
                    onClick={() => {
                      setSelectedCategory("");
                    }}
                    type="button"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-110 ${selectedCategory === "" ? "text-primary" : "text-slate-400 group-hover:text-primary/70"
                        }`}
                    >
                      apps
                    </span>
                    All Categories
                    {selectedCategory === "" && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                </li>

                {categories.map((category) => {
                  const isActive = selectedCategory === category;

                  return (
                    <li key={category}>
                      <button
                        className={`group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] transition-all duration-200 ${isActive
                          ? "bg-gradient-to-r from-primary/12 to-primary/6 font-semibold text-primary shadow-sm shadow-primary/8"
                          : "font-medium text-slate-500 hover:bg-slate-100/70 hover:text-slate-700"
                          }`}
                        onClick={() => {
                          setSelectedCategory(category);
                        }}
                        type="button"
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] transition-transform duration-200 group-hover:scale-110 ${isActive ? "text-primary" : "text-slate-400 group-hover:text-primary/70"
                            }`}
                        >
                          {categoryIcon(category)}
                        </span>
                        {categoryLabel(category)}
                        {isActive && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* ── Divider ── */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* ── Price Range ── */}
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-primary/60">payments</span>
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Price Range</h4>
              </div>
              <div className="px-1">
                {/* Interactive dual-range slider */}
                <div className="relative h-2 w-full rounded-full bg-slate-100">
                  {/* Colored fill between thumbs */}
                  <div
                    className="absolute h-full rounded-full bg-gradient-to-r from-primary to-blue-500"
                    style={{ left: `${minThumbPercent}%`, right: `${100 - maxThumbPercent}%` }}
                  />
                  {/* Min range input */}
                  <input
                    className="price-range-input"
                    max={currentMaxBound}
                    min={PRICE_MIN_BOUND}
                    onChange={(event) => {
                      const val = Number(event.target.value);
                      setSliderMinPrice(Math.min(val, sliderMaxPrice));
                    }}
                    step={50}
                    type="range"
                    value={sliderMinPrice}
                  />
                  {/* Max range input */}
                  <input
                    className="price-range-input"
                    max={currentMaxBound}
                    min={PRICE_MIN_BOUND}
                    onChange={(event) => {
                      const val = Number(event.target.value);
                      setSliderMaxPrice(Math.max(val, sliderMinPrice));
                    }}
                    step={50}
                    type="range"
                    value={sliderMaxPrice}
                  />
                </div>
                {/* Range chips */}
                <div className="mt-5 flex items-center justify-between">
                  <span className="rounded-lg bg-primary/8 px-2.5 py-1 text-[11px] font-bold text-primary">
                    {formatCurrency(sliderMinPrice)}
                  </span>
                  <span className="text-[11px] text-slate-300">—</span>
                  <span className="rounded-lg bg-primary/8 px-2.5 py-1 text-[11px] font-bold text-primary">
                    {formatCurrency(sliderMaxPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* ── Sort By ── */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px] text-primary/60">sort</span>
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Sort By</h4>
              </div>
              <div className="flex flex-col gap-1.5">
                {sortOptions.map((option) => {
                  const isActive = option === selectedSort;
                  return (
                    <button
                      className={`group flex items-center justify-between rounded-xl border px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${isActive
                        ? "border-primary/30 bg-primary/8 text-primary shadow-sm shadow-primary/8"
                        : "border-slate-200/60 bg-white text-slate-500 hover:border-primary/20 hover:bg-primary/4 hover:text-slate-700"
                        }`}
                      key={option.label}
                      onClick={() => {
                        setSelectedSort(option);
                      }}
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-[16px] transition-all duration-200 ${isActive ? "text-primary" : "text-slate-400 group-hover:text-primary/60"
                            }`}
                        >
                          {option.sortDir === "ASC" ? "arrow_upward" : "arrow_downward"}
                        </span>
                        {option.label}
                      </span>
                      {isActive && (
                        <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>


          </div>
        </aside>

        <section className="flex-1 p-6">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Live Auctions</h1>
              <p className="mt-1 text-sm text-slate-500">
                Showing {products.length} items in <span className="font-semibold text-primary">{selectedCategoryLabel}</span>
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <span className="material-symbols-outlined text-sm">search</span>
              </div>
              <input
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-3 pl-10 text-sm placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary"
                onChange={(event) => {
                  setSearchInput(event.target.value);
                }}
                placeholder="Search auctions..."
                type="text"
                value={searchInput}
              />
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" key={index}>
                  <div className="aspect-square animate-pulse bg-slate-100"></div>
                  <div className="space-y-3 p-4">
                    <div className="h-4 animate-pulse rounded bg-slate-100"></div>
                    <div className="h-3 animate-pulse rounded bg-slate-100"></div>
                    <div className="h-10 animate-pulse rounded bg-slate-100"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !errorMessage && products.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              No products matched your filters.
            </div>
          )}

          {!isLoading && !errorMessage && products.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  myBidEntry={myBidStatuses[product.id]}
                  nowMs={nowMs}
                  onBidStatusChange={handleBidStatusChange}
                  product={product}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
