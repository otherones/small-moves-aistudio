import React, { useState, useEffect } from 'react';
import { LogoStyleSettings } from '../../types';

interface SmallMovesLogoProps {
  className?: string;
  isDarkBackground?: boolean;
  customLogoUrl?: string;
  logoStyle?: LogoStyleSettings;
}

export const SmallMovesLogo: React.FC<SmallMovesLogoProps> = ({
  className = "",
  isDarkBackground = true,
  customLogoUrl,
  logoStyle
}) => {
  const [customImageError, setCustomImageError] = useState(false);
  const [defaultImageError, setDefaultImageError] = useState(false);

  // Reset error state if customLogoUrl changes
  useEffect(() => {
    setCustomImageError(false);
  }, [customLogoUrl]);

  const heightPx = logoStyle?.height ?? 44;
  const alignment = logoStyle?.alignment ?? 'left';

  const objectPosClass =
    alignment === 'center'
      ? 'object-center'
      : alignment === 'right'
      ? 'object-right'
      : 'object-left';

  const justifyClass =
    alignment === 'center'
      ? 'justify-center'
      : alignment === 'right'
      ? 'justify-end'
      : 'justify-start';

  if (customLogoUrl && !customImageError) {
    return (
      <img
        src={customLogoUrl}
        alt="Small Moves Principal Emergency Fund"
        className={`w-auto max-w-full object-contain ${objectPosClass} ${className}`}
        style={{ height: `${heightPx}px` }}
        onError={() => setCustomImageError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  if (!defaultImageError) {
    return (
      <img
        src="/logo.png"
        alt="Small Moves Principal Emergency Fund"
        className={`w-auto max-w-full object-contain ${objectPosClass} ${className}`}
        style={{ height: `${heightPx}px` }}
        onError={() => setDefaultImageError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`inline-flex items-center ${justifyClass} gap-3 select-none ${className}`}>
      {/* Tilted Tile Logo Mark */}
      <div className="relative flex items-center justify-center shrink-0">
        <div
          className="w-9 h-9 rounded-xl bg-[#C7DCF0] -rotate-6 flex items-center justify-center shadow-xs border border-[#C7DCF0]/60"
        >
          <span
            className="text-slate-900 font-extrabold text-sm tracking-tighter italic"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            SM
          </span>
        </div>
      </div>

      {/* Brand Text Lockup */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center gap-1">
          <span
            className="text-base font-bold italic tracking-tight text-slate-900"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            SMALL MOVES
          </span>
        </div>
        <div
          className="flex items-center gap-1 mt-0.5 text-[11px] font-bold italic tracking-wide uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          <span style={{ color: '#0089B3' }}>PRINCIPAL</span>
          <span style={{ color: '#8A2BE2' }}>EMERGENCY</span>
          <span style={{ color: '#6EBF00' }}>FUND</span>
        </div>
      </div>
    </div>
  );
};
