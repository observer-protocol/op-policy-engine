# Primitive reuse log

One entry per observation about the primitive set, made while encoding a domain. The log exists so
that a shape that looks wrong in one domain is not fixed there and then, before there is evidence
about whether it is wrong generally.

**The rule this log encodes: one domain is an anecdote.** A primitive that fits awkwardly in the
first regulation encoded against it may be too narrow, or the regulation may be unusual. Those are
different findings with different fixes, and only a second domain separates them. Recording and
waiting is the cheaper error than generalising on one instance and carrying the generalisation
everywhere.

---

## E1. `conditional_requirement` collapses a distinction `elapsed_within` draws

**Domain:** Banxico Circular 34/2010, numeral 3.6.
**Clause:** `34-2010/3.6/p5/expediente-copy`.
**Observed:** 2026-08-21.
**Status: RECORDED. SECOND DATA POINT TAKEN 2026-08-21. See the resolution note at the end of this
entry.**

### What happens

`elapsed_within(start, end, limit, unit)` returns one of three values: `within`, `exceeded`, and
`no_end_event`. The third exists because a deadline that has not been met yet and a deadline that
has been missed are different facts, and a shape that returned a boolean would have to pick one.

`conditional_requirement(precondition, requirement_result)` takes `requirement_result` as a
**boolean**.

So composing them, which is what this clause needs, forces the three values through a boolean at the
call site:

```js
conditional_requirement(requested, elapsed_within(...) === 'within')
```

`exceeded` and `no_end_event` both become `false`, and both come out as `breached`.

### What that costs

An obligation that is **outstanding and still in time** is indistinguishable from one that is
**late**. On the expediente copy that is a live case: a cardholder requests the case file, the
issuer has not yet provided it, and the 45 `días naturales` have not yet run. The correct answer is
that nothing has been breached. What comes back is `breached`.

It was caught because the fixture for case 3 originally carried `delivered_at: null` and returned
`breached`, which was not establishable on those facts. The fixture was changed to a genuine late
delivery so that the case asserts something it can support. **The composition defect was left in
place.**

### What a fix would require

Not a new primitive. Three candidates, in increasing order of blast radius:

1. **Widen `conditional_requirement`'s second parameter** from `boolean` to a three-valued result,
   and add a fourth outcome to its result domain for the undetermined case. Every existing call site
   passes a boolean today, so each would need re-reading to decide what its undetermined case is.
   `34-2010/3.6/d/device-address` and `34-2010/3.6/p4/channel` are the other two callers.
2. **A composition rule rather than a primitive change**: require that a three-valued result is
   never narrowed at a call site, and give the register a way to say which of the three a clause
   treats as failure. This moves the decision from the code into the clause entry, where it is
   visible.
3. **Leave it and require a clock in the facts**, so `no_end_event` can be resolved to `exceeded` or
   `not_yet_due` before composition. This is the smallest change to the primitive set and the
   largest change to the fact schema, and it puts a `now` into evaluation, which nothing currently
   has.

### Why it is not fixed yet

Because the measurement has not been taken. The next domain decides which of two things this is:

- **a Banxico artefact**, if no clause elsewhere composes a deadline under a precondition, in which
  case option 3 or a local workaround is proportionate; or
- **a primitive-set defect**, if the pattern recurs, in which case option 1 or 2 is right and doing
  it once, informed by two instances, is better than doing it twice.

Fixing it now would resolve that question by assumption. The observation is cheap to carry and the
generalisation is expensive to unwind.


### RESOLVED AS A PRIMITIVE-SET DEFECT, 2026-08-21

The second domain has been encoded: SI 2017/752 regulation 76 and dependencies, in
`policy-library/psr-2017-752/`. **The pattern recurs, in a different jurisdiction, in a different
instrument, on three clauses:**

- `psr-2017/75/4/supporting-evidence`, an evidence obligation arising only on a claim
- `psr-2017/76/5/b/pisp-compensates`, compensation arising only on liability plus a request
- `psr-2017/76/2/deadline`, a deadline composed under a carve-out

So the question this entry deferred is answered. It is **not a Banxico artefact**. Wrapping a
multi-valued result in a boolean precondition is a shape that recurs whenever a regulation makes an
obligation conditional, which is most of the time.

**Option 1 or option 2 from the list above is now the right fix**, informed by two instances rather
than one. Still not implemented, because implementing it touches every existing call site in both
domains and that is a change to make deliberately rather than at the end of an encoding run.

**What this entry demonstrates, beyond its own subject.** The observation cost one paragraph to
record and nothing to carry. Fixing it on the first instance would have generalised from a single
case and the generalisation would have been unfalsifiable afterwards: whatever shape had been built,
the second domain would have been encoded to fit it.

---

## E2. Two primitives were missing rather than wrong

**Domain:** SI 2017/752 regulation 76.
**Observed:** 2026-08-21.
**Status: RECORDED, NOT ADDED to the shared inventory.**

`ordered_before` and `amounts_equal` were needed and did not exist. They are different kinds of
absence and the difference matters.

**`ordered_before` is an atom the set had only as a composite.** `elapsed_within` measures an
interval against a limit. Comparing two instants for order is more primitive, and `elapsed_within`
cannot express it without inventing a limit the rule does not have. The set was built from the
first regulation's needs and that regulation only ever measured against limits.

**`amounts_equal` is a gap the first domain concealed.** Banxico compares amounts constantly, but
that arithmetic lives inside the engine's own mandate evaluator and was never lifted into the
primitive inventory. The inventory therefore recorded no numeric comparison, and the first
regulation that needed one found nothing. **A primitive set derived from what one encoding happened
to lift is not the same as one derived from what the domain needs.**

Neither is added yet. Whether the shared inventory should carry them is a decision about the
inventory.

### CORRECTED 2026-08-21 by `INVENTORY-AUDIT.md`

**The account of `amounts_equal` above is wrong in its location and wrong in its classification.**

I wrote that the arithmetic lived in the engine's mandate evaluator, so the encoding could not see
it. The audit instrumented both evaluators and read every call site, and found the equality
operation **inside the Banxico encoding itself**, at `banxico-34-2010/evaluate.mjs:103`:

```js
facts.dictamen?.channel === facts.cardholder?.channel_election
```

Equality of two operands, inline, unnamed, serving `34-2010/3.6/p4/channel`. So `amounts_equal` is
**PARAMETERISED over an operation the first domain already performed**, not NEW. It adds a result
domain the inline version lacks and specialises to typed money.

**The engine explanation was true and was not the reason.** The mandate evaluator does hold amount
comparison, it is a real second location, and pointing at it explained the absence adequately
enough that I stopped looking. The nearer instance was one file away in the artifact I had just
written.

**What the corrected version of E2 says:** the inventory recorded what the encoding NAMED, not what
the encoding DID. `ordered_before` survives as genuinely new, checked directly against Banxico.
`amounts_equal` does not. See `INVENTORY-AUDIT.md` for the other ten undeclared operations found the
same way.


---

## E3. Structured markup reduced retrieval cost, not decomposition cost

**Observed:** 2026-08-21, comparing SI 2017/752 (XML) against Banxico 34/2010 (PDF).
**Status: RECORDED as a finding about sources, not a defect.**

SI 2017/752 arrives as XML with provision-level `id` down to sub-paragraph, an `IdURI` per
provision, `RestrictStartDate` at provision level, typed `ukm:UnappliedEffect` amendment records and
four dated point-in-time versions. Banxico 34/2010 is a compiled PDF with no provision identity, no
in-force dates, and amendment notes in prose.

**What the markup bought, measured:** retrieval by provision rather than by page, citation to a
stable identifier rather than a numeral in prose, a version axis that made a replay possible at all,
and a digest per file. Reg 76's operative text was compared byte for byte between 2018-01-13 and
current on the strength of it.

**What it did not buy:** anything about the decomposition. 21 clauses against 19. A comparable
disposition mix. **Six ambiguities in each.** The two encodings cost about the same to write.

**And PSR's decisive ambiguity is semantic, not a unit question.** Banxico's A1 asks what
`Días` means, which better markup could in principle have answered. PSR's P6 asks whether reg
74(1)'s `without undue delay` bars redress independently of the 13-month limb. No markup answers
that, because the sentence is not underspecified in its structure. It is underspecified in what it
requires. Two limbs in one sentence, and the text does not say whether the first is a separate bar.

**The rule: decomposition cost tracks legal language, not markup.** A well-marked source is cheaper
to retrieve, cite, version and replay. It is not cheaper to decide. Any estimate that prices an
encoding off the format of the source is pricing the wrong variable, and the two domains now bound
that: best-case markup and worst-case markup produced the same clause and ambiguity counts.

Corollary for sourcing: **a source can be structurally precise and still leave the operative
question open**, so structural quality is not evidence about how many judgment calls an encoding
will carry.

---

## E4. STANDING RULE: do not fix a pattern on its first instance

**Established:** 2026-08-21, from E1's outcome.
**Status: STANDING RULE for this harness.**

E1 recorded that `conditional_requirement` collapses the three values `elapsed_within` returns, and
deliberately did not fix it. Three candidate fixes were written down and none was applied. The
second domain then produced three more instances, and the deferred question, artefact or
primitive-set defect, was answered by observation.

**Fixing it on the first instance would have made the generalisation unfalsifiable.** Not merely
unproven. Unfalsifiable, and for a specific mechanism: whatever shape had been built, PSR would have
been encoded to fit it, because the encoder reaches for what the set already provides. The second
domain would then have appeared to confirm the shape while carrying no information about whether the
shape was right. **A test whose subject was designed against the hypothesis cannot refute it.**

The audit in `INVENTORY-AUDIT.md` is the same rule applied to the inventory itself, and it paid the
same way. Had `amounts_equal` been added to the shared set when it was first needed, the equality
operation Banxico had been performing inline since the first domain would have stayed invisible, and
a third domain would have found a set that looked complete.

**The rule.** When an encoding needs a shape the primitive set does not have, or reveals a shape the
set gets wrong:

1. **Record it, with the candidate fixes and the reason each is a candidate.** Recording costs a
   paragraph and carries nothing.
2. **Do not implement until a second, independently sourced instance exists.** Independently sourced
   means another regulation, not another clause of the same one.
3. **When the second instance arrives, decide from both.** Two instances distinguish a shape from a
   coincidence; one cannot.
4. **If a second instance never arrives, the entry stays open.** An open entry is a correct
   description of the evidence. A fix on one instance is a guess wearing a shape.

**The exception.** A recorded defect that produces a WRONG ANSWER, rather than a coarse one, is
fixed on sight. E1 collapses three values into two and loses a distinction; nothing it returns is
false. `truthy_present` contradicting `field_present` on `false` is a wrong answer and does not wait
for a second domain.

**The cost this rule accepts:** the first domain ships with a known limitation, and the case tables
carry it. Banxico case 3 does, and it is written into `cases.mjs` beside the fixture. That is the
price, it is visible, and it is smaller than an unfalsifiable generalisation baked into the layer
everything else is measured against.
