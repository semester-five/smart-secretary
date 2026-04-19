---
name: Coding Standards for Smart Secretary
description: Use this skill to understand the technical stack, architectural standards, and formatting rules of the project.
---

# Smart Secretary FE Coding Standards

Before writing any code or making architectural decisions for this project, you MUST reference these standards.

## 1. Technologies & Frameworks
- **Framework:** Next.js 15 (App Router). Utilize Server Components (`page.tsx`, `layout.tsx`) by default for better performance. Use `"use client"` directive only when necessary (e.g., handling state, effects, or browser APIs).
- **Language:** TypeScript. Use strict typing. Avoid `any` types.
- **Styling:** Tailwind CSS 4 (`@tailwindcss/postcss`). Use utility classes. Prevent writing custom CSS modules unless no other options exist.
- **UI Components:** Shadcn UI + Radix UI. Shared components reside in `src/components/ui`.
- **State Management:** Zustand (`src/stores/`) for global state. Local state via `useState`/`useReducer`.
- **Data Fetching:** TanStack React Query (`@tanstack/react-query`) with `axios`.
- **Forms:** React Hook Form with Zod validation schemas.

## 2. Formatting & Linting
- **Tool:** Biome (`biome.json`).
- **Rules:**
  - 2 spaces indentation.
  - Double quotes (`"`).
  - Maximum line width: 120 characters.
  - Semicolons used always.
  - Trailing commas used.
- Do not run Prettier or ESLint, they are replaced by Biome. Check code via `npm run format` and `npm run check:fix`.

## 3. Directory Structure
```text
src/
├── app/             # Next.js App Router (pages, layouts, route groups like (main), (external)).
├── components/      # Reusable React components.
│   └── ui/          # Shadcn UI primitives.
├── config/          # App-wide configurations, constants, environment settings.
├── data/            # Static data or data-fetching logic (Query options, API abstractions).
├── hooks/           # Custom React hooks.
├── lib/             # Utility functions, libs configs (e.g., Axios).
├── stores/          # Zustand store definitions.
└── styles/          # Global styles if any.
```

## 4. Coding Practices
- **Import Aliases:** Use `@/*` for absolute imports referring to `./src/*`.
- **File Naming:** Use `kebab-case.tsx` or `kebab-case.ts`.
- **Component Naming:** PascalCase for component names.
- **Component Definitions:** Use named exports (`export const MyComponent = ...`) for most components except for Next.js mandatory default exports (`page.tsx`, `layout.tsx`).
- **Icons:** Use `lucide-react` or custom icons from `simple-icons`.
