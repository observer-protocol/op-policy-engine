# Source provenance: Payment Services Regulations 2017 (SI 2017/752)

## Retrieval

| | |
|---|---|
| instrument | The Payment Services Regulations 2017, SI 2017/752 |
| host | legislation.gov.uk |
| representation | `data.xml` per provision, **not** the HTML view |
| pattern | `https://www.legislation.gov.uk/uksi/2017/752/regulation/{n}/data.xml` |
| retrieved | 2026-08-21, in a single browser session |

| provision | bytes | sha256 |
|---|---|---|
| regulation 76 | 14,823 | `2dfe11703ce72f51cf9a911a892eebd1049ff397fa88dda009277661ae78fbc6` |
| regulation 74 | 11,552 | `2783bf9f1ab232aee4541b5e4033aca8a1698472bb62a27c9eedd115dff68879` |
| regulation 75 | 13,661 | `949751b4e5e6f24f7c795f5fa7ee3ba4de3225f2b90a9736a107ed70c4c38e8b` |
| regulation 67 | 13,305 | `ab78fb793036b72414341b9342c13aa51c7cfb4f3d831f4562c99da56b1f7343` |

**RELABELLED 2026-08-23: THESE ARE FETCH DIGESTS, NOT DOCUMENT DIGESTS, AND THEY DO NOT REPRODUCE.**
They are over the exact response bodies received in one browser session on 2026-08-21. The sentence
that followed, that regulation 76 `was fetched twice, in two separate attempts several minutes apart,
and produced an identical digest both times`, was TRUE OF THOSE TWO FETCHES AND DOES NOT GENERALISE:
two fetches of the same request shape do agree, and that is what was observed. See the measurement
below, where twelve fetches across three shapes produced twelve different digests. The document
digests to pin are in that section.

## How it was retrieved, and why that is recorded

The previous sourcing check reported every path on this host returning `HTTP 202` with
`Content-Length: 0` and `x-amzn-waf-action: challenge`, and marked the result UNVERIFIED rather than
concluding the XML was unavailable. That was the right call and the cause is now known.

The response is an **AWS WAF JavaScript challenge**: a 2 KB HTML page that loads `challenge.js`,
computes a token, sets `aws-waf-token`, and reloads. A command line client cannot satisfy it. Adding
browser-like headers changed the response from 0 bytes to the challenge page itself and no further.

Retrieval succeeded from a real browser, where the challenge executes. Two further properties were
observed and matter for anyone repeating this:

- **The token expires within the session.** A fetch that succeeded was followed minutes later by
  `202` again on the same tab. Navigating to any URL on the host re-runs the challenge and restores
  access.
- **The block is on the client, not the resource.** Once the challenge is satisfied, every provision
  returns `200` with well formed XML.

## The files are pinned by digest, not stored here

The response bodies were not written to this directory. Chrome blocks a public origin from posting
to a private network address, and routing 53 KB of XML through the working context to write it out
bought nothing that the digest does not already give: the URLs are canonical and public, so anyone
can re-fetch and compare against the digests above.

**This is weaker than the Banxico arrangement in one specific way.** There the source PDF is stored
in the repository, so the encoding can be checked against a copy that cannot change. Here the check
requires a successful re-fetch, which requires passing the same challenge. If a pinned local copy is
wanted, it needs a client that can execute the challenge and write to disk in the same process.

## Structure, confirmed against the retrieved bytes

Reported here because it was asserted before retrieval and needed checking rather than accepting.

| claim | status | evidence from regulation 76 |
|---|---|---|
| provisions carry `id` down to sub-paragraph | **confirmed** | 16 `id` attributes, including `regulation-76`, `regulation-76-1`, `regulation-76-1-a`, `regulation-76-1-b` |
| provisions carry `IdURI` | **confirmed** | 15 `IdURI` attributes, e.g. `http://www.legislation.gov.uk/id/uksi/2017/752/part/7` |
| `RestrictStartDate` at provision level | **confirmed** | 5 occurrences, 4 distinct values: `2018-01-13`, `2020-12-31`, `2024-10-30`, `2026-04-28` |
| `ukm:UnappliedEffect` with typed amendment attributes | **confirmed** | present, carrying `AffectingEffectsExtent` and `AffectedProvisions` |
| `RestrictExtent` | confirmed, not previously asserted | `E+W+S+N.I.` |

The document parses without error as XML.


---

## THE PINS ABOVE ARE FETCH DIGESTS, NOT DOCUMENT DIGESTS. Measured 2026-08-23.

**legislation.gov.uk does not serialise XML attributes in a stable order.** Every pinned provision
was re-fetched under three request shapes from one host. **Twelve fetches, identical byte counts
within each provision, twelve different sha256s, and four document digests.**

| provision | bytes | three fetch digests | document digest, identical across all three |
|---|---|---|---|
| reg 67 | 13,305 | `9e5651df9a…` `e07b4972c5…` `b0fd6b74b2…` | `cbc3ef672803c87e0e6ea06d552d8cd45de64bf45348eb24a2d928727c9bb0ad` |
| reg 74 | 11,552 | `8e0c19ae4b…` `7e60f4b61e…` `95a0693c75…` | `149dc1c63d27047bc367289a72bc20bb4066d41a121aead4094ae2013e992990` |
| reg 75 | 13,661 | `0ec0019b89…` `a73e907ac5…` `d8d9affb6c…` | `ad311efdf4f78682e2300eccca89328f68bbace3331c6215a0a5afae6550d10f` |
| reg 76 | 14,823 | `4725d8a572…` `7f73c37e56…` `e566f63e9e…` | `d5b9c726266f2d5bcbc9f1e60f79ec490b17987d4a5a92fa4183394b1887e73b` |

**The document digests are what to pin.** They are produced by `../../_sourcing/canonicalise-xml.mjs`,
which sorts attributes within every element and normalises nothing else. Two independent
implementations, one in Python on the retrieving host and one in Node here, agree on all four.

**Three fetches of the SAME shape are stable.** The instability is across request shapes and across
sessions, not per request, which is why the original note below could observe reg 76 twice in one
browser session and see no variation. That observation was true and did not generalise.

**The digests recorded at the top of this file are none of the twelve above.** They were taken in a
browser session on 2026-08-21 and are a fourth shape. They are kept, relabelled as fetch digests, and
they cannot be reproduced by anyone including us.

### Banxico, by contrast, is stable

`circular-34-2010.pdf` was fetched three times and returned **`1312c3fd5810e63f…` every time, which is
its original pin exactly.** A PDF served as a static file has no serialisation freedom to exercise.
So this is a property of the source, not of pinning in general, and the two behave differently.

### The canonicalisation, and what it declines to do

`canonicalise-xml.mjs` normalises **attribute order within every element** and nothing else. It
deliberately does not touch inter-element whitespace, namespace prefixes, attribute values, element
order, or the XML declaration, and it states why for each. It is **not C14N**: it is the smallest
normalisation that closes the one instability actually observed, and it says so rather than implying
coverage it does not have. A second instability gets recorded there.

---

