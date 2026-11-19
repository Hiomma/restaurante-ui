
## Agent skills

### Issue tracker

Issues live in GitHub Issues at Hiomma/restaurante-ui. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

### Design system

Visual identity + component standards: `docs/design-system.md`. Reach it before any UI work — colors, typography, logo, buttons/cards/chips/tables, new screen. Code side: `lib/design-system/` (`tokens.ts` values, `theme.ts` MUI theme).

Applied app-wide: Montserrat + SIETIMA palette in the theme, logo assets in `public/` (sidebar, AppBar, login, favicon), every color consumed as `colors.*` — hex literals live only in `tokens.ts` (plus `globals.css` print rules).
