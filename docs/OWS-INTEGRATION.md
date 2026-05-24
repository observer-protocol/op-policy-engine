# Open Wallet Standard integration (planned)

> **Status:** placeholder. To be completed as a Tier 2 open-source contribution to the [Open Wallet Standard core](https://github.com/open-wallet-standard/core).

OWS's existing policy engine (documented [here](https://github.com/open-wallet-standard/core/blob/main/docs/03-policy-engine.md)) operates pre-signing and uses capability-based access: deny means the wallet's HKDF-derived AES key for decrypting the wallet secret is never derived, so key material never enters memory.

The Observer Protocol Policy Engine fits cleanly alongside OWS's existing model as an **additional rule type** rather than a replacement:

- Existing OWS declarative rules (`allowed_chains`, `expires_at`, `allowed_typed_data_contracts`) remain in place.
- A new OWS executable / declarative rule type, `op-delegation-credential`, invokes the OP evaluator with the OWS request context + a presented `ObserverDelegationCredential`.
- The OWS engine's AND-of-all-policies semantics naturally compose: OP's allow-decision becomes one input to OWS's overall allow/deny.
- OWS retains its capability-based access guarantee; OP adds verifiable cryptographic enforcement on top.

The PR shape (when this work is ready):

- A new OWS rule module under `core/policies/op-delegation-credential/`.
- Documentation update in OWS `docs/03-policy-engine.md` cross-referencing this repository.
- A worked example in `core/examples/` showing an OWS user authorising an OP-delegated agent.

Tracking issue: to be opened in [open-wallet-standard/core](https://github.com/open-wallet-standard/core/issues).
