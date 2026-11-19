# Design system — SIETIMA

Referência de UI do `restaurante-ui`: cores, tipografia, formas, componentes e
logo. Valores vivem no código (`lib/design-system/`), este documento vive nas
**regras** — quem mexe em UI lê os dois.

## Fonte única

| Arquivo | Conteúdo |
| --- | --- |
| `lib/design-system/tokens.ts` | `colors`, `typography`, `radii`, `shadows` — todos os valores, comentados |
| `lib/design-system/theme.ts` | `theme` do MUI: paleta + overrides de componente |
| `lib/design-system/index.ts` | `import { colors, theme } from '@/lib/design-system'` |

Regra de ouro: **componente nenhum declara hex**. Cor entra como token
(`colors.status.danger`), nunca como literal. Exceção: `app/globals.css`
(regras de impressão, CSS puro não importa TS) e comentários.

## Cores

`colors` está agrupado por **intenção**, não por matiz — escolha o grupo pelo
que a cor faz, não pelo que ela é:

| Grupo | Quando usar |
| --- | --- |
| `brand` | Azul Petróleo (`navy` + derivados `navyDark/navyLight/navyHover/navyTint/navyBorder`) e Verde Esmeralda (`emerald*`). Primário, botões, links, fundo da barra lateral, chip ativo |
| `onNavy` | texto sobre superfície `navy` (barra lateral, AppBar, login) |
| `text` | `primary` = Cinza Escuro de Texto do manual; `secondary` para apoio |
| `gray` | rampa neutra de texto/ícone (`gray[900]` … `gray[200]`, quanto maior mais escuro) |
| `surface` | fundos de página/painel (`page`, `sunken`, `subtle`, `hover`, `row`, `muted`) |
| `border` | bordas e divisores (`default`, `subtle`, `hairline`, `input`, `strong`, `divider`) |
| `status` | estados semânticos — **sempre em par** tint + forte |
| `movement` / `storage` / `info` | cores de domínio: chip de movimentação, condição de armazenamento, aviso informativo |

### Estado semântico em par

Alerta, chip de status e botão destrutivos usam sempre o par da mesma
família — fundo claro + cor forte, nunca misturar famílias:

| Estado | cor | fundo |
| --- | --- | --- |
| sucesso | `status.success` | `status.successTint` |
| atenção | `status.warning` | `status.warningTint` (chips) ou `status.warningBg` (painéis) |
| perigo | `status.danger` (texto/borda) · `status.dangerStrong` (sólido/ícone) | `status.dangerTint` · `status.dangerBg` |
| neutro | `status.neutral` | `status.neutralTint` |

Bordas de alerta: `status.dangerBorder` / `status.warningBorder`.

## Tipografia

Montserrat é a única fonte (`app/layout.tsx` carrega 400–800 e expõe
`--font-montserrat`; o tema MUI aponta `typography.fontFamily` para ela).

- Logotipo: Montserrat Bold/ExtraBold (já convertido em paths no SVG).
- Slogan: Montserrat SemiBold — renderizado como **HTML**, não dentro do SVG
  (`fontWeight: typography.weights.semibold`, caixa alta, tracking aberto).
- Pesos disponíveis em `typography.weights`: `regular | medium | semibold | bold | extrabold`.
- Títulos de tabela e cabeçalhos: `bold`; rótulos e botões: `semibold`.

## Formas e elevação

`radii`: `sm 8` (chips/pills) · `md 12` (botões, campos) · `lg 16` (cards,
diálogos) · `pill 999`. `shadows`: `card` (descanso), `raised` (destaque).

O tema já aplica: `shape.borderRadius = md`, Card/Dialog `lg`, botão e campo
`md`, AppBar sem gradiente, cabeçalho de tabela em `bold` + `text.primary`.
Novo componente começa com esses valores; arredondamento diferente precisa de
motivo visível.

## Componentes

- **Button**: `contained` = `primary` (navy); `outlined`/`text` herdam o navy.
  Ação destrutiva usa `color="error"` (vermelho do MUI = `status.dangerStrong`).
- **Chip de status**: par `status.*` acima, `fontWeight: semibold`.
- **Card**: branco, raio `lg`, sombra `card`.
- **TextField**: raio `md`, altura de toque 44px quando é campo principal.
- **Tabela**: `ResponsiveTable` já normaliza cabeçalho, bordas
  (`border.subtle`) e linhas vazias ("Nenhum registro encontrado").
- **Alert/Snackbar**: `severity` do MUI já mapeia para a paleta (error/warning/
  success vêm do tema).

## Logo

Assets em `public/`, extraídos do manual de identidade (nenhum é recolorido à
mão):

| Arquivo | Uso |
| --- | --- |
| `logo-sietima.svg` | logotipo completo sobre fundo claro |
| `logo-sietima-light.svg` | completo sobre fundo navy (barra lateral, AppBar, login) |
| `logo-sietima-wordmark.svg` / `logo-sietima-wordmark-light.svg` | só o "SIETIMA" |
| `logo-sietima-symbol.svg` | só o símbolo |
| `app/icon.svg` + `public/icon.svg` | favicon (símbolo branco+verde em navy) |

Slogan "GESTÃO PRECISA DO ESTOQUE AO PRATO" fica **fora** do SVG: é texto
HTML em Montserrat SemiBold abaixo do logo. Fundo escuro → variante `*-light`;
fundo claro → variante normal. Nunca aplicar filtro/brilho/rotação.

## Exceções

- `app/globals.css`: literais de cor só nas regras de impressão (`#fff`).
- Dados de impressão/etiqueta (`lib/printService.ts`, `LabelPreview`) usam
  tokens normalmente — o HTML gerado recebe `${colors.*}`.

## Para adicionar

1. Cor nova → adiciona o token em `tokens.ts` com comentário de uso e consome
   de lá; valores repetidos com matiz diferente devem virar **um** token.
2. Componente novo → começa nos defaults do tema; override local só quando o
   padrão não serve, e o motivo fica no `sx` comentário.
3. `npm run lint && npm test -- --run && npm run build` antes de fechar.
