/**
 * Small Moves Design Tokens
 * Version 2.6.0 — single source of truth.
 *
 * Human-readable companion: ./DESIGN_SYSTEM.md (same version). Change both together.
 *
 * Merged from four source artifacts: two design docs (admin/navy + principal/light)
 * and two token files (tokens.ts + designTokens.ts). Every color conflict was decided
 * by measured WCAG 2.1 contrast, not by which file was newer. Retired values live in
 * `colors.deprecated` so nothing is lost and nothing sneaks back in.
 *
 * Core palette:
 * - Cyan       #0089B3  Principal lockup, brand tone, icons, CTA fill, focus ring
 * - Lime       #6EBF00  "Fund" lockup, accent dots, positive emphasis
 * - Purple     #8A2BE2  "Emergency" lockup, beneficiary-state accent dots
 * - Light Blue #C7DCF0  Tilted tile logo mark, nav borders, subtle accents
 * - Soft Ice   #EDF5FB  SELECTED rail item (the rail's only fill) + tinted cards
 *
 * ============================================================================
 * ONE RAIL, WHITE, IN BOTH PORTALS.
 * Principal and Admin use the identical rail. There is no navy drawer and no
 * dark shell anywhere in the product. Do not theme the rail per portal — the
 * portals differ in nav destinations and permissions only.
 *
 * THE LEFT RAIL SURFACE IS WHITE.
 * Rail surface, logo container, inactive items, profile card — all #FFFFFF.
 * Separation from the #F3F6FA app canvas is the 1px #C7DCF0 right border and
 * nothing else. No indicator bar, no left border, no rule, no shadow, ever.
 *
 * ONE exception: the SELECTED item carries a Soft Ice #EDF5FB pill. That is
 * the only fill permitted anywhere in the rail, and it is scoped to one row.
 *
 * The pill is NOT load-bearing on its own — #EDF5FB on #FFFFFF is 1.1:1 and
 * is invisible to low-vision users. font-semibold and the #0089B3 icon are
 * what actually communicate selection. All three cues are REQUIRED.
 * ============================================================================
 *
 * RULE: brand colors are FILLS, not text. #0089B3 / #6EBF00 / #8A2BE2 all fail AA as
 * body text on their own tints. Their text counterparts are #006E8F / #2D5F00 / #6A1CB8.
 */

export const DESIGN_TOKENS = {
  colors: {
    // --- lime -------------------------------------------------------------
    lime: '#6EBF00', // fill only — 2.30:1 on white, never text
    limeText: '#2D5F00', // 7.20:1 on limeLight ✅ AAA
    limeLight: '#F2FCE2',
    limeMuted: '#E2F7C2', // gradient stop; 6.66:1 with limeText ✅ AA

    // --- cyan -------------------------------------------------------------
    cyan: '#0089B3', // 4.02:1 on white — large text / UI only
    cyanText: '#006E8F', // 5.79:1 on white, 5.32:1 on cyanLight ✅ AA
    cyanLight: '#EDF7FC',
    cyanSoft: '#E1F2FB', // 5.04:1 with cyanText ✅ AA

    // --- purple -----------------------------------------------------------
    purple: '#8A2BE2', // logo + accent dots only
    purpleText: '#6A1CB8', // 7.50:1 on purpleLight ✅ AAA
    purpleLight: '#F5EEFE',
    purpleSoft: '#EBDCFD',

    // --- brand neutrals ---------------------------------------------------
    lightBlue: '#C7DCF0', // left-nav right border, dividers, logo tile
    /** Left-rail SURFACE. White — see rail.railBg. */
    railSurface: '#FFFFFF',
    /** Selected rail item (the rail's only fill) + tinted cards elsewhere. */
    softIce: '#EDF5FB',

    /**
     * Near-black ink and dark popovers/tooltips ONLY. This is no longer a nav
     * surface — Admin uses the same white rail as Principal. 18.38:1 vs white.
     */
    commandNavy: '#0B132B',
    commandNavyHover: '#1E293B',

    slate: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      /** 2.56:1 on white — FAILS AA. Sanctioned only on commandNavy (7.17:1). */
      400: '#94A3B8',
      500: '#64748B', // muted floor on light surfaces
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },

    alert: {
      redBg: '#FEF2F2', // red-50
      redBorder: '#FECACA', // red-200
      redText: '#B91C1C', // red-700 — 5.91:1 on redBg ✅ AA
      amberBg: '#FEF3C7', // amber-100
      amberText: '#78350F', // amber-900 — 8.15:1 on amberBg ✅ AAA
    },

    /**
     * Retired. Do not use in new work. Left value -> canonical replacement.
     * Kept for find-and-replace sweeps over existing screens.
     */
    deprecated: {
      '#0093BD': 'cyan (#0089B3) — 3.55:1 on white',
      '#007799': 'cyanText (#006E8F) — lower contrast on cyanLight',
      '#0089B3-as-text': 'cyanText (#006E8F) — 3.69:1 on cyanLight FAILS AA',
      '#4A8500': 'limeText (#2D5F00) — 4.26:1 on limeLight FAILS AA',
      '#7C29E3': 'purpleText (#6A1CB8) — 5.65:1 vs 7.50:1',
      '#8A2BE2-as-text': 'purpleText (#6A1CB8) — keep #8A2BE2 for logo + dots',
      '#65C500': 'lime (#6EBF00)',
      '#70E000': 'lime (#6EBF00)',
      '#E3F2FD': 'cyanLight (#EDF7FC)',
      '#e4f9c8': 'limeMuted (#E2F7C2)',
      '#FFE4E6': 'alert.redBg (#FEF2F2)',
      '#BE123C': 'alert.redText (#B91C1C) — 5.24:1 vs 5.91:1',
      '#0B2545': 'commandNavy (#0B132B) — second navy with no distinct role',
      '#EDF5FB-as-rail-surface':
        'railSurface (#FFFFFF) — tint the selected row, not the rail',
      'bg-white-as-selected-item':
        'softIce (#EDF5FB) — white-on-white is invisible',
      'border-l-2-indicator-bar': 'softIce pill — no bars or rules in the rail',
      '#94A3B8-as-rail-icon':
        'slate.500 (#64748B) — 2.56:1 on white, under the 3:1 minimum',
      '#0B132B-as-rail-surface':
        'railSurface (#FFFFFF) — both portals share one white rail',
      'bg-slate-800-as-active-item':
        'rail.activeItem — the dark-shell active state is retired',
      'shells.principal / shells.admin':
        'rail — one rail, no per-portal theming',
      'slate-400-on-light': 'slate.500 (#64748B) — 2.56:1 on white FAILS AA',
    },
  },

  brand: {
    name: 'Small Moves',
    subTitle: 'Principal Emergency Fund',
    primary: '#0089B3',
    primaryText: '#006E8F',
    primaryLight: '#EDF7FC',
    primarySoft: '#E1F2FB',
    accentLime: '#6EBF00',
    accentPurple: '#8A2BE2',
    /** Logo lockup: word -> color. Barlow Condensed, Bold Italic. */
    lockup: {
      principal: '#0089B3',
      emergency: '#8A2BE2',
      fund: '#6EBF00',
      tile: '#C7DCF0',
    },
  },

  /**
   * ONE rail, shared verbatim by both portals. There is no `shells.admin`
   * counterpart — that was the navy drawer, and it is retired.
   */
  rail: {
    /** WHITE — and so is everything sitting on it. Separation is the border, not a fill. */
    railBg: '#FFFFFF',
    railBorder: '#C7DCF0',
    /**
     * Soft Ice pill — the ONLY fill anywhere in the rail. No indicator bar,
     * no left border, no outline, no shadow. Label 16.2:1 on the pill.
     * All three cues (pill + semibold + cyan icon) are required; see the
     * header note on why the pill alone is not sufficient.
     */
    activeItem:
      'bg-[#EDF5FB] rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold',
    inactiveItem:
      'rounded-xl px-3.5 py-2.5 text-slate-600 font-normal hover:bg-[#EDF5FB]/60 hover:text-slate-900',
    activeIcon: '#0089B3', // 3.64:1 on the ice pill — clears the 3:1 non-text minimum
    inactiveIcon: '#64748B', // slate-500; slate-400 is 2.56:1 on white and fails
    /** Plain white. No border, no shadow — a bordered white tile on white is a visible box. */
    logoContainer: 'bg-white rounded-2xl',
    profileCard: 'bg-white border-t border-[#C7DCF0]/70',
    /**
     * Nav destinations are the ONLY per-portal difference. Chrome is identical.
     */
    destinations: {
      principal: [
        'Dashboard',
        'Requests',
        'Disbursements',
        'Beneficiaries',
        'Settings',
      ],
      admin: [
        'Queue',
        'Requests',
        'Payouts',
        'Schools',
        'MOUs',
        'Users',
        'Settings',
      ],
    },
  },

  /** Every status pill: no border, tint background, high-contrast text. All ≥5.32:1. */
  status: {
    readyToPay: {
      label: 'Ready to Pay',
      bg: '#F2FCE2',
      text: '#2D5F00',
      tailwind: 'bg-[#F2FCE2] text-[#2D5F00]',
      dot: '#6EBF00',
      hasBorder: false,
      contrast: 7.2,
    },
    inReview: {
      label: 'In Review',
      bg: '#EDF7FC',
      text: '#006E8F',
      tailwind: 'bg-[#EDF7FC] text-[#006E8F]',
      dot: '#0089B3',
      hasBorder: false,
      contrast: 5.32,
    },
    waitingOnPrincipal: {
      label: 'Waiting on Principal',
      bg: '#FEF3C7', // amber-100
      text: '#78350F', // amber-900
      tailwind: 'bg-amber-100 text-amber-900',
      dot: '#F59E0B',
      hasBorder: false,
      contrast: 8.15,
    },
    waitingOnBeneficiary: {
      label: 'Waiting on Beneficiary',
      bg: '#F5EEFE',
      text: '#6A1CB8',
      tailwind: 'bg-[#F5EEFE] text-[#6A1CB8]',
      dot: '#8A2BE2',
      hasBorder: false,
      contrast: 7.5,
    },
    paid: {
      label: 'Paid',
      bg: '#F1F5F9', // slate-100
      text: '#334155', // slate-700
      tailwind: 'bg-slate-100 text-slate-700',
      dot: '#64748B',
      hasBorder: false,
      contrast: 9.45,
    },
    missingMOU: {
      label: 'Missing MOU',
      bg: '#FEF2F2', // red-50
      text: '#B91C1C', // red-700
      tailwind: 'bg-red-50 text-red-700',
      dot: '#EF4444',
      hasBorder: false,
      contrast: 5.91,
    },
    /** Fallback chip for rows with no meaningful state. */
    neutral: {
      label: 'Standard',
      bg: '#F1F5F9', // slate-100
      text: '#334155', // slate-700
      tailwind: 'bg-slate-100 text-slate-700',
      dot: '#64748B',
      hasBorder: false,
      contrast: 9.45,
    },
  },

  typography: {
    fonts: {
      body: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      display: "'Barlow Condensed', sans-serif",
    },
    weights: {
      pageTitle:
        'text-2xl md:text-3xl font-semibold text-slate-800 tracking-tight',
      sectionHeader: 'text-lg md:text-xl font-medium text-slate-800',
      cardTitle: 'text-base font-medium text-slate-800',
      /** slate-500, not slate-400 — slate-400 is 2.56:1 on white. */
      columnHeader:
        'text-[11px] font-medium uppercase tracking-wider text-slate-500',
      body: 'text-xs md:text-sm font-normal text-slate-600',
      meta: 'text-xs font-normal text-slate-500',
      tableCell: 'text-xs md:text-sm font-medium text-slate-800',
      numericTotal: 'text-2xl font-semibold text-slate-900',
      pill: 'text-xs font-medium',
    },
  },

  surfaces: {
    appBackground: '#F3F6FA',
    cardBackground: '#FFFFFF',
    cardBorder: 'border border-slate-200/80',
    cardShadow: 'shadow-xs',
    cardRadius: 'rounded-2xl',
    divider: 'border-slate-100',
    statCardPositive:
      'p-5 rounded-2xl bg-gradient-to-br from-[#F2FCE2] to-[#E2F7C2] border border-[#6EBF00]/40',
    statCardAlert: 'p-5 rounded-2xl bg-[#FEF2F2]/60 border border-[#FECACA]/60',
  },

  filters: {
    activeTab:
      'bg-slate-900 text-white shadow-xs rounded-full px-3.5 py-1.5 text-xs font-medium',
    inactiveTab:
      'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-full px-3.5 py-1.5 text-xs font-medium',
  },

  layout: {
    containerMaxWidth: 'max-w-7xl mx-auto',
    pagePadding: 'px-4 sm:px-6 lg:px-8 py-6',
    cardGap: 'gap-4',
    cardGapLoose: 'gap-6',
    buttonRadius: 'rounded-xl',
    pillRadius: 'rounded-full',
    iconSizes: { badge: 'w-3.5 h-3.5', control: 'w-4 h-4', header: 'w-5 h-5' },
  },

  interaction: {
    focusRing: 'focus:ring-2 focus:ring-[#0089B3] focus:ring-offset-2',
    transition: 'transition-colors',
    rowHover: 'hover:bg-slate-50/80 transition-colors',
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;
export type StatusKey = keyof typeof DESIGN_TOKENS.status;

export default DESIGN_TOKENS;
