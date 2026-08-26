// The claim-level PROJECTION of a v7 record set: outcome, the tier the waterfall reached, the open
// clauses at that tier, and a status per duty clause. Shared by build.mjs (which signs it) and
// verify.mjs (which rebuilds it from a fresh engine run and compares). That sharing is stated: the
// rebuild check establishes REPRODUCIBILITY of the record from the committed engine and corpus, not
// independence of this projection; independence is the signature check, done by the published
// package. SYNTHETIC tooling; nothing here reads a real claim.
export const SCOPE = 'srf/7.1.1/relevant-claim', FI_TIER = 'srf/6/fi-tier', TELCO_TIER = 'srf/6.4/telco-bears', OUTCOME = 'srf/6.7/outcome', FI_ALL = 'srf/6.4/a/fi-complied-all';
export const TIER_CLOSERS = { scope: SCOPE, fi: FI_TIER, telco: TELCO_TIER, consumer: OUTCOME };
export const WATERFALL_DUTIES = ['srf/4.2.1/cooling-off', 'srf/4.2.2/alerts', 'srf/4.2.3/outgoing-transaction-notification', 'srf/4.2.4/duty', 'srf/4.2.5/duty',
  'srf/5.2.1/deliver-only-from-authorised-aggregators', 'srf/5.2.2/block-unauthorised-sender-id', 'srf/5.2.3/duty'];
// The tier-level held judgments the waterfall reads beside the duties (6.2 and 6.3 causation and liability predicates, 6.6).
export const TIER_JUDGMENT_PATHS = ['fi.loss_arises_from_noncompliance', 'fi.fraud_or_negligence', 'fi.mas_requirement_noncompliance', 'fi.loss_arises_from_action_or_omission',
  'telco.loss_arises_from_noncompliance', 'telco.subscriber_is_account_holder', 'telco.number_designated_for_notifications', 'telco.number_received_phishing_sms'];
export const isComposition = (id) => id.startsWith('srf/6');

/** duty status: a TOTAL map over the tokens the duty clauses emit; an unmapped token throws (R7's discipline). */
export const STATUS = {
  affirmative: ['satisfied', 'available', 'provided', 'in_place', 'implemented', 'designated', 'explained', 'independent', 'within', 'given', 'withheld', 'conforming'],
  breach: ['breached', 'not_available', 'not_provided', 'not_in_place', 'not_implemented', 'not_designated', 'not_explained', 'not_independent', 'exceeded', 'overdue', 'not_given', 'not_withheld', 'not_conforming'],
  undetermined: ['undetermined', 'not_assessed', 'no_end_event', 'not_yet_due', 'outstanding', 'out_of_order', 'missing_operand', 'no_candidate'],
  not_applicable: ['not_applicable'],
};
export const STATUS_NOTES = {
  overdue: 'the limit passed with no end event (elapsed_within against clock.now): breach',
  exceeded: 'the end event came after the limit: breach',
  not_yet_due: 'no end event and the limit has not passed: not decidable yet, classed undetermined',
  outstanding: 'the obligation arose and is not yet discharged or due: classed undetermined',
  out_of_order: 'end before start: nothing decided, classed undetermined',
  '_on_supplied_meaning': 'the suffix is stripped before mapping; the record keeps the full token in tiers/exhibits',
  not_applicable: 'a duty that never arose: its own class. Neither discharged nor breached (register: CONDITIONAL), and the brief\'s four classes have no slot for it',
  not_evaluated: 'the record carries no result key: refused (INSTRUCTION), no result domain (DEFINITIONAL), or awaiting a person (JUDGMENT not assessed, after routing)',
};
const TOKEN_STATUS = {}; for (const [s, toks] of Object.entries(STATUS)) for (const t of toks) TOKEN_STATUS[t] = s;
export function dutyStatus(rec) {
  if (!('result' in rec)) return 'not_evaluated';
  const token = String(rec.result).replace(/_on_supplied_meaning$/, '');
  const s = TOKEN_STATUS[token];
  if (s === undefined) throw new Error(`duty status: unmapped result token ${JSON.stringify(rec.result)}; the map must be total`);
  return s;
}
export function dutySets(CL, byReg) {
  const holders = CL.filter((c) => ['fi', 'telco'].includes(c.duty_holder) && byReg[c.id].evaluate !== undefined).map((c) => c.id);
  const tierLevel = new Set(holders.filter((id) => isComposition(id) || id.startsWith('eupg/5.5/') || id === 'srf/7.7/perpetrated-through-sms'));
  return { DUTY_HOLDER_CLAUSES: holders, TIER_LEVEL: tierLevel, DUTY_CLAUSES: holders.filter((id) => !tierLevel.has(id)) };
}
const isOpen = (r) => !('result' in r) ? ('awaiting' in r) : r.result === 'undetermined';
export function readWaterfall(out, byMeta) {
  const outcome = out[OUTCOME].result;
  // A DECIDED OUTCOME NAMES THE TIER THAT DECIDED IT. The first draft of this reading (and
  // mas-srf-2024/run-scenarios.mjs, from which it was taken) walked the tiers for the first
  // undetermined closer regardless of the outcome, so an out_of_scope claim whose FI tier happened to
  // be undetermined read as "stopped at the FI tier" (9,095 of 41,756 records on the first full run).
  // Only an undetermined outcome has a stopping tier.
  for (const tier of outcome === 'undetermined' ? ['scope', 'fi', 'telco', 'consumer'] : []) {
    const rec = out[TIER_CLOSERS[tier]];
    if (rec.result !== 'undetermined') continue;
    const open = Object.entries(out).filter(([id, r]) => byMeta[id].tier === tier && isOpen(r))
      .map(([id, r]) => ({ clause: id, duty_holder: byMeta[id].duty_holder, waiting: r.waiting, ...(r.undetermined_because ? { because: r.undetermined_because } : {}) }));
    return { outcome, stoppedAt: TIER_CLOSERS[tier], tier, open };
  }
  const closedBy = outcome === 'out_of_scope' ? 'scope' : outcome === 'fi_bears' ? 'fi' : outcome === 'telco_bears' ? 'telco' : 'consumer';
  return { outcome, closedBy, closer: TIER_CLOSERS[closedBy], stoppedAt: null, open: [] };
}
/** The unsigned record body for one claim. Everything in it is derived from `out` (the v7 record set) and the inputs. */
export function projectClaim({ out, facts, resolutions, claim, sets, byMeta, registerRef, recordVersion, jcs, sha256hex }) {
  const wf = readWaterfall(out, byMeta);
  const duties = Object.fromEntries(sets.DUTY_CLAUSES.map((id) => [id, dutyStatus(out[id])]));
  const tiers = Object.fromEntries([...sets.TIER_LEVEL, SCOPE, OUTCOME].map((id) => [id, 'result' in out[id] ? out[id].result : ('awaiting' in out[id] ? `awaiting:${out[id].awaiting}` : null)]));
  const body = {
    payloadType: 'op.policy.claim-determination.mas-srf-2024.scale.v1', labels: ['SYNTHETIC', 'DEMONSTRATION-KEY'], synthetic: true,
    claimId: claim.claimId, population: claim.population, ...(claim.variedClause ? { variedClause: claim.variedClause } : {}),
    register: registerRef, recordVersion,
    factsDigest: sha256hex(jcs(facts)), resolutionsDigest: sha256hex(jcs(resolutions)), recordSetSha256: sha256hex(JSON.stringify(out)),
    outcome: wf.outcome, tier: wf.stoppedAt ? { reached: wf.tier, state: 'undetermined', stoppedAt: wf.stoppedAt } : { reached: wf.closedBy, state: 'closed', closer: wf.closer },
    open: wf.open, duties, tiers,
  };
  return { wf, duties, tiers, body };
}
