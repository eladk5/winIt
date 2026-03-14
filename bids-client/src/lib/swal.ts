import Swal from "sweetalert2";

type BidStatusModalOptions = {
  isWinning: boolean;
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
  currentPrice,
  onLearnMore,
}: BidStatusModalOptions): Promise<void> {
  const accentLabel = isWinning ? "Leading" : "Watchlist";
  const accentText = isWinning ? "You are currently the highest bidder." : "Your bid was recorded, but someone is ahead.";

  return Swal.fire({
    title: isWinning ? "You are leading" : "You were outbid",
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
    iconHtml: `<span class="material-symbols-outlined swal-theme-icon-glyph">${isWinning ? "gavel" : "trending_up"}</span>`,
    showCancelButton: true,
    confirmButtonText: isWinning ? "Keep Browsing" : "Try Another Bid",
    cancelButtonText: "How Bidding Works",
    customClass: {
      container: "swal-theme-container",
      popup: "swal-theme-popup",
      icon: `swal-theme-icon ${isWinning ? "swal-theme-icon-winning" : "swal-theme-icon-outbid"}`,
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
