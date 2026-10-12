'use client';

import Tabs from '@mui/material/Tabs';
import { useMediaQuery, useTheme } from '@mui/material';
import type { SxProps, Theme, TabsProps } from '@mui/material';

/**
 * How the tabs share the screen on mobile (< 900px):
 *
 * - `wrap` (default): the tabs stop scrolling horizontally and instead flow
 *   onto as many lines as they need, each line spreading evenly across the
 *   screen. Labels are allowed to wrap. Use this for tab bars whose number
 *   of tabs is dynamic or large (locations, reports, …).
 * - `equal`: every tab shares one single line in equal fractions of the
 *   screen and the label wraps inside its fraction, icon stacked above the
 *   text. Use this for a small, fixed number of tabs where a segmented
 *   control look is wanted.
 *
 * On desktop (>= 900px) the component is a plain pass-through: the very same
 * `Tabs` the page already used renders, so nothing changes visually.
 */
export type ResponsiveTabsFit = 'wrap' | 'equal';

/** Mobile styles for `fit="wrap"`: chips that flow onto several lines. */
const mobileWrapSx: SxProps<Theme> = {
  // No horizontal scroll anywhere: the page must fit the viewport.
  overflowX: 'visible',
  '& .MuiTabs-flexContainer': {
    flexWrap: 'wrap',
    gap: 0.5,
    // Every tab grows to share the line it landed on.
    '& > .MuiTab-root': { flex: '1 1 auto', flexShrink: 1 },
  },
  '& .MuiTab-root': {
    minWidth: 96,
    maxWidth: '100%',
    minHeight: 40,
    px: 0.75,
    py: 0.75,
    fontSize: '0.8125rem',
    lineHeight: 1.2,
    whiteSpace: 'normal',
    textAlign: 'center',
  },
};

/** Mobile styles for `fit="equal"`: one line split into equal fractions. */
const mobileEqualSx: SxProps<Theme> = {
  overflowX: 'visible',
  '& .MuiTabs-flexContainer': {
    flexWrap: 'nowrap',
    gap: 0.5,
    '& > .MuiTab-root': { flex: '1 1 0', flexShrink: 1 },
  },
  '& .MuiTab-root': {
    // `flexBasis: 0` never wraps, so the line always fits: the tabs are
    // squeezed into equal thirds/quarters and the label wraps inside.
    minWidth: 0,
    maxWidth: 'none',
    minHeight: 56,
    flexDirection: 'column',
    justifyContent: 'center',
    px: 0.5,
    py: 0.75,
    fontSize: '0.8125rem',
    lineHeight: 1.15,
    whiteSpace: 'normal',
    textAlign: 'center',
    // The icon sits above the label so the text gets the whole width.
    '& .MuiTab-icon': { marginRight: 0, marginBottom: 0.5 },
  },
};

export interface ResponsiveTabsProps extends TabsProps {
  /** Mobile sharing strategy, see {@link ResponsiveTabsFit}. Defaults to `wrap`. */
  fit?: ResponsiveTabsFit;
}

/**
 * `MUI Tabs` that always fit the screen.
 *
 * Below the layout breakpoint (< 900px) it swaps the scrollable variant —
 * which pushes tabs off the right edge of the viewport — for a layout where
 * every tab is reachable without horizontal scrolling. Above it, the regular
 * scrollable tabs render exactly as before.
 */
export default function ResponsiveTabs({ fit = 'wrap', variant = 'scrollable', sx, ...rest }: ResponsiveTabsProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (!isMobile) {
    return <Tabs variant={variant} sx={sx} {...rest} />;
  }

  const mobileSx = fit === 'equal' ? mobileEqualSx : mobileWrapSx;
  // Caller `sx` first so the mobile fitting rules win on conflicts
  // (nowrap labels, minWidth, …) while colors and pill styling are kept.
  const mergedSx: SxProps<Theme> = [...(Array.isArray(sx) ? sx : sx ? [sx] : []), mobileSx];

  return <Tabs variant="standard" sx={mergedSx} {...rest} />;
}
