# Step 6: the restatement from Atlas, what is verified and against what, before it runs

Written 2026-08-24, before step 6 runs. Atlas has fabricated specific details before (PR numbers,
commit hashes, test counts). **Nothing Atlas returns enters `register_versions` on its authority.
An unverified Atlas claim is not a pending entry; it is not an entry**, and the projector enforces
that (below, shown refusing).

## What Atlas is being asked for

A candidate **restatement**: a public document, not authored by any claims administrator, that
restates rules of the 12 NYCRR fee schedule provisions in its own words (a provider association
billing guide, a Board provider bulletin, a professional society summary). The brief's non-goals
apply to the candidate itself: no document authored by a claims administrator, public record or
not; no fee schedule text; no CPT descriptors.

## What Atlas will say, and what each claim is checked against

Every claim below is recorded on the version entry as one `provenance.agent_claims[]` row with
`claim`, `value` (what Atlas said), `verified: true`, `verified_against` (the primary source),
`method` (the command or comparison), and `verified_value` (what the primary source actually
carries, which may differ from what Atlas said; the difference is kept, not overwritten).

| Atlas claim | verified against | method | what a mismatch means |
|---|---|---|---|
| the document exists at URL U | an HTTP GET **from this session** | `curl -sS -L -A <browser UA>`; status and bytes recorded; the bytes stored under `source/` | a 404 or a different document is the end of the candidate, not a retry through Atlas |
| the document's digest is D | the bytes this session retrieved | `shasum -a 256` over the stored file | Atlas's digest is not evidence; the recorded digest is the local one, and Atlas's is kept beside it as `value` |
| the document is titled T, dated P, published by O | the document's own cover, dateline and imprint, and the publisher's own index page | `pdftotext`; the title, date and publisher read off the text; the publisher's page fetched from this session | the publisher decides the claims-administrator non-goal, so it is read from the document and the site, never from Atlas's description |
| the author is not a claims administrator | the publisher as established above, against the non-goal | a stated reason on the entry, naming the publisher's class | a claims administrator's document is excluded whatever Atlas says about it |
| the document restates rule R of section S as "…" | the retrieved text, canonicalised (whitespace collapsed), and `clauses.json` | the quoted passage located as a substring of the canonicalised text with its offset; S resolved to a clause id in the register; the register's own source text for S compared with the passage | a passage not found verbatim is not a restatement of anything; a section that resolves to no clause is outside scope |
| the document cites 12 NYCRR section S / edition E / effective date F | the retrieved text; `source/lii-sections.txt`; `source/PROVENANCE.md` | grep of the citation in the text; the section, edition and date checked against the register's in-force facts | a citation Atlas reports and the text does not carry is a fabrication and ends the candidate |
| the document has N rules / N pages / N sections | the retrieved text | recounted here | Atlas's count is never the recorded count |
| any repository fact: a PR, a commit, a test count, a branch | `git` and `gh` **from this session** | `git show`, `gh pr view` | Atlas carries no repository facts into this register at all; a claim of this kind is refused whether or not it checks out, because nothing about a restatement document is a repository fact |
| any date: publication, retrieval, effective | the document, the State Register or the Board's page, and the environment clock for retrieval | read, never composed | a date Atlas supplies and no primary source carries is not recorded |

**Retrieval is done by this session, not by Atlas.** Atlas returns a pointer and a description;
the bytes that become `source/` are fetched here, digested here, and the description is checked
against them claim by claim. Atlas's own text is kept beside the entry as what was claimed, so a
later reader can see what was said and what was found.

## What lands, and what the entry records

A third `register_versions` entry, id `restatement-<publisher-slug>-<date>`, status
`restatement_candidate`, with `provenance.retrieved_by` naming this session and the instant,
`provenance.agent_claims` carrying every claim above with its verification, and
`source/PROVENANCE.md` extended with the digest. Then the clause texts as restated, in
`text_by_version`, each a located substring of the retrieved bytes; clauses the restatement does
not carry, absent; rules the restatement states that the regulation does not, registered as
divergence findings in the third-comparison run, not as clauses of the regulation.

## The gate, shown refusing

`checkVersionProvenance(vid, meta)` in `project-versions.mjs` runs on every register version
before anything is projected. A version whose `provenance.agent_claims` carries any claim not
`verified: true`, or without `verified_against`, `method` and `verified_value`, makes the
projector throw and write nothing for that version. `show-provenance-refusal.mjs` output,
verbatim:

```
=== 1. mock entry with unverified agent claims
mock-unverified: REFUSED register version restatement-mock: 13 agent claim(s) not verified. An unverified agent claim is not an entry.
  restatement-mock: agent_claims[0] ("document URL"): verified is undefined, not true
  restatement-mock: agent_claims[0] ("document URL"): no verified_against (the primary source the claim was checked against)
  restatement-mock: agent_claims[0] ("document URL"): no method (how it was checked)
  restatement-mock: agent_claims[1] ("document sha256"): verified is "pending", not true
  restatement-mock: agent_claims[1] ("document sha256"): no verified_against (the primary source the claim was checked against)
  restatement-mock: agent_claims[1] ("document sha256"): no method (how it was checked)
  restatement-mock: agent_claims[2] ("published 2026-02-03 by the Board"): verified is false, not true
  restatement-mock: agent_claims[2] ("published 2026-02-03 by the Board"): no verified_against (the primary source the claim was checked against)
  restatement-mock: agent_claims[2] ("published 2026-02-03 by the Board"): no method (how it was checked)
  restatement-mock: agent_claims[3] ("restates 12 NYCRR 329-1.3(c)(3) as 85 percent"): no verified_against (the primary source the claim was checked against)
  restatement-mock: agent_claims[3] ("restates 12 NYCRR 329-1.3(c)(3) as 85 percent"): no method (how it was checked)
  restatement-mock: agent_claims[3] ("restates 12 NYCRR 329-1.3(c)(3) as 85 percent"): verified but no verified_value recorded (the value the primary source actually carries)
  restatement-mock: agent_claims[4] ("merged as PR #212 at commit 9f3c1a2"): verified but no verified_value recorded (the value the primary source actually carries)

=== 2. the same entry, every claim verified against a named primary source
mock-verified: ACCEPTED (4 verified agent claims)

=== 3. the two real versions as committed
in-force: ACCEPTED (0 agent claims; provenance by this session's retrieval, recorded in source/PROVENANCE.md)
proposed-2026-01-14: ACCEPTED (0 agent claims; provenance by this session's retrieval, recorded in source/PROVENANCE.md)
```

**What the gate cannot do, stated here and in the projector's own header.** It checks the FORM
of a verification record, not its truth: a well-formed false verification passes it. The gate makes
the omission of a verification impossible to land silently; it cannot make a false verification
impossible. What carries the weight is the practice the gate forces the recording of: retrieval by
the landing session, digests computed in that session, counts recomputed in that session, and the
agent's own value kept beside the verified one.

**The failure mode, named:** a future session accepting a `verified_value` it did not compute
itself. A row that arrives already well formed, from a previous entry, a previous session, a
sibling's branch, or the agent, passes the gate on its form; the session that lands it has verified
nothing and the entry says it has. A `verified_value` is a value THIS session computed against the
primary source named in `verified_against`. One inherited is a claim wearing the field name of a
verification, and the entry that carries it is not an entry, whatever the gate says.

## Not run

Step 6 does not run until Atlas returns a candidate, and then not until every row of the table
above has a primary source beside it. If the candidate's publisher is a claims administrator, or
a quoted passage is not in the retrieved bytes, the candidate is recorded as refused with the
reason and step 6 waits for the next one.
