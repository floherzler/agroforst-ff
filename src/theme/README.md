# Agroforst FF Style System

## Rules
- Shared UI uses semantic tokens and approved component variants only.
- Page-level art direction may add local CSS, but should inherit official typography, radius, spacing, and surface tokens.
- Avoid raw hex values in `src/components`, `src/features`, and `src/app` unless the style is intentionally one-off art direction.
- Add new shadows, radii, font roles, and semantic colors in `src/app/globals.css` before using them in components.
- Prefer `Button`/`Badge`/`Card`/`Tabs` variants first, brand utilities second, custom CSS last.

## Public Interfaces
- `src/theme/tokens.ts`: token names and categories.
- `src/theme/recipes.ts`: shared class recipes for surfaces, text roles, and status tones.
- `src/components/brand/*`: opinionated wrappers for common branded composition.
