# Liquid canonicalization

Per AIP v0.8 §3.3, any implementation issuing `PolicyEvaluationCredential` for a
given rail MUST publish a canonicalisation specification describing exactly how
`proposalHash` is computed. This document pins Observer Protocol's reference
implementation's canonicalisation for the `liquid` rail.

## Definition

For the `liquid` rail:

- `canonicalBytes` is the **hex-encoded elements-core consensus serialization of
  the unsigned Elements transaction** extracted from the wallet's unsigned PSET
  prior to signing. In `lwk`'s Python binding, this is:

  ```python
  unsigned_tx = unsigned_pset.extract_tx()    # lwk.Transaction (zero signatures pre-sign)
  canonical_bytes = bytes(unsigned_tx.to_bytes())   # elements::Transaction::serialize(&inner)
  canonical_hex = canonical_bytes.hex()
  ```

  Note that `lwk.Transaction.bytes()` is a deprecated alias for `to_bytes()`; both
  return the same consensus-encoded bytes. The `Display` impl on `lwk.Transaction`
  returns the same bytes as a hex string; `str(unsigned_tx)` is therefore
  equivalent to `canonical_hex`.

- `proposalHash` is the lowercase hex SHA-256 digest of those bytes:

  ```python
  import hashlib
  proposal_hash = hashlib.sha256(canonical_bytes).hexdigest()
  ```

## Normative property — single-PSET binding

> **Canonical bytes are bound to a specific PSET instance, not to a semantic
> transaction.** Liquid uses confidential transactions: blinding factors are
> injected into the PSET when the wallet's tx builder calls `finish()` (or the
> equivalent in non-`lwk` stacks). Those blinding factors land in the
> consensus-encoded value commitments, so two `finish()` calls for the
> *same logical send* produce different `canonicalBytes` and a different
> `proposalHash`.

This is a correctness requirement on integrators, not a quirk:

1. The wallet MUST call `finish()` exactly once to produce the PSET that will be
   signed and broadcast.
2. The wallet MUST extract `canonicalBytes` from **that same PSET instance**.
3. The wallet MUST NOT rebuild, re-blind, or round-trip the PSET between
   extracting `canonicalBytes` and invoking the signer. A different PSET
   instance would yield a different `proposalHash`, and the signed
   `PolicyEvaluationCredential` would attest to a transaction that is not the
   one being signed — the credential would be cryptographically valid but
   semantically false.

Integrators SHOULD include a structural guard at the signing site that asserts
the PSET object identity between the policy hook and the signer call. The
reference Aqua integration captures `id(unsigned_pset)` at the hook entry and
asserts equality immediately before the signer call.

## Sample — Aqua demo rehearsal, 2026-05-27 (real on-chain run)

Worked example from the first real ALLOW run of the Aqua × OP policy demo:
testnet L-BTC native transfer, Maxi → her own index-0 wallet address. The
on-chain confirmation is at
[`blockstream.info/liquidtestnet/tx/65bd2a9b55f42fa26997a332aa4616df80a636d43c1edeae3ff370eca1323ace`](https://blockstream.info/liquidtestnet/tx/65bd2a9b55f42fa26997a332aa4616df80a636d43c1edeae3ff370eca1323ace).
The signed PolicyEvaluationCredential for this same run verifies via the OP
reference verifier with all three bindings matching (proposalHash,
delegationCredentialHash, Ed25519 over JCS body, signed by
`did:web:observerprotocol.org#key-3`).

```text
Wallet:           default (Liquid testnet, lwk Pyhon binding via Aqua)
Recipient:        tlq1qqd63r2q58yq2937pfa5k6l8yasq5hx049sr4qnjrzhqwjfmfz22w5w2y80qx9a5drpvx6c4fvqyrlg9m2k66v9ajtk8npysv6
Amount:           5000 L-BTC sats
Asset:            L-BTC (testnet policy asset)
Asset ID:         144c654344aa716d6f3abcc1ca90e5641e4e2a7f633bc09fe3baf64585819a49
Broadcast txid:   65bd2a9b55f42fa26997a332aa4616df80a636d43c1edeae3ff370eca1323ace

canonicalBytes (hex), 8945 bytes (17890 hex chars), elements-core
consensus encoding of bytes(unsigned_pset.extract_tx().to_bytes()).hex():

  starts:  020000000102a328354c5d27158eddd0ceab971002b025f612f935bd62b19fecdb107eb75290000…
  ends:    …636799ccb668a9220d6250036b5e603a7827cc9bb9574edb3ef0855cc9c8b22f142f86b5c3140000

  Full bytes captured in the demo's allow-canonical-1f8e1744c851.hex artifact.
  The 8945-byte length is dominated by Liquid's confidential value commitments
  + range proofs in the PSET — this is normal for a confidential transfer.

proposalHash (sha256, lowercase hex):
  1f8e1744c851883df80cb0b7dea33d66ab32d34d6386cb1addbd0fef9ee44306

  (Reproducible: sha256(bytes.fromhex(canonical_hex)) yields this value.
  Recorded inside the signed PolicyEvaluationCredential at
  credentialSubject.proposal.proposalHash.)
```

## Why not `Pset.unique_id()` directly?

`lwk.Pset.unique_id()` (BIP-370) is a deterministic pre-sign content
identifier — the txid of the PSET with input `nSequence` zeroed. It is a
valid alternative canonicalisation choice for Liquid and we considered it.

We chose consensus-encoded bytes + SHA-256 because:

1. It mirrors the EVM treatment in AIP v0.8 §3.3 ("SHA-256 of the canonical RLP
   encoding"), keeping the cross-rail story uniform: `proposalHash` is always
   `SHA-256(rail-native pre-sign bytes)`.
2. The full canonical bytes are part of the wire payload (`proposal.canonicalBytes`
   in the sidecar request), which lets the evaluator independently verify the
   hash — `unique_id()` is a 32-byte handle that would require the verifier to
   compute it themselves, which is more lwk-specific machinery to depend on.

Implementations MAY surface `unique_id()` as a secondary identifier for
internal replay-detection or PSET equivalence testing; it is not part of the
on-the-wire credential.

## Verifier semantics

A verifier holding a signed `PolicyEvaluationCredential` for `rail: "liquid"`:

1. Reads `proposal.proposalHash` and `proposal.canonicalBytes` from its payload
   (the latter is carried in the signed credential's
   `evaluatedAgainst.proposal` for self-contained verification, or supplied by
   the prover out of band).
2. Verifies `SHA-256(bytes.fromhex(canonicalBytes)) == proposalHash`.
3. Deserialises `canonicalBytes` as an elements-core `Transaction` and confirms
   the human-readable fields (recipient, amount, asset) match the proposed
   action being verified.
4. Verifies the issuer's signature over the JCS-canonical form of the credential
   (excluding `proof`) against the `assertionMethod` key referenced in
   `proof.verificationMethod`.

The reference verifier under `aqua-demo/verifier/verify.py` performs steps 1, 2,
4. Step 3 is left to the consuming application's domain logic (the demo
artifact's narrative answers it visually).
