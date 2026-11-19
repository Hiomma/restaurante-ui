/**
 * Design tokens — fonte única de valores visuais do SIETIMA.
 *
 * Origem: Manual de Identidade Visual SIETIMA (logo, paleta, tipografia).
 * Componentes importam `colors` de `@/lib/design-system`; hex nunca entra
 * em JSX/sx. Referência: `docs/design-system.md`.
 */

export const colors = {
  /** Branco/preto puros (fundo, texto invertido, contraforma do logo). */
  common: {
    white: '#FFFFFF',
    black: '#000000',
  },

  /**
   * Identidade SIETIMA.
   * `navy` = Azul Petróleo Escuro (primário) · `emerald` = Verde Esmeralda
   * (acento/estado ativo).
   */
  brand: {
    navy: '#0B253A',
    navyDark: '#071A2B',
    navyLight: '#1E4266',
    navyHover: '#13364F',
    navyTint: '#E7EEF4',
    navyBorder: '#A3B8CB',
    emerald: '#00A86B',
    emeraldDark: '#008756',
    emeraldLight: '#33C48F',
  },

  /** Conteúdo sobre superfícies Azul Petróleo (barra lateral, AppBar, login). */
  onNavy: {
    text: '#A9BDCB',
    muted: '#8FA8BD',
    faint: '#7C93A8',
  },

  /** Rampa neutra para texto/ícones (quanto maior, mais escuro). */
  gray: {
    900: '#212529',
    800: '#333333',
    700: '#444444',
    600: '#555555',
    500: '#666666',
    400: '#888888',
    300: '#999999',
    250: '#CCCCCC',
    200: '#DDDDDD',
  },

  /** Cinza Escuro de Texto (manual) e texto secundário. */
  text: {
    primary: '#1A2634',
    secondary: '#5B6672',
  },

  /** Fundos de página/painel. */
  surface: {
    page: '#F7F9FA',
    sunken: '#F5F7FA',
    subtle: '#F8F9FA',
    hover: '#F9FAFB',
    row: '#FAFAFA',
    muted: '#F5F5F5',
  },

  /** Bordas e divisores. */
  border: {
    default: '#E0E0E0',
    subtle: '#E8ECF1',
    hairline: '#F0F0F0',
    input: '#CED4DA',
    strong: '#BDBDBD',
    divider: '#E3E8EC',
  },

  /**
   * Estados semânticos: sempre em par (fundo tint + cor forte).
   * Alertas, chips de status e botões destrutivos usam estes pares.
   */
  status: {
    success: '#2E7D32',
    successTint: '#E8F5E9',
    warning: '#E65100',
    warningTint: '#FFF3E0',
    warningBg: '#FFF8E1',
    warningBorder: '#FFCC80',
    danger: '#C62828',
    dangerStrong: '#D32F2F',
    dangerDeep: '#B71C1C',
    dangerTint: '#FFEBEE',
    dangerBg: '#FFF5F5',
    dangerHover: '#FBE4E4',
    dangerBorder: '#F0C0C0',
    neutral: '#495057',
    neutralTint: '#F1F3F5',
  },

  /** Chip de movimentação "Porcionamento" (único tom fora da paleta). */
  movement: {
    portioning: '#5E35B1',
    portioningTint: '#EDE7F6',
  },

  /** Condição de armazenamento do produto (chip de cadastro). */
  storage: {
    chilled: '#00897B',
    chilledTint: '#E0F2F1',
    ambient: '#F9A825',
    ambientTint: '#FFFDE7',
    chamber: '#5C6BC0',
    chamberTint: '#E8EAF6',
  },

  /** Aviso informativo (painéis de dica). */
  info: {
    tint: '#E8F4FD',
    border: '#B3DDF2',
  },
};

/** Montserrat: fonte única da aplicação (ver `app/layout.tsx`). */
export const typography = {
  fontFamily: 'var(--font-montserrat), system-ui, sans-serif',
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
} as const;

/** Escala de cantos arredondados. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Elevação discreta sobre fundo claro (tinta Azul Petróleo). */
export const shadows = {
  card: '0 1px 3px rgba(11, 37, 58, 0.06)',
  raised: '0 4px 12px rgba(11, 37, 58, 0.10)',
} as const;
