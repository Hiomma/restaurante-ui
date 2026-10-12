/**
 * Regression tests for the tab bars that used to overflow the mobile screen.
 *
 * `ResponsiveTabs` renders the regular MUI scrollable tabs on desktop and,
 * below the layout breakpoint (< 900px), switches to a layout where every
 * tab is reachable without horizontal scrolling: the scrollable scroller is
 * gone and the tabs flow onto as many lines as they need (`fit="wrap"`) or
 * share one line in equal fractions (`fit="equal"`).
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ResponsiveTabs from './ResponsiveTabs';
import Tab from '@mui/material/Tab';

const originalMatchMedia = window.matchMedia;

function useViewport(mobile: boolean) {
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: mobile && query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    cleanup();
  });
}

/** All CSS rules of the rendered component (matched via the emotion class of its root). */
function componentCss(): string {
  const root = document.querySelector('.MuiTabs-root');
  const cssClasses = Array.from(root?.classList ?? []).filter((c) => c.startsWith('css-'));
  let out = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (cssClasses.some((c) => rule.cssText.includes(`.${c}`))) out += `${rule.cssText}\n`;
      }
    } catch {
      // cross-origin sheet, nothing to read
    }
  }
  return out;
}

const tabs = (
  <>
    <Tab label="Movimentar Etiqueta" />
    <Tab label="Contagem" />
    <Tab label="Destinos" />
  </>
);

describe('ResponsiveTabs (desktop)', () => {
  useViewport(false);

  it('keeps the regular horizontally scrollable tabs', () => {
    render(
      <ResponsiveTabs value={0} onChange={() => {}}>
        {tabs}
      </ResponsiveTabs>,
    );

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    // The scroller is horizontally scrollable only on desktop...
    expect(document.querySelector('.MuiTabs-scrollableX')).toBeTruthy();
    // ...and no wrapping rules are injected.
    expect(componentCss()).not.toMatch(/flex-wrap:\s*wrap/);
  });
});

describe('ResponsiveTabs (mobile, <900px)', () => {
  useViewport(true);

  it('removes the horizontal scroll without dropping any tab', () => {
    render(
      <ResponsiveTabs value={0} onChange={() => {}}>
        {tabs}
      </ResponsiveTabs>,
    );

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('Movimentar Etiqueta')).toBeTruthy();
    expect(screen.getByText('Contagem')).toBeTruthy();
    expect(screen.getByText('Destinos')).toBeTruthy();

    // No scrollable scroller and no scroll buttons: nothing can go off-screen.
    expect(document.querySelector('.MuiTabs-scrollableX')).toBeNull();
    expect(document.querySelector('.MuiTabs-hideScrollbar')).toBeNull();
    expect(document.querySelector('.MuiTabs-scrollButtons')).toBeNull();
  });

  it('wraps the tabs onto as many lines as they need (fit="wrap")', () => {
    render(
      <ResponsiveTabs fit="wrap" value={0} onChange={() => {}}>
        {tabs}
      </ResponsiveTabs>,
    );

    const css = componentCss();
    expect(css).toMatch(/flex-wrap:\s*wrap/);
    // Each tab grows to share its line instead of keeping its content width.
    expect(css).toMatch(/flex:\s*1 1 auto/);
  });

  it('splits one line into equal fractions (fit="equal")', () => {
    render(
      <ResponsiveTabs fit="equal" value={0} onChange={() => {}}>
        {tabs}
      </ResponsiveTabs>,
    );

    const css = componentCss();
    // One single line whose tabs grow from a zero basis: equal widths, so
    // "Movimentar Etiqueta" can never take half of the screen again.
    expect(css).toMatch(/flex-wrap:\s*nowrap/);
    expect(css).toMatch(/flex:\s*1 1 0/);
    expect(css).not.toMatch(/flex-wrap:\s*wrap/);
  });
});
