import { createTheme } from '@mui/material/styles';
import { colors, radii, shadows, typography } from './tokens';

/**
 * Tema MUI do SIETIMA — todos os valores vêm de `tokens.ts`.
 * Páginas podem precisar de cor fora do tema: usam `colors.*` (mesmo token),
 * nunca um hex literal.
 */
export const theme = createTheme({
  palette: {
    primary: {
      main: colors.brand.navy,
      dark: colors.brand.navyDark,
      light: colors.brand.navyLight,
      contrastText: colors.common.white,
    },
    secondary: {
      main: colors.brand.emerald,
      dark: colors.brand.emeraldDark,
      light: colors.brand.emeraldLight,
      contrastText: colors.common.white,
    },
    error: {
      main: colors.status.dangerStrong,
      dark: colors.status.dangerDeep,
      contrastText: colors.common.white,
    },
    success: { main: colors.status.success },
    warning: { main: colors.status.warning },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
    },
    background: {
      default: colors.surface.page,
      paper: colors.common.white,
    },
    divider: colors.border.divider,
  },
  shape: {
    borderRadius: radii.md,
  },
  typography: {
    fontFamily: typography.fontFamily,
  },
  components: {
    // Botões: sem maiúsculas, canto md, peso SemiBold (slogan da identidade).
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: radii.md,
          fontWeight: typography.weights.semibold,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radii.lg,
          boxShadow: shadows.card,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: radii.lg },
      },
    },
    // Campo de texto acompanha o canto dos botões (outline herda o raio).
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: radii.md },
        notchedOutline: { borderRadius: radii.md },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: typography.weights.semibold },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: typography.weights.bold,
          color: colors.text.primary,
        },
      },
    },
  },
});
