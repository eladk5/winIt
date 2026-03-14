type BrandProps = {
  compact?: boolean;
  className?: string;
  taglineClassName?: string;
  wordmarkClassName?: string;
};

export function Brand({
  compact = false,
  className = "",
  taglineClassName = "",
  wordmarkClassName = "",
}: BrandProps) {
  const iconSizeClass = compact ? "h-11 w-11" : "h-14 w-14";
  const wordSizeClass = compact ? "text-[1.85rem]" : "text-[2.5rem]";
  const taglineSizeClass = compact ? "text-[0.56rem]" : "text-[0.7rem]";

  return (
    <div className={`flex items-center gap-2.5 ${className}`.trim()}>
      <svg
        aria-hidden="true"
        className={`${iconSizeClass} shrink-0 overflow-visible`}
        viewBox="0 0 128 128"
      >
        <defs>
          <linearGradient id="winit-blue" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#1d8ef5" />
            <stop offset="100%" stopColor="#114fbf" />
          </linearGradient>
          <linearGradient id="winit-orange" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#ffb13b" />
            <stop offset="100%" stopColor="#f57b17" />
          </linearGradient>
        </defs>
        <path
          d="M22 98 10 28h19l8 44 10-31h16l10 31 8-44h19L88 98H74L55 54 36 98Z"
          fill="url(#winit-blue)"
        />
        <path
          d="M8 74c24-33 62-47 106-36-30 1-56 13-77 34-8 8-14 17-20 26L8 74Z"
          fill="url(#winit-orange)"
        />
        <circle cx="24" cy="20" fill="url(#winit-blue)" r="10" />
        <circle cx="84" cy="14" fill="url(#winit-orange)" r="9" />
        <path
          d="m102 26 4 8 8 4-8 4-4 8-4-8-8-4 8-4 4-8Z"
          fill="#f6a21a"
        />
        <path
          d="m113 37 2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"
          fill="#1778e8"
        />
      </svg>

      <div className="flex min-w-0 flex-col leading-none">
        <div className={`brand-wordmark ${wordSizeClass} ${wordmarkClassName}`.trim()}>
          <span className="brand-wordmark-blue">Win</span>
          <span className="brand-wordmark-orange">It</span>
        </div>
        <div
          className={`brand-tagline ${taglineSizeClass} text-[#114fbf] ${taglineClassName}`.trim()}
        >
          AUCTION &amp; WIN APP
        </div>
      </div>
    </div>
  );
}
