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
**Status: STANDING RULE, in force. Not a defect and not awaiting anything.**

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

**Read with E10**, which says what counts as an instance. Counting instances of a FORM rather than
of an operation trips this rule's threshold on a population that does not exist.

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

---

## E6. Two locally reasonable readings of the same question, in two domains, disagreeing

**Domains:** both. **Observed:** 2026-08-22, characterising the composition shapes before naming them.
**Status: FIXED SAME DAY under a ruling. Recorded because of HOW it was found, not what it was.**

### What happened

Both domains remapped `held_judgment`'s result domain onto a boolean-ish value at a call site. The
two inline versions disagreed on one token:

| `held_judgment` returns | Banxico `3.6/p4/language` | PSR `76/1/b/restore` |
|---|---|---|
| `affirmed` | `true` | `true` |
| **`denied`** | **`undetermined`** | **`false`** |
| `not_assessed` | `undetermined` | `undetermined` |

Banxico's was `=== 'affirmed' ? true : 'undetermined'`. So **an explicit denial and an unanswered
question reached firmeza identically**, on the clause deciding whether a credit becomes irreversible.
PSR's kept them apart.

**Ruled 2026-08-22: PSR's treatment is correct.** `denied` is a person having answered;
`not_assessed` is nobody having answered. Collapsing them discards a judgment that was actually made.
Banxico changed.

### Why this entry exists

**Neither version is wrong on its face.** Read alone, `=== 'affirmed' ? true : 'undetermined'` looks
careful: it declines to conclude from anything but an affirmation. Read alone,
`=== 'affirmed' ? true : === 'not_assessed' ? 'undetermined' : false` looks careful too. **Nothing in
either file is a defect until the two are put next to each other.**

No second instance would have found this. Both domains already HAD instances; the instances were the
problem. No test would have found it either: each evaluator was internally consistent, and no fixture
carried an explicit `denied` on that clause. It surfaced when the same shape was characterised across
both domains in one table, ahead of naming it.

**This is E4's second trigger doing exactly what the rewritten rule says it does.** A change of
representation, here putting two inline versions of one shape side by side, tests something instance
counting cannot: not whether a shape generalises, but whether two existing implementations of it
agree. The rewrite predicted that. This is the first observation taken after it and it behaved as
predicted, which is better evidence for the rewrite than the case that motivated it.

### The structural fix, beyond the ruling

`remap_result_domain` is now a named shape taking its mapping **from the call site**, and the mapping
must be **total over the source domain**. An unlisted token throws. A source domain that is genuinely
open, which `held_judgment`'s is, must declare `$unmapped` explicitly.

**So the shape now makes this class of divergence unwritable.** The old versions differed in an
`else` arm, which is invisible because it has no name and no enumeration. Both readings are now
written out token by token, and a reader comparing the two domains sees a table rather than two
ternaries.

---

## E7. A disjunction that collapses `undetermined`

**Domain:** SI 2017/752. **Clause:** `psr-2017/76/1/trigger`, via the `notBarred` operand.
**Observed:** 2026-08-22. **Status: FIXED INLINE, NOT NAMED. One instance, one domain, so the SHAPE
waits.**

### What happened

`conjunction_over_results` is a named primitive and carries `undetermined`. Its dual was a bare `||`:

```js
const notBarred = o['.../74/1/thirteen-months'].result === 'within'
  || o['.../74/2/information-failure'].result === 'satisfied';
```

Measured with nobody notified and no clock supplied: `thirteen-months` returns `no_end_event`,
meaning it cannot be told whether the 13 month bar bit; `information-failure` returns
`not_applicable`. The disjunction produced `false`, and **the refund duty reported as not triggered
on facts that establish nothing.**

Fixed to three-valued: `true` dominates, then `undetermined`, then `false`. The trigger now returns
`undetermined` on those facts.

### Why the shape is not named

**It has one instance in one domain.** Banxico has no disjunction over clause results at all. Naming
it now would be generalising a composition shape from a single site, which is the error this log
exists to prevent, and it would freeze whichever three-valued semantics one clause happened to need.

**The defect is fixed and the shape waits.** Those are separable, and keeping them separate is the
point: E4's exception covers a recorded defect that produces a wrong answer, which this did, but the
exception licenses fixing the ANSWER, not naming the abstraction.

It waits for a second instance or a change of representation. A second Banxico clause composing two
results disjunctively would be the first. So would writing the truth table out, which is what
finally showed the conjunction's dual was missing at all.

---

## E8. `select by predicate` is named in one domain and inline in the other

**Domains:** both. **Observed:** 2026-08-22, in the composition recount.
**Status: CLOSED 2026-08-22 WITH NO CHANGE. The entry's own premise was wrong: the three instances are
not three instances of one operation. See the closure at the end.**

### What happens

Choosing between two readings by one predicate appears three times, in two domains, in three forms:

| site | form |
|---|---|
| Banxico, the deadline period | `select_parameter_by_predicate(abroad, ...)`, **a named primitive** |
| Banxico `3.6/p5/foreign-deadline` | `abroad ? 'selected_180_calendar_days' : 'selected_fourth_paragraph'`, inline |
| PSR `76/2/deadline` | `carve ? <carve-out reading> : elapsed_within(...)`, inline |

The first two use **the same predicate in the same clause group**, one through a primitive and one
inline, which is why neither looked like a pattern on its own.

**This also corrects `INVENTORY-AUDIT.md`,** which called `branch_label` a one-off that should stay
unnamed. It is not a one-off. It is `select by predicate` with a label as its payload, and the
audit missed it because it classified by what the operation RETURNS rather than by what it DOES.

### Candidate fixes

1. **Use the existing primitive at the Banxico inline site only.** Smallest, and leaves PSR inline,
   which is a shape landing in one domain and not the other. That is the thing E5 warns about.
2. **Copy `select_parameter_by_predicate` into PSR and use it at all three.** Consistent, and adds a
   fourth copied primitive definition, making E5 worse by one.
3. **Promote it to a composition shape** alongside the four named today, taking thunks so both arms
   are not evaluated. Largest, and the only one that does not deepen E5.

Option 3 is probably right and is a decision about the shape layer rather than about either
regulation. Not taken tonight.

### CLOSED WITH NO CHANGE, 2026-08-22

**The three do not disagree, and there is nothing to build. This entry merged three operations by
the shape of their code.**

#### The disagreement check passed, and what it found instead

All three predicates are normalised to a strict boolean by `=== true` before selection, so the three
sites cannot disagree about an unanswerable predicate. Measured, they behave identically.

**But they agree in a direction worth recording.** An absent fact is read as a decided `false`:

| `operation.executed_abroad` | `p5/foreign-deadline` | `p4/deadline` | firmeza |
|---|---|---|---|
| `true` | `selected_180_calendar_days` | `within` | `not_attached` |
| `false` | `selected_fourth_paragraph` | `exceeded` | `attached` |
| **`null`** | `selected_fourth_paragraph` | `exceeded` | **`attached`** |
| **absent** | `selected_fourth_paragraph` | `exceeded` | **`attached`** |

**Nobody recorded where the operation happened, and the credit becomes irreversible.** The 45 day
period is applied because the absence of `abroad` is read as `domestic`. That is E1's class one layer
up: a decision taken on a fact nothing establishes. PSR's carve-out predicate has the same shape but
not the same consequence, because its false arm measures a deadline that returns `no_end_event`
honestly. Opened as E9.

#### Why neither option in the entry is right

Classified by what they DO rather than by their syntax, the three are three different operations:

| site | what it actually does |
|---|---|
| Banxico deadline period | selects a PARAMETER OBJECT that feeds `elapsed_within`. Never a clause result. Plumbing. |
| Banxico `p5/foreign-deadline` | renders a boolean into two of the clause's own tokens. The clause's whole content is which paragraph applies. |
| PSR `76/2/deadline` | selects between two COMPUTATIONS, each a different reading, and the selected one's result is the clause result. |

Only the third is "select between two readings by a predicate", and **it has one instance**. Under E4,
one instance waits.

There is a second reason, and it is stronger. **The general form is exactly what Ruling 2 refused to
build.** `applicability_gate` and `guard_on_unresolved` are already select-by-predicate with the false
arm fixed, one to `not_applicable` and one to `undetermined`, and Ruling 2 hard-coded those arms
precisely so that "the requirement failed" and "the requirement never applied" could not share a shape
name. Adding the general form beside them re-creates that hazard: the next author writes
`select_by_predicate(pred, () => x, () => 'not_applicable')` and the distinction is gone.

They also differ mechanically. `select_parameter_by_predicate` is EAGER and selects values;
`applicability_gate` and `guard_on_unresolved` take thunks and select computations. Merging them would
change when the unselected arm runs.

**So: neither layer, and no new layer.** Option (a) contradicts a standing ruling, option (b) deepens
E5 to serve an instance that does not need it, and the honest third answer is that the population was
never three.

#### What this entry got wrong, and it is the same error twice

I opened E8 having noticed three ternaries on a predicate. **I classified by the shape of the code.**
`INVENTORY-AUDIT.md` had already made the same error in the other direction, calling `branch_label`
and `truthy_present` two separate one-offs when they are one operation with three instances, because
it classified by RETURN TYPE.

And E1's resolution note made it a third time, recording the recurrence of a wrapping SHAPE as
recurrence of a DEFECT.

**Three misclassifications, one cause: naming a pattern by how it is written rather than by what it
does.** The corrective is cheap and mechanical, and it is now written into `INVENTORY-AUDIT.md`
beside the passage it corrects: before recording a shape, state what the operation DOES in a sentence
that does not mention its syntax or its return type. All three of these survive that test only by
falling apart.

---

## E9. An absent predicate is read as a decided false

**Domains:** both, with different consequences. **Observed:** 2026-08-22, closing E8.
**Status: FIXED 2026-08-22 under a ruling, with one further instance found by the sweep and two reported and not fixed. See the closure.**

`facts.operation?.executed_abroad === true` and
`f.provider?.reasonable_grounds_to_suspect_fraud === true` both normalise an absent fact to `false`
before it reaches a selection. The normalisation is correct JavaScript and hides a question.

**In Banxico it decides.** With `executed_abroad` absent, the fourth paragraph's 45 day period is
applied, a dictamen delivered on day 120 reads as `exceeded`, and firmeza attaches. Nobody said where
the operation happened.

**In PSR it does not.** With the carve-out predicate absent, the deadline is measured and returns
`no_end_event`, which is honest.

Candidate fixes, in increasing order of blast radius:

1. **Make the predicate three-valued at the Banxico site only.** `executed_abroad` absent yields
   `undetermined` for `p5/foreign-deadline` and the deadline clause. Smallest, and leaves the pattern
   in place everywhere else.
2. **A shape for a three-valued predicate**, so an unanswerable predicate propagates rather than
   collapsing. Larger, and it is close enough to `guard_on_unresolved` that the two would need
   distinguishing carefully.
3. **Require every fact feeding a selection to be declared non-nullable in the register**, and check
   it. Moves the problem to authoring time and would have caught this before any run.

Not fixed. No worked case has `executed_abroad` absent, so this would change nothing visible today,
which is the same reason E1 sat unfixed and is not a reason to leave it.

### CLOSED 2026-08-22, and the sweep found one more

**Ruled: absent is not domestic.** A period cannot be selected from a fact nobody supplied.

`field_present` separates the three inputs, because a recorded `false` is present and an absent field
is not. Measured, before and after:

| `operation.executed_abroad` | `p5/foreign-deadline` | `p4/deadline` | firmeza |
|---|---|---|---|
| `true` | `selected_180_calendar_days` | `within` | `not_attached` |
| `false` | `selected_fourth_paragraph` | `exceeded` | `attached` |
| `null` | `selected_fourth_paragraph` to **`undetermined`** | `exceeded` to **`undetermined`** | `attached` to **`undetermined`** |
| absent | `selected_fourth_paragraph` to **`undetermined`** | `exceeded` to **`undetermined`** | `attached` to **`undetermined`** |

**`undetermined` survives to firmeza**, through the table's existing `deadline: undetermined` rows.
The two recorded values are untouched, and no worked case moved.

### The sweep: four facts, and the instrument had the defect it was hunting

Both domains were swept for any predicate where an absent fact takes a decided arm. **The first
version of the sweep found E9 itself invisible.** It compared the absent case against the
recorded-`false` case and skipped anything that matched, which is exactly the pair E9 says are
indistinguishable. The sweep silently skipped the defect it was written to find.

Corrected to: a clause DEPENDS on a field if its result differs between the field's two recorded
values, and the question is then whether ABSENT gives a decided result for those clauses. Recorded
rather than quietly repaired, because it is the third time in this estate an instrument has been
built with the shape of its own subject.

**Four facts, eight clause results. PSR: none.**

| fact | clause | recorded values give | absent gives | |
|---|---|---|---|---|
| `operation.executed_abroad` | `p5/foreign-deadline`, `p4/deadline`, `p7/firmeza` | both decided | decided | **FIXED, E9** |
| `operation.auth_factors` | `2.6/a/two-factor` | `met` / `not_met` | `not_met` | **FIXED** |
| `dictamen.evidence_of_factors_present` | `3.6/a/evidence`, `3.6/p4/floor` | `present` / `absent` | `absent` | reported, see below |
| `dictamen.verification_method_stated` | `3.6/a/verification-method`, `3.6/p4/floor` | `present` / `absent` | `absent` | reported, see below |

**`auth_factors` was fixed with E9** and the same distinction. An absent list returned `not_met`,
asserting the two-factor requirement failed on a fact nobody supplied. **A RECORDED EMPTY LIST still
returns `not_met`**, which is right: it says no factors were used. `field_present` keeps them apart,
because an empty array is present.

### The two that were reported and not fixed, and why that is a scope decision

`3.6/a/evidence` and `3.6/a/verification-method` have the same defect: an absent boolean returns
`absent`, which is what a recorded `false` returns, and both then make the floor `floor_not_met`.

**Fixing them cannot be done with the existing shapes.** The clause result domain is
`present`/`absent`, two values, so a third state needs a third token. That token then has to reach
`34-2010/3.6/p4/floor`, and `open_set_floor` takes booleans and returns `floor_met`/`floor_not_met`.
**It cannot carry `undetermined`.** So the fix is a primitive widening of exactly the shape E1
required, and it should be its own decision rather than a rider on E9.

There is also a standing ruling on those two call sites from 2026-08-21, that the inline ternary is
correct and `field_present` is the wrong repair because it would rule a dictamen stating no evidence
as conforming. **That ruling stands and is not what this is about**: it settled which of two
two-valued operations to use, and this is the separate question of whether a third value is needed.

Opened as the next entry when someone rules on it. Not started.

---

## E10. STANDING RULE: name an operation by what it does, never by how it is written

**Established:** 2026-08-22, from three misclassifications in this estate. Companion to E4.
**Status: STANDING RULE, in force. Not a defect and not awaiting anything.**

### The rule

**Before recording a shape, state what the operation DOES in one sentence that mentions neither its
syntax nor its return type. If the sentence cannot be written without saying `a ternary on a
predicate` or `returns a label`, the grouping is by FORM and is not yet a finding.**

### Why it is a rule and not an observation

Three entries in this log and its audit were wrong the same way, in three different directions:

| recorded as | the sentence that survives the test | what it actually was |
|---|---|---|
| `branch_label` and `truthy_present`, two separate one-offs | renders a boolean into two of the clause's own result tokens | ONE operation, three instances, and it belongs to the primitive layer rather than the shape layer |
| E8, three instances of select-by-predicate | none: the three need three different sentences | three different operations sharing a ternary |
| E1's resolution note, three PSR instances of the defect | wraps a result carrying more states than the wrapper can represent | one instance, and a different clause than the three named |

**Twice by return type, once by syntax.** Each was a true statement about the code that did not
support the conclusion drawn from it.

### What it costs to get wrong

The failures are not symmetrical and both are expensive.

**Splitting one operation into several one-offs** makes each look too rare to name, so a recurring
shape stays unnamed and its instances drift apart. That is how the two domains came to disagree about
`denied`, which is E6.

**Merging several operations into one shape** manufactures a population that was never there, and the
fix invented for it generalises from a case that does not exist. E8 would have added a fifth
composition shape serving one real instance, and that shape would have re-created the hazard Ruling 2
closed by hard-coding the closed arms of `applicability_gate` and `guard_on_unresolved`.

### How it relates to E4

E4 says WHEN to fix: a second instance, or a change of representation. **E10 says what counts as an
instance.** They compose badly if only one is applied: counting instances of a form rather than of an
operation makes E4's threshold trip early on a population that does not exist, which is exactly what
E8 did.

---

## E11. A content hash over a non-deterministic source pins a fetch, not a document

**Domains:** PSR, and every domain that pins a retrieved source. **Observed:** 2026-08-23.
**Status: MEASURED AND CLOSED for the policy library. OPEN as a question about `policyRef.hash`.**

### What happens

legislation.gov.uk does not serialise XML attributes in a stable order. Measured across regulations
67, 74, 75 and 76: **twelve fetches, three request shapes each, identical byte counts within each
provision, twelve different sha256 digests.** The content is identical every time. Sorting attributes
within every element gives **one digest per provision, identical across all three shapes.**

Three fetches of the SAME shape agree, which is why the original provenance note could observe one
provision twice in a browser session and record no variation. That observation was true and did not
generalise, and it is the reason the instability sat unnoticed.

**Banxico's PDF is stable**, returning its original pin on all three fetches. A static file has no
serialisation freedom to exercise. So this is a property of a source, not of pinning, and a sweep is
the only way to know which kind a given source is.

### Fixed in the library

`_sourcing/canonicalise-xml.mjs` normalises attribute order and nothing else, and states for each
omission why: whitespace because it is significant in mixed content, namespace prefixes because
doing it with a regex would corrupt text that merely looks like one, attribute values and element
order because a difference there is a document that differs. **It is not C14N and says so.** The four
PSR provisions are re-pinned under it, with the fetch digests kept alongside and relabelled.

### The part that is not about PSR

**`policyRef.hash` is the same construction.** A decision attestation cites the policy it applied by
content hash, and `attestation.ts:308` states the reason plainly: **`hash` is what fixes the
reference.**

`hashMethod` is carried and, by the convention's own note at `attestation.ts:120`, is **named and
never defaulted** because a hash whose method is assumed is not a claim. That reasoning is right and
it stops one step short: **naming the digest algorithm does not name the canonicalisation**, and
`sha256` over `the document` is well defined only if the bytes are.

Where a decider and a verifier fetch the same policy from a source like this one, they compute
different hashes for the same document. A verifier comparing them would report a policy mismatch,
which reads as **the decider applied a different policy version**. That is a false negative on a
verification surface, and this estate already holds that a false negative there is the worst answer
such a surface can give.

**Is the verify path exposed today? Latently, not actively.** Nothing recomputes or compares a
policyRef hash: `attestation.ts:297` declares
`OBSERVATION_BOUNDARY_DOES_NOT_INSPECT_POLICY_REF = true`, and the ruling over 446 live records was
convention plus adoption measurement rather than enforcement. **So no verifier fails today because no
verifier checks.** It becomes live the moment one does, and the convention is actively encouraging
issuers to put more structured fact inside the one object nothing inspects.

### THE ORDER IS PART OF THE DESIGN, and it is counter-intuitive

**Third state first. Field second. Enforcement last.** Someone will otherwise do it in the intuitive
order, add the field, and create the defect they were preventing.

**Why the field must not ship first.** `payment-host.ts` compared two references and had two outcomes:
same, or differ and deny `POLICY_MISMATCH`. Add `canonicalization` to that and every attestation
issued to date lacks it, so an absent one falls into the `differ` arm and fires `POLICY_MISMATCH` on
documents that MATCH. The field would manufacture the false negative it exists to prevent, on 100
percent of existing traffic, and the failure would read as `a decision correctly made under the wrong
policy`.

**Shipped 2026-08-23: the third arm, before the field.** `POLICY_REF_NOT_COMPARABLE`, established
BEFORE equality, because two digests are equal or unequal only if they are digests of the same thing
computed the same way. It has a reachable trigger today without any new field: **`hashMethod`
disagreement, which was carried on both sides and compared by nothing.**

Measured before and after, on the same probe:

| case | before | after |
|---|---|---|
| same id, same digest string, DIFFERENT method | **ALLOWED, no refusal at all** | `POLICY_REF_NOT_COMPARABLE` |
| different digest, same method | `POLICY_MISMATCH` | `POLICY_MISMATCH` |
| different digest AND different method | `POLICY_MISMATCH` | `POLICY_REF_NOT_COMPARABLE` |

**The first row is the one that mattered and it was live.** Two references naming different methods
whose digest strings happened to match were read as the same policy and the payment proceeded.

The `POLICY_MISMATCH` message said `Both are compared as opaque strings and neither is parsed or
fetched`, which was true and became misleading the moment a third outcome existed. It now states that
comparability is established separately and first, so reaching it means the two are comparable and
differ.

**Remaining sequence, neither step taken:** add `canonicalization` as an optional field and measure
adoption through `policyref-adoption.ts`, then refuse its absence at issuance once adoption makes
that cheap. An absent one routes to the third arm, never to `differ`.

### A correction to how this entry was first written

The entry said nothing recomputes or compares `policyRef.hash`. **That was true of the ENGINE and
false of the estate.** `attestation.ts:297` declares
`OBSERVATION_BOUNDARY_DOES_NOT_INSPECT_POLICY_REF = true`, and I read the engine's boundary as the
whole answer. **PaymentHost compares it at `payment-host.ts:1129` and denies on mismatch**, which is
what made the exposure live rather than theoretical and is why the third arm ships now rather than
with the field.

The two claims differ by which component was surveyed, and the first was reached by stopping at the
one whose source comment answered the question directly.

**Not changed, as scoped.** The candidate fixes, none taken:

1. **Name the canonicalisation alongside the method.** `hashMethod: 'sha256'` becomes something that
   says what was hashed, for instance a method plus a canonicalisation identifier. Smallest change to
   the type, largest change to existing traffic, and it refuses nothing today because nothing checks.
2. **Say it in the convention rather than the type.** Tell issuers that a hash over a source that
   serialises non-deterministically pins their fetch. Costs nothing and enforces nothing, which is
   the same trade the existing convention took.
3. **Have the verifier canonicalise before comparing.** Moves the problem to whoever compares, which
   is nobody today, and requires the verifier to know the source's format.

This entry has **one instance and one representation**, so under E4 the FIX waits. What does not wait
is the measurement, because the exposure was invisible until somebody fetched the same document twice
in two different ways.

---

## E12. A measurement taken on the branch you are standing on

**Observed:** 2026-08-23. **Status: RECORDED. One line, and it is the line.**

**A measurement taken on the branch you are standing on is a claim about that branch until you
check.**

I reported that the payment server's suite gate `aborts at invocation 2 on a pre-existing
AppliedBoundReason typecheck break, leaving 121 invocations unrun`, and put that caveat into a commit
message and a pull request body. **The break is not on main and not in either pull request.** It
exists only on an unmerged local branch which re-exports a type the engine has never exported, in
source or in dist. On the branch the change actually ships from, the typecheck is clean and the gate
reaches 121 of 123, failing on untracked fixtures from that same other session.

**The instrument was not at fault and it said so plainly.** It printed
`SUITE ABORTED AT INVOCATION 2 OF 123`, `NEVER ASKED: 121`, and
`Any statement about this repository's tests made from this run covers 1 of 123 invocations`. A clean
run closes `SUITE COMPLETE. 123 of 123` and exits 0; an aborted one exits 1. **The two are already
distinguishable at the point a reader looks.** I read the number and did not ask whose branch produced
it.

Same shape as reading the engine's `OBSERVATION_BOUNDARY_DOES_NOT_INSPECT_POLICY_REF` as the estate's
answer when PaymentHost compares. **Both times a component's own honest statement about itself was
taken for a statement about the whole.**

---

## E13. The claim detector reads prose, and prose is not a control

**Observed:** 2026-08-23, immediately after correcting two bases it was built to catch.
**Status: RECORDED, NOT FIXED.**

`check-claimed-effects.mjs` decides whether a basis claims a composition by matching phrasing:
`composes`, `consumes`, `reads the`, `reads another`. Both bases corrected today now state their read
in plain English and name the clause, and **the check still reports them as read-but-not-claimed**,
because `reads psr-2017/67/4/series-withdrawal` does not match `reads (the|another|three|two)`.

So the instrument built to catch a register whose prose disagrees with its code **is itself keyed to
prose**, and its notes are now false on two of three: they say a basis claims no composition when it
does.

**A third case is a different limitation of the same kind.** `feca/2-0805/4/b/no-opinion` states its
composition in `assertion` and in the clause text, and the check reads only `disposition_basis`,
`reuse_note` and `note`. The register says it; the check does not look there.

**The fix that is available and not taken.** Both corrected clauses now carry a structured
`reads: [...]` field, which was added for the reader and is the right input for the check: compare
the declared list against the traced one, in both directions, and stop parsing sentences. That makes
the claim a datum rather than a phrasing, which is the whole lesson of `used_by`.

Not done here, because widening what counts as a claim changes what the instrument asserts across all
three domains, and it should be a deliberate change rather than a same-day patch to make a note go
away.

### FIFTH INSTANCE, AND THE FIRST OF ITS KIND

**A check written to catch prose that disagrees with code tests it with a regex over prose.**

The four before it were defects in what the instrument MEASURED: the sweep that matched its own
consumer, the coverage check that read a declaration instead of a run, the claims tracer whose flush
never matched so every clause read zero others, and the unread-field sweep that counted a presence
test inside a spread as a consult.

**This one is a defect in what the instrument ACCEPTS.** It measures correctly: the traced read graph
is right, and both corrected clauses do read what they now say they read. What it gets wrong is
recognising the claim, because the claim is a sentence and it is matching phrasings. So it reports a
basis as silent when the basis is explicit, and the failure mode is a FALSE NOTE rather than a missed
one.

Worth separating, because the corrective differs. The other four are fixed by measuring the right
thing. This one is fixed by **making the claim a datum instead of a phrasing**, which is what the
`reads` field on both clauses is for, and it is the same corrective `used_by` needed.

---

## E14. The unread-field sweep, and it came out the other way

**Observed:** 2026-08-23, prompted by `hashMethod` having been carried on both sides and compared by
nothing. **Status: MEASURED. No fix needed, which is the finding.**

Every field carried on a verified attestation or a mandate requirement was swept for consumers. **The
sweep had to be run three times before it was right, and the first two answers were both artefacts of
the instrument.**

**First pass: six fields with zero reads.** Wrong. It matched `block.field` and `att.field`, and the
code binds the block as `b`. The pattern, not the code, produced the zeros.

**Second pass: zero fields with zero reads.** Also wrong, in the opposite direction. It counted
`...(b.decidedAt === undefined ? {} : { decidedAt: b.decidedAt })` as a consult because it contains
`===`. That is a presence test inside a spread: it decides whether to COPY the field, not anything
about the payment.

**Third pass, excluding spread-carrying: three fields carried and never consulted anywhere.**

| field | what it claims about itself | verdict |
|---|---|---|
| `decidedAt` | `When the decider says it decided. Their timestamp: we did not watch it happen.` | **genuinely informational, and it says so** |
| `inputsDigest` | `only the original set reproduces this value`, so a customer can prove later which inputs were before the decider | **informational to us, and the claim IS exercised**: `attestation-computed-amount.mjs` reproduces it and asserts a tampered set does not |
| `deciderArtifactDigest` | the reason is `FIXED BY HASH at decision time, held by the decider ... readable by neither us nor a counterparty` | **informational by design, and we CANNOT check it.** Not holding the artifact is the property |
| `vocabularyRef` | | **consulted**, five genuine guards at issuance in the engine |

**NONE OF THEM IS THE `hashMethod` CASE, and the difference is what the sweep was for.** `hashMethod`
was carried **on both sides of a comparison that ignored it**, so its presence created an appearance
of rigour the code did not deliver, and two references naming different methods could be read as the
same policy. These three are carried by design, are documented as carried, and two of them are
load-bearing precisely because we do NOT read them.

**So the fourth-layer pattern does not hold here.** `used_by`, `clauses_no_primitive_serves` and the
primitive inventory were all recorded, believed load-bearing, and never consulted. This layer was
swept for the same shape and does not have it. **A sweep that finds nothing is worth running and
worth recording, and the instrument being wrong twice on the way is the part to remember.**

**RULED 2026-08-23: the negative result is the result.** A fourth instance of the pattern would have
been a better story, and there is not one. Three fields are carried and never consulted, none of them
is the `hashMethod` case, and the two earlier passes that said otherwise were both artefacts of the
instrument rather than facts about the code.

Recording it matters more than a positive would have, because the next person to suspect this layer
now finds a measurement rather than an open question, and finds the two wrong answers beside it with
the reason each was wrong.

---

## E15. A gate whose verdict depends on untracked local state

**Observed:** 2026-08-23, in op-mcp-payment-server. **Status: RULED 2026-08-23. The move is WITHDRAWN and the gate keeps failing, attributed and unsuppressed, until `session/banxico-corpus` lands.**

`scripts/fixture-schema-gate.mjs` walks `fixtures/` **on disk** and asserts that every credential it
finds validates against the schema it cites and is indexed in the credential manifest by its own
digest. That is the right rule for fixtures.

`fixtures/banxico-34-2010/` is on disk and **tracked by no branch**, not `origin/main` and not
`session/banxico-corpus`, which tracks only the `artifact-digests.json` that pins its screenshots. It
is demo OUTPUT: four rendered case pages, screenshots, a run log, a seeded `cases.json`, a policy
document, and a credential.

**Two checks fail on it, and both failures are correct.** The credential fails `v2.7.json` on
`must have required property 'proof'`, and the RUNBOOK beside it states exactly that as a stated seam:
`The mandate credential carries no issuer proof in this run.` And its digest is not a key in the
credential manifest, because nothing minted it as a fixture.

**So the gate's verdict depends on untracked local state.** Moving the directory aside makes the gate
pass; putting it back makes it fail. A fresh clone passes. Two sessions sharing this working tree run
the same command and get different answers, and neither is wrong.

### The recommendation, which is a recommendation and not a change

**They should not be in `fixtures/` at all.** They are demo output whose credential is deliberately
unsigned, living under a path whose contract requires signed, manifest-indexed credentials. Moving
them to something like `demo/banxico-34-2010/` costs nothing, leaves the RUNBOOK freeze untouched,
regenerates nothing, and the gate stops seeing files it is right to reject.

**The gate should NOT be taught to tolerate untracked paths.** That would make its verdict depend on
git state, so a real fixture added and not yet committed would silently skip the checks it exists to
enforce. Gitignoring the directory has the same defect and hides a real fixture if one ever lands
there.

### THE MOVE WAS RULED AND THEN WITHDRAWN, ON THREE REFERENCES

A move to `demo/banxico-34-2010/` was ruled and then withdrawn the same day, because the directory is
referenced by path from three places that make a move unsafe from here:

1. **`policy-library/banxico-34-2010/DIVERGENCE.md` is public on main** and pins `policy-v1.txt` by
   path as well as by digest. Moving it makes a published document point at a path that does not
   exist.
2. **`fixtures/artifact-digests.json` and `scripts/drive-banxico-demo.mjs` are tracked on
   `session/banxico-corpus`**, a branch this session was told not to touch. The move breaks another
   session's manifest and its generator, **invisibly from here**: neither file exists on the branch
   this session stands on.
3. **`policy-v1.txt` is hashed by that generator** to check the mandate's pin has not drifted, so it
   is load-bearing in two repositories at once.

**THIS IS YESTERDAY'S TYPECHECK BREAK FROM THE OTHER DIRECTION.** There, a break present only on
another branch was reported as the repository's state. Here, files present only on another branch made
this directory look orphaned when it is not. **Each session's view of what is orphaned is a view of
its own branch.** E12 states the rule for a measurement; this is the same rule applied to an ABSENCE,
which is harder to notice because nothing appears in the output to prompt the check.

### WHAT REPLACES THE MOVE: nothing, and the failure stays visible

**The directory stays, the gate keeps failing on it, and that is the honest state.** The failure is
known and attributed: demo output under a `fixtures/` path whose contract requires signed,
manifest-indexed artifacts, unmovable until `session/banxico-corpus` lands.

**Not suppressed, not excepted, not made to pass.** The credential is deliberately unsigned and the
RUNBOOK says so as a stated seam; regenerating it to satisfy the schema would destroy the thing the
freeze protects and would trade a visible known failure for an invisible unknown one.

**When that branch merges the move becomes an ordinary change:** rewrite the four straightforward
references, update the manifest and the generator in the same commit, and put `DIVERGENCE.md`'s edit
in its own pull request because it is public.

**Nothing was deleted, moved or regenerated.** The directory was moved aside once to establish
causation and moved straight back, with its eleven files intact.

---

## E16. A check that passes because of the condition it should catch

**Observed:** 2026-08-23. **Status: FIXED, with a new check installed at three moments.**

A second worktree sat on `main` at `a8f8f6f` while `origin/main` was at `8938918`: **two commits
behind, nothing ahead, no visible symptom.** A session branching from it would have worked from a
stale base with nothing to say so.

**A check already existed and it fetches and compares.**
`packages/policy-engine/scripts/preflight-publish.mjs` check 6 asserts HEAD is an ancestor of
`origin/main`. Measured: `a8f8f6f` IS an ancestor of `8938918`, so **check 6 passes, and it passes
precisely because the worktree is behind.** Being stale is the condition that satisfies it.

Check 6 is correct for its own question, which is whether a commit being published lives on main. It
was not modified. **Repurposing it would make one check assert two things**, and the second would be
asserted in the direction the first is satisfied by.

It also runs only at publish time and only for one package, and every change of the last two days is
in `policy-library/`, which it does not reach.

### What was installed

`scripts/check-not-behind.mjs`, plus a self-contained shell hook body, asserting after
`git fetch --quiet` that `git rev-list --count HEAD..<upstream>` is **0**, and failing loudly with the
count and the commits.

**Three moments.** `post-checkout`, which REPORTS ONLY because git ignores that hook's exit status,
stated rather than implied by a hook returning 1 and never being obeyed. `pre-commit`, which BLOCKS,
shown by a real commit attempt on a branch two behind returning exit 1 with HEAD unchanged. And
invocation 1 of the payment server's suite gate, ahead of the gate's own selftest.

**Hooks because `.git/hooks` is shared by every worktree**, verified through `--git-common-dir`. The
hook body calls only git and depends on no file in the repository, because a worktree on an older
commit does not have the script, **and that worktree is the one this exists to warn.** A hook that
skipped when the script was missing would go quiet in the only case that matters.

**It caught a real one on its first run in the second repository**, where the branch was one behind
after its own merge landed.

### What it cannot reach

- **A worktree simply sitting there.** This runs at checkout and at commit. A session doing neither is
  never asked, and that is the state the stale worktree is in now.
- **Another session's uncommitted work.** Nothing in git reports that a sibling tree is dirty.
- **Files tracked by no branch**, the `fixtures/banxico-34-2010` case. There is no ref to be behind,
  so staleness is not the predicate.
- **Two sessions editing one file in separate trees.** Nothing surfaces until a commit that may never
  conflict.
- **Whether being behind matters.** It can say `two commits behind`. It cannot say `the other session
  is mid-flight on this file, wait`. That half is a coordination rule, not a check.

### The class these three share

**E12** was a measurement read as a fact about the repository when it was a fact about a branch.
**E15** was an absence read the same way. **E16** is a check that returns green for the reason it
should return red.

**Under E10, the sentence: each of the three took a true statement about one thing for a statement
about a larger thing that contains it.** A branch for the repository, a branch's file list for what
exists, and one direction of a comparison for the comparison. None was a wrong measurement; each was
a correct measurement answering a smaller question than the one being asked.

---

## E17. The corpus reaches FECA, and finds a defect in the attribution I introduced

**Observed:** 2026-08-23. **Status: ADAPTED, and the defect it found is FIXED 2026-08-23 by making it unwritable. See the closure.**

### The generator was adapted and the two existing domains did not move

`explore-lib.mjs` and `coverage.mjs` did `m.set(v.result, ...)` for every emitted entry. The generator
predates DEFINITIONAL, INSTRUCTION and EVIDENTIAL and assumed every clause yields a result, so run
unchanged against FECA it recorded **all 24 no-result-domain clauses as having a result of
`undefined`**, which is exactly the silent failure their refusal was built to prevent.

The adaptation is one guard in each: **an entry with no `result` key is skipped, because that is not a
result of `undefined`.**

**The test was that Banxico and PSR must be identical afterwards, and they are: 62 and 30, 75 and 28,
before and after.** The guard is a no-op for domains where every clause emits a result, which is the
whole reason it is safe.

One further widening: the harness's spy re-exported only `evaluate`, and FECA's cases also import
`resultOf`. A spy exporting one name turns a missing re-export into a `SyntaxError` that **reads as
the domain being broken rather than as the harness being narrow.**

### FECA: 111 reachable, 41 reached

| | clauses | reachable | reached | never reached |
|---|---|---|---|---|
| Banxico | 19 | 62 | 30 | 32 |
| PSR | 21 | 75 | 28 | 47 |
| **FECA** | **59** | **111** | **41** | **70** |

**All 111 come from the 35 result-bearing clauses; the 24 contribute zero.** Measured directly, so
the count does not exceed what the register's dispositions allow.

All four clauses resting on an ungrounded term reach `undetermined` and their attributed forms, and
**nine attributed results are reached in total**.

### THE DEFECT: attribution is gated on a lexical read, not on dependence

I introduced `attribute_to_supplied_meaning` and described it as attributing **only where the meaning
was actually read**, using a proxy that records access. The corpus reached
`not_applicable_on_supplied_meaning`, which should not exist: a clause that came out `not_applicable`
did not depend on the meaning.

Measured, same clause, precondition FALSE in both rows:

| facts | result |
|---|---|
| `differentiates` absent, so `&&` short-circuits before the meaning is read | `not_applicable` |
| `differentiates` true, so the meaning IS read before the precondition is tested | **`not_applicable_on_supplied_meaning`** |

**The two differ only in whether JavaScript happened to short-circuit.** Arguments are evaluated
before the call, so `meaning.accepts` is read whenever the conjunction reaches it, regardless of
whether the precondition later makes the clause inapplicable.

**So the gate is on a lexical read and I claimed it was on use.** An attributed `not_applicable`
asserts an institution's supplied meaning bore on a determination it did not bear on, which
overstates the institution's reach in exactly the direction the attribution exists to avoid
overstating.

**Found by the corpus, on the first run against a domain the corpus was said not to fit.**

### FIXED SAME DAY, by making the defect unwritable rather than fixing one site

**What `use` means, chosen and stated.** Not `a meaning that changed the result`: that needs a
counterfactual against some other meaning, and it is not well defined, because without a meaning the
result is `undetermined`, so every decided result would count as changed. It is **consulted on the
path where the clause actually decides.**

**The defect was one call site, and the fix is not at that site.** Three of the four passed a THUNK to
`applicability_gate`, so their meaning was unreachable until the gate held and they attributed
correctly. The fourth passed a VALUE to `conditional_requirement`, whose arguments evaluate eagerly,
so the meaning was read before the precondition was tested.

**The gate is now an argument of `ungrounded` rather than something a caller may put inside
`compute`.** When it is false the meaning is never even proxied. A call site cannot reach a meaning
before its precondition holds, so the defect is unwritable rather than repaired once.

Measured, the exact case that was wrong, precondition false in both rows:

| facts | before | after |
|---|---|---|
| `differentiates` absent, so `&&` short-circuits | `not_applicable` | `not_applicable` |
| `differentiates` true, so the meaning was read | **`not_applicable_on_supplied_meaning`** | `not_applicable` |

**`not_applicable_on_supplied_meaning` no longer exists anywhere.** FECA's reachable count falls from
111 to 110, and the one removed is that token. Attributed results reached fall from 9 to 8. **No
worked case moved, in any domain**, and Banxico and PSR are unchanged at 62/30 and 75/28.

**Exact for these four sites rather than guaranteed in general:** a site could still read a meaning and
discard it inside `compute`. None does, and a short-circuit inside `compute` correctly leaves the
meaning unread and unattributed.

## E18. `disjunction_over_results` NAMED, on a change of representation

**Domain:** SI 2017/752. **Clause:** `psr-2017/76/1/trigger`, via the `notBarred` operand.
**Observed:** 2026-08-23, re-expressing the three domains as pure data.
**Status: NAMED. E7 is closed by this entry.**

### E7 left this waiting, and what it was waiting for arrived

E7 recorded a bare `||` over two clause results, fixed it inline to three-valued, and declined to
name the shape: *one instance in one domain*, so under E4 it waits for a second instance **or a
change of representation**. E7 named the second permit itself: *So would writing the truth table
out.*

**Re-expressing PSR as a register is that change of representation**, and it is not optional here:
a register is data, and an inline `||` in a program has no data form. Either the shape is named or
`psr-2017/76/1/trigger` cannot be expressed, which would stop the item.

### THE SOURCE TEXT THAT FORCED IT

`reg 76(1) chapeau`: *Subject to regulations 74 and 75, where an executed transaction was not
authorised under regulation 67, the provider must refund and restore.*

`reg 74(1)`: *Entitlement to redress arises only if notification is given no later than 13 months
after the debit date.*

`reg 74(2)`: *The 13 month bar does not apply where the provider failed to supply the Part 6
information about the transaction.*

**The bar is lifted by EITHER limb.** 74(1) not biting is one way; 74(2) applying is the other. The
text makes them independent, so the composition is a disjunction over two clause results and the
instrument states it in one sentence.

### IT IS NOT THE DUAL OF `conjunction_over_results`, and that is why it needs its own definition

| | when any operand is `undetermined` |
|---|---|
| `conjunction_over_results` | **`undetermined` DOMINATES**, even beside a `false` |
| `disjunction_over_results` | **`true` DOMINATES**, and `undetermined` only survives when nothing is true |

So De Morgan does not relate them: `conjunction_over_results` is not Kleene AND, and negating it
would not produce the disjunction reg 76(1) needs. A limb that HOLDS makes the bar lifted whatever
is unknown about the other limb, and a limb that FAILS leaves the question open. Written as a table
rather than as a ternary, so a reader compares rows rather than reading an `else` arm.

**Closed token vocabulary, throwing on anything unregistered**, exactly as its sibling does.

---

## E19. `all_members_of_enumeration` ADDED, and it is the list lift of a primitive already there

**Domain:** Banxico 34/2010. **Clause:** `34-2010/2.6/a/two-factor`.
**Observed:** 2026-08-23. **Status: ADDED, one instance, and the argument is structural rather than
numerical.**

### What could not be expressed

`evaluate.mjs` computes `factors.every((f) => member_of_enumeration(f, AUTH_FACTOR_KINDS) === 'member')`
and feeds it to `guard_on_unresolved`. `INVENTORY-AUDIT.md` observed this as
`universal_quantification_over_results`, listed it among the eleven undeclared operations, and did
not rule on it. **A `.every` over a primitive is a program, not data.** No existing primitive
expresses it: `all_present` quantifies presence, `none_of_class_present` quantifies a prohibited
class and cannot express its complement over an open one, and `member_of_enumeration` is scalar.

### THE SOURCE TEXT THAT FORCED IT

`pp.5-6, numeral 2.6, inciso a)`: *Por operaciones en las que, para su realización, requieran al
Tarjetahabiente que utilice al menos dos elementos independientes para autenticar las operaciones
como autorizadas por este último … **Los referidos factores deberán ser de entre los listados a
continuación***.

**`de entre los listados a continuación` closes the enumeration over the WHOLE SET of factors used,
not over one of them.** The requirement is a quantifier in the source sentence, and a register that
can only test one factor at a time cannot state it. The clause's existing basis in `clauses.json`
already says so: *A count of at least two, plus membership of each factor in a closed enumeration.*

### E10's sentence, and why it belongs to the primitive layer

**It reports whether every item in a list is a member of a declared enumeration.** That mentions
neither syntax nor return type.

**One instance, and E4 is satisfied by the second permit rather than the first.** The change of
representation is the whole of Phase 0. But the stronger argument is structural: the primitive set
ALREADY CONTAINS the list lift of `field_present`, twice, as `all_present` and `any_present`. This is
the list lift of `member_of_enumeration` and it sits beside them. Adding it is filling a hole the set
already has a shape for, not generalising from one case.

**What is NOT claimed:** that a second domain needs it. Neither PSR nor FECA does. If no second
domain ever does, that is an argument this entry cannot answer and the entry should be re-read then.

---

## E20. The gate is structural and operand ORDER is still an author's choice

**Domain:** FECA PM 2-0805. **Clause:** `feca/2-0805/3/e/differentiate`.
**Observed:** 2026-08-23, showing E17's conditions on the interpreter.
**Status: RECORDED, NOT FIXED. One instance, one domain, so it waits under E4.**

### What the interpreter does remove

E17's defect was an attribution gated on a lexical read: three call sites passed thunks to
`applicability_gate` and a fourth passed a value to `conditional_requirement`, whose arguments
JavaScript evaluates eagerly. **A generic interpreter written the obvious way reproduces that
exactly**, because `handler(force(a), force(b))` is the same eager evaluation one level up.

It is avoided by handlers taking NODES rather than values, with `force(node, ctx)` the only site in
the interpreter that maps a node to a value. `ungrounded` takes its gate as an argument, so a
register cannot reach a meaning before the precondition holds. Measured over 40000 sampled fact
sets: `not_applicable_on_supplied_meaning` occurs **0** times, against 9607
`breached_on_supplied_meaning` and 9405 `satisfied_on_supplied_meaning`.

### What it does NOT remove, measured on the same clause

`3/e/differentiate`'s compute is `differentiates === true AND rationale_grade is in the supplied
meaning`. `and` short-circuits at the single forcing site, so on a false first conjunct the meaning
is never consulted and the result is a bare `breached`.

**Write the two conjuncts the other way round and the same facts give
`breached_on_supplied_meaning`.** The predicate is identical; the attribution is not.

| conjuncts as written | conjuncts reversed |
|---|---|
| `{"result":"breached"}` | `{"result":"breached_on_supplied_meaning","rests_on":"a meaning supplied by the institution, not by the chapter","term":"rationalized medical opinion"}` |

**So the closure holds exactly where E17 said it holds and no further.** E17's own note said as much
of the hand-written version: *a site could still read a meaning and discard it inside `compute`*.
What has changed is that the author is now a register author rather than a programmer, and that the
choice is visible as an operand order in data rather than buried in an expression.

**Why it is not fixed.** The candidate fixes are all larger than the observation. Forcing every
operand of a conjunction would remove the short-circuit and change results in the other direction,
attributing meanings that were genuinely never consulted. Ordering conjuncts by whether they touch a
meaning is a rule about authoring rather than about evaluation, and nothing checks it. Declaring per
clause which operands may consult a meaning is a fourth field on a shape that has three. **One
instance, one domain: it waits.** Shown rather than described, in `_phase0/show-e17.mjs` section 5.

---

## E21. The corpus no longer reproduces from the evaluators beside it

**Domains:** Banxico and PSR. **Observed:** 2026-08-23, freezing the Phase 0 oracle.
**Status: MEASURED, NOT REGENERATED. Regenerating it is a decision about the corpus.**

`_corpus/corpus.json` stores, per case, a `facts` block and a `results` block, under a note that
says the results *were computed by running the committed evaluator over the `facts` block*. That was
true when it was written.

**Measured now, by recomputing every case: 11 of 17 Banxico cases and 25 of 25 PSR cases carry a
stored result map the committed code no longer produces.**

| domain | cases | drift | the clauses that moved |
|---|---|---|---|
| Banxico | 17 | 11 | `p5/foreign-deadline` 10, `p4/deadline` 7, `2.6/a/two-factor` 6, `p7/firmeza` 3 |
| PSR | 25 | 25 | `67/4/series-withdrawal` 19, `67/1/consent` 2, **and every case's clause ORDER** |

**Every difference is traceable to a ruling that landed after the corpus was written**: E9's
`absent is not domestic`, which moved decided results to `undetermined`; the two-factor guard on an
unclassifiable factor kind; and `67/4/series-withdrawal` being given effect, which both changed its
own result domain from `{not_satisfied, not_applicable}` to `{defeated, not_defeated, undetermined}`
and moved it ahead of `67/1/consent` in the emission order. **Nothing is wrong with the corpus's
facts.** What is stale is a stored derived value.

**This is the `_totalCases` lesson, unlearned in a fourth place.** `parity-harness/matrix.json`
already records why a count must be derived at runtime rather than stored;
`INVENTORY-AUDIT.md` STEP 4 already withdrew two stored fields for the same reason in the same
library. `corpus.json` stores a derived map beside the facts that derive it, **and nothing in the
repository compares the two**. It went stale silently and stayed silent through three rulings.

**Not regenerated here**, because the Phase 0 oracle does not need it: the corpus supplies FACT SETS,
which do not go stale, and the oracle recomputes every result from the committed evaluator. Whether
`corpus.json` should carry results at all, or should carry only facts and a deriver, is the decision
this entry is for.

---

## E22. Five definitions with no call site, and a measurement whose subject moved

**Domains:** all three. **Observed:** 2026-08-23. **Status: MEASURED. Nothing removed.**

Counted directly over the three `evaluate.mjs` files, by looking for a call of each name:

| domain | defined and never called |
|---|---|
| Banxico | `select_parameter_by_predicate`, `applicability_gate` |
| PSR | `any_present` |
| FECA | `any_present`, `guard_on_unresolved` |

**`select_parameter_by_predicate` is the one that matters, because it is DECLARED.** It is one of the
thirteen entries in `banxico-34-2010/primitives.json`, with parameters, a result domain and a
`used_by` list. `INVENTORY-AUDIT.md` STEP 1 states: *Every one of the 13 primitives declared in
`primitives.json` is invoked somewhere. The declared-and-never-called bucket is empty at the
primitive level.*

**That was true on 2026-08-21 and is false now.** On 2026-08-23 the deadline period was routed
through `remap_result_domain` off `p5/foreign-deadline`'s own result, which was a correction to a
different defect and removed this primitive's last call site as a side effect. **A measurement is
evidence about its moment.** Nothing in the repository re-derives it, so the audit's sentence still
reads as a present-tense claim.

**The other four are E5 landing in a third place**: the primitives are copied between domains, so a
domain acquires the definitions of the domain it was copied from whether it needs them or not. A
shared module would make the count fall out of an import list rather than out of a grep.

**Nothing removed, deliberately.** The interpreter does not implement
`select_parameter_by_predicate`, because no register uses it; that is recorded in the schema
comparison rather than by deleting a declaration from a published register.

---

## E23. No clause declares its own result domain, so twelve of twenty-nine remaps cannot be checked

**Domains:** all three. **Observed:** 2026-08-23, building the register validator.
**Status: RECORDED. This is the register's largest under-specification and it is not filled here.**

`remap_result_domain` exists because two hand-written remaps of one primitive's result domain
silently disagreed about `denied` (E6). Its rule is that **the mapping must be TOTAL over the source
domain**, and an unlisted token throws.

**Totality is only checkable where the source domain is declared somewhere.** Measured over the three
registers:

| what the remap reads | sites | totality checkable? |
|---|---|---|
| a primitive with a declared result domain | 16 | **yes**, and the validator checks it |
| **another clause's result** | 9 | **no** |
| a binding | 3 | no |
| a resolution | 1 | no |

**29 sites, 12 unchecked**, being the 13 whose source the schema cannot resolve less the one that
declares `$unmapped` anyway.

**The cause: a clause register does not say what a clause can return.** Counted:
`banxico-34-2010/clauses.json` **0 of 19**, `feca-2-0805/clauses.json` **0 of 59**,
`psr-2017-752/clauses.json` **1 of 21**, and that one is on a clause whose disposition was corrected
the same day. So the artifact a client is handed states what each clause requires and never states
what answering it can produce.

**And a derived domain is not a substitute.** `_corpus/coverage.mjs` derives observed result sets by
sampling, and an observed set is a LOWER BOUND: it says a token was reached, never that no other
token exists. E6's disagreement was over `denied`, a token no fixture carried.

**Not filled here, and that is the finding rather than a deferral.** Writing a result domain onto 99
clauses would be authoring 99 claims nothing forced, and the brief's own ruling applies: needing to
know an answer in order to proceed is evidence the register is under-specified, and the finding is
worth more than the answer. **The interpreter did not need it. The validator did, and could not get
it.**

---

## E24. The key an institution supplies a resolution by is in no register, and most registered ambiguities are inputs to nothing

**Domains:** all three. **Observed:** 2026-08-23. **Status: RECORDED. The register now carries the
key; the ambiguity registers do not.**

### The join is a string literal in a program

`ambiguities.json` registers `A1` with a clause id, a question, competing readings, a textual basis
and a materiality. `evaluate.mjs` reads `resolutions.A1_dias_unit`. **Nothing anywhere states that
those are the same thing.** An institution handed the register cannot tell what to call the field
whose value resolves A1, and a run that supplied `A1` rather than `A1_dias_unit` would be
indistinguishable from a run that resolved nothing: the clause returns `undetermined`, which is the
correct answer to a different question.

The Phase 0 registers carry `resolution_key` on each ambiguity, supplied by the evaluation layer.
**It is authored, not derived**, because there is nothing to derive it from.

### Three of seventeen registered ambiguities are inputs to anything

| domain | registered | consumed | which |
|---|---|---|---|
| Banxico | 6 | 2 | A1, A2 |
| PSR | 6 | 1 | P1 |
| FECA | 5 | **0** | none |

**FECA's five are inert, and there is a structural reason.** Banxico's and PSR's ambiguity entries
carry the competing readings, so a resolution has a vocabulary to be drawn from and the firmeza
decision table takes A2's domain directly from it. **FECA's entries carry no readings field at all**,
so there is no vocabulary, nothing for an evaluation to consume, and no way to write one without
first deciding what the readings are.

**Not an argument that the other fourteen should be consumed.** An ambiguity that no clause's result
turns on is properly recorded and properly unread; A3 is named in a clause note precisely to say
that a recovery right is never inferred. The finding is that **nothing distinguishes the two cases**:
a register cannot say whether an ambiguity is an input awaiting a resolution or a caveat that will
never be one, and the only way to find out today is to read a program.

---

## E25. The order a determination is reported in is a property of a program

**Domains:** all three. **Observed:** 2026-08-23. **Status: FIXED IN THE REGISTER, recorded because of
what it says about the artifact.**

Byte identity is over `JSON.stringify(output)`, and JavaScript object key order is insertion order,
so **the order clauses are emitted in is part of what a run produces**. A supervisor reading two
determinations side by side compares rows by position.

**That order lives in no register.** It is the order `put()` happens to be called in, and it matches
neither the source order nor `clauses.json`'s order in any of the three domains. FECA's is stranger
still: the 35 result-bearing clauses come in the evaluator's own order and the 24 with no result
domain are appended afterwards by a trailing loop over the register, so **one output object carries
two different orderings** and the boundary between them is invisible in the output.

The Phase 0 registers make the clause array order the emission order, stated as such. That is the
smallest change that makes the property a property of data.

**What it says about the artifact:** three published registers, each described as the specification
of a conversion, and a determination made from any of them could not be reproduced row for row from
the register alone. Nothing was wrong with any result. The register simply did not carry a property
its own output has.

---

## E26. Three registers, six fields, and the disagreements are not naming preferences

**Domains:** all three. **Observed:** 2026-08-23, deriving the register schema.
**Status: RECORDED, and reconciled in the Phase 0 schema WITHOUT ruling on which side is right.**

Each row below is a field where the three registers disagree, with the text on both sides. The brief
required these be reported rather than merged by preference, and none of the six is settled here.

### 1. The clause text field names the language, in two of three

`banxico-34-2010` `"text_es": "Hora y minuto en que se realizó la operación."` ·
`psr-2017-752` `"text_en": "Entitlement to redress arises only if notification is given no later
than 13 months after the debit date."` · `feca-2-0805` `"text": "In clear-cut traumatic injury
claims, …"`.

**Not cosmetic.** Under two of the three the language is part of the KEY, so a register carrying one
provision in two languages, which is ordinary for a supervisor operating in more than one, cannot be
expressed without inventing a third key. Under the third the language is not recorded at all. The
Phase 0 schema carries `text` plus `text_language`, which is the only form that can hold both, and
that choice is a schema decision this entry does not claim the domains made.

### 2. `source_locator` and `source` carry different KINDS of thing

`banxico` `"p.13, numeral 3.6, fourth paragraph"` · `feca` `"para 3d(1)"` ·
`psr` `"reg 75(1)"`.

**Banxico's is a PAGE plus a numeral, and it has to be**, because the source is a compiled PDF with
no provision identity. PSR's is a provision identifier that legislation.gov.uk assigns and that is
citable and stable, which is exactly the property E3 measured the XML as buying. Merging the two
under one name records a page number and a legal citation in one field and loses which one you have.

### 3. `assertion` is present on 78 clauses of 99 and absent on all of PSR

Banxico 19/19, FECA 59/59, PSR **0/21**. For Banxico the assertion is the English rendering of a
Spanish provision and is doing translation. For FECA it is a restatement of an English sentence in
operative terms: `"A clear-cut traumatic injury needs only a diagnosis and an affirmative
statement."` beside a text that says the same thing at greater length. **PSR's absence is defensible
on the same reasoning that makes FECA's presence useful**, and the two cannot both be what the field
is for.

### 4. `disposition_basis` is present on 78 clauses of 99 and on ONE PSR clause

Banxico 19/19, FECA 59/59, PSR **1/21**, and that one reads *Composes the 67 authorisation result
with the 74 bar. Reads no fact directly.* PSR carries `reuse_note` on all 21 instead, which is about
which primitive transferred, not about why the clause is MECHANICAL rather than JUDGMENT.

**So for 20 of 21 PSR clauses the register does not record why the category was chosen**, and the
category is the thing that decides whether the evaluator computes a result, refuses one, or takes a
judgment as an input.

### 5. Three names for three DIFFERENT relations, and only one is the evaluation dependency

| field | domain | count | what it points at |
|---|---|---|---|
| `depends_on` | Banxico | 19/19 | other clauses of this register, the evaluation dependency |
| `governs` | PSR | 4/21 | **the inverse**: an EVIDENTIAL clause naming the clause its result is an input TO |
| `implements` | FECA | 6/59 | **outside the document**: `5 U.S.C. 8101(2)`, `20 C.F.R. 10.312` |

Reading these as one field would have `governs` pointing backwards along the dependency edge and
`implements` pointing out of the register entirely. The Phase 0 schema keeps all three, separately,
and derives nothing from them: **the interpreter's dependency order comes from the emission order and
is checked against it by rule R3**, not from `depends_on`, which no instrument has ever read.

### 6. The ambiguity readings field, and FECA has none

Banxico `competing_readings`, PSR `readings`, FECA **no field**. The consequence is measured in E24:
FECA's five ambiguities have no resolution vocabulary and are inputs to nothing.

### And one disagreement inside a single domain

`feca-2-0805/clauses.json` declares `"$dispositions": "MECHANICAL, JUDGMENT, CONDITIONAL, DERIVED,
DEFINITIONAL, INSTRUCTION. ILLUSTRATIVE is NOT in the schema…"` — **six categories, and EVIDENTIAL is
not among them.** Its own `evaluate.mjs` declares
`HAS_RESULT_DOMAIN = new Set(['MECHANICAL','JUDGMENT','CONDITIONAL','DERIVED','EVIDENTIAL'])`, and
`EVIDENTIAL.md` records that FECA has **five** clauses that are EVIDENTIAL under the tight test while
stating that nothing has been recategorised. The three statements are consistent only if you already
know that the category exists and that the recategorisation was deliberately not made. **A reader of
the register alone would conclude the category does not apply to this document.**

---

## E27. A correction fixed the prose and left the structured field, and the edge is now inverted

**Domain:** Banxico 34/2010. **Clauses:** `34-2010/3.6/p5/foreign-deadline` and
`34-2010/3.6/p4/deadline`. **Observed:** 2026-08-23, by deriving the dependency graph from the
register rather than reading it. **Status: RECORDED, NOT FIXED. It is a change to a register that is
public on main.**

### What was measured

`_phase0/reads-graph.mjs` walks each clause's `evaluate` tree, follows bindings, and collects every
clause result it names. No run, no fixtures. Compared against `depends_on`:

| | clauses |
|---|---|
| carry an evaluation | 75 |
| `depends_on` agrees with the derived graph | **9** |
| declare a dependency the tree does not have | 10 |
| read a clause they do not declare | **1** |
| carry no `depends_on` at all | **56**, being the whole of PSR and the whole of FECA |

### The one that is unambiguously wrong, and it is inverted

On 2026-08-23 the deadline period was rerouted so that `p5/foreign-deadline` is emitted FIRST and
`p4/deadline` derives the period from its result. The correction is recorded on both clauses. The
prose was updated on both:

`p4/deadline.disposition_basis`, as corrected: *THE LIMIT IS NOT ITS OWN: **this clause reads
34-2010/3.6/p5/foreign-deadline** and applies 45 days or 180 accordingly.*

**`p4/deadline.depends_on` does not list it.** And `p5/foreign-deadline.depends_on` still reads
`["34-2010/3.6/p4/deadline"]`, **which is the edge the correction reversed**. Two fields of one
register, in one file, disagreeing about one dependency, with the structured field pointing the wrong
way down it.

**The correction was prompted by `check-claimed-effects.mjs`**, which reported this pair as
READ-BUT-NOT-CLAIMED. That instrument reads `disposition_basis`, `reuse_note` and `note`. It does not
read `depends_on`. So the prose it inspects was brought into line and the field it does not inspect
was left, and the register ended the day less consistent with itself than it began.

### The other ten are a different finding: the field has no definition

The ten `declares and does not read` cases are not all defects. `3.6/a/evidence` declares
`2.6/a/two-factor`, and the evidence must refer to factors drawn from that enumeration, which is a
relationship in the source text and not a computed one. `p4/floor` declares `a/explanation`, whose
result the floor deliberately does not consume.

**Nothing in any register says which relation `depends_on` records.** Read as the evaluation
dependency it is wrong on ten clauses; read as a relationship in the source it is right on most of
them and cannot be used by any instrument. It is one field carrying two relations, which is why the
one genuine inversion sat inside it unnoticed.

**And 56 of 75 clauses have no declaration to check at all**, because neither PSR nor FECA carries
the field. The estate's only dependency declaration exists in one of three domains and no instrument
has ever read it.

### What this says about the false-effect class

The handoff predicted that a generic interpreter makes the false-effect class unreachable, because
*an interpreter derives behaviour FROM the register, so the register cannot describe something the
behaviour does not do.* **That is true of the evaluation half and false of the descriptive half.**
`assertion`, `disposition_basis`, `depends_on`, `governs` and `implements` still sit beside an
evaluation and can still contradict it. What changed is that a contradiction is now DERIVABLE without
a run and without parsing a sentence, and this entry is the first thing derived that way.

---

---
---

# What Phase 0 inherits

> **E18 to E27 WERE WRITTEN AFTER THIS SECTION, on 2026-08-23, while Phase 0 was carried out. This
> section says `seventeen log entries`; there are now twenty-seven. Two of the additions change what
> this section claims: E7's fifth shape is no longer unnamed (E18), and E5 is dissolved in the
> interpreter but is still live in the three `evaluate.mjs` files, which are untouched and remain the
> oracle. The section is kept as written rather than edited, so the count and the claims it was
> reached with stay visible.**

Written 2026-08-23, closing this session. Three domains, two document classes, 99 clauses, seventeen
log entries all carrying a status.

## The seven categories, and what each requires of an evaluator

| category | requires |
|---|---|
| **MECHANICAL** | evaluate against recorded facts; the primitive's own result domain |
| **JUDGMENT** | evaluate, taking the judgment as an INPUT. Never inferred, never defaulted |
| **CONDITIONAL** | evaluate; carries `not_applicable` for an obligation that never arose, which is not a pass |
| **DERIVED** | evaluate; reads no fact of its own and composes other clauses' results |
| **EVIDENTIAL** | evaluate; its result is about the STATE OF PROOF of another clause's condition and is an INPUT to that clause, not a determination of its own |
| **DEFINITIONAL** | **do not evaluate to a result.** It supplies a meaning other clauses consume, and the run must report WHICH definition applied to each consuming clause |
| **INSTRUCTION** | **REFUSE.** It directs an act and no fact makes it true or false, so it has no result domain. Emitted with no `result` key so coverage by set equality still holds; an accessor asked for one must THROW rather than return `undefined` |

**ILLUSTRATIVE is not in the schema.** One clause carries it, it fits no category, and that is recorded
rather than smoothed away.

**The refusal is the load-bearing part.** A clause with no result domain that nonetheless returns
something is the defect class this estate found at four separate layers. `put()` must refuse at the
source, so the discipline does not depend on a call site remembering it.

## The five composition shapes, and the decision-table boundary

`applicability_gate`, `guard_on_unresolved`, `remap_result_domain`, `conjunction_over_results`, each
with a closed vocabulary that THROWS on an unregistered token, and each carrying `undetermined`
rather than collapsing it. The fifth, `disjunction_over_results`, is **deliberately unnamed**: one
instance in one domain, fixed inline, waiting under E4.

**Two shapes, not one parameterised shape.** `applicability_gate`'s closed arm is always
`not_applicable` and `guard_on_unresolved`'s is always `undetermined`, hard-coded, so that
`the requirement failed` and `the requirement never applied` cannot share a name.

**`remap_result_domain` takes its mapping FROM THE CALL SITE**, because which of a primitive's results
a clause treats as failure is the clause's reading. The mapping must be TOTAL; `$unmapped` is declared
explicitly where a source domain is genuinely open.

**The decision-table boundary, and it is a structural test rather than a judgment call: a DERIVED
clause whose inputs form a small, closed, finite cross-product should be a table. If the clause's own
text makes the input arity open, a table is the wrong shape.** `firmeza` qualifies at 7x3;
`foreign-deadline` at 2; `3.6/p4/floor` does not, because `por lo menos` makes its arity open and a
table would have to be regenerated by the clause's own semantics.

A table is data: enumerable, checkable for completeness over its input domains, diffable when an
institution changes its reading, and every row states what it rests on. An if/else chain is none of
those, and its arms cannot be counted by anything.

## Which entries constrain the design rather than describing a past defect

**E4** and **E10** are standing rules. E4: fix on a second instance OR a change of representation,
whichever arrives first, because they rule out different wrong answers. E10: name an operation by
what it does, in one sentence mentioning neither syntax nor return type.

**E1** constrains every composition: a primitive returning more states than its wrapper can represent
loses a distinction, and the loss is invisible. Its closure added a CLOCK AS AN EXPLICIT FACT, absent
by default, never `Date.now()`.

**E11** constrains any reference to an external document: naming a hash algorithm does not name a
canonicalisation, and a digest over a non-deterministically serialised source pins a fetch rather than
a document. **The third state must exist before the field does**, or an absent field falls into the
`differ` arm and manufactures the false negative it exists to prevent.

**E17's closure** constrains provenance: a determination resting on a meaning the institution supplied
must carry that IN THE RESULT TOKEN, not only in a provenance field, and the attribution must be gated
on the deciding path rather than on a lexical read.

**E5** constrains packaging: the primitives have no shared module, so every correction lands twice,
and a diff of the two copies is not a usable check because legitimate and accidental differences look
alike.

## The entries a generic interpreter would make unreachable

**This is the important half, because several of these defects exist only because each domain has its
own hand-written evaluator.**

**Made unreachable by a generic interpreter:**

- **E5**, entirely. There would be one implementation, so a correction could not land twice and the
  two copies could not drift.
- **E6**, the two domains disagreeing about `denied`. Two hand-written remaps of one primitive's
  result domain is what made disagreement possible; one interpreter reading a declared mapping cannot
  disagree with itself.
- **E17's defect**, and this one is sharp: the attribution was gated on a lexical read because
  JavaScript evaluates arguments eagerly, and three call sites passed thunks while a fourth passed a
  value. **That is a property of hand-written JavaScript, not of the encoding.** An interpreter
  evaluating a declared clause structure has no argument-evaluation order for an author to get wrong.
- **E13**, the claim detector reading prose. If a clause DECLARED what it reads, the check would
  compare a declared list against a traced one and there would be no sentence to parse. The `reads`
  field now on two clauses is that declaration, unread by the check.
- **The false-effect class itself**, E8 and the three basis defects. A basis can contradict the code
  only where a human writes both; an interpreter derives behaviour FROM the register, so the register
  cannot describe something the behaviour does not do.

**NOT made unreachable, and these are the ones Phase 0 still has to solve:**

- **E1**, **E7**, **E9**: a wrapper that cannot represent a source's states, a disjunction that
  collapses `undetermined`, a predicate that reads an absent fact as a decided `false`. These are
  properties of the SHAPE VOCABULARY, and an interpreter implementing that vocabulary inherits them
  exactly.
- **E11**: a reference to an external document is outside the interpreter entirely.
- **E12**, **E15**, **E16**: the shared-tree class. Nothing about how clauses are evaluated touches
  them.
- **E14**: fields carried and never consulted is a property of the wire format, not of the evaluator.
- **The UNGROUNDED state**: a term the document never defines is a property of the document. An
  interpreter must still refuse to decide, and must still mark a determination that rested on a
  supplied meaning.

**So the split is clean: an interpreter removes the defects that come from writing the same thing
twice, and removes none of the defects that come from a vocabulary that cannot say what a source
says.** The first group is five entries and the second is eight, and the second group is the design
work.
