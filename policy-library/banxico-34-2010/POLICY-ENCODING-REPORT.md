# Banxico Circular 34/2010, numeral 3.6

## An encoding of the recovery and dictamen rules, and what the encoding surfaced

Prepared 21 August 2026.

This document describes a regulation. It does not describe any software, and it makes no claim that
any system evaluates this regulation. Nothing here establishes conformity with Circular 34/2010 or
assesses any institution's compliance.

---

## 1. Scope and source

Numeral 3.6 of Circular 34/2010 (Reglas de Tarjetas de Crédito, Banco de México), together with the
two numerals it depends on: numeral 3.3, which creates the aviso that starts its clock, and numeral
2.6 inciso a), which defines the authentication standard the dictamen must evidence.

| | |
|---|---|
| document | Circular 34/2010, TEXTO COMPILADO |
| url | `https://www.banxico.org.mx/marco-normativo/normativa-emitida-por-el-banco-de-mexico/circular-34-2010/{0C55B906-6DB4-6B88-FED0-67987E9FB3CC}.pdf` |
| retrieved | 2026-08-21T21:15:20Z |
| bytes / pages | 560,920 / 23 |
| sha256 | `1312c3fd5810e63f264a9a729a6bea9fffc84db405a75d0f0f6725d313619501` |

### Commencement dates are not established here

The compiled text records numeral 3.6 as `(Numeral modificado por la Circular 13/2018)` and states
**no in-force date**. It carries per numeral modification notes and no consolidated commencement
table. Accordingly **no clause in this encoding carries a commencement date**, and establishing one
for any clause requires the Diario Oficial de la Federación publication of the amending circular
rather than this compiled text.

## 2. Decomposition

**19 clauses**, where an operational reading of numeral 3.6 commonly carries four: incisos a)
through d).

| clause id | what it requires | disposition |
|---|---|---|
| `34-2010/3.6/p1/recovery-right` | The issuer may recover a credited amount only if it demonstrates to the cardholder that the charge came from an operation executed under numeral 2.6 inciso a). | JUDGMENT |
| `34-2010/3.6/p4/deadline` | The dictamen must be made available within 45 Días counted from the date the numeral 3.3 notice was received. | MECHANICAL |
| `34-2010/3.6/p4/channel` | The dictamen must be made available in a branch or by means agreed with the cardholder, at the cardholder's election. | CONDITIONAL |
| `34-2010/3.6/p4/signatory` | The dictamen must be signed by issuer personnel authorised to sign it. | MECHANICAL |
| `34-2010/3.6/p4/language` | The dictamen must be written in simple and clear language. | JUDGMENT |
| `34-2010/3.6/p4/floor` | The listed elements are a minimum, not a complete specification of a conforming dictamen. | DERIVED |
| `34-2010/3.6/a/evidence` | The dictamen must carry evidence of the authentication factors used, as specified by numeral 2.6 inciso a). | MECHANICAL |
| `34-2010/3.6/a/explanation` | The dictamen must explain those factors in simple and clear language. | JUDGMENT |
| `34-2010/3.6/a/verification-method` | The dictamen must state how verification of those factors was carried out under the applicable procedures. | MECHANICAL |
| `34-2010/3.6/b/time` | The dictamen must state the hour and minute of the operation. | MECHANICAL |
| `34-2010/3.6/c/parties` | The dictamen must name both the acquirer and the merchant where the operation originated. | MECHANICAL |
| `34-2010/3.6/d/device-address` | Where the issuer holds it, the dictamen must state either the physical address of the device or the IP address through which it was connected. | CONDITIONAL |
| `34-2010/3.6/p5/foreign-deadline` | For claims about operations carried out abroad, the fourth-paragraph period is 180 calendar days instead. | DERIVED |
| `34-2010/3.6/p5/expediente-copy` | On the cardholder's request, the issuer must provide a free copy of the case file within 45 calendar days following delivery of the dictamen. | CONDITIONAL |
| `34-2010/3.6/p6/no-moratory-interest` | In these cases the issuer may not charge default interest or other accessories beyond ordinary interest on the credited amount. | MECHANICAL |
| `34-2010/3.6/p7/firmeza` | If the applicable period elapses and the issuer has not delivered a conforming dictamen, the credit becomes final and cannot be reversed. | DERIVED |
| `34-2010/3.3/p1/notice-types` | The issuer must permit two kinds of notice: theft or loss of the card, and claims for unrecognised charges. | MECHANICAL |
| `34-2010/3.3/p5/receipt-record` | The issuer must give the cardholder a reference number for the notice and the date and time it was received. | MECHANICAL |
| `34-2010/2.6/a/two-factor` | The operation required at least two independent authentication elements, each drawn from the enumerated list i to iv. | MECHANICAL |

### What the four element framing has no place for

The sentence that introduces the element list carries three requirements of its own: the dictamen
must be in simple and clear language, signed by personnel authorised to sign it, and made available
in a sucursal or by an agreed means at the tarjetahabiente's election. Inciso a) is itself three
requirements rather than one, and they fail independently. Paragraphs five, six and seven carry the
180 day period for operations abroad, the prohibition on default interest, and the firmeza rule that
decides whether the abono can be reversed at all.

A four element view has nowhere to record any of these, which is why the omissions in section 4 are
possible rather than careless.

## 3. What can and cannot be decided from records

| disposition | count | meaning |
|---|---|---|
| MECHANICAL | 10 | decidable from recorded facts |
| JUDGMENT | 3 | requires a person; the source sets a standard and no test |
| CONDITIONAL | 3 | decidable only once a further fact is known, with outcomes that are neither satisfied nor breached: `not_applicable` where the obligation never arose, `outstanding` where it arose and its period has not run, and `undetermined` where the facts cannot settle it. Only `34-2010/3.6/p5/expediente-copy` reaches all three; the other two reach `not_applicable` alone |
| DERIVED | 3 | decides nothing directly; composes other results |

### The three that require a person

**`34-2010/3.6/p1/recovery-right`**

A person must determine that the charge has been demonstrated to the tarjetahabiente as deriving from an operation executed under numeral 2.6 inciso a). The source sets no evidential threshold, so the determination is the institution's and is recorded as made, never inferred from the authentication factors being present.

**`34-2010/3.6/p4/language`**

A person must assess whether the dictamen as a whole is written in `lenguaje simple y claro`. There is no test in the source, so this is a reading of the document by someone competent to judge how it will be understood.

**`34-2010/3.6/a/explanation`**

A person must assess whether the explanation of the authentication factors specifically is in simple and clear language. It is the same standard as the chapeau applied to one component, and it fails independently: a dictamen can be plain overall and opaque about the factors.


Two of the three turn on `lenguaje simple y claro`. The third turns on `acredite al Tarjetahabiente`,
a demonstration made to a person.

**How far automation reaches in this workflow.** Timing, presence of the listed elements, the
signatory check and the authentication factor count are decidable from records. Whether the dictamen
reads plainly, and whether the charge has been demonstrated to the tarjetahabiente, are not. Under
one available reading of the seventh paragraph (see A2) the firmeza consequence depends on the
first of those, which places a judgment clause on the path to an outcome that moves money.

## 4. Divergence from an operational restatement

An existing restatement of this numeral, used operationally, was compared against the source after
the encoding was derived. **Five divergences.** The first two change outcomes.

A sixth was withdrawn on review. It observed that numeral 3.6 names the tarjetahabiente as the
recipient of the dictamen while numeral 3.4 names the Titular in one paragraph and the
tarjetahabiente in another. That is true, and it is not a divergence: the source is inconsistent
with itself there, so there is no settled reading the restatement could have departed from, and what
the restatement says about numeral 3.4 is accurate. The finding is kept in full as ambiguity **A6**
in section 5, which is where a question the source does not resolve belongs.

### D1. Inciso a) is missing its third component

**The source requires.** Evidence of the authentication factors, an explanation of those factors, **and** `la forma en que su verificación se realizó de acuerdo con los procedimientos aplicables`. Three requirements.

**The restatement carried.** Evidence of the factors and an explanation in plain language. Two requirements.

**Operational consequence.** A dictamen that evidences and explains the factors but says nothing about how verification was performed satisfies the restatement and does not satisfy the numeral.

### D2. Firmeza depends on which of two periods applies

**The source requires.** `Si transcurrido el plazo a que se refiere el cuarto o quinto párrafo de este numeral, según corresponda`. Two possible deadlines.

**The restatement carried.** A single condition that "the dictamen period has elapsed", with the 180 day rule placed under a separate heading and not connected to firmeza.

**Operational consequence.** On an operation carried out abroad, a dictamen delivered on day 100 is late under the restatement and timely under the source.

### D3. The fifth paragraph carries two rules, not one

**The source requires.** The 180 `días naturales` deadline for operations abroad, and separately the tarjetahabiente's right on request to a free copy of the expediente within 45 `días naturales` after the dictamen is delivered.

**The restatement carried.** The fifth paragraph identified only with the expediente copy right.

**Operational consequence.** The firmeza paragraph cross-refers to the fifth paragraph by number, so under the restatement that cross-reference does not resolve. This is the mechanism behind D2.

### D4. The clock start is stated more precisely in the source

**The source requires.** `contado a partir de la fecha en la que se haya recibido el aviso a que se refiere el numeral 3.3`, and numeral 3.3 requires that receipt date to be recorded and given to the tarjetahabiente.

**The restatement carried.** The period, without stating what it is counted from.

**Operational consequence.** The start of the period is an institutional record rather than an inference, which matters where the notice and the charge fall on different dates.

### D5. Channel and signatory are requirements the element table does not carry

**The source requires.** The dictamen must be made available `en alguna sucursal, o bien, a través de los medios que al efecto haya convenido`, at the tarjetahabiente's election, and be `suscrito por personal de la Emisora facultado para ello`.

**The restatement carried.** Neither requirement appears; the table lists only incisos a) to d).

**Operational consequence.** A dictamen failing either is not a conforming dictamen, and both sit in the same sentence that introduces the element list.

### The restatement is materially right in most places

Recorded because a divergence list read alone would misrepresent it. It correctly holds that
`por lo menos` makes the element list a floor rather than a specification, that inciso d) is
conditional and its absence is not a breach, that firmeza attaches on expiry rather than before and
that a deficient dictamen inside the period is curable, and that the `Días` question is unresolved.
It declines to resolve that question, which is the right handling.

## 5. Ambiguities requiring an institutional decision

Six points where the text does not determine an outcome. Each is a decision for the institution,
taken once and applied consistently. **None is resolved here.**

**A2 is presented first, ahead of the more familiar A1.** A1 governs how a period is counted. A2
governs whether a dictamen that arrived on time but is deficient prevents the abono becoming firme,
and that is the case a dispute process generates routinely.

### A2. Does `en los términos señalados` in the firmeza paragraph refer to the timing terms only, or to the full content specification of the fourth paragraph?

- **Timing only.** The sentence opens with the elapse of the period, so `los términos señalados` may refer back to the delivery obligation as timed.
- **Timing and content.** `el referido dictamen` refers to the dictamen as specified in the fourth paragraph, which includes the `por lo menos` element floor, the plain-language requirement, the authorised signatory and the channel. On this reading a timely but non-conforming dictamen does not prevent firmeza.

**Textual basis.** p.14 seventh paragraph: `la Emisora no entrega el referido dictamen en los términos señalados`.

**What turns on it.** Decisive for any case where a dictamen was delivered inside the period but is deficient on an element. The two readings give opposite answers on whether the credit becomes final.

**Status: unresolved.**

### A1. Is the fourth-paragraph period of `cuarenta y cinco Días` counted in business days or calendar days?

- **Business days.** `Días` is capitalised, and the definitions section defines `Días Hábiles` as a term of art. Capitalisation in this instrument marks defined terms, so a capitalised `Días` may be a shortened reference to the defined term.
- **Calendar days.** The definitions section defines `Días Hábiles`, not `Días`. The fifth paragraph, in the same numeral, says `ciento ochenta días naturales` and `cuarenta y cinco días naturales` in lower case and explicitly natural. A drafter distinguishing the two within one numeral arguably signals that the capitalised bare `Días` is neither.

**Textual basis.** p.13 fourth paragraph reads `cuarenta y cinco Días`. p.14 fifth paragraph reads `ciento ochenta días naturales` and `cuarenta y cinco días naturales`. The definitions section (p.1) defines `Días Hábiles` and does not define `Días`.

**What turns on it.** Decisive. On a 45-unit period the two readings diverge by roughly three weeks, and the seventh paragraph makes firmeza turn on exactly this expiry.

**Status: unresolved.**

### A3. What standard does `acredite al Tarjetahabiente` set, and to whose satisfaction?

- **Delivery of the conforming dictamen is itself the demonstration.** The fourth paragraph opens `Para efectos del primer párrafo del presente numeral`, tying the dictamen to the first paragraph's demonstration requirement.
- **The dictamen is necessary but not sufficient.** The first paragraph requires demonstrating that the charge derived from a 2.6(a) operation. The dictamen is a document that must contain certain elements; containing them is not the same as establishing the fact, and `por lo menos` explicitly declines to make the element list complete.

**Textual basis.** p.13 first and fourth paragraphs read together.

**What turns on it.** Determines whether the recovery right can ever be established mechanically. Under the second reading it cannot.

**Status: unresolved.**

### A4. Which event starts the period where more than one notice was presented, or where a notice was presented to an entity other than the issuer?

- **The first qualifying notice.** The text says `el aviso a que se refiere el numeral 3.3`, definite singular.
- **The notice the dictamen answers.** 3.3 permits two distinct notice types, and a case may involve both a theft notice and a later unrecognised-charge claim over the same charge.

**Textual basis.** p.13 fourth paragraph `contado a partir de la fecha en la que se haya recibido el aviso a que se refiere el numeral 3.3`; p.10 numeral 3.3 first paragraph enumerating two notice types.

**What turns on it.** Changes the deadline by the interval between the two notices. Not addressed by the source.

**Status: unresolved.**

### A5. Who determines, and on what evidence, whether the issuer `cuenta con` the device address?

- **Issuer assertion.** The condition is about the issuer's own holdings, which only the issuer can report.
- **Demonstrable holding.** Reading it as issuer assertion makes inciso d) unfalsifiable: an issuer that omits the field and asserts it holds nothing cannot be contradicted from the record.

**Textual basis.** p.14 inciso d) `En caso de contar con ella`.

**What turns on it.** Determines whether inciso d) is a requirement or a self-certification. Does not change outcomes in cases where the address is supplied.

**Status: unresolved.**

### A6. To whom must the dictamen be made available, given that numeral 3.4 names a different recipient for the same document?

- **Tarjetahabiente throughout.** 3.6's fourth paragraph says `poner a disposición del Tarjetahabiente`, and 3.4's second paragraph also says `entregue al Tarjetahabiente un dictamen`.
- **Recipient varies by numeral.** 3.4's third paragraph says `La Emisora deberá entregar al Titular el dictamen a que se refiere el párrafo anterior en términos del numeral 3.6`, naming the Titular for a document specified by 3.6.

**Textual basis.** p.12 numeral 3.4 second and third paragraphs against p.13 numeral 3.6 fourth paragraph. The instrument treats Titular and Tarjetahabiente as distinct roles throughout.

**What turns on it.** Determines who can complain that the dictamen was not made available, and therefore who can trigger the firmeza consequence.

**Status: unresolved.**

## 6. Worked cases

Three cases run against the clause register. The tables below are the per clause outputs,
**19 rows against a 19 clause register**, generated from a live run rather than transcribed.

Two kinds of input are recorded separately for each case, because they are different things. An
**ambiguity resolution** is an institutional reading of an undetermined text, decided once and
applied to every case. A **human affirmation** is one person's assessment of one document on one
case. A clause returning `not_assessed` is waiting on the second, not the first.

### Case 1. Conforming dictamen, domestic, day 29

- ambiguity resolutions supplied: `{"A1_dias_unit":"calendar_days","A2_terminos_senalados":"timing_and_content"}`
- human affirmations supplied: `p1/recovery-right=demonstrated, p4/language and a/explanation=affirmed`

| clause id | result |
|---|---|
| `34-2010/2.6/a/two-factor` | `met` |
| `34-2010/3.3/p1/notice-types` | `member` |
| `34-2010/3.3/p5/receipt-record` | `all_present` |
| `34-2010/3.6/a/evidence` | `present` |
| `34-2010/3.6/a/explanation` | `affirmed` |
| `34-2010/3.6/a/verification-method` | `present` |
| `34-2010/3.6/b/time` | `present` |
| `34-2010/3.6/c/parties` | `all_present` |
| `34-2010/3.6/d/device-address` | `satisfied` |
| `34-2010/3.6/p4/language` | `affirmed` |
| `34-2010/3.6/p4/signatory` | `member` |
| `34-2010/3.6/p4/channel` | `satisfied` |
| `34-2010/3.6/p5/foreign-deadline` | `selected_fourth_paragraph` |
| `34-2010/3.6/p4/deadline` | `within` |
| `34-2010/3.6/p4/floor` | `floor_met` |
| `34-2010/3.6/p5/expediente-copy` | `satisfied` |
| `34-2010/3.6/p6/no-moratory-interest` | `clear` |
| `34-2010/3.6/p1/recovery-right` | `demonstrated` |
| `34-2010/3.6/p7/firmeza` | `not_attached` |

The expediente copy was requested and provided 20 days after the dictamen was made available,
against a 45 `días naturales` period that runs from that delivery.

### Case 2. Inciso d) absent and NOT HELD; inciso b) missing

- ambiguity resolutions supplied: `{"A1_dias_unit":"calendar_days","A2_terminos_senalados":"timing_and_content"}`
- human affirmations supplied: `p1/recovery-right=demonstrated, p4/language and a/explanation=affirmed`

| clause id | result |
|---|---|
| `34-2010/2.6/a/two-factor` | `met` |
| `34-2010/3.3/p1/notice-types` | `member` |
| `34-2010/3.3/p5/receipt-record` | `all_present` |
| `34-2010/3.6/a/evidence` | `present` |
| `34-2010/3.6/a/explanation` | `affirmed` |
| `34-2010/3.6/a/verification-method` | `present` |
| `34-2010/3.6/b/time` | `absent` |
| `34-2010/3.6/c/parties` | `all_present` |
| `34-2010/3.6/d/device-address` | `not_applicable` |
| `34-2010/3.6/p4/language` | `affirmed` |
| `34-2010/3.6/p4/signatory` | `member` |
| `34-2010/3.6/p4/channel` | `satisfied` |
| `34-2010/3.6/p5/foreign-deadline` | `selected_fourth_paragraph` |
| `34-2010/3.6/p4/deadline` | `within` |
| `34-2010/3.6/p4/floor` | `floor_not_met` |
| `34-2010/3.6/p5/expediente-copy` | `not_applicable` |
| `34-2010/3.6/p6/no-moratory-interest` | `clear` |
| `34-2010/3.6/p1/recovery-right` | `demonstrated` |
| `34-2010/3.6/p7/firmeza` | `attached` |

Two clauses return `not_applicable`, and neither is a breach. Inciso d) does not apply because the
issuer holds no device address, and the source applies the requirement only `en caso de contar con
ella`. The expediente copy does not apply because none was requested. Inciso b) is absent, so the
element floor is not met, and under the `timing_and_content` reading of A2 the abono becomes firme
even though the dictamen arrived inside the period.

### Case 3. Foreign operation, day 120

- ambiguity resolutions supplied: **NONE**
- human affirmations supplied: **NONE**

| clause id | result |
|---|---|
| `34-2010/2.6/a/two-factor` | `met` |
| `34-2010/3.3/p1/notice-types` | `member` |
| `34-2010/3.3/p5/receipt-record` | `all_present` |
| `34-2010/3.6/a/evidence` | `present` |
| `34-2010/3.6/a/explanation` | `not_assessed` |
| `34-2010/3.6/a/verification-method` | `present` |
| `34-2010/3.6/b/time` | `present` |
| `34-2010/3.6/c/parties` | `all_present` |
| `34-2010/3.6/d/device-address` | `satisfied` |
| `34-2010/3.6/p4/language` | `not_assessed` |
| `34-2010/3.6/p4/signatory` | `member` |
| `34-2010/3.6/p4/channel` | `satisfied` |
| `34-2010/3.6/p5/foreign-deadline` | `selected_180_calendar_days` |
| `34-2010/3.6/p4/deadline` | `within` |
| `34-2010/3.6/p4/floor` | `floor_met` |
| `34-2010/3.6/p5/expediente-copy` | `breached` |
| `34-2010/3.6/p6/no-moratory-interest` | `clear` |
| `34-2010/3.6/p1/recovery-right` | `not_assessed` |
| `34-2010/3.6/p7/firmeza` | `undetermined` |

Three clauses return `not_assessed`: `p1/recovery-right`, `p4/language` and `a/explanation`. That is
not a consequence of the unresolved ambiguities. Those three are the JUDGMENT clauses from section
3, and they are waiting on a person, not on an institutional reading.

The `p4/deadline` row reads `within` at day 120. The clause register defines that clause as the 45
`Días` deadline, so the row carries the period it actually applied: **180 calendar days, selected by
`p5/foreign-deadline` under the fifth paragraph**.

#### A wrong outcome that a reasonable reading produces

No ambiguity resolutions were supplied for this case, and the deadline still resolved to `within`.

The reason is that **ambiguity A1 governs the fourth paragraph only**. A claim about an operation
carried out abroad falls under the fifth paragraph, whose period is stated as
`ciento ochenta días naturales`: explicitly natural days, and not ambiguous. So A1 does not reach
foreign cases at all, and an institution deciding it is deciding it for domestic claims.

The operational consequence is direct. The aviso was received on 2026-05-04 and the dictamen was
made available on 2026-09-01, which is **120 calendar days**. A reading that applies 45 days to
every case calls it **75 days late**, and on that basis treats the abono as firme and not
reversible. The source treats it as delivered inside the applicable period. Whether firmeza attaches
then turns on A2, which nobody has decided, which is why the clause returns `undetermined` rather
than a value.

This is a wrong outcome produced by a reasonable reading of the numeral, not a fault in any system.

## 7. What this does not cover

- **Numeral 3.4** beyond what numeral 3.6 references. The abono obligation itself and its second
  Día Hábil deadline are not encoded.
- **Debit cards.** Those sit under Circular 3/2012, which is not this instrument and was not read.
- **Commencement dates.** Absent, for the reason in section 1. No clause carries one.
- **The three JUDGMENT clauses.** They are identified and their requirements described. They are not
  decided here and cannot be decided from records.
- **The six ambiguities.** Registered, not resolved.
- **Numerals 3.7 through 3.10** and the remainder of the instrument.
- **Whether this is the version in force on any given date.** The compiled text does not establish
  it.
- **Any assessment of compliance.** This describes what the numeral requires. Whether a given
  process meets it is not a question this document answers.
