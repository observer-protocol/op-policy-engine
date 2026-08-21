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
**Status: RECORDED, NOT FIXED.**

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
