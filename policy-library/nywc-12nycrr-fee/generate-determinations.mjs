#!/usr/bin/env node
/**
 * SYNTHETIC DETERMINATIONS. No real claims, no real providers, no real names, nothing scraped.
 * Every value is drawn from the fact schema's DECLARED KIND (versions/in-force/facts.json) or from
 * a population parameter stated in this header. No value is chosen to reach a result.
 *
 * POPULATION PARAMETERS (stated here because they are choices, and a choice a report does not
 * state is a choice the reader cannot discount):
 *   N                        600 determinations, seed 20260825 (a seeded PRNG; rerunning reproduces)
 *   service.kind             uniform over the seven declared kinds
 *   rendering class          uniform over the classes the kind admits (a physician, resident, fellow,
 *                            PA or NP for medical; PT or PTA; OT or OTA; one class for the others)
 *   cited register version   in-force 70%, proposed-2026-01-14 30%
 *   cited edition            the in-force edition for the kind 60%, the proposed edition 25%,
 *                            another declared edition 15%; publisher matches the edition 90%
 *   cited schedule kind      the natural schedule for the kind 85%, another 15%; for PT and OT the
 *                            natural schedule is itself split, medical 50% / acu_pt_ot 50% (NY-A1)
 *   applied bound            present 90%, absent 10% (code and amount both unsupplied)
 *   payment relation         see paymentFor(): exact fraction 65%, an off-by-one-cent rounding 15%,
 *                            unrelated 20%
 *   branch facts             COVID-19 testing on 15% of medical; telemedicine on 20% of the five
 *                            kinds the telemedicine subdivisions cover; proration on 10% of physician
 *                            services; each optional fact unsupplied (undefined) 5% of the time
 *   resolutions              NY-A1 pt_ot_governing_schedule: medical 40% / acu_pt_ot 40% / unsupplied
 *                            20%. NY-A2 proposed_effective_date: unsupplied 40% / 2026-07-01 30% /
 *                            2027-07-01 30% (the Board's anticipated July 2027 and a placeholder)
 *   dates                    service dates on a ladder around the edition effective dates the
 *                            register declares (2019-04-01, 2020-01-01) and the two assumed
 *                            proposed effective dates; never composed from the clock
 *
 * A determination that CARRIES NO APPLIED BOUND, and one that CITES A VERSION NOT IN FORCE, are
 * both in the population by these parameters, not by construction of individual records; the
 * defensibility figure counts them after the fact.
 *
 *   node generate-determinations.mjs [N] -> determinations.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname;
const N = Number(process.argv[2] ?? 600);
const SEED = 20260825;

// mulberry32
let s = SEED >>> 0;
const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const chance = (p) => rnd() < p;
const weighted = (pairs) => { const r = rnd(); let acc = 0; for (const [v, w] of pairs) { acc += w; if (r < acc) return v; } return pairs[pairs.length - 1][0]; };
const maybe = (v) => (chance(0.05) ? undefined : v);

const facts = JSON.parse(readFileSync(`${HERE}/versions/in-force/facts.json`, 'utf8'));
const domain = (f) => facts.fields.find((x) => x.field === f).domain;
const enumOf = (f) => domain(f).values;

const IN_FORCE_EDITION = { medical: '2019-12-11', acu_pt_ot: '2019-12-11', behavioral_health: '2019-12-11', podiatry: '2018-12-26', chiropractic: '2019-12-11' };
const NATURAL_SCHEDULE = { medical: ['medical'], physical_therapy: ['medical', 'acu_pt_ot'], occupational_therapy: ['medical', 'acu_pt_ot'], acupuncture: ['acu_pt_ot'], psychology: ['behavioral_health'], podiatry: ['podiatry'], chiropractic: ['chiropractic'] };
const CLASSES = { medical: ['physician', 'resident', 'fellow', 'physician_assistant', 'nurse_practitioner'], physical_therapy: ['pt', 'pta'], occupational_therapy: ['ot', 'ota'], acupuncture: ['acupuncturist'], psychology: ['psychologist', 'lcsw'], podiatry: ['podiatrist'], chiropractic: ['chiropractor'] };
const DATES = ['2019-03-15T10:00:00Z', '2019-04-01T09:00:00Z', '2019-12-31T16:00:00Z', '2020-01-01T09:00:00Z', '2024-06-10T11:30:00Z', '2026-03-02T10:00:00Z', '2026-06-30T15:00:00Z', '2026-07-01T09:00:00Z', '2026-08-20T13:00:00Z', '2027-06-30T10:00:00Z', '2027-07-01T09:00:00Z', '2027-09-15T10:00:00Z'];
const ACCIDENTS = ['2018-11-02T08:00:00Z', '2019-02-20T14:00:00Z', '2021-05-05T09:00:00Z', '2025-12-01T07:30:00Z', '2026-01-15T12:00:00Z'];
const money = (cents) => ({ amountRaw: String(cents), decimals: '2', currency: 'USD' });
const BOUND_CENTS = [4000, 8500, 12000, 15000, 22500, 31000, 48000, 75000, 120000, 20001, 33333];
const id = (p, n) => `${p}-${String(n).padStart(2, '0')}`;

// exact fraction 65%, off by one cent 15%, unrelated 20%
const paymentFor = (boundCents, percent) => {
  if (boundCents === undefined) return money(pick(BOUND_CENTS));
  const exact = Math.round((boundCents * percent) / 100);
  const r = weighted([['exact', 0.65], ['off', 0.15], ['other', 0.20]]);
  if (r === 'exact') return money(exact);
  if (r === 'off') return money(exact + (chance(0.5) ? 1 : -1));
  return money(pick(BOUND_CENTS.filter((c) => c !== exact)));
};

const determinations = [];
for (let i = 1; i <= N; i++) {
  const kind = pick(enumOf('service.kind'));
  const rendering = pick(CLASSES[kind]);
  const isAssistant = rendering === 'pta' || rendering === 'ota';
  const isResident = rendering === 'resident' || rendering === 'fellow';
  const supervisor = rendering === 'pta' ? 'pt' : rendering === 'ota' ? 'ot' : isResident ? 'physician' : rendering;
  const citedVersion = weighted([['in-force', 0.7], ['proposed-2026-01-14', 0.3]]);
  const schedKind = chance(0.85) ? pick(NATURAL_SCHEDULE[kind]) : pick(enumOf('schedule.cited.kind'));
  const editionChoice = weighted([['in_force', 0.6], ['proposed', 0.25], ['other', 0.15]]);
  const edition = editionChoice === 'in_force' ? IN_FORCE_EDITION[schedKind] : editionChoice === 'proposed' ? '2025-12-30' : pick(enumOf('schedule.cited.edition_date').filter((e) => e !== IN_FORCE_EDITION[schedKind] && e !== '2025-12-30'));
  const naturalPublisher = edition.startsWith('2025') || edition.startsWith('2026') ? 'RefMed' : 'OptumInsight';
  const publisher = chance(0.9) ? naturalPublisher : (naturalPublisher === 'RefMed' ? 'OptumInsight' : 'RefMed');
  const hasBound = chance(0.9);
  const boundCents = hasBound ? pick(BOUND_CENTS) : undefined;

  const f = {
    service: { kind, date: maybe(pick(DATES)) },
    accident: { date: pick(ACCIDENTS) },
    schedule: { cited: { kind: maybe(schedKind), edition_date: maybe(edition), publisher: maybe(publisher), code_source: undefined } },
    applied_bound: { code: hasBound ? `SYN-${String(1000 + Math.floor(rnd() * 9000))}` : undefined, amount: hasBound ? money(boundCents) : undefined },
    payment: { amount: undefined },
    provider: { rendering_class: rendering, billing_class: undefined, supervising_class: undefined, supervision_present: undefined, supervising_authorized: undefined, supervision_direct: undefined },
    bill: { modifiers: undefined, notes_cosigned_by: undefined, supervision_billed_separately: undefined },
  };
  let percent = 100;
  const mods = [];

  if (isAssistant) {
    const mod = rendering === 'pta' ? 'CQ' : 'CO';
    if (chance(0.8)) mods.push(mod); else if (chance(0.5)) mods.push(mod === 'CQ' ? 'CO' : 'CQ');
    percent = mods.includes('CQ') || mods.includes('CO') ? 85 : 100;
    f.provider.billing_class = maybe(weighted([[supervisor, 0.85], [rendering, 0.15]]));
    f.provider.supervising_class = maybe(weighted([[supervisor, 0.85], [supervisor === 'pt' ? 'ot' : 'pt', 0.15]]));
    f.provider.supervision_present = maybe(chance(0.9));
    f.provider.supervising_authorized = maybe(chance(0.9));
    f.provider.supervision_direct = maybe(chance(0.8));
    f.bill.notes_cosigned_by = maybe(weighted([[`supervising_${supervisor}`, 0.75], ['none', 0.15], [`supervising_${supervisor === 'pt' ? 'ot' : 'pt'}`, 0.1]]));
    f.schedule.cited.code_source = maybe(weighted([['medical_physical_medicine_section', 0.5], ['acu_pt_ot_schedule', 0.35], [pick(enumOf('schedule.cited.code_source')), 0.15]]));
    f.assistant = { mixed_same_dos: maybe(chance(0.4)), priority_given_to: maybe(pick(enumOf('assistant.priority_given_to'))), service_reserved_for_pt_ot: maybe(pick(enumOf('assistant.service_reserved_for_pt_ot'))) };
  } else if (isResident) {
    const role = pick(enumOf('resident.role'));
    const mod = role === 'non_surgical' ? '1R' : '84';
    if (chance(0.8)) mods.push(mod); else if (chance(0.5)) mods.push(mod === '1R' ? '84' : '1R');
    percent = mods.includes('84') ? 16 : 100;
    f.provider.billing_class = maybe(weighted([['physician', 0.85], [rendering, 0.15]]));
    f.provider.supervising_class = maybe(weighted([['physician', 0.9], ['pt', 0.1]]));
    f.provider.supervision_present = maybe(chance(0.9));
    f.provider.supervising_authorized = maybe(chance(0.9));
    f.provider.supervision_direct = maybe(chance(0.7));
    f.bill.supervision_billed_separately = maybe(chance(0.15));
    f.resident = { program_acgme_accredited: maybe(chance(0.9)), activity_external_to_program: maybe(chance(0.1)), role: maybe(role) };
    const residents = Array.from({ length: weighted([[1, 0.7], [2, 0.2], [3, 0.1]]) }, (_, k) => id('RES', k + 1));
    const others = chance(0.3) ? Array.from({ length: pick([1, 2]) }, (_, k) => id('AST', k + 1)) : [];
    f.surgery = { resident_assistants_billed: maybe(residents), other_assistants_billed: maybe(others), all_assistants_billed: maybe([...residents, ...others]),
      complexity_requires_multiple: maybe(pick(enumOf('surgery.complexity_requires_multiple'))), multiple_documented_contemporaneously: maybe(chance(0.6)),
      on_same_bill_as_surgery: maybe(chance(0.85)), work_accurately_documented: maybe(pick(enumOf('surgery.work_accurately_documented'))) };
    f.bills = { same_dos_bill_ids: maybe(Array.from({ length: weighted([[1, 0.75], [2, 0.25]]) }, (_, k) => id('BILL', k + 1))), services_demonstrably_different: maybe(pick(enumOf('bills.services_demonstrably_different'))) };
    f.narrative = { resident_name: maybe(chance(0.9) ? 'RES-01' : null), supervising_physician_name: maybe(chance(0.9) ? 'SUP-01' : null), program_name: maybe(chance(0.85) ? 'PROG-01' : null) };
  } else {
    f.provider.billing_class = maybe(rendering);
    if (kind === 'medical' && chance(0.10)) {
      const unit = pick(BOUND_CENTS);
      f.proration = { unit_fee_specified: maybe(chance(0.8)), transferred: maybe(chance(0.7)), unit_fee_amount: maybe(money(unit)), total_paid: maybe(chance(0.7) ? money(unit) : money(pick(BOUND_CENTS))),
        physicians_agreed: maybe(chance(0.5)), separate_bills_rendered: maybe(chance(0.6)), terminated_by: maybe(pick(enumOf('proration.terminated_by'))), earned_portion_assessment: maybe(pick(enumOf('proration.earned_portion_assessment'))) };
    }
  }

  // COVID-19 testing branch, medical only
  if (kind === 'medical' && !isAssistant && chance(0.15)) {
    const basis = pick(enumOf('covid.claim_basis'));
    const region = pick(enumOf('covid.region'));
    const fee = { IV: 5133, III: 4741, II: 4153, I: 4153 }[region];
    f.applied_bound.code = hasBound ? weighted([['87635', 0.85], [f.applied_bound.code, 0.15]]) : undefined;
    f.applied_bound.amount = hasBound ? money(fee) : undefined;
    f.covid = { claim_basis: maybe(basis), region: maybe(region), rvu_applied: maybe(weighted([[39.18, 0.8], [pick([38.5, 40, 39.2]), 0.2]])),
      tests_billed: maybe(weighted([[['molecular'], 0.5], [['serological'], 0.25], [['antibody'], 0.15], [['molecular', 'antibody'], 0.1]])),
      prior_87635_lines: maybe(weighted([[[], 0.7], [['L-01'], 0.3]])), repeat_documentation: maybe(pick(enumOf('covid.repeat_documentation'))) };
    f.payment.amount = weighted([[money(fee), 0.75], [money(fee + pick([-100, 100, 250])), 0.25]]);
  }
  // telemedicine branch
  if (['acupuncture', 'physical_therapy', 'occupational_therapy', 'psychology', 'chiropractic'].includes(kind) && !isAssistant && chance(0.2)) {
    const codes = kind === 'psychology' ? ['99441', '99442', '99443'] : ['99441'];
    f.applied_bound.code = hasBound ? weighted([[pick(codes), 0.8], [f.applied_bound.code, 0.2]]) : undefined;
    f.telemedicine = { per_325_1_8: maybe(chance(0.85)), units_same_day: maybe(Array.from({ length: weighted([[1, 0.8], [2, 0.2]]) }, (_, k) => id('U', k + 1))) };
    if (kind === 'psychology' && chance(0.25)) mods.push('1B');
  }
  if (chance(0.05)) mods.push('other');
  f.bill.modifiers = maybe(mods);
  if (f.payment.amount === undefined) f.payment.amount = paymentFor(boundCents, percent);

  const resolutions = {};
  const a1 = weighted([['medical_physical_medicine_section', 0.4], ['acu_pt_ot_schedule', 0.4], [undefined, 0.2]]);
  if (a1 !== undefined) resolutions.pt_ot_governing_schedule = a1;
  const a2 = weighted([[undefined, 0.4], ['2026-07-01T00:00:00Z', 0.3], ['2027-07-01T00:00:00Z', 0.3]]);
  if (a2 !== undefined) resolutions.proposed_effective_date = a2;

  determinations.push({ id: `NYWC-SYN-${String(i).padStart(4, '0')}`, cites: { register_version_id: citedVersion }, facts: f, resolutions });
}

const out = { $note: 'SYNTHETIC. Generated by generate-determinations.mjs from the declared fact kinds and the population parameters in its header. No real claim, provider, name or scraped record. Results are never stored beside the facts; replay.mjs computes them.', seed: SEED, count: N, determinations };
writeFileSync(`${HERE}/determinations.json`, JSON.stringify(out) + '\n');
const tally = {};
for (const d of determinations) { const k = d.facts.service.kind; tally[k] = (tally[k] ?? 0) + 1; }
console.log(`generated ${N} synthetic determinations (seed ${SEED}) -> determinations.json`);
console.log(`by service kind: ${JSON.stringify(tally)}`);
console.log(`citing register version: ${JSON.stringify(determinations.reduce((a, d) => { a[d.cites.register_version_id] = (a[d.cites.register_version_id] ?? 0) + 1; return a; }, {}))}`);
console.log(`with no applied bound: ${determinations.filter((d) => d.facts.applied_bound.amount === undefined).length}`);
