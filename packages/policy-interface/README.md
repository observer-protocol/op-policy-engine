# @observer-protocol/policy-interface

TypeScript interfaces for the Observer Protocol Policy Engine. **Types only — no runtime.**

The actual evaluator + signer is in a separate, proprietary package (`@observer-protocol/policy-core`). This package gives integrators the type surface they need to call the engine without depending on the implementation.

## Install

```bash
npm install @observer-protocol/policy-interface
```

## Usage

```ts
import type {
  TradingMandate,
  ObserverDelegationCredential,
  PolicyEvaluationCredential,
  EvaluationInput,
  IssuerClass,
} from '@observer-protocol/policy-interface';

// You provide an EvaluationInput; the runtime returns a PolicyEvaluationCredential.
declare function evaluate(input: EvaluationInput): Promise<PolicyEvaluationCredential>;
```

For runtime: install `@observer-protocol/policy-core` separately.

## What's in here

- `TradingMandate` — the policy itself, lives at `credentialSubject.tradingMandate` of an `ObserverDelegationCredential`.
- `ObserverDelegationCredential` — the W3C Verifiable Credential carrying the mandate, signed by the issuer.
- `PolicyEvaluationCredential` — the signed decision the engine returns.
- `EvaluationInput` — what you pass into the engine.
- `IssuerClass` — the five values used by `tradingMandate.counterparty.requireIssuerClassIn`.

## Spec

The authoritative spec is AIP v0.8 draft 1:
https://github.com/observer-protocol/aip/blob/main/aip-v0.8-draft-1.md

## License

MIT.
