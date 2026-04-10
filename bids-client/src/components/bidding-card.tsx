import { FormEvent } from "react";
import { formatCurrency, statusTone } from "@/lib/format";
import type { MyBidHistoryItem } from "@/lib/api";

export type BidFeedback = {
  tone: "green" | "red" | "amber";
  text: string;
};

export type MyBidStatus = "WINNING" | "OUTBID" | "WON" | "LOST";

export function bidStatusClasses(status: MyBidStatus): string {
  const tone = statusTone(status);

  if (tone === "green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "red") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

type BiddingCardProps = {
  feedback: BidFeedback | null;
  myBidEntry: MyBidHistoryItem | null;
  normalizedMyBidStatus: MyBidStatus | null;
  currentPrice: number;
  timeLeft: string;
  minimumBid: number;
  bidAmount: string;
  submitting: boolean;
  isAuctionEnded: boolean;
  onBidAmountChange: (amount: string) => void;
  onSubmitBid: (event: FormEvent<HTMLFormElement>) => void;
};

export function BiddingCard({
  feedback,
  myBidEntry,
  normalizedMyBidStatus,
  currentPrice,
  timeLeft,
  minimumBid,
  bidAmount,
  submitting,
  isAuctionEnded,
  onBidAmountChange,
  onSubmitBid,
}: BiddingCardProps) {
  return (
    <aside className="lg:col-span-5">
      <div className="sticky top-24 space-y-4">
        {feedback && (
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-bold whitespace-pre-line ${
              feedback.tone === "green"
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
            {myBidEntry && normalizedMyBidStatus && (
              <div className={`mb-5 rounded-2xl border px-4 py-3 ${bidStatusClasses(normalizedMyBidStatus)}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">Your Bid Status</p>
                    <p className="mt-1 text-lg font-black">{normalizedMyBidStatus}</p>
                  </div>
                  <span className="material-symbols-outlined text-[24px]">
                    {normalizedMyBidStatus === "WINNING" || normalizedMyBidStatus === "WON" ? "emoji_events" : "priority_high"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-current/10 pt-3 text-sm">
                  <span className="opacity-70">Your max bid</span>
                  <span className="font-bold">{formatCurrency(myBidEntry.myMaxBid)}</span>
                </div>
              </div>
            )}

            <p className="mb-1 text-sm font-medium text-slate-500">Current Price</p>
            <h3 className="text-5xl font-black tracking-tight text-slate-900">{formatCurrency(currentPrice)}</h3>

            <div className="mt-6 flex items-center justify-between border-y border-slate-100 py-3 text-sm">
              <span className="text-slate-500">Time Left</span>
              <span className="font-bold text-slate-900">{timeLeft}</span>
            </div>

            <form className="mt-6 space-y-4" onSubmit={onSubmitBid}>
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
                    onChange={(event) => onBidAmountChange(event.target.value)}
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
                {submitting ? "Submitting..." : normalizedMyBidStatus === "WINNING" ? "Raise Max Amount" : "Place Bid"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
