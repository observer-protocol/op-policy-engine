# Build roadmap and handoff

**Observer Protocol / Agentic Terminal. 23 August 2026.**

Written so a session with no history of the preceding work can lead it. Read sections 1
and 2 before ruling on anything.

---

## 1. What the product is

An institution has a written rule. It is approved, in force, and exists as prose in an
operating document: a claims manual, a dispute procedure, an underwriting guideline. Prose
cannot be evaluated, cited by clause, or replayed against past cases.

Three steps, each with a defined input and output:

1. **Convert.** The institution's written rule, and the published regulation it implements,
   become a clause register. Each clause carries what it requires, its disposition, and
   whether the text leaves the reading open.
2. **Train and simulate.** Agents are trained against the register and replayed over
   historical or synthetic determinations. The output is a divergence report by clause and
   by disposition. No production exposure.
3. **Deploy.** Agents run against the register inside the client's perimeter, under a
   mandate, with every determination, refusal and approval signed. Review starts high and
   falls as agreement is measured, per clause.

**Not authoring policy.** The client has the rule. We make it machine-evaluable. Say so
explicitly in any client-facing material, because the objection arrives first.

The category is Decision Intelligence, named by Gartner's inaugural Magic Quadrant on
26 January 2026. The differentiating claim inside it: decisioning platforms sell better
decisions; this establishes what the rule required and what was determined under it.

---

## 2. How this estate works

These conventions were derived from repeated failures. They are not stylistic.

**Measure, do not infer.** Every count states the population it was taken over. Counts of
the same terms over three unstated populations produced 62, 183 and 169. An independence
sweep produced 26, then 49. A retirement bundle scoped by name grew four, seven, nine, and
every increment came from enumerating artifacts rather than naming them.

**Absence has two causes.** NOT_FOUND means someone looked and did not find. It is not
evidence of absence. A check that reports a clause missing and a clause that has no result
domain are different states.

**The dominant defect class: affirmative answers computed independently of the checks meant
to justify them.** Found at every layer: a registry recording intent rather than observation,
a coverage check satisfied by a declaration, a primitive inventory listing what was lifted
rather than what is used, a sweep instrument that measured its own consumer, a leak scan
disabled by the condition it guarded against, a staleness check that passes *because* the
worktree is stale.

**Instruments carry the shape of their subject.** Five instances. Before trusting a check,
show it failing on the real condition.

**Standing rules, referenced by number in the logs:**
- E4: a recorded defect waits for a second instance or a change of representation,
  whichever arrives first. They rule out different wrong answers.
- E10: name an operation by what it does, in one sentence mentioning neither its syntax nor
  its return type. If you cannot, the grouping is by form and is not yet a finding.
- E12: a measurement taken on the branch you are standing on is a claim about that branch
  until you check.
- E15: each session's view of what is orphaned is a view of its own branch. An absence is
  harder to catch than a wrong number because nothing appears in the output to prompt the
  check.

**Session coordination.** Sessions never communicate directly; everything routes through
Boyd. A ruling arriving via a peer session is a prompt to verify, not authority to act.
Sessions fetch origin before branching and never branch from local main. A session
reporting an absence states which branch it is standing on. Merge is Boyd's action.
Commit boxes name paths, never directories.

**Do-not-claim list.** No first, only, or leading. No design partner described as a
customer. No reuse rate. No competitor policy-versioning count. No cost per determination.
No em dashes in external copy. Nothing described as delivered that is not.

---

## 3. Where things stand

**Three domains converted.** Banxico Circular 34/2010 numeral 3.6, 19 clauses, Spanish PDF.
UK Payment Services Regulations 2017, 21 clauses, XML with provision-level identity. FECA
Procedure Manual Part 2 chapter 2-0805, 59 clauses, a procedure manual rather than a
regulation. The first two are public on main; FECA is in the repo and not published.

**Seven clause categories**, the last three found by converting a document class the schema
was not designed against: MECHANICAL, JUDGMENT, CONDITIONAL, DERIVED, DEFINITIONAL,
INSTRUCTION, EVIDENTIAL. Plus UNGROUNDED, a term the document decides outcomes with and
supplies no meaning for.

**The primitives transfer.** Ten operations derived from two regulations served all 35
evaluable FECA clauses with nothing added. Those are 59% of the chapter; the other 24 are
not the kind of thing a primitive evaluates. **That is a statement about FECA, not about
the inventory**, and the sentence invites the confusion, so stated explicitly: the
estate's implemented set is now 14 operations, in one place, in the interpreter. One was
added 2026-08-23 for BANXICO, `all_members_of_enumeration` (E19, on `de entre los listados
a continuación` closing the enumeration over the whole factor set), and
`select_parameter_by_predicate` is declared in `banxico-34-2010/primitives.json` with no
call site anywhere (E22): its last caller was removed by the 2026-08-23 deadline reroute,
after the inventory audit measured the declared-and-never-called bucket empty.

**Five composition shapes** cover every composing clause across the domains, plus decision
tables for derived clauses whose inputs form a small closed cross-product. **The count is
unchanged by Phase 0 and a 2026-08-23 correction to this document briefly said six, which
was a miscount:** the five always included `disjunction_over_results` as the deliberately
unnamed fifth (REUSE-LOG, `The fifth, disjunction_over_results, is deliberately unnamed`),
and what Phase 0 changed is its STATUS, unnamed to named (E18), on reg 76(1) read with reg
74(1) and 74(2), whose bar is lifted by either limb. E18 records why it is not the dual of
the conjunction: `true` dominates `undetermined` there, where `undetermined` dominates in
the conjunction. **Five is a count under the current shape vocabulary, not a closed one:**
E18 shows the vocabulary grows when re-expression makes an inline form inexpressible, so a
document class not yet converted can grow it again.

**What is not built.** No routing engine. No agent tier. No conversion tooling beyond the
session harness. Nothing is deployed. The payment service has no access control and
approver entitlement is bypassed. No customers, no production deployments.

**CORRECTED 2026-08-23: the generic evaluator exists.** This section originally read `No
generic evaluator: each domain has hand-written JavaScript.` One interpreter now reads a
register and evaluates it, with no domain name and no per-domain branch in it
(`policy-library/_interpreter/interpret.mjs`), and all three domains are re-expressed as
pure data (`<domain>/register.json`). Measured by
`policy-library/_phase0/parity.mjs`: byte-identical to the hand-written evaluators over
120,052 records across the three domains, where byte-identical is
`JSON.stringify(output)` equality covering the clause set, the key order, every result
token and every note. **The hand-written evaluators remain, untouched, as the oracle**, so
the primitive copies they carry still exist and E5 is not retired. On branch
`phase-0/register-interpreter`, PR #33, stacked on PR #30, unmerged.

---

## 4. Phase 0. The register becomes a specification

**This decides which business the company is in and everything else is cheap after it.**

Today a conversion produces two artifacts: `clauses.json`, which is data, and
`evaluate.mjs`, which is hand-written JavaScript. Every regulation gets its own evaluator.
Primitives are copied between domains rather than shared, so every correction lands twice.

That works for three domains and does not work for twenty clients. More importantly it
makes converting a regulation a programming task rather than a conversion task, which is
the difference between the product and a consultancy.

**Build:** one interpreter that reads a register and evaluates it. No per-domain code. The
register carries clauses, dispositions, primitive references, composition shapes, decision
tables, ambiguities, undefined terms, and the fact schema.

**The test:** all three existing domains re-expressed as pure data, producing byte-identical
results. Not similar. Identical.

**MET, 2026-08-23.** 120,052 record comparisons against an oracle frozen at `57b13bd`:
per domain, the committed fixtures, the corpus fact sets (FECA has none, reported as
NOT_FOUND rather than filled), and 40,000 records of the seeded stream from
`_corpus/space.mjs`. Every instrument was shown failing before anything rested on it
passing. One command for the whole claim: `node policy-library/_phase0/gate.mjs`. PR #33,
stacked on PR #30, unmerged. Full account:
`policy-library/_phase0/PHASE-0-REPORT.md`; new log entries E18 to E27.

**What dissolves rather than gets fixed:** the primitive duplication, because there stops
being two copies of anything.

**What this unlocks commercially:** the register becomes a real artifact that can be
published, versioned, diffed when a clause changes, and handed to an auditor. That is the
differentiator the whole pitch rests on, and today it is a JSON file next to a program.

**Open questions for whoever leads this, two of three answered 2026-08-23:**
- **STILL OPEN:** whether the interpreter is the thing that ships to a client, or whether a
  register compiles to something. What Phase 0 added is the specific reason it cannot be
  settled yet, E23: **no clause in any register declares its own result domain**, so 12 of
  29 `remap_result_domain` sites cannot be checked for totality and a second
  implementation could not be checked against the first except by running it. The
  register is not yet complete enough for the interpreter to be interchangeable, and that
  under-specification, not the shipping question, is the work.
- **ANSWERED:** the fact schema is part of the register, under its own top-level key with
  its own `version` field, so it can be split out later without a rewrite. Pre-ruled in
  the Phase 0 brief; the boundary is not yet known. Two of three domains have no fact
  register at all, recorded as NOT_FOUND with a stated reason rather than filled.
- **ANSWERED IN HALF:** a register validates against
  `policy-library/_interpreter/register.schema.json`, twelve rules, every one shown firing
  on a case written for it (`_phase0/show-validator.mjs`). **Whether it is published is
  still a separate decision and was deliberately not taken.**

**A limit, stated as one.** Conformance of a second implementation to a register is today
establishable only by execution against the frozen oracle, not statically, because 12 of
29 `remap_result_domain` sites declare no source domain to check totality against. E23 is
the entry; the 12 are derived, not counted by hand, as the R7 NOTE lines of
`policy-library/_interpreter/validate.mjs` over the three registers, and the 29 and the
breakdown are in E23's table. This is the answer to the first open question above in its
current state: the register is the artifact the pitch calls publishable, versionable and
auditable, and it does not yet specify its own implementation.

---

## 5. Phase 1. Routing, and the mode in the record

Small once Phase 0 is done. Days, not weeks.

Dispositions become data, so the router is a lookup. The work is not the routing.

**The work is that the determination must state which lane produced it, and the record must
carry it.** Without that, this is an opaque box with better internals, and the property that
makes it defensible to a supervisor is gone.

Four destinations: the policy engine for mechanical clauses, a single agent, a panel, a
person. The routing key is the clause's disposition, assigned once at conversion, not a
confidence score guessed at runtime. That distinction is the claim no comparable product
makes: "this clause sets a test the records answer, and here is the clause" is a defence;
"our router estimated this was easy" is not.

Tier assignment is revisable. A clause can move from agent to mechanical once it is known
which facts it actually requires, and the change goes on the record.

---

## 6. Phase 2. The agent tier

One agent against judgment clauses. Input: the clause text, the register, the facts. Output:
an assessment recorded as an assessment.

**The hard part is not the agent.** It is that a judgment result must never be
indistinguishable from a mechanical one in the output. A clause decided mechanically, one
interpreted by a model, and one whose reading was chosen must produce visibly different
results.

Precedent exists in the estate: a determination resting on a meaning the institution
supplied carries that in the result token, not only in provenance. Follow that pattern.

---

## 7. Phase 3. Conversion tooling

Turnkey economics depend on conversion getting faster, and nothing measures it today.
Conversion is currently a session and a human relaying.

Not full automation. The harness: derive-from-source, the fixed decomposition schema,
disposition assignment, ambiguity registration, undefined-term detection, divergence
reporting, trace verification.

**Move this earlier if a first engagement lands sooner.** It is the phase that decides
margins.

**The one thing nobody has measured:** whether a client's own written policy converts at
anything like the cost of a published regulation. Every conversion so far has been of clean
statutory or manual text. The first real client document will tell you more about the
business than Phases 1 through 5 combined.

---

## 8. Phase 4. Simulation as a product surface

The corpus generator does the hard part already: it derives fact sets from the register's
own declared domains, facts first, results computed by running the evaluator.

What is missing is the client-facing output: replay their historical determinations, report
divergence by clause and by disposition.

**This is the phase that removes the production-exposure objection**, which is what stalls a
regulated institution at the door. Treat it as objection removal, not evidence generation.

Simulation and backtesting are long established in this category and are not novel. What
the register adds is that a disagreement has a location in the rule.

---

## 9. Phase 5. The panel

Last, and only if a buyer asks.

A panel resolves a question the clause left open, and consensus is not a reading of the
text. If three agents agree a standard was satisfied, that is an assessment, not an
interpretation with a basis anyone can check. It must be recorded as an assessment, and the
ambiguity it touches stays registered as unresolved.

---

## 10. Cutting across all phases

**Deployment.** Nothing is deployed. The payment service has no access control and approver
entitlement is bypassed, so nothing in the current build establishes that a given person may
approve. This gates any real engagement regardless of phase.

**E11, the canonicalisation problem.** A policy reference that names a hash algorithm and
not a canonicalisation identifies a fetch, not a document. Sources that serialise
non-deterministically produce a different digest per fetch: twelve fetches of four
legislation.gov.uk provisions returned twelve digests, four under canonicalisation. The
three-arm comparability check has shipped. The `canonicalization` field is designed and
deliberately not shipped, and **the ordering is the design**: added to a two-valued
comparison, an absent field falls into the differ arm and manufactures the false negative it
exists to prevent.

**Library ownership.** Unresolved and blocking. If the first contract is work-for-hire, the
front-loaded conversion engineering is unrecoverable and the multi-year revenue model
collapses. Licensed, with the encodings and primitives retained, is what makes it work.
Settle before the first contract.

**The open/closed split**, already ruled: sources and their encodings follow the source, so
public regulation encodes to a public artifact and client policy stays confidential.
Tooling, primitives and the harness are closed regardless. Two exceptions: a published
encoding asserts a reading, and a client may object to their encoding of a public rule being
public because it reveals which readings they chose.

---

## 11. What is measured and what is not

Do not restate anything from the second list as established.

**Measured:** the primitives transfer across three domains and two document classes. Five
composition shapes cover every composing clause, the fifth named 2026-08-23 (E18) when
re-expressing PSR as data forced the inline disjunction into a shape or nothing; measured
by the three registers expressing every composing clause in the five and evaluating
byte-identically. The five is a count under the current vocabulary and not a closed one,
by E18's own mechanism. Converting a clause from a branching chain
to a decision table surfaced a finding the chain structurally could not hold. Three
ambiguity counts of six, six and five. Zero of seventeen surveyed competitors publish the
rule their determinations cite. Zero of six construct or withhold the payment that follows
the determination. A schema that cannot express a category suppresses the count: the first
FECA pass under-reported the chapter by more than a third while producing a plausible split.

**Not established:** whether conversion cost falls per domain, because the reuse figure
measures a layer below where the cost sits. Whether a client's own document converts like a
published one. Whether mid-market operators run on statutory or bespoke policy, which the
segment thesis depends on. Cost per determination in any vertical. Whether the rules-engine
incumbents are competitors or distribution.

---

## 12. First actions for a new session

1. Read `REUSE-LOG.md`, `INVENTORY-AUDIT.md` and `EVIDENTIAL.md` in the policy-library.
   The numbered entries are the estate's actual reasoning and are referenced by number
   throughout.
2. Fetch origin. State which branch you are standing on before reporting any absence.
3. Do not start Phase 0 without ruling on whether the interpreter ships to the client.
   That decision shapes everything under it.
   **SUPERSEDED 2026-08-23, ruled rather than skipped:** the Phase 0 brief pre-ruled the
   opposite: build the interpreter so that shipping it is a deployment decision, not an
   architectural one, and treat needing the answer to proceed as evidence the register is
   under-specified. Phase 0 ran under that ruling and produced the evidence: E23.
4. Before proposing any check, decide what it must be shown failing on.

---

# Addendum A. Evidence and investigation agents

Added 23 August 2026, after considering a proposed seven-agent functional swarm. Most of
that proposal was rejected and the reasoning matters more than the conclusion.

## A.1 Why most task-based agent specialisation is the wrong axis here

A functional decomposition divides work by task: evidence gathering, investigation, policy
reasoning, decision and risk, explanation, execution, audit.

This architecture divides work by **what makes a determination defensible**: a clause
decided mechanically, a clause requiring judgment, a clause whose reading was chosen. Those
are properties of the rule, assigned once at conversion. Seven agents each doing their task
well still produce one undifferentiated output, which is the thing a supervisor cannot
interrogate.

Three specific rejections, each of which would undo something already established:

**A policy-reasoning agent that maps facts to rules and computes confidence** puts a
confidence score back at the centre of routing. Routing is a property of the clause, not a
runtime guess about the request. "This clause sets a test the records answer, and here is
the clause" is a defence. "Our router estimated this was easy" is not.

**An execution agent that triggers money movement** contradicts the enforcement point. The
instruction is gated, not triggered by an agent. Of six closest comparable products, none
constructs or withholds the payment that follows the determination, and that is the only
measured differentiator with no competitor.

**An audit agent that enforces immutable logging** makes the record something an agent
produces. The record is a precondition rather than a byproduct, and its value is that it is
produced outside the deciding path. An agent writing the audit trail is self-attestation in
a new costume.

Explanation is a partial case. Generating a rationale in plain language with exact clause
citations is useful, and it must not become the thing that decides what the citation says.
The citation comes from the register.

## A.2 What survives, and why it is a real gap

**Evidence agents and investigation agents.** These do the thing the registers cannot.

Every conversion so far assumes facts arrive. Nothing in the system gathers them. A clause
returning `undetermined` because a fact is absent is often a clause that could be resolved
by going and getting the fact, and the current design has no way to do that.

FECA 2-0805 makes the gap concrete: a substantial part of that chapter is about what
evidence establishes causation and when to develop a case further. Five of its clauses are
EVIDENTIAL, a category that exists precisely because a document can govern how a condition
is proved rather than stating the condition. The register can express that a burden was not
discharged. Nothing acts on it.

This is task-shaped work and it specialises well, because gathering a document is a
different job from weighing one.

**The gap is measured, 2026-08-23, and it is 12 clauses, not 36.** A.5 originally listed
as not established whether the registers' fact requirements are specific enough to
dispatch against, since they were written to be evaluated, not requested. Checked, by
`policy-library/_phase0/dispatchable.mjs`: interpret each register over the empty fact
set, classify every clause that cannot decide by what would move it, derived from the
register rather than asserted. Population: the 75 clauses carrying an evaluation.

| cannot decide on no facts: 36 | clauses |
|---|---|
| waiting on a JUDGMENT nobody has made, a person or the agent tier | 17 |
| **waiting on a FACT or record nobody supplied, the evidence-agent population** | **12** |
| waiting on a MEANING the document never gave, an institution ruling, not gatherable | 4 |
| DERIVED, waiting on other clauses, not on a fact | 3 |

**The register names the read set for all 12**, which is what the question asked: an
evidence agent can be dispatched against a declared fact path with no free-form
instruction. Two bounds, both carried into A.4 as design constraints: five of the twelve
are moved by no single fact, and one of the twelve is in the fact bucket by composition
only.

## A.3 Where it sits in the phasing

**After Phase 1, alongside or before Phase 2.** It depends on routing existing, because a
clause has to be able to say what it is waiting for. It does not depend on the agent tier.

The sequence a determination follows once this exists:

1. Clauses evaluate against available facts.
2. Any clause returning `undetermined` for want of a fact declares which fact.
3. Evidence agents attempt to obtain it. Investigation agents pursue what is not directly
   retrievable.
4. Clauses re-evaluate. What remains `undetermined` after that is genuinely undetermined,
   which is a stronger statement than the current one.

That last point is the design payoff. Today `undetermined` conflates "the facts do not
settle this" with "nobody looked". After this, the two are distinguishable, and the record
can say which. That is the same distinction as absent versus zero, at the level of a
determination rather than a field.

## A.4 Design constraints, derived from what is already built

**The register declares what a clause needs.** An evidence agent is dispatched against a
declared fact requirement, not against a free-form instruction. If a clause cannot say what
it is missing, the gap is in the register.

**Gathering must not decide.** An evidence agent returns a fact and its provenance. It does
not return a conclusion about a clause. The moment a gatherer can settle a clause, the
disposition system is bypassed and the routing guarantee is gone.

**Provenance is part of the fact.** Where a fact came from, when, and by what method. The
existing estate already carries this discipline: a determination resting on a meaning the
institution supplied carries that in the result token. A determination resting on a fact an
agent went and found should carry that too.

**Failure to obtain is a result, not silence.** An evidence agent that cannot obtain a fact
must say so distinctly from one that did not try. Absence has two causes, and this creates a
third place where they can be conflated.

**A dispatch target is a set of facts, not a fact.** Measured: five of the twelve
gatherable clauses are moved by no single declared fact, at any value the fact space
declares for it, because their operators (`ordered_before`, `elapsed_within`,
`amounts_equal`) need both operands. `psr-2017/76/4/value-date` waits on the credit value
date AND the debit date; supplying either alone leaves it exactly where it was. An
evidence-agent interface that accepts one fact per dispatch cannot resolve five of the
twelve clauses this exists for, so the interface takes the clause's declared read set,
before anything is built.

**Composition can erase the distinction before an agent sees it, and this is a constraint
on the SHAPE VOCABULARY, not on the agents.** A.3's payoff is distinguishing `the facts do
not settle this` from `nobody looked`. Measured: `psr-2017/75/1/provider-burden` is a
conjunction over four `not_assessed` judgments, and the composition maps `not_assessed`
into `undetermined`, so the clause sits in the FACT bucket while everything it actually
waits on is a judgment. The distinction A.3 exists to create is already gone one level up,
before any evidence agent is dispatched, and no amount of agent-side discipline restores
it: a value that arrives merged cannot be split by the consumer, which is E1's lesson at
the determination layer. The addendum anticipated the conflation arriving from gathering
(`failure to obtain is a result, not silence`); it arrives from composition too, a
direction this addendum did not anticipate. Fixing it means the composition vocabulary
carries the waiting-on-a-judgment state instead of collapsing it, which is shape-layer
work that precedes the agents.

**Investigation has a boundary and it needs ruling.** Actively seeking information, running
anomaly checks and simulating counterfactuals shade from gathering into inferring. A
counterfactual is not a fact. Decide where the line sits before building, and record it,
because it will be crossed silently otherwise.

## A.5 What is not established

Whether the fact-requirement declarations are specific enough to dispatch against was
listed here and is **ANSWERED 2026-08-23**: yes for all twelve gatherable clauses, with
two bounds. The measurement is in A.2 and the bounds are constraints in A.4.

Whether evidence gathering is a client-specific integration problem rather than a product.
Core systems, document stores and external APIs differ per institution, and if every
deployment needs bespoke connectors this is services work with a thin product layer. That is
the same question the conversion pipeline faces and it deserves the same scepticism.
