# Banxico Circular 34/2010, numeral 3.6: policy encoding findings

Prepared 21 August 2026. This report describes the regulation. It makes no claims about software.

## What was encoded, and from what

Numeral 3.6 of Circular 34/2010 (Reglas de Tarjetas de Crédito, Banco de México), together with the
two numerals it references and depends on: numeral 3.3, which creates the notice that starts its
clock, and numeral 2.6 inciso a), which defines the authentication standard its dictamen must
evidence.

| | |
|---|---|
| document | Circular 34/2010, TEXTO COMPILADO |
| retrieved | 21 August 2026, from banxico.org.mx |
| sha256 | `1312c3fd5810e63f264a9a729a6bea9fffc84db405a75d0f0f6725d313619501` |
| pages used | 1, 5-6, 10, 11-12, 13-14 |

Everything below was derived from that document. An existing internal restatement of the same
numeral was read only afterwards, as a comparison, and the differences are recorded separately.

## Clause decomposition

**19 addressable units.** Numeral 3.6 itself accounts for 16; numeral 3.3 for 2; numeral
2.6 inciso a) for 1.

The instinct is to treat numeral 3.6 as its four listed elements, incisos a) through d). Decomposing
from the text shows that framing leaves out most of the numeral.

**Three things the four-element view has no place for.**

**The chapeau carries requirements of its own.** The sentence introducing the element list also
requires the dictamen to be in simple and clear language, signed by personnel authorised to sign it,
and made available in a branch or by an agreed means at the cardholder's election. A dictamen
failing any of these is not a conforming dictamen, and none of the three is an element in the list.

**Inciso a) is three requirements, not one.** It requires evidence of the authentication factors,
an explanation of those factors in simple and clear language, and an account of how their
verification was carried out under the applicable procedures. The three fail independently and only
the first is a matter of presence.

**Paragraphs five, six and seven carry the consequences.** The 180-day period for operations abroad,
the prohibition on default interest, and the firmeza rule that makes a credit final all sit outside
the element list. The firmeza rule is the one that decides whether money moves.

## Disposition: what a machine can decide

| disposition | count |
|---|---|
| MECHANICAL | 10 |
| JUDGMENT | 3 |
| CONDITIONAL | 3 |
| DERIVED | 3 |

**10 of 19 can be decided from recorded facts:**

- `34-2010/3.6/p4/deadline`
- `34-2010/3.6/p4/signatory`
- `34-2010/3.6/a/evidence`
- `34-2010/3.6/a/verification-method`
- `34-2010/3.6/b/time`
- `34-2010/3.6/c/parties`
- `34-2010/3.6/p6/no-moratory-interest`
- `34-2010/3.3/p1/notice-types`
- `34-2010/3.3/p5/receipt-record`
- `34-2010/2.6/a/two-factor`

**3 cannot be decided by a machine at all**, because the source sets a qualitative
standard and no test for it:

- `34-2010/3.6/p1/recovery-right`
- `34-2010/3.6/p4/language`
- `34-2010/3.6/a/explanation`

Two of the three turn on `lenguaje simple y claro`. The third, the recovery right in the first
paragraph, turns on `acredite al Tarjetahabiente`, a demonstration made to a person.

**3 are decidable only once a further fact is known**, and each has a third
outcome that is neither satisfied nor breached:

- `34-2010/3.6/p4/channel`
- `34-2010/3.6/d/device-address`
- `34-2010/3.6/p5/expediente-copy`

**3 decide nothing themselves.** They compose other results:

- `34-2010/3.6/p4/floor`
- `34-2010/3.6/p5/foreign-deadline`
- `34-2010/3.6/p7/firmeza`

The practical reading: an institution can automate the timing, the presence of elements, the
signatory check and the authentication count. It cannot automate whether the dictamen reads plainly,
or whether the charge has been demonstrated to the cardholder. Those two remain human, and the
firmeza consequence depends on the first of them under one available reading of the seventh
paragraph.

## Ambiguities requiring an institutional decision

Six points where the text does not determine an outcome. None is resolved here; resolving them is a
decision for the institution, taken once and applied consistently.

**A1. Business days or calendar days.** The fourth paragraph says `cuarenta y cinco Días`,
capitalised. The definitions section defines `Días Hábiles` and does not define `Días`. The fifth
paragraph, in the same numeral, says `días naturales` in lower case. On a 45-unit period the two
readings diverge by roughly three weeks, and firmeza turns on the expiry.

**A2. Does a timely but deficient dictamen prevent finality?** The seventh paragraph makes the
credit final where the issuer `no entrega el referido dictamen en los términos señalados`. Whether
`los términos señalados` means the timing alone or the full content specification decides every case
where something was delivered on time and was incomplete. **This is the case a dispute process
actually generates**, and it is arguably more consequential than A1.

**A3. Is delivering a conforming dictamen the same as demonstrating the charge?** The first
paragraph requires the issuer to demonstrate that the charge derived from a two-factor operation.
The fourth paragraph specifies a document. Whether producing the document discharges the
demonstration determines whether the recovery right can ever be established without a human.

**A4. Which notice starts the clock** where more than one was presented over the same charge.

**A5. Who determines whether the issuer holds the device address**, given that inciso d) applies
only where it does and an omission is otherwise unfalsifiable.

**A6. Who must receive the dictamen.** Numeral 3.6 names the Tarjetahabiente. Numeral 3.4, for the
same document, names the Titular in one paragraph and the Tarjetahabiente in another. The
instrument treats those as distinct roles.

## Clauses where a naive reading produces wrong outcomes

**The element list is a floor, not a specification.** The text says the dictamen must contain
`por lo menos` the listed information. A process that checks all four elements and concludes the
dictamen conforms has drawn a conclusion the numeral declines to license. The mechanism is that
`por lo menos` makes the list necessary and says nothing about sufficiency.

**Inciso d) is conditional, and its absence is evidence of nothing.** It applies `en caso de contar
con ella`. A process treating a missing device address as a deficiency will find breaches that do
not exist. The condition is a fact about the issuer's holdings, not about the document.

**Firmeza has two deadlines, not one.** The seventh paragraph refers to `el cuarto o quinto párrafo
de este numeral, según corresponda`. The fifth paragraph sets 180 calendar days for operations
carried out abroad. A process applying 45 units to every case will treat timely foreign dictámenes
as late, and will make credits final that are not.

**The fifth paragraph carries two different periods.** It sets the 180-day foreign deadline and,
separately, a 45-calendar-day period for providing a copy of the case file after the dictamen is
delivered. Two periods of similar length in one paragraph, measured from different events, for
different purposes. Reading either as the other misplaces the deadline.

**Inciso a) has a third component that is easy to drop.** Beyond evidence of the factors and an
explanation of them, it requires an account of how verification was carried out. A process checking
the first two will pass dictámenes that do not satisfy the inciso.

**Two independent factors is not two factors.** Numeral 2.6 inciso a) requires at least two
independent elements. Counting entries in a list answers a different question, because independence
is a property of the pair.

## A note on the worked evaluation

A standalone evaluation of this clause set accompanies this report. It is a demonstration of the
decomposition, not a system: it reads a facts object and returns one result per clause.

Two properties of it are worth stating because they are properties of the policy, not of the code.

**It takes the ambiguities as inputs and refuses to guess them.** Where an institution has not
decided A1 or A2, the clauses that depend on them return `undetermined` rather than a value. A
process that silently defaulted them would be making the institution's decision on its behalf, once
per case, invisibly.

**Ambiguity A1 does not reach every case.** Running a foreign operation through it showed that the
business-day question governs the fourth paragraph only, and a claim about an operation carried out
abroad is governed by the fifth, whose period is stated in `días naturales` and is not ambiguous. An
institution deciding A1 is therefore deciding it for domestic claims. That was not evident from
reading the numeral and became evident from working a case through it.

## What this does not cover

- **Numeral 3.4**, the abono obligation itself and its second-business-day deadline, is referenced
  here only where numeral 3.6 depends on it. It is not encoded.
- **Commencement dates.** The compiled text marks numeral 3.6 as modified by Circular 13/2018 and
  states no in-force date. Dates asserted elsewhere were not verified against this document, and no
  clause here carries one.
- **Numerals 3.7 through 3.10**, and the rest of the instrument.
- **Whether this is the version in force on any given date.** The compiled text carries per-numeral
  modification notes and no consolidated commencement table.
- **Debit cards**, which sit under a different instrument.
- **Any assessment of an institution's compliance.** This encodes what the numeral requires. Whether
  a given process meets it is not a question this work answers.
