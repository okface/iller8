# iller8 — Serbian Language Learning App

## Project Overview
A personal Serbian language learning SPA. Teaches practical, modern Serbian through interactive exercises with spaced repetition. Built for deployment on GitHub Pages.

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Type-check + production build
- `npx tsc --noEmit` — Type-check only
- Build output goes to `dist/`

## Tech Stack
- Vite + React 18 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- React Router v6 (HashRouter for GitHub Pages)
- localStorage for all state persistence
- No backend

## Architecture
- `src/data/lessons/*.json` — Lesson content (Serbian phrases with Latin + Cyrillic + English)
- `src/engine/` — SRS algorithm, exercise generation, script conversion, answer scoring
- `src/store/` — TypeScript types and localStorage persistence
- `src/components/exercises/` — One component per exercise type
- `src/pages/` — Route-level page components
- `src/lib/` — Claude API client, utilities

## Key Patterns
- All lesson content is in JSON data files, separate from code
- Script toggle (Latin/Cyrillic) is a global setting passed via props
- Progress state lives in a single `UserProgress` object persisted to localStorage
- Exercise components share a common `onAnswer(correct: boolean)` callback pattern
- SRS uses bucket-based progression (0-5) with time decay

## Adding New Lessons
1. Create a JSON file in `src/data/lessons/` following the existing format
2. Import it in `src/data/lessons/index.ts` and add to the `lessons` array
3. Each phrase needs `id`, `sr_latin`, `sr_cyrillic`, `en`, and `context`
