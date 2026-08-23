# The waiting axis

**BUILT 2026-08-24, at record format v4.** This document was the specification; it is now the
specification as corrected by building it, and the corrections are listed at the end because a
spec that silently absorbs its own falsifications teaches nothing. The authoritative statement of
what `waiting: "fact"` does and does not establish is on the record's own documentation, the
format header of `_interpreter/interpret.mjs`; this file explains the design.

## Where it sits on the record

A field `waiting`, on every record, beside `lane`, at the next record-format version (v4 when
taken, with the one authorised re-freeze that implies; three measurements put that cost at about
two seconds, one needle, a dozen files). It is a SECOND AXIS, not a value of an existing field,
ruled in the block of 2026-08-24: as a lane value it conflates who-owns with can-it-be-decided (a
clause routed to person and waiting on that person needs both facts in one field), and as a result
value it collides with the absence tokens that already exist at determination granularity
(`not_assessed`, `no_end_event`, `missing_operand`, `no_candidate`), each of which every existing
remap maps totally, so a new result token would break every remap's totality by construction.

## The values, and what computes them

From `_phase0/dispatchable.mjs`'s classification, derived from the register rather than asserted:

| value | meaning | computed from |
|---|---|---|
| `fact` | waiting on a fact or record nobody supplied | a fact origin: an absence token of the fact class (`no_end_event`, `missing_operand`, `no_candidate`), or a presence-family primitive probing a strictly-undefined argument, or a read input clause waiting on a fact |
| `judgment` | waiting on an assessment nobody has made | a `not_assessed` origin, a read input waiting on a judgment, or the routed `awaiting: person` record |
| `meaning` | waiting on a meaning the document never gave | the `ungrounded` emitter's missing-meaning branch, or a read input waiting on one |
| `clause` | waiting on a derived input that classifies as nothing else | the fallback: an `undetermined` result with no tracked origin on a clause that reads no fact of its own |
| `none` | not waiting: the determination rests on supplied inputs, or is `not_applicable` | everything else, EXPLICITLY. Absent is not `none`; E30 |

**What computes it: the interpreter, at emission**, from two inputs it already holds: the emitter
kind and which absence token, if any, the result rests on. It is derived per record per run, never
stored in the register, because whether a clause is waiting is a fact about a run's inputs, not
about the clause.

**A clause that is not waiting says `waiting: "none"`.** The field is never absent, on E30's rule:
an absent field would make "not waiting" and "nobody computed the axis" one token.

## What R7 and R13 must be extended with

- **R7's extension (totality of the classifier over result domains):** the waiting classifier maps
  absence tokens to axis values, so it is a remap in disguise, and R7's discipline applies to it:
  the map from every primitive's declared result domain into {is-an-absence-token(which), is-not}
  must be TOTAL per primitive in use, throwing on an unmapped token. Without this, a new primitive
  result token silently classifies as not-waiting, which is the axis's own false negative.
- **R13's extension (totality over emitter kinds):** the classifier must declare an entry for every
  emitter kind the schema knows (emit, decision_table, ungrounded, and the per-disposition
  no-result emissions), the same polarity discipline as the lane lookup: a no-result record's
  waiting value is `none` explicitly, because a clause that will never produce a determination is
  not waiting for one.

## The two measured cases it must express

`psr-2017/75/3/instrument-not-sufficient` and `feca/2-0805/4/b/no-opinion` are routed to engine and
waiting on facts nobody gathers, measured by `_phase0/dispatchable.mjs`. The lane is correct and
the waiting is real; the record must be able to say both, which is the reason the axis is a second
field and not a lane refinement.

## What it must express about 75/3 specifically

**The determination `floor_not_met` is correct.** Reg 75(3) allocates a burden, and silence
counting against the burden-bearer is what a burden means. The waiting axis must not soften the
determination and must not re-decide it.

**The defect it must express is one level down: the record cannot distinguish a provider who was
asked and produced nothing from a provider nobody asked.** Those are the same determination and
different facts. Expressing the difference needs an ask-state fact in the register's fact schema,
the shape `expediente.requested` already has in Banxico: a recorded demand, whose absence is a
state and not a default. Until the fact schema carries one for 75(3), the axis can only say
`waiting: "fact"` on a decided record, which states that nobody gathered the record and cannot
state whether anybody asked for it. The specification names that as its limit rather than
implying the axis answers a question the facts cannot.


## The limit a new conversion will meet first, written for the session that converts it

**An unresolved ambiguity resolution is not one of the five values, and it lands on `fact`.** If
the document you are converting registers ambiguities, then a run whose resolutions are unsupplied
will emit `waiting: "fact"` on the clauses those ambiguities gate, and the record will read as
`go and gather a fact` when the true state is `an institution must choose between the registered
readings`. Nothing gatherable resolves it, and an evidence tier dispatched against it would be
dispatched against a question no document or system holds the answer to.

**The first scoped document where this bites is the Molina provider-manual conversion**, whose
section 4.3 enumerates ambiguities as a deliverable (as scoped in the 2026-08-24 coordinator
block; the scoping is not verifiable from this repository and is recorded with that provenance).
The session converting it should expect every A-register entry it produces to surface here: on any
run left unresolved, the gated clauses will say `fact`, and the conversion report should say that
the token is the vocabulary's limit, not a claim about the case. This is a named limit, not a fix;
widening the vocabulary is a schema decision with its own R7-extension consequences, and it is not
taken by a conversion session mid-document.

## The first population measurement, with its caveat bound to the figures

**These figures must not travel without the paragraph after them.**

Over 120,000 sampled runs (40,000 per domain, seed 20260822, the `_corpus/space.mjs` sampler),
3,960,000 records: **waiting on a fact 419,454; on a judgment 481,301; on a meaning 79,784; on a
clause 12,750; not waiting 2,966,711** (993,289 records waiting in total). Per domain: banxico
186,141 / 51,387 / 0 / 6,986 / 515,486; psr 174,136 / 86,700 / 0 / 5,764 / 573,400; feca 59,177 /
343,214 / 79,784 / 0 / 1,877,825.

**The caveat, bound here: the population is the seeded corpus sampler filling fact fields
uniformly at random. It measures what the registers CAN wait on, not what any case mix DOES wait
on.** A field the sampler leaves absent as often as it fills is nothing like a field a client's
intake always carries, so these proportions say which absences the registers are structurally
exposed to, and nothing about how often a real determination would wait. The population that would
measure the second thing is a client's historical determinations replayed against the register,
which is Phase 4's simulation surface, **and nothing in the estate has one**: no historical case
set, no client intake distribution, no replay corpus. Quoting the waiting split as if it described
operational load is the E29 shape, a count under the wrong population.

## What building it falsified in this specification, and how each was resolved

1. **The value table above originally conditioned `fact` on an absence-token result, while the
   75/3 section below requires `waiting: "fact"` on the decided `floor_not_met`.** Both could not
   hold. Resolved toward 75/3: a decided record can carry waiting, which is the point of a second
   axis. `not_applicable` is the one decided result that is always `none`, because the obligation
   never arose and eager argument evaluation would otherwise mark it.
2. **The spec claimed the interpreter already holds "which absence token the result rests on". It
   does not, for any token that crosses a remap.** Resolved by origin tracking at the forcing site
   and at the tracked primitives of the hand implementations. A side effect repairs E28's collapse:
   `psr-2017/75/1` now classifies `judgment`, because the `not_assessed` is seen before the remap
   collapses it into `undetermined`.
3. **The `clause` value as specified made classification depend on how expressions are shared**,
   which differs between implementations by construction; parity caught it on its first run
   (p4/deadline: `fact` against `clause`). Resolved: a read input clause PROPAGATES its own waiting
   class, and `clause` survives as the no-origin fallback for a derived clause stuck on an
   unclassifiable input.
4. **An unresolved ambiguity resolution (A1, P1) is not expressible in the five values** and lands
   on `fact` through the fallback. A stated limit, not a claim that a resolution is gatherable.
5. **Two implementation asymmetries the sweep surfaced and the fixes for them**: a shared eager
   const probes in the emission window where it is evaluated, not where it is used (PSR's `carve`
   moved to its consumer; the 67/1 consent consts became thunks with the register's own
   short-circuit shape); and the interpreter's emitter now forces the note and extras BEFORE
   classification, because the hand implementations evaluate every argument before emitting.
   Cross-implementation agreement after the fixes: 120,042 records, zero divergences, before the
   freeze.
