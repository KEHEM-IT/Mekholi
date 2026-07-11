# Madol — Setup Instructions

Vue 3 + Vite + TypeScript ERP frontend, with Vue Router, Pinia, and a SCSS design system.

## Prerequisites

- Node.js `^22.18.0` or `>=24.12.0`
- pnpm (this repo uses a `pnpm-workspace.yaml`)

If you don't have pnpm:
```bash
npm install -g pnpm
```

## 1. Install dependencies

```bash
cd "D:\Web\ERP\Madol"
pnpm install
```

This pulls in `vue`, `vue-router`, `pinia`, `sass`, and the existing Vite/TypeScript tooling.

## 2. Environment variables

Create a `.env` file in the project root:

```bash
VITE_API_BASE_URL=http://localhost:3000/api
```

Used by `src/services/http.ts` to prefix all API calls. Defaults to `/api` if unset.

## 3. Run the dev server

```bash
pnpm dev
```

Opens Vite's dev server (default `http://localhost:5173`). SCSS in `src/styles/main.scss` compiles on the fly — no separate build step needed during development.

## 4. Type-check, lint, build

```bash
pnpm type-check   # vue-tsc
pnpm lint         # oxlint + eslint, auto-fix
pnpm build        # type-check + production build to dist/
pnpm preview       # preview the production build locally
```

## 5. SCSS-only commands (optional)

Only needed if you want a standalone compiled CSS file outside of Vite (e.g. for sharing styles with a non-Vite consumer):

```bash
pnpm scss:build   # one-off compile → src/assets/styles/main.css
pnpm scss:watch   # recompiles on save
```

This output file is gitignored — it's generated, not hand-edited.

## Project structure

```
src/
├── pages/          Route-level views
├── layouts/        DefaultLayout (app shell), AuthLayout (login etc.)
├── router/         Route table + guards wiring
├── middleware/      Route guards: requireAuth, requireGuest, requireRole
├── stores/          Pinia stores (auth.ts)
├── composables/      useAuth, useFetch, useToast
├── services/         http.ts — fetch wrapper, injects Bearer token
├── components/
│   ├── layout/       AppHeader, AppSidebar, AppFooter
│   └── ui/           BaseButton, etc.
├── styles/           SCSS design system (7-1 architecture)
└── types/            Shared TypeScript types
```

## Auth flow

`src/stores/auth.ts` expects a backend with:
- `POST /auth/login` → `{ token, user }`
- `GET /auth/me` → `User`

Token is stored in `localStorage` under `madol_auth_token` and attached as `Authorization: Bearer <token>` on authenticated requests. Update `src/services/http.ts` / `src/stores/auth.ts` if your backend's auth contract differs.

## Adding a new page

1. Create `src/pages/YourView.vue`
2. Register it in `src/router/routes.ts` (add `beforeEnter: requireAuth` if it needs login)
3. Add a nav entry in `src/components/layout/AppSidebar.vue` if it should appear in the sidebar
