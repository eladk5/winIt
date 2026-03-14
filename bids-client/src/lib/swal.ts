import Swal from "sweetalert2";

type BidStatusModalOptions = {
  isWinning: boolean;
  isUpdateOnly?: boolean;
  currentPrice?: number;
  onLearnMore?: () => void;
};

function formatPriceSnapshot(currentPrice?: number): string {
  if (currentPrice === undefined || Number.isNaN(currentPrice)) {
    return "Latest price updated";
  }

  return `Current auction price: $${currentPrice.toFixed(2)}`;
}

export function showBidStatusModal({
  isWinning,
  isUpdateOnly,
  currentPrice,
  onLearnMore,
}: BidStatusModalOptions): Promise<void> {
  const accentLabel = isUpdateOnly ? "Max Bid Updated" : isWinning ? "Leading" : "Watchlist";
  const accentText = isUpdateOnly
    ? "Your maximum bid has been increased without raising the current price."
    : isWinning
      ? "You are currently the highest bidder."
      : "Your bid was recorded, but someone is ahead.";

  const title = isUpdateOnly ? "Max Bid Increased" : isWinning ? "You are leading" : "You were outbid";

  return Swal.fire({
    title,
    html: `
      <div class="swal-theme-card">
        <div class="swal-theme-badge">${accentLabel}</div>
        <p class="swal-theme-lead">${accentText}</p>
        <div class="swal-theme-info-row">
          <span class="swal-theme-info-label">Auction status</span>
          <span class="swal-theme-info-value">${formatPriceSnapshot(currentPrice)}</span>
        </div>
        <p class="swal-theme-copy">
          Our automatic bidding engine already handled the update for you.
          Open the help page if you want to review how max bids and tie-breaking work.
        </p>
      </div>
    `,
    iconHtml: `<span class="material-symbols-outlined swal-theme-icon-glyph">${isUpdateOnly || isWinning ? "gavel" : "trending_up"}</span>`,
    showCancelButton: true,
    confirmButtonText: isWinning || isUpdateOnly ? "Keep Browsing" : "Try Another Bid",
    cancelButtonText: "How Bidding Works",
    customClass: {
      container: "swal-theme-container",
      popup: "swal-theme-popup",
      icon: `swal-theme-icon ${isWinning || isUpdateOnly ? "swal-theme-icon-winning" : "swal-theme-icon-outbid"}`,
      title: "swal-theme-title",
      htmlContainer: "swal-theme-html",
      actions: "swal-theme-actions",
      confirmButton: "swal-theme-confirm",
      cancelButton: "swal-theme-cancel",
    },
    buttonsStyling: false,
    showClass: {
      popup: "swal-theme-show",
    },
    hideClass: {
      popup: "swal-theme-hide",
    },
    backdrop: "rgba(15, 23, 42, 0.42)",
  }).then((result) => {
    if (result.dismiss === Swal.DismissReason.cancel) {
      onLearnMore?.();
    }
  });
}
