# Core Provenance

The 12 TypeScript modules in `src/core/` (excluding `verify.ts`) are
extracted verbatim from `observer-protocol/ows-op-policy` at commit
**6a5df2e2** and are the canonical source of truth for the shared
policy logic.

`src/core/verify.ts` is derived from `wdk-op-policy/src/verify.ts`
(which was itself extracted from `ows-op-policy/src/main.ts`) with one
modification: the `enforceMandate` function no longer has a fallback to
`resolveTransfer` — the resolved transfer is always supplied by the
caller. Rail-specific decode belongs to the adapter layer.

## Excluded rail-specific modules

The following files from `ows-op-policy/src/` are intentionally absent:

- `evmtx.ts` — EVM transaction decode
- `soltx.ts` — Solana transaction decode
- `resolve-transfer.ts` — calls evmtx/soltx; belongs in adapters

## Drift detection

Engine adapters that vendor their own `src/core/` copy should run their
`check-core-sync` script against this package (the new canonical source)
rather than against `ows-op-policy/src/` directly. Once an engine is
flipped to import `@observer-protocol/policy-engine`, its `src/core/`
vendor copy is deleted.
