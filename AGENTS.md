# Architecture Notes

## Layering

- `src/types.ts`
  - Central place for shared types.
  - New reusable types should be defined here instead of inside feature files.

- `src/constants.ts`
  - Central place for shared constants.
  - Registry defaults should prefer upstream sources such as `fast-npm-meta` instead of duplicated string literals.

- `src/helpers/`
  - Holds reusable pure helper functions.
  - Parsing, normalization, merging, and small data-shaping helpers should live here rather than in `config.ts` or request entry points.

- `src/config.ts`
  - Orchestrates config loading only.
  - It should compose helpers from `src/helpers/`, apply source precedence, and return the request-facing config shape.
  - Avoid embedding low-level parsing helpers directly in this file.

- `src/api/`
  - High-level request helpers belong here.
  - Registry picking should rely on `fast-npm-meta` rather than a local reimplementation.

## Testing

- Keep behavior-focused tests under `test/`.
- When config output is intended to feed `fast-npm-meta`, tests should verify that compatibility directly with `fast-npm-meta` helpers when practical.
