# Primitive reuse log

One entry per observation about the primitive set, made while encoding a domain. The log exists so
that a shape that looks wrong in one domain is not fixed there and then, before there is evidence
about whether it is wrong generally.

**The rule this log encodes: one domain is an anecdote, and one representation is a blind spot.** A
primitive that fits awkwardly in the first regulation encoded against it may be too narrow, or the
regulation may be unusual, and only a second domain separates those. But a second domain cannot see
a value that was never derived, because every domain inherits the same gap and agrees with the
first. **Re-expressing the same logic in a different shape is what finds those.** An entry waits for
whichever arrives first. See E4, which was rewritten once the two turned out to do different work.

---

## E1. `conditional_requirement` collapses a distinction `elapsed_within` draws

**Domain:** Banxico Circular 34/2010, numeral 3.6.
**Clause:** `34-2010/3.6/p5/expediente-copy`.
**Observed:** 2026-08-21.
**Status: CLOSED 2026-08-22. Fixed in both domains. See the closure note at the end of this entry.**

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

> **THIS NOTE WAS WRONG, AND IS KEPT SO THE ERROR IS VISIBLE. Corrected 2026-08-22.**
>
> The three clauses listed below do not lose information, measured by reading every call site:
> `75/4/supporting-evidence` narrows `field_present`, which has two values;
> `76/5/b/pisp-compensates` passes a boolean; and `76/2/deadline` returns `elapsed_within`
> **directly** rather than under a precondition, so all three of its values reach the output.
>
> **What recurred here was the wrapping SHAPE, not the defect.** Wrapping a result in a precondition
> is common. Wrapping a result that carries MORE STATES THAN THE WRAPPER CAN REPRESENT is the defect,
> and it is much rarer: eight `conditional_requirement` call sites exist in the estate and two of them
> do it.
>
> **I recorded the recurrence of a shape and wrote it up as recurrence of a defect.** Those are
> different claims, and the second does not follow from the first. The error was invisible because
> both are true sentences about the same three clauses, and only the second justified the conclusion
> the note reached.
>
> **The real second-domain instance is `psr-2017/76/1/b/restore`**, which this note never named. It
> narrows `held_judgment` through `=== 'affirmed'`, so a restoration nobody had assessed came back
> `breached`. It is the more useful instance, because it shows the defect is not about time.
>
> The conclusion the note drew, that this is a primitive-set defect rather than a Banxico artefact,
> **survives on the corrected evidence**. It was reached from the wrong three clauses.

The second domain has been encoded: SI 2017/752 regulation 76 and dependencies, in
`policy-library/psr-2017-752/`. **The pattern recurs, in a different jurisdiction, in a different
instrument, on three clauses:** (SUPERSEDED, see above)

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

### CLOSED 2026-08-22

**Option 3, plus the minimum of option 1. Neither alone was sufficient, and the log's own resolution
note was wrong about why.**

#### The measurement that decided it

Every `conditional_requirement` call site in the estate was read and its second operand classified by
the cardinality of what it passes. **Eight call sites. Exactly two narrow a multi-valued result:**

- `34-2010/3.6/p5/expediente-copy`, narrowing `elapsed_within`'s three values. The instance this
  entry was opened on.
- `psr-2017/76/1/b/restore`, narrowing `held_judgment` through `=== 'affirmed'`, so a restoration
  **nobody had assessed** came back `breached`.

The other six pass genuinely two-valued expressions and lose nothing.

**This corrects the resolution note above.** It named three PSR clauses as the second domain's
instances. Measured, **none of the three loses information**: `75/4/supporting-evidence` narrows
`field_present`, which has two values; `76/5/b/pisp-compensates` passes a boolean; and
`76/2/deadline` returns `elapsed_within` DIRECTLY rather than under a precondition, so all three
values reach the output. What recurred there was the wrapping SHAPE, not the defect. I recorded the
recurrence of a shape and wrote it up as recurrence of a defect, which is a different claim.

The real second-domain instance is `76/1/b/restore`, which the note did not name, and it is the more
useful one: it shows the defect is **not about time**. That is what makes the decoupled design
obviously right, and it is the second domain's actual contribution.

#### Why option 1 or 2 alone could not work

**Neither reaches `34-2010/3.6/p7/firmeza`,** which does not use `conditional_requirement` at all. Its
decision table returned `attached` from `no_end_event` on a note asserting the period had elapsed.
**There the distinction was never derived, so there was nothing for a composition rule to preserve.**
`elapsed_within` returns `no_end_event` whenever the end event is absent, whether the period has run
or not, and no rule about narrowing can split a value that arrived already merged. Only a clock can.

And option 1 alone would have been **wrong in the same direction as the defect it fixed**: carrying
`no_end_event` through composition to `outstanding` asserts that the obligation is still in time,
which without a clock is exactly as unestablished as `breached` was.

#### Why option 3 alone could not work either

`not_yet_due` still has to survive composition, and `conditional_requirement` had no outcome for it.
So the fourth outcome from option 1 is needed, at its minimum size.

**Boyd's read was right and the code strengthens it.** Making the clock an explicit fact is the same
discipline as registering an ambiguity: **absent is a state, never a default, and never `Date.now()`.**
A run stays reproducible, and a determination records the instant it was made against.

#### What was implemented

`elapsed_within` gains a fifth operand `now` and two result values. With a clock and no end event it
returns `not_yet_due` or `overdue`; without one it returns `no_end_event`, which now means only that
the question cannot be answered from these facts. **The same predicate decides `within` and
`not_yet_due`,** so the two vocabularies cannot disagree about where the boundary is.

`conditional_requirement` takes a **closed four-token vocabulary** (`true`, `false`, `'outstanding'`,
`'undetermined'`) and **throws on anything else**. It is deliberately NOT coupled to
`elapsed_within`'s tokens: mapping one primitive's result domain into these four is the clause's
reading, so it stays at the call site beside the clause note. That is option 2's instinct, applied
where it costs nothing, without building option 2's register machinery.

`34-2010/3.6/p7/firmeza` gains a fourth outcome, `not_yet_attached`. Collapsing it into
`not_attached` would have repeated this very defect one level up: a timely dictamen having PREVENTED
finality, and the period simply not having run yet, are different facts.

#### What it cost

| | |
|---|---|
| new primitives | **none**, which was the stop condition |
| primitive definitions changed | 4, being 2 per domain, because the primitives are copied rather than shared |
| call sites changed | **5**: 2 in Banxico, 3 in PSR |
| call sites deliberately untouched | 6, the ones passing genuinely two-valued expressions |
| fact schema | **shape changed by one optional field**, `clock.now`, absent by default |
| registers changed | `primitives.json` two entries, `facts.json` one field, `clauses.json` table 12 rows to 18 and one new outcome token |
| firmeza table cells changed | **5 of 18**, all traced to the defect |
| case results changed | **none**, in either domain |

**That last two rows together are the shape of this fix.** It changes five cells of a decision table
and no case result, because no fixture ever reached the rows it corrects. A defect no test touches is
still a defect; it is just one that only a completeness check over the input domains can find.

The four primitive definitions are two copies of the same change, and **that is a defect this fix
does not address**: `_primitives/` has no shared module, so every domain carries its own copy and a
future correction has to land twice. Recorded here rather than fixed, on this log's own rule.

#### Did E4's deferral rule hold?

**Yes, but not for the reason this entry predicted, and the honest answer is more interesting than a
clean yes.**

Fixing on the first instance would have produced **option 1, coupled to `elapsed_within`'s tokens**,
because that is the only shape the first instance motivates: one clause, narrowing one time-valued
result. From the code, that fix would have been wrong twice over. It would not have reached firmeza,
and it would have returned a confident `outstanding` where the facts support only `undetermined`.

**What the second domain actually contributed was not confirmation.** It contributed a narrowing of
`held_judgment`, a primitive with nothing to do with time, which is what makes the abstract
four-token vocabulary obviously right rather than a guess. Had PSR never been encoded, the natural
fix would have hard-coded time semantics into a general composition primitive.

**And the thing that forced the clock was neither domain.** It was building the firmeza decision
table, in the FIRST domain, weeks after this entry was opened. Laying the rows side by side made
visible that two of them asserted elapsing that nothing established. **A chain hid it; a table could
not.**

So the rule held, and the mechanism was not the one the rule describes. The value of waiting was not
that a second instance confirmed the first. It was that **two independent later observations, one
from another jurisdiction and one from a change of representation, between them ruled out the fix
the first instance would have suggested.** Waiting is worth it because you cannot know in advance
which later observation will be the one that matters.


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

## E4. STANDING RULE: a recorded defect waits for a second instance OR a change of representation

**Established:** 2026-08-21. **Rewritten 2026-08-22**, after E1 was closed and the original wording
turned out to describe a mechanism that did not happen.

### The rule

**When an encoding reveals a shape the primitive set gets wrong, record it and do not fix it until
either a second independently sourced instance exists, or the same logic has been re-expressed in a
different representation. Whichever arrives first.**

Both are permits to fix, and they are not interchangeable, because **they rule out different wrong
answers**:

- **A second instance tests whether the shape generalises.** It answers: is this primitive too
  narrow, or is this regulation unusual? Only another source can separate those.
- **A change of representation tests whether the value was ever derived.** It answers: is this
  information being lost in composition, or did it never exist? A second instance cannot see that at
  all, because every instance inherits the same missing derivation and agrees with the first.

The original version of this entry required only the first. E1 shows why that is not enough.

### E1 as the worked example

**What the first instance showed.** One clause, `34-2010/3.6/p5/expediente-copy`, forcing
`elapsed_within`'s three values through `conditional_requirement`'s boolean operand.

**What fixing on it would have produced.** Option 1 as this log originally framed it: widen
`conditional_requirement` to accept the time tokens. From the code, that fix is wrong twice over.

- **It never reaches `34-2010/3.6/p7/firmeza`**, which does not call `conditional_requirement`. The
  most consequential instance in the estate would have been untouched by the fix written for the
  defect it has.
- **It answers confidently where the facts do not support an answer.** Carrying `no_end_event`
  through composition to `outstanding` asserts the obligation is still in time. With no clock that is
  exactly as unestablished as the `breached` it replaced. **The fix would have moved the error, not
  removed it**, and its new position is harder to see because `outstanding` reads like care.

It would also have **hard-coded time semantics into a general composition primitive**, since one
time-valued clause is the only thing the first instance motivates.

**What the second instance contributed.** Not confirmation. The second domain produced
`psr-2017/76/1/b/restore`, narrowing `held_judgment`, **a primitive with nothing to do with time**.
That is what makes an abstract four-token vocabulary obviously right rather than a guess. Without it
the natural fix couples two primitives that have no business knowing about each other.

**What the change of representation contributed, and it was the decisive one.** Neither domain forced
the clock. **Rewriting firmeza's if/else chain as a decision table did**, in the FIRST domain, weeks
after this entry was opened. Laying the rows side by side made visible that two of them returned
`attached` on a note asserting an elapsing that nothing established. The chain had been doing that
since it was written, in an `else` arm, where no reader and no test could see it.

**No number of further domains would have found that.** Every domain composing a deadline inherits
the same undrawn distinction and produces the same plausible answer. The defect was invisible to
instance-counting and visible immediately to a change of shape.

### How to apply

1. **Record the observation with candidate fixes and their blast radius.** A paragraph, carried at no
   cost. Do not implement.
2. **Fix when a second independently sourced instance arrives**, meaning another regulation, not
   another clause of the same one. Decide from both.
3. **Or fix when the logic is re-expressed** as a table, a schema, an enumeration, anything that puts
   the cases side by side. If the re-expression makes a case unwritable, or forces a row to state a
   premise nothing establishes, that is the same permit.
4. **An entry with neither stays open.** An open entry is a correct description of the evidence.

### The exception, unchanged

**A recorded defect that produces a WRONG ANSWER, rather than a coarse one, is fixed on sight.** E1
collapsed three values into two and lost a distinction; nothing it returned was false until it
reached firmeza. A guard that contradicts a declared primitive on `false` is a wrong answer and does
not wait.

### What this rule costs, stated honestly

The first domain ships with a known limitation and the case tables carry it. Banxico case 3 did, and
it is written into `cases.mjs` beside the fixture. E1 sat open for a day across two domains.

**And the cost is not symmetric with the benefit.** Waiting did not confirm the first instance. It
produced two independent later observations that between them **ruled out the fix the first instance
would have suggested.** That is the argument for the rule: you cannot know in advance which later
observation will be the one that matters, and a fix shipped early forecloses both.

---

## E5. The primitive set has no shared module, so every correction lands twice

**Domains:** both. **Observed:** 2026-08-22, while closing E1.
**Status: RECORDED, NOT FIXED. One instance and one representation, so it waits under E4.**

### What happens

`policy-library/_primitives/` holds this log and nothing else. There is no module. Each domain's
`evaluate.mjs` carries its **own copy** of every primitive it uses, and the PSR file says so at the
top: `Primitives are the Banxico set, imported by copy rather than by reference because there is no
shared package yet.`

So E1's fix edited **four primitive definitions to make two changes**: `elapsed_within` and
`conditional_requirement`, once in each domain. The two copies of each are now identical in intent
and were edited separately, by hand, in the same session.

### What it costs

**Not duplication. Divergence that nothing detects.** Two copies edited together stay together only
as long as whoever edits them remembers there are two. Nothing in the repository compares them:

- `check-coverage.mjs` compares a register against a live run **within one domain**.
- `check-firmeza-table.mjs` is Banxico only.
- `primitives.json` lives in `banxico-34-2010/` and **describes primitives PSR also uses**, while PSR
  has no primitive register at all. The declaration and one of its two subjects are already in
  different directories.

The PSR copy of `elapsed_within` already differs deliberately: it carries a `months` unit Banxico
never needed, and it uses `new Date` where Banxico uses `Date.parse`. **So a diff of the two files is
not a usable check today**, because legitimate and accidental differences look the same. That is the
part worth recording: the fix is not just "extract a module", it is "decide which differences are
allowed to exist".

### Candidate fixes, in increasing order of blast radius

1. **A drift check, no extraction.** A script that extracts each named primitive from both files and
   compares them, with an explicit allowlist of sanctioned differences (the `months` unit). Smallest
   change, keeps the copies, and makes divergence loud. Does not stop a third domain adding a third
   copy.
2. **A shared module in `_primitives/`, imported by both.** Removes the copies. Forces a decision
   about the `months` unit and the `Date.parse` difference, which is work this entry has not done.
   Also breaks the property that each domain reads standalone, which the audit relied on when
   establishing the boundary and which `evaluate.mjs` already traded once for the decision table.
3. **A shared module plus a single primitive register.** Moves `primitives.json` out of
   `banxico-34-2010/` to sit with the module, so the declaration is not inside one of its subjects.
   Largest change; the only one that fixes the register's location as well as the code's.

### Why it is not fixed yet

Under the rewritten E4 this has **one instance and one representation**. The instance is E1's fix
landing twice. There is no second: no other correction has yet had to cross both copies, and no
change of representation has put the two copies side by side where a discrepancy would show.

**Option 1 is the cheap one and would supply the missing representation itself**, which is a reason
to think it arrives first rather than a reason to skip the wait. If a second correction has to land
twice before then, that is the second instance and the entry opens.

**One thing that is NOT deferred:** a third domain would add a third copy and make this strictly
worse. That is a reason not to start one before this entry closes, not a reason to fix it tonight.
