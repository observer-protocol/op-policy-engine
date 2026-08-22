# Primitive inventory audit

Audit only. Nothing was added to the inventory, nothing was encoded, nothing was fixed.

---

## BOTH STOP CONDITIONS ARE MET

> *Stop and report if STEP 2's third bucket exceeds five, or if any of them computes a clause-level
> result rather than a supporting value.*

**The third bucket holds 11 distinct operations, and 6 of them compute clause-level results.**

**11 of the 40 clauses across the two domains emit a result whose OUTERMOST operation is undeclared**,
6 in Banxico and 5 in PSR. For those clauses the primitive layer is not where the clause logic
lives. It sits in the evaluator body, unnamed, uninventoried, and invisible to every count taken so
far.

I completed STEPS 3, 4 and 5 because they are observation and recording with no change attached. The
STEP 3 numbers are reported as **contingent**: they depend on a boundary decision that is yours, and
they should not be quoted outside this repo until you make it.

---

## Method, and how the boundary was established

Three instruments, because no one of them sees the whole population.

**1. Execution.** Both `evaluate.mjs` files were rewritten so every top-level named function records
its calls, with call depth so a primitive invoked INSIDE another is not double counted as a clause's
own operation. The traced evaluators were then driven by the **committed `cases.mjs` files**, with
the import rewritten to point at the traced copy, so the fact sets are the real ones rather than a
transcription. Plus the empty run that `check-coverage.mjs` uses. 223 calls observed.

**2. Call sites.** Every `put()` expression was extracted by paren balancing and its outermost
operation identified. This is what execution cannot see: an inline `?:` or `===` is not a function
and never appears in a trace.

**3. Repository scan** for any other location where an evaluative outcome is produced.

**The boundary I used:** an operation counts if its output IS, or becomes, a clause result or a value
in a primitive's result domain. Reading a fact field and coercing it for a precondition argument is
fact access. Comparing two fact values to each other is evaluation, because it produces a judgment
present in neither operand.

**Established, not assumed:** both `evaluate.mjs` files **import nothing at all**. Checked directly.
So for these two encodings the entire population is those two files, and the engine cannot be a
hidden location for them. The engine is a separate location where evaluative logic lives, and it
matters for the inventory's provenance, but it is not called here.

---

## STEP 1: what is actually called

15 distinct named operations, observed in execution.

| operation | arity | result values observed | Banxico | PSR | calls |
|---|---|---|---|---|---|
| `all_present` | 1 | `all_present`, `some_absent` | 2 | . | 8 |
| `amounts_equal` | 2 | `equal`, `missing_operand` | . | 1 | 4 |
| `any_present` | 1 | `none_present`, `one_present` | 1 | 1 | 8 |
| `conditional_requirement` | 2 | `breached`, `not_applicable`, `satisfied` | 3 | 6 | 36 |
| `conjunction_over_results` | 2 | `not_satisfied`, `satisfied`, `undetermined` | 1 | 2 | 10 |
| `distinct_members_at_least` | 3 | `met`, `not_met` | 1 | . | 4 |
| `elapsed_within` | 4 | `exceeded`, `no_end_event`, `within` | 2 | 2 | 14 |
| `field_present` | 1 | `absent`, `present` | 6 | 5 | 57 |
| `held_judgment` | 1 | `affirmed`, `demonstrated`, `denied`, `not_assessed` | 3 | 4 | 40 |
| `member_of_enumeration` | 2 | `member`, `not_member` | 2 | . | 10 |
| `member_of_register` | 2 | `member`, `no_candidate` | 1 | 1 | 8 |
| `none_of_class_present` | 2 | `clear` | 1 | . | 4 |
| `open_set_floor` | 1 | `floor_met`, `floor_not_met` | 1 | 1 | 8 |
| `ordered_before` | 2 | `after`, `missing_operand`, `simultaneous` | . | 2 | 8 |
| `select_parameter_by_predicate` | 3 | `{"limit":45}` | 1 | . | 4 |

Every one of the 13 primitives declared in `primitives.json` is invoked somewhere. **The
declared-and-never-called bucket is empty at the primitive level.** The defects are all one level
down, at the clause pairing, and one level out, in what was never named.

**Three of 30 declared result values are never produced by any fixture in either domain:**
`member_of_register.not_member`, `none_of_class_present.prohibited_present`, and
`select_parameter_by_predicate.selected_value`. A register can only tell you a value exists. Only a
run tells you anything ever reaches it, and for these three nothing does. `ordered_before.before` is
also never produced, so its `before` arm is unexercised in the domain it was written for.

---

## STEP 2: reconciled three ways

### Declared and called

19 of the 24 clause-primitive pairs in `used_by` reconcile against observation. 11 of the 13
primitives reconcile exactly.

### Declared and never called

**Two pairs, and both are semantically wrong rather than merely stale.**

`primitives.json` declares `field_present` serves `34-2010/3.6/a/evidence` and
`34-2010/3.6/a/verification-method`. **Neither clause calls it, at any depth.** Both use an inline
ternary instead:

```js
put('34-2010/3.6/a/evidence', facts.dictamen?.evidence_of_factors_present ? 'present' : 'absent');
```

That is not `field_present`, and the difference is behavioural, measured:

| value | `field_present` | the inline ternary |
|---|---|---|
| `false` | `present` | **`absent`** |
| `0` | `present` | **`absent`** |
| `null`, `undefined`, `''` | `absent` | `absent` |

So an issuer that records `evidence_of_factors_present: false`, an explicit negative, gets `absent`,
the same answer as a field nobody filled in. The register says the clause distinguishes those. **The
code does not, and the register is what anyone would read to find out.**

One further mis-attribution, benign: `34-2010/3.3/p5/receipt-record` is declared under
`field_present` and actually served by `all_present`, which calls `field_present` internally.

### A sub-class worth separating: declared, plausible, never exercised

Three PSR clauses declare a primitive that no fixture ever reaches, because no case sets
`via_pisp` or a series withdrawal:

- `psr-2017/67/4/series-withdrawal` declares `conjunction_over_results`
- `psr-2017/75/2/pisp-burden` declares `held_judgment`
- `psr-2017/76/5/a/aspsp-complies` declares `conjunction_over_results`

Not the same defect as the two above. The declaration may well be right. **Nothing has ever shown it
to be**, and the PISP path is a third of regulation 76.

### Called and never declared

**11 distinct operations.** `amounts_equal` was one instance of a much larger population.

| # | operation | what it does | Banxico | PSR | clause-level? |
|---|---|---|---|---|---|
| 1 | `truthy_present` | boolean to `present`/`absent`, disagreeing with `field_present` | yes | . | **YES** |
| 2 | `values_equal` | equality of two fact values | yes | . | no |
| 3 | `result_projection` | another clause's result token to a boolean or tri-state | yes | yes | no |
| 4 | `guard_on_unresolved` | emit `undetermined` when a resolution is absent | yes | yes | **YES** |
| 5 | `remap_result_domain` | one primitive's result domain onto another | yes | yes | **YES** |
| 6 | `branch_label` | emit a label naming the branch taken | yes | . | **YES** |
| 7 | `derived_clause_chain` | a multi-branch if/else producing a clause result | yes | . | **YES** |
| 8 | `universal_quantification_over_results` | `.every` over a primitive's results | yes | . | no |
| 9 | `applicability_gate` | gate the whole clause, else a fixed token | yes | yes | **YES** |
| 10 | `conjunction_of_predicates` | `&&` over projected results or fact predicates | yes | yes | no |
| 11 | `disjunction_over_results` | `\|\|` over two clause results | . | yes | no |

**Where the logic currently lives:** all 11 live in the bodies of the two `evaluate.mjs` files,
inline in `put()` expressions and in the `firmeza` block at `banxico-34-2010/evaluate.mjs:166-181`.
Nothing is imported, so there is no second file to look in for these two encodings.

### The 11 clauses whose emitted result is produced by an undeclared operation

**Banxico, 6 of 19:** `2.6/a/two-factor`, `3.6/a/evidence`, `3.6/a/verification-method`,
`3.6/p5/foreign-deadline`, `3.6/p4/deadline`, `3.6/p7/firmeza`.

**PSR, 5 of 21:** `67/4/series-withdrawal`, `75/2/pisp-burden`, `76/2/deadline`, `76/4/value-date`,
`76/5/a/aspsp-complies`.

`34-2010/3.6/p7/firmeza` is the clearest case. Its entire value comes from a six-branch if/else
chain over the deadline result and an ambiguity resolution. It is the most consequential clause in
the Banxico register, it is the one a client would ask about first, and **not one step of it is
expressible in the inventory.**

### The other location, for completeness

`packages/policy-core-impl/src/rules/` holds five rule modules: amount limits, counterparty,
geographic, temporal, velocity. They compute rule-level outcomes and carry exactly the operations the
inventory reports as missing or new: magnitude and equality comparison on amounts, list membership,
and time-window containment.

**Their absent-operand policy is the opposite of the encodings'.** `evaluateAmountLimits` returns a
denial reading `cannot evaluate, denying`; the encodings return `no_end_event`, `missing_operand` or
`undetermined` and decide nothing. Both are defensible. **Two rule layers in one repository resolve
missing operands in opposite directions, and neither names the other.**

---

## STEP 3: the reuse measurement, restated

**Contingent on your boundary decision. Do not quote it yet.**

### The count of genuinely NEW primitives does not change. It is a different two.

**`amounts_equal` is demoted.** Banxico already performs equality of two operands, inline and
undeclared, at `evaluate.mjs:103`:

```js
facts.dictamen?.channel === facts.cardholder?.channel_election
```

Same shape. `amounts_equal` adds a result domain the inline version never had
(`missing_operand`, `incomparable_currency`) and specialises to typed money. On the audited baseline
that is **PARAMETERISED, over an operation that was never declared**. It looked new because the
first instance was invisible.

**`disjunction_over_results` is promoted.** PSR composes two clause results with `||`
(`evaluate.mjs:115-116`). Checked directly: Banxico's only `||` uses are null guards inside
primitive bodies, never a composition of clause results. `conjunction_over_results` was declared;
its dual never was, and PSR needed it.

**`ordered_before` survives as genuinely NEW.** Checked directly: Banxico contains no bare two-instant
ordering anywhere. The original reasoning holds.

### Both figures

| | original | audited |
|---|---|---|
| unit | one hand-authored `primitive` field per clause | operations actually invoked |
| population | 21 clauses | 16 operations (PSR), against 23 (Banxico) |
| REUSED | 16 | 11 |
| PARAMETERISED | 2 | 3 |
| NEW | 3 instances, 2 distinct | 2 |
| served with at most a new argument | 18/21, **86%** | 14/16, **87.5%** |

**The headline rate barely moves, and that is the least interesting thing about this.** The original
was right by accident: one false positive (`amounts_equal`) and one false negative
(`disjunction_over_results`) cancelled. **A number that survives an audit of its own baseline
unchanged, for reasons unrelated to why it was right, has not been confirmed.**

### Why the original could not have been right on purpose

The 86% came from `psr-2017-752/clauses.json`'s `primitive` field, one primitive per clause, written
by hand. Measured against the trace: **the field names the sole top-level call on 13 of 21 clauses,
and disagrees on 8.** Five clauses invoke more primitives than the field records; three declare one
that no fixture reaches.

So `FINDINGS.md`'s reuse table reads as a measurement and is a **restatement of a hand-authored
field**. Its arithmetic over that field is correct. That is the entire extent of what was verified.

---

## STEP 4: the registry census

Every registry, manifest, index, coverage field and count in this repository. **Derived** means the
content is produced by an observed run. **Authored** means a person wrote it and nothing checks it.

| # | registry | derivation |
|---|---|---|
| 1 | `banxico/primitives.json` `used_by` | **Authored.** Already known; 5 of 24 pairs wrong |
| 2 | `banxico/primitives.json` `integrity.names_or_descriptions_containing_domain_terms` | **Authored**, a stored result of a past run, not re-derived |
| 3 | `banxico/primitives.json` `integrity.references_to_unknown_clauses` | **Authored**, stored |
| 4 | `banxico/primitives.json` `integrity.coverage_check` | Prose. Withdrawn and says so |
| 5 | `banxico/clauses.json` register | **Authored.** Correct: it is the decomposition |
| 6 | `banxico/facts.json` `fields` (23) | **Authored** |
| 7 | `banxico/facts.json` `integrity.fields_read_by_no_clause` and `clauses_reading_no_field` | **Authored**, stored. No code computes it. **Same defect class as `used_by`, in the same directory, still live** |
| 8 | `banxico/ambiguities.json` (6) | **Authored.** Correct: a judgment register |
| 9 | `banxico/DIVERGENCE.md` (5) | **Authored** |
| 10 | `banxico/FINDINGS.md` counts | **Authored** prose |
| 11 | `banxico/check-coverage.mjs` | **Derived.** Set equality against a live run. The good one |
| 12 | `banxico/source/PROVENANCE.md` digests | **Derived**, measured |
| 13 | `psr/clauses.json` `primitive` and `reuse` | **Authored.** Disagrees with observation on 8 of 21 |
| 14 | `psr/ambiguities.json` (6) | **Authored.** Correct |
| 15 | `psr/check-coverage.mjs` | **Derived** |
| 16 | `psr/source/PROVENANCE.md` digests | **Derived**, measured |
| 17 | `psr/FINDINGS.md` reuse counts | **Authored, presented as derived.** The worst class here |
| 18 | `_primitives/REUSE-LOG.md` | **Authored.** Correct: a log |
| 19 | `_sourcing/RETRIEVAL-CHECK-2026-08-21.md` | **Derived**, and names the one thing it could not measure |
| 20 | `parity-harness/matrix.json` `cases` (250) | **Authored** case list |
| 21 | `parity-harness/matrix.json` `_totalCases` | **Derived at runtime and deliberately not stored.** The best pattern in the repo; see below |
| 22 | `parity-harness/matrix.json` `description` counts | **Authored** prose. Says 250; `cases` is 250. Agrees today, checked by nothing |
| 23 | `parity-harness/matrix.json` `ruleCategories` (11) | **Authored.** `run.mjs:209` reads coverage FROM it, so a case in an unlisted category is silently dropped. All 11 reconcile today |
| 24 | `policy-engine/src/core/vocabulary.ts` `KNOWN_*` | **Authored**, asserted by a vocabulary suite for internal properties. See below |
| 25 | `vocabulary.ts` `DECLARED_UNENFORCEABLE` | **Authored** |
| 26 | `policy-engine/KNOWN-LIMITS.md` | **Authored** prose |
| 27 | `policy-engine/PROVENANCE.md` module count | **Authored, and no longer reconciles.** See below |
| 28 | `policy-engine/CHANGELOG.md` | **Authored** |
| 29 | `schema/policy.schema.json` | **Authored** |
| 30 | `examples/policy-templates/*.json` (3) | **Authored** |
| 31 | `README.md` claims | **Authored** prose |

**Derived: 6 of 31.**

### Three worth pulling out

**`_totalCases` is the pattern the rest should copy.** Its value is not a count. It is the sentence
`DERIVED at runtime from cases.length (run.mjs); not stored. A stored count drifts and misleads the
next person who greps it`, and it names the two days this harness read red on exactly that. Someone
already learned this lesson in this repository and wrote it down where it would be found. It did not
propagate to `used_by`, to `facts.json`'s integrity object, or to `psr/clauses.json`.

**`PROVENANCE.md` no longer identifies its own population.** It says `The 12 TypeScript modules in
src/core/ (excluding verify.ts) are extracted verbatim from ows-op-policy at commit 6a5df2e2`.
Counted: **21 top-level modules excluding `verify.ts`, plus 5 more under `records/`.** The definite
article makes this a closed description of a directory that now holds nearly twice as many files, and
nothing in the file says which 12 the verbatim claim covers. **A provenance claim that cannot be
resolved to a file list is not a provenance claim.**

**`vocabulary.ts` cites a check I could not find in this repository.** Its header says the
schema-vs-engine conformance check `diffs these against the published schemas rather than against a
code comment`. A vocabulary suite exists and asserts internal properties of the sets. **No file in
this repository reads `schema/policy.schema.json` and diffs it against `KNOWN_SCOPE_KEYS`.** It may
live in `ows-op-policy`, where core was extracted from; the comment does not say. Recorded as
unlocated rather than absent, because the two are different findings.

---

## STEP 5

Recorded in `REUSE-LOG.md` as E3 and E4.

---

## What this audit does not decide

**Whether the 11 undeclared operations should become primitives.** Several plainly should not:
`derived_clause_chain` is a clause's own logic and naming it would invent a primitive per clause.
Others plainly should: `truthy_present` is currently a silent contradiction of a declared primitive,
and `guard_on_unresolved` is the mechanism the whole register depends on for keeping ambiguities as
inputs.

That decision sets the denominator, which is why STEP 3 is contingent. **The number cannot be
finished before the boundary is drawn, and drawing it is not a measurement.**


---
---

# Follow-up, 2026-08-21

Four steps. **STEP 1 did not ship**, for a reason that reverses one of this audit's own findings.

---

## STEP 1: the fix inverts the clause, and the code was right

### No committed Banxico result changes

I made the change, ran all three cases, and diffed against the committed baseline. **Byte identical.
Nothing changed.** All three fixtures record `evidence_of_factors_present: true` and
`verification_method_stated: true`, and `field_present(true)` and `true ? 'present' : 'absent'` agree.

`POLICY-ENCODING-REPORT.md` is therefore not wrong, and it is also **not on main**. Checked:
`policy-library/` does not exist on `main` or `origin/main`. It exists only on the pushed branch
`policy-library/banxico-34-2010`, which is PR #23, open and unmerged. The client-facing artifact is
public on the PR branch and reaches main when you merge.

### But the prescribed fix is wrong, so I reverted it

A fix that changes nothing on the fixtures still has to be checked on the input it was written for.
Run with an issuer that **records** that evidence is not present:

| clause | before | after `field_present` |
|---|---|---|
| `3.6/a/evidence` | `absent` | **`present`** |
| `3.6/p4/floor` | `floor_not_met` | **`floor_met`** |
| `3.6/p7/firmeza` | `attached` | **`not_attached`** |

`firmeza` is not a neutral token. `clauses.json` gives its assertion as *the credit becomes final and
cannot be reversed*. **`attached` is the cardholder-protective outcome.** So the change takes a
dictamen that states evidence of the authentication factors is NOT present, rules it conforming, and
moves the outcome against the cardholder on the one clause where that matters most.

The reason is in the field name. `evidence_of_factors_present` is a **boolean assertion about the
world**, not a container whose fill state is the question. `field_present` asks whether a field was
filled in, and a recorded `false` was filled in. The clause asks something else, and
`clauses.json` says so in its own `disposition_basis`: *Presence of an evidence item referring to
factors drawn from the 2.6(a) enumeration.* No evidence item means `absent`. **The inline ternary
returns the correct answer.**

### Correcting this audit

The section above, `Declared and never called`, said the register distinguishes a recorded `false`
from an unfilled field and the code does not. **The mismatch is real and I assigned the fault to the
wrong side.** `used_by` is what says `field_present` serves these two clauses, and `used_by` is the
artifact this audit proved is authorless intent. I took the unreliable registry as the authority on
which of the two to change, in a document whose subject is that the registry is unreliable.

**What actually holds:** the clause result domain has two values and cannot distinguish three
states, so the distinction I said was required was never expressible here. Distinguishing
*recorded false* from *not recorded* needs a three-valued operation, which is a new primitive, which
is out of scope tonight and may not be wanted at all.

**Recommended instead, for your ruling:** correct `used_by` to stop naming `field_present` for these
two clauses, and leave the call sites alone. That is a one-line change to a field already marked
documentation-only, and it is the half that is wrong. I have not made it.

### The same pattern elsewhere: one instance, not fixed

`psr-2017-752/evaluate.mjs:88`, clause `psr-2017/67/4/series-withdrawal`:

```js
f.consent?.series_withdrawn_at ? conjunction_over_results([false], 'undetermined') : 'not_applicable'
```

Truthiness on a **timestamp**, so it disagrees with `field_present` only on `''` and `0`, neither of
which a date serialiser normally emits. Here `field_present` would be semantically right, unlike the
Banxico pair, because the question really is whether a withdrawal timestamp exists.

**Not fixed.** The instruction was to apply the fix elsewhere only if it is identical, and the two
named fixes are being withdrawn, so there is no longer an identical fix to extend. Reported for the
same ruling.

No other instance in either domain. Everything else guards with an explicit `=== true`, which does
not coerce: 5 sites in Banxico, 13 in PSR.

---

## STEP 2: the two rule layers

### The exact resolution each applies

**`policy-core-impl/src/rules/` decides, per rule, asymmetrically.** My earlier one-line summary,
that it denies where the encodings return `undetermined`, was too simple and is corrected here. Read
from the code and its fail-mode headers:

| rule | operand absent | resolution |
|---|---|---|
| `amount-limits` `maxNotionalPerOrder` | no notional hint | **DENY** |
| `amount-limits` `maxPosition` | no state | SKIP |
| `amount-limits` `dailyDrawdownCap` | always, unimplemented | SKIP |
| `counterparty` `allowList` | no counterparty hint | **DENY** |
| `counterparty` `blockList` | no counterparty hint | SKIP |
| `counterparty` `requireIssuerClassIn` | no attestation | SKIP, caller records `evaluatedWithAttestations=false` |
| `geographic` `allowedJurisdictionsOnly` | jurisdiction unknown | **DENY** |
| `geographic` `blockedJurisdictions` | jurisdiction unknown | SKIP |
| `velocity` daily and monthly | no state | SKIP, deferring to the server-side evaluator |

**The principle is consistent even though the table is mixed: a closed permission list fails closed,
an open prohibition list fails open, and a stateful rule skips rather than guesses.** Both fail-open
cases are documented as deliberate, `geographic.ts` under a `CRITICAL` heading.

**`policy-library/` never decides.** A missing operand becomes a third value: `no_end_event`,
`missing_operand`, `not_assessed`, `no_candidate`, `not_applicable`, or `undetermined` on any
composition over an unresolved input.

### Can any consumer reach both on the same question

**No.** The encodings import nothing at all, checked directly, and are shipped by no package:
`policy-engine`'s published `files` list is `dist/`, `PROVENANCE.md`, `README.md`,
`KNOWN-LIMITS.md`, `LICENSE`, `CHANGELOG.md`, and `policy-library/` is not in it. Nothing in the
repository imports `policy-core-impl` either; two code comments reference a
`policy-core-impl/src/gate.ts` that **does not exist in this repository**.

### Deployed surface

**Not a clean dev-only answer, and worth your attention.** `policy-core-impl` is `private: true` at
`0.1.0-draft` with no build, but **its own README states these rule implementations are the code
behind `POST api.observerprotocol.org/policy/evaluate`**, with `signer.ts`, `server.ts` and the
systemd unit held in a private build repository. So the package is unpublished while the logic is
claimed to be production.

I have not verified whether that endpoint is currently serving, and I did not probe it. There is a
separate standing finding that the sidecar was stopped and disabled and that this repo is not what
runs; whether that still holds is a live question I cannot settle from the filesystem.

**The stop condition does not fire either way.** It asks for a deployed surface reachable by BOTH
layers. The encodings are reachable from nothing, so no surface reaches both, regardless of the
sidecar's state.

### Recommendation, for your ruling

**The policy library should keep `undetermined` and should not adopt the decide-on-absence
convention.** Three reasons, in order of weight:

1. **The two layers have different outputs, not different opinions.** `policy-core-impl` gates an
   action, so something happens next and an absent operand must resolve to allow or deny. The
   library produces a finding, and nothing happens next. An encoding that resolved a missing fact
   would be manufacturing a determination the source does not support.
2. **The third value is the mechanism the register is built on.** Ambiguities are inputs, never
   defaults, and `undetermined` is how that is enforced at runtime. Adopting a default would
   silently resolve A1, A2 and P1 to whichever side the default fell on, which is precisely the
   failure the register exists to prevent.
3. **It is the direction that keeps information.** `undetermined` can be converted to a deny at a
   boundary by a deployment that needs a decision. A deny cannot be converted back into
   `undetermined`, because the fact that nothing was known is gone.

**If the two ever meet, convert at the boundary and make the conversion a deployment decision, not
an encoding one.** Do not unify the primitives.

Documented in both locations as asked, each naming the other:
`packages/policy-core-impl/README.md` and this section.

---

## STEP 3: the composition gap, characterised

Six operations produce clause-level results without being named. Recurrence is the question, so it
is the column that matters.

| operation | composes | over | recurs? |
|---|---|---|---|
| `applicability_gate` | a whole clause evaluation, else a fixed token | one fact predicate | **BOTH.** B `2.6/a/two-factor`; P `67/4`, `75/2`, `76/5/a` |
| `guard_on_unresolved` | a primitive call, else `undetermined` | an ambiguity resolution | **BOTH.** B `p4/deadline`, `p7/firmeza`; P `76/2/deadline` |
| `remap_result_domain` | one result domain onto another | one prior result | **BOTH.** B `p7/firmeza`; P `76/4/value-date`, `75/1` |
| `truthy_present` | a boolean into `present`/`absent` | one fact field | Banxico only, 2 clauses. Not composition at all; see STEP 1 |
| `branch_label` | a label naming the branch taken | one fact predicate | Banxico only, `p5/foreign-deadline` |
| `derived_clause_chain` | a decision table | two prior results plus a resolution | Banxico only, `p7/firmeza` |

### The answer: a small vocabulary, plus a table, and the table is data

**Three of the six recur across both domains**, and all three are composition proper. With
`conjunction_over_results` already declared and `disjunction_over_results` identified as its missing
dual, that is **five shapes covering every composing clause in both registers except one.**

The exception is `34-2010/3.6/p7/firmeza`, and it does not reduce to an operation. It is 5 arms
yielding 7 terminal outcomes over two inputs, the deadline result and the A2 resolution, with the
fourth arm expanding into a three-way conjunction over the floor, the signatory and the language
results. **But it is not bespoke logic either. It is a decision table**, complete over its two input
domains, and every row is a reading of one sentence of the seventh paragraph.

**So clause-level logic is not irreducibly bespoke.** It is a small composition vocabulary, about
five shapes, plus a per-clause decision table for DERIVED clauses. That matters because a table is
**data**: enumerable, checkable for completeness over its input domains, and expressible in the
register beside the clause it belongs to. An if/else chain is none of those, and its arms cannot be
counted by anything.

`branch_label` and `truthy_present` are one-offs and should stay that way. Naming them would add
inventory without adding reuse.

**Not built, as scoped.** The finding is that the reduction exists, not that it should be done
tonight.

---

## STEP 4: both stored fields withdrawn

Applied the `_totalCases` pattern: the value is replaced by a sentence saying what it was, why it
went, and what derives it now.

### `banxico-34-2010/facts.json`

`integrity` held three stored lists. **It was measurably wrong when withdrawn.**
`clauses_reading_no_field` held one entry, `34-2010/3.6/p4/floor`, while its own note defined the
category as the DERIVED clauses that read no fact directly. `34-2010/3.6/p7/firmeza` reads no
`facts.` at all and **its own entry in `clauses.json` says `It reads no fact directly`**. Two files
in one directory contradicted each other about one clause, and the stored list was the wrong half.

**What derives it now: nothing, and no deriver was invented.** `check-coverage.mjs` derives the
clause id set by set equality against a live run and is the only execution-established property in
the directory; it does not read `facts.json`. The three lists are now recorded as unknown, which is
what they are. Prior values preserved under `$last_stored_values`.

### `psr-2017-752/clauses.json`

The per-clause `primitive` and `reuse` fields are withdrawn from all 21 clauses. **These are what the
86% was counted from**, which made a hand-authored classification read as a measurement.

`reuse_note` is kept. It carries authorial reasoning about why a shape transferred, which no trace
can recover, it is plainly prose, and it was never counted.

**What derives it now: nothing in this repository.** The tracer that measured the disagreement lives
in a scratchpad and was not committed, so no instrument here derives which primitives a clause
invokes. Prior values preserved under `$last_stored_values`.

**Both coverage checks still pass** after the withdrawal, which is the point: neither ever read these
fields.


---
---

# Firmeza as a table, 2026-08-21

**No case result changed. Byte identical, and checked wider than the cases.**

---

## STEP 1: the table, and two things the chain hid

12 rows in `clauses.json` under the firmeza clause, plus a 3-row sub-table. **Every row was derived
by running the evaluator** on facts producing that input combination and recording what came back.
Nothing was transcribed from the chain and no row was invented.

**Input domains, derived rather than read off the branches:**

- `deadline`, 4 values: `undetermined`, `within`, `exceeded`, `no_end_event`. Obtained by running
  four fact sets, then reconciled against `elapsed_within`'s declared `result_domain` in
  `primitives.json` plus `undetermined`, so a probe set too narrow to produce a value would fail
  rather than hide a missing row.
- `a2`, 3 values: the two competing readings registered for ambiguity A2, plus `(unresolved)`.
  Unresolved is a member of the domain, not an error, because ambiguities are inputs.

**No gaps.** All 12 combinations are handled, so the second stop condition does not fire. The chain's
`else` arm was catching four of them.

### Two findings, recorded in the table, not fixed

**F1, rows `no_end_event/timing_only` and `no_end_event/timing_and_content`.** Both return `attached`
on a note reading *The applicable period elapsed with no conforming dictamen delivered*. **The period
elapsing is not established.** `elapsed_within` returns `no_end_event` whenever the end event is
absent, whether the period has run or not, so a dictamen that is merely outstanding and still in time
is ruled identically to one delivered late. The source conditions firmeza on `transcurrido el plazo`.

This is the third instance of the collapse recorded as E1, and the most consequential: it is the
clause that decides whether a credit becomes irreversible. Not fixed, because fixing it needs a clock
in the facts, which is a fixture and register change rather than a transcription.

**F2, rows `exceeded/(unresolved)` and `no_end_event/(unresolved)`.** Both return `undetermined` for
want of A2, while the table shows **both A2 readings give `attached` on the same deadline value**. The
chain asks for a resolution the outcome does not depend on. Over-caution rather than a wrong answer,
so recorded and left.

**F2 is legible only as a table.** It is read across the two A2 columns of one deadline row, and arm
order in a chain destroys exactly that comparison. This is the concrete return on the move.

---

## STEP 2: driven by the table

The chain is replaced by a lookup that throws when no row matches. **A missing row is a defect, never
a default**, which is the property the `else` arm could not have.

**Diff against current output: byte identical on all three cases.**

Three cases only reach 3 of 12 rows, so that is a weak check. The transcription was also verified by
running the **pre-table evaluator and the table-driven one over the full cross-product**, comparing
the entire 19-clause result object each time: **14 combinations, 0 differences.**

**One property was traded, deliberately.** `evaluate.mjs` used to import nothing at all, which made it
auditable in isolation, and this audit relied on that fact when establishing the boundary. It now
reads `clauses.json`. The alternative was to keep the rule in two places, which is worse: the table
would be documentation of a chain rather than the thing that runs. Noted in the file.

---

## STEP 3: the completeness check

`check-firmeza-table.mjs`. **It does not ask the table what it covers.** `cross_product: 12` and
`$gaps: NONE` are the table's statements about itself. The check derives the input domains from
elsewhere, then **executes the evaluator once per combination**, so coverage is established by the
evaluator refusing to run rather than by a set comparison against the list under test.

**Shown to fail.** Deleting row `exceeded/timing_only`:

```
FAIL  all 12 combinations of the two input domains are covered
      <<< exceeded/timing_only: firmeza: no decision-table row for deadline=exceeded, a2=timing_only
```

It names the missing combination. Restored, and passing at 5 of 5.

**It caught its own author on the first run.** The row `undetermined/timing_and_content` carried the
reading `As above.`, and the assertion that no row states an outcome without saying what it rests on
failed on it. I had written a placeholder into the artifact whose whole purpose is that a lawyer can
read the reading. Rewritten, and the check is why.

---

## STEP 4: the other two DERIVED clauses

**`34-2010/3.6/p5/foreign-deadline` IS a table**, trivially: one boolean input, two rows, total. The
gain is small, because the only thing a table adds at this arity is somewhere to put the reading, but
that is not nothing on a clause whose whole content is which paragraph applies.

**`34-2010/3.6/p4/floor` IS NOT, and should not be made one.** It is a quantifier over an open list:
`open_set_floor` folds 5 element results and returns `floor_met` only if all hold. As a table it is
2^5 = 32 rows saying what one quantifier says. Worse, **its arity is not fixed**: `por lo menos`
declares the enumerated elements a minimum, so adding an element makes it 64 rows. A table would have
to be regenerated by the clause's own semantics, and would fight the thing the clause exists to say.

### So it is a pattern, with a boundary

**Not a firmeza fix, and not all DERIVED clauses.** The pattern is: **a DERIVED clause whose inputs
form a small, closed, finite cross-product should be a table.** firmeza qualifies at 4x3.
foreign-deadline qualifies at 2. `floor` is excluded on a structural test that is easy to apply, not
a judgment call: **if the clause's own text makes the input arity open, a table is the wrong shape.**

Reported only. Neither converted.

---

## The two small corrections

**`used_by` corrected.** `field_present` no longer names `3.6/a/evidence` or
`3.6/a/verification-method`. The call sites were left alone, because they are right. Rationale
recorded in `primitives.json`'s integrity object.

**`psr-2017/67/4/series-withdrawal` now uses `field_present`.** PSR cases byte identical.

**And the comment I first wrote on it was wrong, so it was corrected.** I claimed the two forms differ
on `''` and on a `0` epoch. Measured: **they differ on `0` only.** `field_present` also calls `''`
absent, so the two agree there. The comment now says what was measured, because a fix that overstates
its own reach is a claim nobody re-checks.
