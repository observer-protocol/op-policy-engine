#!/usr/bin/env node
/**
 * THE PROVENANCE GATE, SHOWN REFUSING. A mock third register version whose provenance carries the
 * kinds of claim Atlas has fabricated before (a PR number, a commit hash, a test count, a
 * publication date), unverified, preceded by a mock entry with NO provenance block at all, the omitted key
 * (refused since 2026-08-25; before that the gate returned OK on it). The gate must refuse both and name each claim. Then the same entry
 * with every claim verified against a named primary source, which it must accept. Then the two
 * real versions, which carry no agent claims and pass. Output written to STEP-6-ATLAS-VERIFICATION.md
 * by hand-authored surround; this script prints the three results verbatim.
 */
import { checkVersionProvenance } from './project-versions.mjs';
import { readFileSync } from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname;
const cj = JSON.parse(readFileSync(`${HERE}/clauses.json`, 'utf8'));

const unverified = {
  status: 'restatement_candidate', text_source: 'returned by Atlas 2026-08-24',
  provenance: { retrieved_by: 'Atlas', agent_claims: [
    { claim: 'document URL', value: 'https://example.invalid/restatement.pdf' },
    { claim: 'document sha256', value: 'deadbeef…', verified: 'pending' },
    { claim: 'published 2026-02-03 by the Board', value: '2026-02-03', verified: false, verified_against: '', method: '' },
    { claim: 'restates 12 NYCRR 329-1.3(c)(3) as 85 percent', value: '85', verified: true },
    { claim: 'merged as PR #212 at commit 9f3c1a2', value: 'PR #212 / 9f3c1a2', verified: true, verified_against: 'gh pr view 212', method: 'gh', verified_value: undefined },
  ] },
};
const verified = {
  status: 'restatement_candidate', text_source: 'returned by Atlas 2026-08-24; every claim re-derived from the retrieved bytes',
  provenance: { retrieved_by: 'this session, curl, 2026-08-24T…Z', agent_claims: [
    { claim: 'document URL', value: 'https://example.invalid/restatement.pdf', verified: true, verified_against: 'HTTP GET of the URL from this session', method: 'curl -sS -L -A <browser UA>; HTTP 200; bytes stored in source/', verified_value: 'HTTP 200, 48,112 bytes' },
    { claim: 'document sha256', value: 'deadbeef…', verified: true, verified_against: 'the bytes this session retrieved', method: 'shasum -a 256 over the stored file', verified_value: '<digest as computed here>' },
    { claim: 'published 2026-02-03 by the Board', value: '2026-02-03', verified: true, verified_against: 'the document\'s own dateline and the publisher\'s index page', method: 'pdftotext; grep the dateline; publisher identified from the document, not from Atlas', verified_value: '2026-02-03, publisher as printed' },
    { claim: 'restates 12 NYCRR 329-1.3(c)(3) as 85 percent', value: '85', verified: true, verified_against: 'the retrieved text and clauses.json 12nycrr/329-1.3/c/3/eighty-five-percent', method: 'the quoted passage located as a substring of the canonicalised retrieved text; the section cited matched against the register', verified_value: 'passage at char offset N; 85 percent' },
  ] },
};
const show = (label, meta) => { try { const r = checkVersionProvenance('restatement-mock', meta); console.log(`${label}: ACCEPTED (${r.agent_claims} verified agent claims)`); } catch (e) { console.log(`${label}: ${e.message}`); } };
const absent = { status: 'restatement_candidate', text_source: 'returned by Atlas 2026-08-24' };
console.log('=== 0. mock entry with NO provenance block (the omitted key)'); show('mock-absent', absent);
console.log('\n=== 1. mock entry with unverified agent claims'); show('mock-unverified', unverified);
console.log('\n=== 2. the same entry, every claim verified against a named primary source'); show('mock-verified', verified);
console.log('\n=== 3. the two real versions as committed');
for (const vid of Object.keys(cj.register_versions).filter((k) => !k.startsWith('$'))) { const r = checkVersionProvenance(vid, cj.register_versions[vid]); console.log(`${vid}: ACCEPTED (${r.agent_claims} agent claims; provenance by this session's retrieval, recorded in source/PROVENANCE.md)`); }
