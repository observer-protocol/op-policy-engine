# The waiting axis, specified and not built

A specification only. Nothing in this repository computes it, and the record does not carry it.
Written in the Phase 1 router block, which ruled the axis into existence and out of scope in the
same breath: the lane says who owns a determination, and nothing on the record says whether the
determination's inputs can be obtained, or by what kind of act.

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
| `fact` | waiting on a fact or record nobody supplied | the record's result is an absence token and the clause's evaluation reads facts |
| `judgment` | waiting on an assessment nobody has made | the result rests on `not_assessed`, or the routed record is `awaiting: person` |
| `meaning` | waiting on a meaning the document never gave | the `ungrounded` emitter's undetermined branch |
| `clause` | waiting on another clause's determination | the clause reads no fact of its own and an input clause is itself waiting |
| `none` | not waiting: the determination rests on supplied inputs | everything else, EXPLICITLY. Absent is not `none`; E30 |

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
