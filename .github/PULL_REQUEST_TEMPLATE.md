## Summary

## Why

## Changes

## Testing

## UI / screenshots

Use fictional data and redact private information. Write “Not applicable” when
there is no meaningful UI change.

## Database / migrations

## Security / privacy

## AI / provider impact

## Plugin / memory boundaries

## Checklist

- [ ] The change is focused and excludes unrelated refactors.
- [ ] Tests were added or updated for important behavior.
- [ ] Format, lint, typecheck, tests, and applicable builds pass.
- [ ] No secrets, environment files, private data, or generated artifacts are included.
- [ ] Schema changes use a new forward-only migration; applied migrations were not edited.
- [ ] RLS, grants, and organization isolation were reviewed for database authorization changes.
- [ ] Documentation was updated where needed.
- [ ] AI calls still use `ModelGateway`; no provider SDK boundary was bypassed.
- [ ] Plugins do not import private internals from Core or another plugin.
- [ ] Working content is not promoted to memory automatically.
- [ ] A safe screenshot is included for a meaningful UI change.
