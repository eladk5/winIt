/* eslint-disable @next/next/no-img-element */

type BrandProps = {
  compact?: boolean;
  className?: string;
};

export function Brand({
  compact = false,
  className = "",
}: BrandProps) {
  const heightClass = compact ? "h-14" : "h-20";

  return (
    <div className={`flex items-center ${className}`.trim()}>
      <img
        alt="WinIt – Auction & Win"
        className={`${heightClass} w-auto object-contain`}
        src="https://res.cloudinary.com/dawc0rbyi/image/upload/v1775213847/Gemini_Generated_Image_jwhtcrjwhtcrjwht_p4akt8.png"
      />
    </div>
  );
}
