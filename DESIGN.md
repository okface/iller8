# iller8 — Visual Design Instructions for Claude Design

This document describes the visual design direction for the iller8 Serbian language learning app. Use it as a reference when enhancing the app's visual design, creating mockups, or iterating on the UI.

## App Overview

iller8 is a personal Serbian language learning app (like Duolingo but for adults). It's a React SPA with Tailwind CSS, dark mode by default. The user learns practical Serbian phrases through interactive exercises.

## Aesthetic Direction

- **Tone**: Modern, clean, warm. Sophisticated but approachable. NOT childish or cartoon-like.
- **Target audience**: Adults (20-30s) learning Serbian for personal relationships.
- **Feel**: Like a well-designed productivity app that happens to teach languages. Think: Linear meets Duolingo's engagement model.

## Color Palette

### Primary (already implemented in Tailwind config)
- **Base**: Deep navy/slate (`navy-950: #070813` through `navy-50: #f0f1f8`)
- **Accent**: Warm amber/gold (`amber-500: #ffc107`) — inspired by Serbian flag colors, muted and modern
- **Success**: `#22c55e` (green for correct answers)
- **Error**: `#ef4444` (red for incorrect answers)

### Extended Palette Suggestions
- Soft warm white for light mode text on dark: `#f0f1f8`
- Muted blue-gray for secondary text: `#9ca3af`
- Deep amber for hover states: `#ff8f00`
- Subtle purple accent for achievements: `#a78bfa`

## Typography

- **UI text**: System font stack (`system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`)
- **Serbian text display**: Consider a slightly more expressive font for Serbian phrases shown during exercises (serif or a distinctive sans-serif). The Serbian text should feel "special" compared to UI chrome.
- **Size hierarchy**:
  - Exercise prompts: `text-2xl` (24px), bold
  - Headings: `text-lg` to `text-2xl`
  - Body: `text-sm` (14px)
  - Captions: `text-xs` (12px)

## Layout

- **Mobile-first**: Single column, max-width ~640px centered on desktop
- **Bottom navigation**: 4 tabs (Learn, Review, Progress, Settings) — fixed at bottom
- **Top header**: App name + script toggle (Lat/Ћир) — sticky
- **Content padding**: `px-4 py-6` standard, generous whitespace between sections

## Component Design Guidelines

### Lesson Cards (Dashboard)
- Rounded corners (`rounded-2xl`)
- Subtle border, transparent/dark background
- Progress ring (SVG circle) on the right showing completion %
- Completed lessons get a green checkmark and subtle green tint
- Locked lessons are dimmed with a lock icon
- Hover: border color shifts to amber

### Exercise Cards
- Full-width, generous padding (`p-4` to `p-6`)
- Clear visual hierarchy: prompt text large, options below
- Multiple choice options: bordered cards, spacing between them
- Correct answer: green border + green background tint, smooth transition
- Wrong answer: red border + red background tint + slight shake animation
- After answering: correct answer always highlighted green, wrong one red

### Progress Bar
- Thin horizontal bar (`h-2`) at top of lesson view
- Navy background, amber fill, smooth width transition
- Shows `currentExercise / totalExercises`

### Streak Counter
- Fire emoji (animated pulse when active)
- Day count in bold white
- "days" label in gray below

### Achievement Badges
- Small cards in a grid (3 columns)
- Icon (emoji) centered above title
- Unlocked: amber border/tint, full color
- Locked: grayscale, dimmed, dashed border

### Script Toggle (header)
- Pill-shaped toggle with two segments: "Lat" and "Ћир"
- Active segment: amber background, dark text
- Inactive: transparent, gray text

### Stats Page
- GitHub-style contribution calendar (28 days, 7 columns)
- Squares colored by activity intensity (more amber = more study)
- Mastery distribution as horizontal bar chart
- Per-lesson progress as small inline bar charts

## Animations & Transitions

- **Correct answer**: Gentle green pulse, slight scale up (1.02)
- **Wrong answer**: Soft red background flash + subtle horizontal shake
- **Card transitions**: `transition-all duration-300`
- **Progress bar**: `transition-all duration-500` for smooth fill
- **Page transitions**: Subtle fade-in on route change (optional)
- **Achievement unlock**: Scale-in animation with a brief glow effect

## Serbian Cultural Touches (Subtle)

- **Pirot kilim patterns**: Consider using subtle geometric patterns inspired by Serbian Pirot kilim rugs as decorative elements — background textures, section dividers, or achievement badge borders. Use sparingly and at low opacity.
- **Color inspiration**: The navy + amber palette already references the Serbian flag's blue, white, and red (here warmed to amber/gold).
- **Typography**: When displaying Serbian text in exercises, allow it to feel prominent and "native" — don't treat it as secondary to English.

## Dark Mode

- Dark mode is the default and primary mode
- All backgrounds use the navy scale
- Text uses white (#fff) for primary, gray-400 for secondary, gray-500 for tertiary
- Borders are navy-700 or navy-800
- Cards/sections use `bg-navy-800/30` or `bg-navy-800/50` with borders

## Light Mode (Future)

- If implementing light mode later:
  - Swap navy backgrounds to white/gray-50
  - Text to gray-900/gray-600
  - Keep amber accent
  - Borders to gray-200

## Responsive Breakpoints

- Mobile: < 640px (primary target)
- Tablet: 640px - 1024px (centered content)
- Desktop: > 1024px (max-width 640px content column, centered)

## Key Screens to Polish

1. **Dashboard**: The first impression. Greeting, streak, daily goal, lesson grid.
2. **Exercise view**: Where users spend 90% of their time. Must feel smooth and responsive.
3. **Lesson complete screen**: Celebratory but not over-the-top. Stats + replay button.
4. **Stats page**: Data visualization that makes progress feel tangible.

## Assets Needed

- Custom lesson icons (optional, currently using order numbers)
- Achievement badge icons (currently using emojis — could be upgraded to custom SVG icons)
- Background pattern SVG for decorative elements
- Loading spinner / skeleton states for exercise generation
