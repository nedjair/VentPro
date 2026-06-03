# DESIGN.md

Design system for the **VentesPro / Gestion Commerciale TPE** frontend
(`apps/frontend`). Read this before creating or reviewing any UI work. Code
references use `path:line` so you can jump straight to the source of truth.

## Identity

- **Product name:** "VentesPro" (sidebar logo + header) over the more generic
  "Gestion Commerciale TPE" metadata. The "premium PME/TPE" angle is
  intentional: rounded everything, soft layered shadows, one warm gold accent
  on a cool blue-slate palette.
- **Tone:** French UI strings, calm/neutral by default, accent reserved for
  emphasis (badges, "secondary" tone, hover rings).
- **Themes:** light + dark via the `.dark` class on `<html>`
  (`tailwind.config.ts:9`). `ThemeProvider` in `app/layout.tsx:4` toggles it.
  Both modes share the same hue families — never introduce a brand-new color,
  only add a CSS variable in `app/globals.css` and a matching Tailwind token.

## Color tokens

All semantic colors come from CSS variables defined in
`app/globals.css:6-66` and consumed in `tailwind.config.ts:12-57`. The
two `--color-*` "raw" values follow the same identity in both themes:

| Token            | Light RGB        | Dark RGB         | Usage |
|------------------|------------------|------------------|-------|
| `--color-background` | 247 248 252 | 9 18 34     | Page background |
| `--color-foreground` | 19 33 54    | 235 240 248 | Body text |
| `--color-card`       | 255 255 255 | 14 28 49    | Surfaces |
| `--color-card-foreground` | 19 33 54 | 235 240 248 | Card text |
| `--color-primary`    | 41 83 138  | 91 128 190   | Brand action / link |
| `--color-primary-foreground` | 255 255 255 | 255 255 255 | On-primary text |
| `--color-secondary`  | 239 243 250 | 18 35 59    | Subtle fills |
| `--color-muted`      | 232 237 246 | 22 40 67    | Chips, neutral fills |
| `--color-muted-foreground` | 112 125 151 | 145 162 190 | Secondary text |
| `--color-accent`     | 241 244 250 | 19 37 61    | Hover surface |
| `--color-destructive` | 239 68 68  | 239 68 68   | Danger (red-500 in both) |
| `--color-border`     | 224 229 239 | 30 51 82   | Hairline borders |
| `--color-input`      | 223 229 240 | 35 57 91   | Form field borders |
| `--color-ring`       | 41 83 138  | 91 128 190  | Focus ring |
| `--color-gold`       | 198 168 106 | 212 184 118 | Accent (badges, hover rings) |
| `--color-gold-soft`  | 247 241 225 | 61 50 21    | Accent surface |

Special sidebar palette (light/dark variants of `#0C1F3B` family):
`--color-sidebar`, `--color-sidebar-foreground`, `--color-sidebar-border`,
`--color-nav-item`, `--color-nav-item-hover`, `--color-nav-item-active`.
The sidebar is always dark navy even in light mode.

Tailwind also exposes a `primary.50..950` hard-coded blue scale
(`tailwind.config.ts:21-31`) for non-token needs (charts, data viz).

## Typography

Two Google fonts loaded in `app/layout.tsx:2-19` and exposed as CSS variables:

- `--font-display` = **Outfit** — headings, page titles, the brand mark.
  Tracking tightened to `-0.02em` (`globals.css:89`).
- `--font-body` = **DM Sans** — body, UI, table content. Antialiasing on
  (`globals.css:97-98`).

Never load other weights/families. Don't set Tailwind's `font-sans` (which
points to Inter) directly — it is overridden by the body class in `layout.tsx`.

## Shape, depth, motion

- **Border radius:** cards `28px`, buttons `2xl` (16px), inputs `xl` (12px),
  sidebar/logo block `24px`, brand badge `18px`. See `card.tsx:11`,
  `button.tsx:23`, `input.tsx:18`, `sidebar-premium.tsx:56-59`.
- **Shadows:** prefer the project palette
  (`rgba(19,33,54,…)` for soft, `rgba(41,83,138,…)` for elevation on primary,
  `rgba(239,68,68,…)` for danger). Reusable utility classes
  `.shadow-soft` and `.shadow-soft-lg` live in `globals.css:230-236`; Tailwind
  also defines `shadow-soft` and `shadow-medium` (`tailwind.config.ts:75-78`).
  Pick the one closest in weight rather than inventing new drop shadows.
- **Body backdrop:** subtle radial gradient `rgba(41,83,138,0.05)` from the
  top (`globals.css:99`). Keep this; new pages should not paint their own
  backgrounds.
- **Selection:** tinted with the primary at 18% alpha (`globals.css:102-105`).
- **Animations:** keep them short and shared.
  - Tailwind utilities: `animate-fade-in`, `animate-slide-in`
    (`tailwind.config.ts:61-74`).
  - Reusable classes: `.animate-premium-in` (fade-up 0.55s, `globals.css:238`)
    with `.stagger-1..6` delay helpers, `.animate-premium-glow` (pulsing
    primary shadow, `globals.css:215-223`).
  - Stagger via `stagger-N` on children of any `animate-premium-in` list.

## Tailwind setup

- Source globs (`tailwind.config.ts:5-7`):
  `./src/pages/**`, `./src/components/**`, `./src/app/**`. The `src/pages/**`
  glob is currently dead (App Router only) — leave it alone unless you also
  remove Pages Router.
- PostCSS: only Tailwind is wired (`postcss.config.mjs`). No autoprefixer
  plugin is needed; Next handles it.
- Path aliases (`tsconfig.json:23-30`): use `@/components/...`, `@/lib/...`,
  `@/hooks/...`, `@/stores/...`, `@/types/...`, `@/utils/...`.
- `cn()` helper for class composition: `@/lib/utils` (used by every UI
  primitive — follow this pattern).

## UI primitives

Lives in `apps/frontend/src/components/ui/`. **Compose from these — do not
rebuild them.** New primitives should follow the same shape: `forwardRef`,
`cn()` merge, accept a `className` override, expose `variant`/`size` enums.

| Component | File | Variants / sizes |
|-----------|------|------------------|
| `Button` | `button.tsx` | variants: `primary`, `secondary`, `danger`, `warning`, `success`, `ghost`, `outline`, `link` (+ `default`→`primary`, `destructive`→`danger` aliases). sizes: `sm`/`md`/`lg`. Extras: `loading` (Loader2 spinner), `fullWidth`. |
| `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`) | `card.tsx` | Single rounded-[28px] surface, no variants. |
| `Input` | `input.tsx` | Single style, `h-11`, focus ring `primary/5` + border `primary/15`. |
| `Badge` | `badge.tsx` | `default` (primary fill), `secondary` (gold), `destructive`, `warning`, `success`, `outline`. |
| `Label` | `label.tsx` | Form label. |
| `Select` | `select.tsx` | Styled native select. |
| `Textarea` | `textarea.tsx` | Same field shape as Input. |
| `Tabs` | `tabs.tsx` | Tabbed UI. |
| `Toast` (`ToastProvider`) | `toast.tsx` | App-wide notification system, mounted in `layout.tsx:43`. |
| `ListPagination` | `list-pagination.tsx` | Table pagination. |

Domain primitives: `category-display.tsx`, `import-export-buttons.tsx`,
`product-identifiers.tsx` — keep the file structure if you add a similar
feature.

Domain leftovers to ignore (do not extend): `_codex_write_test.tmp`,
`import-export-buttons.tsx.locktest` are stray test artifacts.

## Reusable utility classes (from `globals.css`)

Reach for these before writing inline Tailwind for the same effect:

- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-danger`
  (`globals.css:114-142`).
- Form: `.input-field` (`globals.css:145-154`).
- Surfaces: `.card`, `.card-hover` (`globals.css:157-166`).
- Sidebar nav: `.nav-item`, `.nav-item.active` (`globals.css:169-188`).
- Scrollbar: `.premium-scrollbar` (rounded 10px, semi-transparent thumb).
- Accents: `.text-gold`, `.bg-gold-soft` (`globals.css:253-259`).
- Animation: `.animate-premium-in` + `.stagger-1..6`,
  `.animate-premium-glow`, `.text-balance`.

## Layout & app shell

- `app/layout.tsx:32-49` wires providers in this order: `ChunkErrorBoundary`
  → `ThemeProvider` → `AuthProvider` → `QueryProvider` (TanStack Query) → page
  content → `ToastProvider`. Keep this order; theming must wrap auth.
- `components/layout/` ships three sidebars (`sidebar.tsx`,
  `sidebar-simple.tsx`, `sidebar-premium.tsx`); the live one is
  `SidebarPremium`. It is dark navy (`#0C1F3B`) regardless of theme, has a
  gradient brand badge (`from-[#3E76C8] to-[#173764]`), and collapses to
  `w-24` (state persisted in `localStorage` under `gc-premium-sidebar-collapsed`).
- `components/layout/header.tsx` shows notifications (panel `z-index: 9999`),
  search, shield icon, user initials. Title/subtitle/`actions` slot pattern.
- `MainLayout` (`layout/main-layout.tsx`) is the standard page frame: sidebar
  + header + scrollable content. Default pages should not introduce their own
  shell.

## Page patterns

- `app/<feature>/page.tsx` thin RSC entry that imports a `Page` from
  `components/pages/<feature>/` (e.g. `app/login/page.tsx:2` imports from
  `@/components/pages/login`). Follow this split — keep `page.tsx` for
  metadata + provider glue, do the work in `components/pages`.
- Background-of-page concerns: rely on the body radial gradient; do not
  paint full-bleed colored sections.
- Cards group content; the page is usually a stacked column of `Card`s
  separated by `space-y-6` or similar.
- Modals/dialogs: portal to `document.body` at high z-index (mirroring
  notifications `9999`); for new modals, use the same range.
- `apps/frontend/src/app/` contains many `test-*` route folders — these are
  scratch dev routes, not product surfaces. Do not import from them.

## Iconography

- Library: **lucide-react** (already a dep, used in `sidebar-premium.tsx:7`,
  `header.tsx:5`, `button.tsx:3`).
- Stroke style is consistent; standard size `h-4 w-4` for inline icons,
  `h-5 w-5` in nav, `h-12 w-12` for the brand badge.
- Use icons from this set only. Adding a new icon family needs a design
  review (line weight, optical size must match lucide).

## Accessibility & responsiveness

- Color contrast: light text on primary is white; primary is darkened in dark
  mode (`91 128 190`) so it stays AA on the dark `card` background.
  Verify any new accent color reaches AA before merging.
- Focus states: inputs use `focus-visible:ring-4 focus-visible:ring-primary/5`
  with `border-primary/15` (`input.tsx:18`). Reuse the same focus style on
  new form controls.
- Layout: `min-h-screen` on body, `overflow-x-hidden` is set globally
  (`globals.css:76-80`) — avoid horizontal scroll at all costs; if a table
  needs to overflow, wrap it and let only the table scroll.
- HTML lang is `fr` (`layout.tsx:32`).
- `suppressHydrationWarning` is on `<html>` because the theme class is set
  pre-hydration. Do not remove this without an alternative no-flash strategy.

## Auth & role visibility

- `useAuth` from `@/stores/auth` exposes `user` with `role ∈ ADMIN | MANAGER | EMPLOYEE`.
- `SidebarPremium` filters admin-only items (`Paramètres`) via
  `canAccess(item, user?.role)` (`sidebar-premium.tsx:34`). Mirror this
  pattern in any new gated UI.

## When adding a new token or primitive

1. Add the CSS variable to both `:root` and `.dark` in `globals.css` (use the
   `R G B` triplet format so Tailwind can wrap it in `rgb(var(...) / <alpha>)`).
2. Map it in `tailwind.config.ts` if it should be a Tailwind utility.
3. If it is a component, place it in `components/ui/`, use `forwardRef`,
   `cn()`, and accept a `className` override.
4. Verify both themes (toggle theme in the header) before committing.
