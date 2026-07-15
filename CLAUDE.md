# CLAUDE.md

## Project
Mekholi — a Vue 3 + TypeScript ERP frontend for educational institutions
in Bangladesh (Shikkha ERP). Full product spec lives in
`public/Shikkha_ERP_Blueprint.pdf` — it's large; only read specific
sections from it when a task needs that context, don't read it in full
by default.

## Stack
- Vue 3, Composition API, `<script setup>`
- TypeScript (strict, checked via `vue-tsc`)
- Vite 8, **pnpm** (not npm/yarn — see `pnpm-workspace.yaml`)
- Vue Router 4, Pinia 2 (setup-store style)
- SCSS, 7-1 architecture, single dark theme — no CSS/component framework
- Linting: oxlint (fast) + eslint, both run via `pnpm lint`

## Commands
- `pnpm dev` — start dev server (localhost:5173)
- `pnpm build` — type-check + production build
- `pnpm type-check` — vue-tsc only
- `pnpm lint` — oxlint + eslint, auto-fix
- `pnpm scss:build` / `pnpm scss:watch` — only for a standalone CSS
  output; Vite compiles SCSS live during normal dev, no need otherwise

## Architecture (src/)
- `pages/` — route-level views, PascalCase, suffix `View` (e.g.
  `DashboardView.vue`). Feature areas get subfolders, e.g.
  `pages/Institute_Setup/`
- `layouts/` — `DefaultLayout` (app shell: sidebar/header) and
  `AuthLayout` (login etc.)
- `router/` — `routes.ts` is the route table, `index.ts` wires the
  router. Guards attached via `beforeEnter`
- `middleware/` — nav guards: `requireAuth`, `requireGuest`,
  `requireRole(...roles)`
- `stores/` — Pinia, setup-store style (see `stores/auth.ts`)
- `composables/` — `useAuth`, `useFetch`, `useToast`, `useSidebar`,
  `useAppPreferences`, plus feature-scoped ones like
  `composables/Institute_Setup/useInstituteProfile.ts`
- `services/http.ts` — thin fetch wrapper: `get/post/put/delete`,
  auto-attaches Bearer token, pass `{ auth: false }` to skip
- `components/layout/` — `AppHeader`, `AppSidebar`, `AppFooter`
- `components/ui/` — generic reusable pieces (`BaseButton`, etc.)
- `styles/` — SCSS 7-1 (`abstracts/base/components/layout/pages/themes`);
  design tokens in `styles/abstracts/_variables.scss`
- `types/index.ts` — shared TS types
- `utils/constants.ts` — app-wide constants (roles, localStorage keys,
  option lists)

## Conventions
- Path alias `@` → `src/`
- Roles: `super_admin`, `institute_admin`, `teacher`, `accountant`,
  `student_parent_portal` — defined in `utils/constants.ts`
  (`ROLES`/`ROLE_LABELS`)
- Auth: token stored in `localStorage` under `mekholi_auth_token`,
  Bearer header auto-attached by `services/http.ts`. Dev-only fake
  login (`loginAsDev`, `assets/auth/dev_users.json`) exists for
  previewing roles without a backend — never wire this into real
  auth flows
- Bilingual EN/BN throughout: most user-facing option lists carry both
  `label` and `label_bn` (see `INSTITUTION_TYPES`, `EDUCATION_BOARDS`,
  `ACCENT_THEMES` in `utils/constants.ts`) — follow this pattern for
  any new option list
- API base URL from `VITE_API_BASE_URL` env var, defaults to `/api`

## Adding a new page
1. Create `src/pages/XView.vue`
2. Add it to `src/router/routes.ts` (`beforeEnter: requireAuth` if it
   needs login, `requireRole(...)` if role-gated)
3. Add a nav entry in `src/components/layout/AppSidebar.vue` if it
   should appear in the sidebar

## Do NOT
- Add a UI/component framework (Vuetify, Element, etc.) — this project
  uses a hand-rolled SCSS design system
- Use npm or yarn — pnpm only
- Add a light theme — dark theme only, no theme-switching
- Call `fetch` directly for API requests — go through `services/http.ts`
  so token handling stays centralized
