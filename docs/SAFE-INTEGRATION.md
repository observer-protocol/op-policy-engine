# Safe App integration (planned)

> **Status:** placeholder. Integration scope and pattern to be defined when Safe Apps becomes a Tier 1 target.

The expected shape:

- A Safe App that proposes a transaction (multi-sig EVM) calls the Policy Engine before submitting to the Safe transaction service.
- Wallet-embedded pattern (TypeScript), same as [WDK-INTEGRATION.md](./WDK-INTEGRATION.md), with the EVM canonical pre-sign bytes (RLP of the unsigned tx).
- Multi-sig considerations: the Policy Engine evaluates the **proposed** transaction, not each signer's individual approval. A denial means the Safe App refuses to submit the proposal at all; the Safe's own multi-sig threshold logic is untouched.
- Open question: whether the `PolicyEvaluationCredential` attaches to the Safe transaction service's metadata, or lives only in the agent's local audit trail.

This document will be replaced with a concrete guide once the Safe integration is in flight.
