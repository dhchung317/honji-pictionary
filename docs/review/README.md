# Review index

Base: `6c3fb66` (`fix-vh`). Original checkout is unchanged. No changes have been pushed or deployed.

## Grouped server branch: fix/mvp-server-safety

Three separate commits, in order:

1. [Server permissions](server-permissions.md)
2. [Usage limits](usage-limits.md)
3. [Concurrent writes](concurrent-writes.md)

Review individual commits in your editor or `git show COMMIT`. To compare the whole branch with the original use `git diff 6c3fb66..fix/mvp-server-safety`.

## Other independent branches

- `fix/preserve-drawings` in `../preserve-drawings`: `docs/review/preserve-drawings.md`.
- `fix/scoring-recovery` in `../scoring-recovery`: `docs/review/scoring-recovery.md`.
- `fix/room-expiry` in `../room-expiry`: `docs/review/room-expiry.md`.

## Combining approved changes later

Create a fresh integration branch from the intended release base. Cherry-pick approved commit IDs in dependency order, or merge an entirely approved branch. Resolve overlapping edits, then rerun frontend/API type checks, production build, regression tests and the multi-browser game checklist. Never assume independently passing branches also pass after combination.

No integration branch or approval is implied by these review commits. Permissions, usage limits and concurrency overlap, so selecting a later server commit alone may require adapting it. Public scoring retry should include permissions and room locking. Drawings/expiry can be reviewed independently.

## Validation

Frontend/API TypeScript checks and seven mocked-service regression tests pass across the fixes. Production builds and the final grouped server tests also pass. Live Redis Lua behavior, Blob uploads, AI scoring, deployment timeout settings and browser interaction still require the manual instructions. Existing lint errors and hook warnings predate this work.

## Repeatable automated checks

From each review folder:

```sh
npm run build
./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --skipLibCheck --esModuleInterop api/*.ts
```

For the grouped server branch:

```sh
node --test tests/server-permissions/regression.cjs tests/usage-limits/regression.cjs tests/concurrent-writes/regression.cjs
```

The scoring and expiry branches each contain their own regression test command in the linked guide. `npm run lint` currently fails with the four existing errors and four warnings; these fixes introduce no additional lint findings.
