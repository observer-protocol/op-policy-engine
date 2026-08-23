# policyRef must name its canonicalisation

Designed 2026-08-23, not shipped. Extends the reasoning already in the code: **`hashMethod` is named
and never defaulted because a hash whose method is assumed is not a claim. A canonicalisation that is
assumed is not a claim either.**

---

## STEP 1: the exposure, established from the code

**Who sets `policyRef.hash`: the issuer. The engine never sets it.** In the Banxico demo,
`drive-banxico-demo.mjs:65-66` reads a LOCAL FILE and hashes its raw bytes. A local file has no
serialisation freedom, so that pin is stable.

**Every consumer, and what each does:**

| consumer | what it does |
|---|---|
| `checkDecisionRefs`, `attestation.ts:591` | asserts `id`, `hash`, `hashMethod` are **non-empty**. Never computes, never compares |
| `verifyDecisionAttestation` | carries `policyRef` into the verified block **by reference**. Never compares |
| **`payment-host.ts:1129`** | **COMPARES `block.policyRef.hash` against `required.policyRef.hash` and denies `POLICY_MISMATCH`** |
| `mandate-config.ts:171` | prints it |
| `policyref-adoption.ts` | measures adoption of the convention's optional fields |

**THIS CORRECTS WHAT I REPORTED LAST TURN.** I said nothing compares it. That was true of the
ENGINE, whose `OBSERVATION_BOUNDARY_DOES_NOT_INSPECT_POLICY_REF = true` says so at
`attestation.ts:297`. **PaymentHost compares it, and denies on mismatch.** The comparison is of two
SUPPLIED strings, neither recomputed from a fetched document, and the denial message says so
exactly: `Both are compared as opaque strings and neither is parsed or fetched.`

**So the failure mode is live, not hypothetical.** If a mandate's pin and an attestation's pin were
computed by two parties fetching the same unstable source, they differ, and PaymentHost denies with
`A decision correctly made under the wrong policy is still not the decision this mandate asked for.`
The decision was made under the RIGHT policy. The message would be wrong, and it is the message a
supervisor reads.

## Is any published attestation exposed? NO, and it was measured

`observerprotocol-website/verify-samples/` publishes determinations carrying a real
`policyRef.hash` over a real fetched document:
`9b7c561bbcf0afa79a8d8294e114ccf19c5f85fd6b778a94035b45343271be96` over
`https://www.govinfo.gov/content/pkg/FR-2020-04-15/pdf/2020-07672.pdf`.

Fetched three times under three request shapes from a different host, months after the pin was taken:

| document | bytes | three digests | published pin |
|---|---|---|---|
| APR, FR 2020-07672 | 204,796 | `9b7c561bbcf0…` three times | **matches** |
| JUN, FR 2020-12909 | 217,459 | `cee76d17312a…` three times | **matches** |

**Stable, and the demonstration is sound rather than coincidental.** govinfo serves a static PDF, as
Banxico does. **So this is a latent design defect, not a live wrong answer sitting in a signed
document.** That was the question that decided it and it was measured rather than assumed.

## STEP 2: the design

**Field: `canonicalization: string`, alongside `hashMethod`.** It names the normalisation applied to
the bytes before hashing. Suggested values: `none` for bytes as retrieved, `xml-attrs-sorted` for the
normalisation in `_sourcing/canonicalise-xml.mjs`, `jcs` for JSON, `c14n-1.1` for full XML C14N.

**Required or optional: REQUIRED at issuance, on exactly the reasoning that made `hashMethod`
required.** A hash whose canonicalisation is unnamed is a hex string over bytes nobody can
reconstruct.

**What a verifier does when it is absent, which is every attestation issued to date: NOT `none`.**
Absent must mean **the comparability of this hash cannot be established**, and a comparison must
return a third state rather than match or mismatch. Reading absent as `none` is E1 at the reference
layer: a default standing in for a fact nobody supplied, and it would silently assert that a hash
over a browser's bytes is a hash over the document.

Concretely at `payment-host.ts:1129`, the denial would need three arms rather than two: the hashes
match, the hashes differ, or **it cannot be established whether they are comparable**. Today it has
two, so an absent canonicalisation would fall into `differ` and produce `POLICY_MISMATCH` on
documents that match.

## Is it a schema change, and what breaks

**Yes, and it breaks in three places:**

1. **`checkDecisionRefs` would refuse every attestation lacking it**, which is 100% of existing
   issuance. That is the same wall the `policyRef` convention already hit, and the ruling then was
   convention plus adoption measurement rather than enforcement.
2. **`payment-host.ts:1129` gains a third outcome**, so a comparison that returns a clean allow or
   deny today returns `cannot compare` for every existing pair.
3. **The published `verify-samples` become non-conforming**, and they are the artifacts the verify
   page invites people to check.

**The path the estate already has:** `policyref-adoption.ts` exists to measure adoption of an
optional convention field before it is enforced. `canonicalization` fits that mechanism exactly, and
the honest sequence is convention, then measurement, then a refusal when adoption makes it cheap. The
one thing that must not wait is **the third state**: adding the field while leaving a two-valued
comparison would create the false negative rather than prevent it.

**Not shipped.** Verify path untouched, no schema edited, no type changed.
