# SBTC.Cool Brand & Theme Guide

## Core Themes
- **Default mode:** Dark. Background `#020617` gradient overlays with neon accents (sky, emerald, violet). All pages should honour the Next Themes `resolvedTheme` toggle; fall back to dark when the theme is unknown.
- **Light mode:** Background `#f8fafc` with softened gradients. Replace `border-white/10` and `text-white/*` styles with slate/emerald counterparts. Prefer `shadow-xl` over translucent blurs in light mode for depth.

## Palette
| Token | Dark | Light | Notes |
|-------|------|-------|-------|
| Background canvas | `bg-slate-950` | `bg-slate-50` | Applied to `<body>` wrapper. |
| Surface card | `bg-slate-900/80` | `bg-white` | Rounded 24–28 px corners, subtle glow in dark, drop shadow in light. |
| Sub-surface | `bg-white/5` | `bg-slate-50` | Use for secondary groupings and list rows. |
| Accent gradient | `from-sky-500 via-emerald-500 to-purple-500` | `from-sky-300 via-emerald-300 to-purple-200` | CTAs, active tabs. |
| Brand text | `text-white` / `text-slate-300` | `text-slate-900` / `text-slate-600` | Paired for headings/body copy. |
| Success | `emerald-500` family | `emerald-500` on pastel backgrounds | Automation stats, destination chips. |
| Warning/Error | `amber-500`, `red-500` | same hues, more opaque background | Alerts, validation. |

## Typography & Spacing
- Use `text-4xl/5xl` bold for hero headings, `text-xl` for section titles, and `text-sm` for body copy.
- Uppercase micro labels (`text-xs`, `tracking-wide`) should adopt the muted palette for readability.
- Maintain 24–32px spacing inside cards; 16px for nested list items.

## Components
- **Theme toggle:** Place at the top-right of the primary layout. Label with emoji (`☀️/🌙`) and copy describing the target mode.
- **Status tabs:** Rounded-full container; apply gradient fill to the active tab, slate background in light mode, translucent white in dark mode.
- **Summary cards:** Pair icon + title row with gradient fill that hints at asset colour (orange for STX, blue for sBTC). Text must adapt to theme (e.g., `text-orange-700` vs `text-orange-600`).
- **Automation destinations:** In dark mode, keep translucent emerald overlay; in light mode switch to pastel backgrounds (`bg-emerald-50`) with darker text for contrast.
- **Trading portfolio lists:** Use shared helpers to switch between `border-white/10` and `border-slate-200` depending on theme; avoid raw `text-[var(--text-secondary)]` unless the CSS variable is theme-aware.

## Interaction Cues
- Primary buttons: gradient or solid brand fill, white text in both themes.
- Secondary buttons: border only, inherit theme-aware text colour. Hover states lighten fill (`bg-white/20` dark, `bg-slate-100` light).
- Inputs: 8px rounded, border token `border-[var(--border-subtle)]` dark, `border-slate-200` light, with `focus:ring` accent.

## Implementation Notes
- Always derive `isDarkMode` using `resolvedTheme ?? (theme === "system" ? systemTheme : theme)`. Default to dark when undefined.
- Centralise theme-dependent class helpers per component to avoid scattered ternaries.
- When introducing new surfaces, define paired dark/light class strings first, then reference them in JSX.
- Prefer Tailwind utilities over inline hex where possible to keep parity with existing tokens.

## Assets & Iconography
- Emoji icons are acceptable for prototype velocity; swap to vector when branding assets are ready.
- Maintain consistent stroke/weight when replacing with SVG; align colours with palette table.

## Layout Patterns
- 6xl content max-width with generous padding (`py-16`, `px-6` mobile, `px-10` desktop).
- Cards organized in vertical stacks (`gap-6`/`gap-8`) with responsive grids stepping to two columns at `sm`/`md` breakpoints.
