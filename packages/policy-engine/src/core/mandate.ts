import type {
  ObserverDelegationCredential,
  PolicyContext,
  RailDef,
  ResolvedTransfer,
  TradingMandate,
  VerifierConfig,
} from './types.js';
import { convertToBudgetUnits, formatBudgetUnits, CROSS_RAIL_SCALE } from './cross-rail.js';
import { KNOWN_SCOPE_KEYS, KNOWN_TM_KEYS, KNOWN_COUNTERPARTY_KINDS, KNOWN_PURCHASE_TERMS_TYPES, declaredUnenforceable } from './vocabulary.js';
import { capDetail, formatScaled, NON_NEGOTIABLE, type DenialDetail } from './denial.js';

// Mandate enforcement against the OWS PolicyContext.
//
// Plane split (documented in README): this verifier enforces
// TRANSACTION-plane constraints — the things observable in a wallet
// signing request (rail, native amount, recipient, time). ORDER-plane
// constraints (allowedVenues, allowedInstruments, drawdown) belong to an
// order-aware evaluator and are surfaced as NOT-ENFORCED notes, never
// silently dropped.
//
// Fail-closed rule: a BINDING constraint this verifier cannot establish
// from the available context is a DENY with an explicit reason — wrongful
// acceptance is categorically worse than wrongful rejection. Advisory
// fields (per AIP v0.8: cumulative_budget, actionScope.geographic_restriction)
// never ground a deny. Note: allowed_counterparty_types has no enforcement
// path and is NOT in the advisory allowlist. Any mandate that sets it is
// DENIED, now via the DECLARED_UNENFORCEABLE path in vocabulary.ts rather than
// the generic unknown-rule catch-all: the published schemas accept the field,
// so the issuer is told it is declared-but-unenforceable instead of being told
// the engine does not recognize a field its own schema permits.

export interface MandateOutcome {
  ok: boolean;
  reason: string;
  notes: string[];
  /** Present when the payment is permitted BUT requires a human. `ok` is false because the payment must
   * not proceed unattended, and an outcome that said otherwise would be read as permission by anything
   * not looking for this field. Optional, so every existing caller keeps working unchanged. */
  escalation?: {
    threshold: { amount: string; currency: string };
    requested: { amount: string; currency: string };
    approvers: unknown[];
    /** WHICH CONSTRAINT ROUTED THIS TO A HUMAN, as a dotted path, and NOT a breach.
     *
     * ADDED IN 1.0.0-rc.5 BECAUSE ITS ABSENCE WAS BEING WORKED AROUND DOWNSTREAM THREE TIMES. The
     * escalation said a human must authorise the payment and never said which rule decided that, so
     * every consumer that needed the answer supplied its own: `op-mcp-payment-server` defaulted it to
     * `actionScope.escalationThreshold`, then refused to default it, then proposed to assert it under
     * a better field name. Each was diagnosed as a defect in that service. All three were this
     * omission, and naming it here is what makes a consumer able to pass it through without inventing
     * anything.
     *
     * REQUIRED INSIDE `escalation`, not optional. Optional would mean the next escalating rule could
     * ship without naming itself and nothing would report it, which is the state this field exists to
     * end. `escalation` itself stays optional, so no existing caller breaks.
     *
     * THE VALUE COMES FROM THE RULE, NOT FROM THE SITE. There is exactly ONE escalation site in this
     * engine today, which is why a consumer asserting `actionScope.escalationThreshold` would be
     * correct right now and silently wrong at the second site. Being unique is a fact about today, so
     * the path is built from the same symbol the rule reads rather than written out beside it. */
    constraint: string;
  };
  /** Machine-readable detail. Optional so every existing caller keeps working: a
   * new required field on a returned type is a breaking change, which is the same
   * over-refusal as a new required config field. */
  detail?: DenialDetail;
}

/** THE `actionScope` PROPERTY THE ESCALATION RULE EVALUATES, as one symbol.
 *
 * Read THREE ways below: the property access, the currency-mismatch label, and the `constraint` path
 * on the escalation itself. A literal at any of those sites would agree with the rule by coincidence
 * and would keep agreeing after the property was renamed, which is a name borrowing the credibility of
 * a field nobody read. It is registered in `KNOWN_SCOPE_KEYS`, asserted by the vocabulary suite, so the
 * path cannot name a key this engine does not recognise. */
const ESCALATION_SCOPE_KEY = 'escalationThreshold' as const;

/** `detail` is the second argument rather than the third because every call site
 * that has one has notes too, and putting it last would mean threading `notes`
 * past it at 51 sites. */
const deny = (reason: string, notes: string[], detail?: DenialDetail): MandateOutcome =>
  detail ? { ok: false, reason, notes, detail } : { ok: false, reason, notes };

/** Parse a decimal string ("0.5") into a bigint scaled by `decimals`. */
export function parseDecimalScaled(amount: string, decimals: number): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!m) throw new Error(`amount ${JSON.stringify(amount)} is not a plain decimal string`);
  const whole = m[1] as string;
  const frac = m[2] ?? '';
  if (frac.length > decimals) {
    throw new Error(`amount ${amount} has more fractional digits than the rail supports (${decimals})`);
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, '0') || '0');
}

function parseIntegerValue(value: string): bigint {
  if (!/^\d+$/.test(value)) throw new Error(`transaction.value ${JSON.stringify(value)} is not an integer string`);
  return BigInt(value);
}

/** Match a recipient address against a mandate counterparty list. List
 * entries are raw addresses or DIDs expanded through
 * config.counterpartyAddressMap. Returns which DIDs could not be expanded so
 * callers can fail closed on them.
 *
 * Case handling is rail-family-aware (`caseExact`): EVM hex addresses are
 * case-insensitive by definition (EIP-55 is only a checksum), so they fold.
 * base58 addresses (TRON, Solana) are CASE-SENSITIVE — folding them makes a
 * case-collision grindable (search a keypair whose address lowercases to an
 * allowlisted one), so non-EVM rails compare exact bytes. */
/** A counterparty list entry: the legacy bare string, or a typed {kind, value}.
 * Both forms are live: every credential issued against v2.1/v2.3/v2.4 uses the
 * string and keeps working unchanged. */
export type CounterpartyEntry = string | { kind: string; value: string };

/** Flatten an entry to the string the matcher compares, or report the kind as
 * unrecognized. Unrecognized DENIES upstream rather than being skipped: a skipped
 * entry means an allowlist silently matched nothing, which is permissive. */
function entryValue(e: CounterpartyEntry): { value: string } | { unknownKind: string } {
  if (typeof e === 'string') return { value: e };
  if (!KNOWN_COUNTERPARTY_KINDS.has(e.kind)) return { unknownKind: e.kind };
  return { value: e.value };
}

function matchCounterparty(
  to: string,
  list: CounterpartyEntry[],
  map: Record<string, string[]> | undefined,
  caseExact: boolean,
): { matched: boolean; unmappedDids: string[]; unknownKinds: string[] } {
  const norm = (s: string) => (caseExact ? s : s.toLowerCase());
  const target = norm(to);
  const unmappedDids: string[] = [];
  const unknownKinds: string[] = [];
  for (const raw of list) {
    const flat = entryValue(raw);
    if ('unknownKind' in flat) {
      unknownKinds.push(flat.unknownKind);
      continue;
    }
    const entry = flat.value;
    if (entry.startsWith('did:')) {
      const addrs = map?.[entry];
      if (!addrs) {
        unmappedDids.push(entry);
        continue;
      }
      if (addrs.some((a) => norm(a) === target)) return { matched: true, unmappedDids, unknownKinds };
    } else if (norm(entry) === target) {
      return { matched: true, unmappedDids, unknownKinds };
    }
  }
  return { matched: false, unmappedDids, unknownKinds };
}

function inTimeWindows(
  windows: NonNullable<NonNullable<TradingMandate['temporal']>['allowedTimeWindows']>,
  atMs: number,
): boolean {
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  for (const w of windows) {
    let parts: Intl.DateTimeFormatPart[];
    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone: w.timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
      }).formatToParts(new Date(atMs));
    } catch {
      continue; // unknown timezone in the mandate: this window can never admit
    }
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const hour = get('hour') === '24' ? '00' : get('hour');
    const hhmm = `${hour}:${get('minute')}`;
    const weekday = get('weekday').toLowerCase().slice(0, 3);
    if (w.daysOfWeek && w.daysOfWeek.length > 0 && !w.daysOfWeek.includes(weekday)) continue;
    if (!dayNames.includes(weekday)) continue;
    if (w.start <= w.end ? hhmm >= w.start && hhmm <= w.end : hhmm >= w.start || hhmm <= w.end) return true;
  }
  return false;
}

function railMatches(entry: string, railDef: RailDef, chainId: string): boolean {
  return entry === railDef.rail || entry === chainId;
}

interface DelegationCap { max_amount?: string; currency?: string }
interface DelegationPerRail {
  per_transaction?: DelegationCap;
  per_day?: DelegationCap;
  per_asset?: Record<string, unknown>;
}

export function evaluateMandate(
  ctx: PolicyContext,
  cred: ObserverDelegationCredential,
  config: VerifierConfig,
  resolved: ResolvedTransfer,
): MandateOutcome {
  const notes: string[] = [];
  const subject = cred.credentialSubject;
  // credentialSubject.delegation (the spending-delegation shape) is handled after
  // rail mapping + resolved-transfer are available — see the spending_limits block
  // below. A RECOGNIZED delegation.scope.spending_limits.per_rail shape is read and
  // enforced; an UNRECOGNIZED delegation container fails closed there.
  const scope = subject.actionScope;
  const tm = subject.tradingMandate;
  const nowMs = Date.parse(ctx.timestamp) || Date.now();

  // 1. Rail mapping — an unmapped chain means we cannot establish what the
  // mandate's same-currency comparisons mean on this rail.
  const railDef = config.rails[ctx.chain_id];
  if (!railDef) {
    return deny(
      `[rails] chain ${ctx.chain_id} has no rail mapping in config.rails — cannot establish mandate scope on an unmapped chain`,
      notes,
    );
  }

  // ── requiredPurchaseTerms ──────────────────────────────────────────────────
  //
  // THE ONLY REAL CONSTRAINT ON A PAYOUT RAIL. actionScope.allowList cannot bound a claims payout at
  // all: a third-party administrator's payees are the customer's customers, thousands of claimants
  // unknown when the mandate is issued, and allowList matches identities by equality. What bounds
  // the payment is whether it matches an adjudicated claim.
  //
  // Placed BEFORE the amount and counterparty checks because it asks a prior question: not "is this
  // payment within bounds" but "did anyone other than the agent state that this is owed".
  if (Array.isArray(scope?.requiredPurchaseTerms) && scope.requiredPurchaseTerms.length > 0) {
    const accepted = scope.requiredPurchaseTerms as string[];
    const presented = ctx.purchase_terms;

    // UNRECOGNIZED TYPES IN THE CREDENTIAL DENY. The vocabulary is open so a new scheme needs no
    // schema version; the price of that is that this set is the closed half, and a mandate naming a
    // type this engine cannot evaluate is a mandate whose control we cannot perform.
    const unknownAccepted = accepted.filter((t) => !KNOWN_PURCHASE_TERMS_TYPES.has(t));
    if (unknownAccepted.length > 0) {
      return deny(
        `[purchase-terms] mandate accepts artifact type(s) this engine does not recognize: ${unknownAccepted.join(', ')}. ` +
        `Recognized: ${[...KNOWN_PURCHASE_TERMS_TYPES.keys()].join(', ')}. An open vocabulary is not an open door: ` +
        'a type we cannot evaluate is a control we cannot perform, so the credential is refused rather than partially honoured',
        notes,
      );
    }

    if (!presented) {
      return deny(
        `[purchase-terms] this mandate requires a signed statement of what is owed (${accepted.join(' or ')}) and none was presented. ` +
        'ABSENT IS NOT EMPTY: a payment with no stated terms is the agent asserting, unchallenged, what the other party wanted',
        notes,
      );
    }
    if (!presented.verified) {
      return deny(
        `[purchase-terms] the presented ${presented.type} was not verified. This engine refuses an unverified artifact rather than ` +
        'accepting one on the strength of its shape: an artifact read as evidence of itself is not evidence',
        notes,
      );
    }
    if (!accepted.includes(presented.type)) {
      return deny(
        `[purchase-terms] presented ${presented.type}, which this mandate does not accept (accepts ${accepted.join(', ')})`,
        notes,
      );
    }
    const known = KNOWN_PURCHASE_TERMS_TYPES.get(presented.type);
    notes.push(`[purchase-terms] ${presented.type} accepted, signed by ${known?.signer ?? 'an unrecorded party'}`);
  }

  // Case discipline for counterparty compares on this rail (see matchCounterparty).
  const cpCaseExact = railDef.family !== 'evm';

  // 2. Resolved transfer — the single {asset, amount, recipient} view from
  // either an EVM or Solana payload (see resolve-transfer.ts). Amount/currency
  // comparisons below are against the ACTUAL transferred asset (e.g. USDC at 6
  // decimals), not the chain-native unit.
  notes.push(...resolved.notes);
  const tx = ctx.transaction ?? {};

  // ── Spending-delegation shape (rail-parity items 3+4) ──────────────────────
  // A credential may carry its constraints under credentialSubject.delegation
  // .scope.spending_limits.per_rail instead of actionScope/tradingMandate. Read
  // and enforce the per-rail per_transaction (and per_day) cap here, same-currency,
  // no FX. RECOGNIZED shape → enforce (item 3). UNRECOGNIZED delegation container,
  // per_asset (out of scope for this engine), unenforceable transfer, or missing cap → fail closed
  // (item 4 — replaces the earlier blanket-deny 7337f61: recognized→enforce,
  // unrecognized→DENY, both hold).
  const delegation = (subject as unknown as { delegation?: Record<string, unknown> }).delegation;
  if (delegation !== undefined) {
    const scopeObj = delegation.scope as Record<string, unknown> | undefined;
    const spending = scopeObj?.spending_limits as { per_rail?: Record<string, DelegationPerRail> } | undefined;
    if (!spending || typeof spending !== 'object' || typeof spending.per_rail !== 'object' || spending.per_rail === null) {
      return deny('[failClosed] credentialSubject.delegation without a recognized scope.spending_limits.per_rail shape — refusing to enforce a mandate it cannot fully read', notes);
    }
    const perRail = spending.per_rail[railDef.rail] ?? spending.per_rail[ctx.chain_id];
    if (!perRail || typeof perRail !== 'object') {
      return deny(`[spending-limits] no per_rail entry for ${railDef.rail} — no authority on this rail (fail-closed)`, notes);
    }
    if (perRail.per_asset !== undefined) {
      return deny('[spending-limits] per_asset caps are not evaluated by this engine (per-asset enforcement is out of scope for this engine) — fail-closed', notes);
    }
    if (resolved.unenforceable) {
      return deny(`[unenforceable] ${resolved.unenforceable} — spending_limits cap cannot be established`, notes);
    }
    const pt = perRail.per_transaction;
    if (!pt || pt.max_amount === undefined || pt.currency === undefined) {
      return deny('[spending-limits] per_transaction.{max_amount,currency} required to establish the cap (fail-closed)', notes);
    }
    if (resolved.assetSymbol !== undefined && pt.currency !== resolved.assetSymbol) {
      return deny(`[spending-limits] same-currency invariant: cap currency ${pt.currency} != transferred ${resolved.assetSymbol} (no FX)`, notes);
    }
    if (resolved.amount === undefined || resolved.decimals === undefined) {
      return deny('[spending-limits] transfer amount/decimals unavailable — cannot establish the per_transaction cap (fail-closed)', notes);
    }
    const cap = parseDecimalScaled(pt.max_amount, resolved.decimals);
    if (resolved.amount > cap) {
      return deny(
        `[spending-limits] value ${formatScaled(resolved.amount, resolved.decimals)} exceeds per_transaction cap ${pt.max_amount} ${pt.currency} on ${railDef.rail}. ${NON_NEGOTIABLE}`,
        notes,
        capDetail({ tag: 'spending-limits', constraint: 'delegation.scope.spending_limits.per_rail.per_transaction.max_amount', cap, observed: resolved.amount, decimals: resolved.decimals, unit: pt.currency }),
      );
    }
    if (perRail.per_day !== undefined) {
      const dailyTotal = ctx.spending?.daily_total !== undefined ? parseIntegerValue(ctx.spending.daily_total) : undefined;
      if (dailyTotal === undefined) {
        return deny('[spending-limits] per_day cap present but no daily counter supplied — fail-closed', notes);
      }
      if (perRail.per_day.max_amount !== undefined) {
        const dcap = parseDecimalScaled(perRail.per_day.max_amount, resolved.decimals);
        if (dailyTotal + resolved.amount > dcap) {
          return deny(
            `[spending-limits] 24h volume would exceed per_day cap ${perRail.per_day.max_amount} ${perRail.per_day.currency ?? pt.currency} on ${railDef.rail}. ${NON_NEGOTIABLE}`,
            notes,
            capDetail({ tag: 'spending-limits', constraint: 'delegation.scope.spending_limits.per_rail.per_day.max_amount', cap: dcap, observed: dailyTotal + resolved.amount, priorTotal: dailyTotal, decimals: resolved.decimals, unit: perRail.per_day.currency ?? pt.currency }),
          );
        }
      }
    }
    return { ok: true, reason: 'spending_limits satisfied', notes };
  }

  // Which binding constraints require an established amount / recipient?
  const authCfg = subject.authorizationConfig;
  const level = subject.authorizationLevel;
  const needsAmount =
    scope.per_transaction_ceiling !== undefined ||
    tm?.maxNotionalPerOrder !== undefined ||
    tm?.velocity?.dailyVolumeCap !== undefined ||
    tm?.velocity?.monthlyVolumeCap !== undefined ||
    tm?.crossRailBudget !== undefined ||
    (level === 'one-time' && !!authCfg?.oneTime) ||
    (level === 'recurring' && !!authCfg?.recurring) ||
    (level === 'policy' && !!authCfg?.policy?.per_rail_caps);
  const needsCounterparty =
    (level === 'one-time' && !!authCfg?.oneTime) ||
    (level === 'recurring' && !!authCfg?.recurring) ||
    (tm?.counterparty?.allowList?.length ?? 0) > 0 ||
    (tm?.counterparty?.blockList?.length ?? 0) > 0;

  let asset = resolved.assetSymbol;
  let decimals = resolved.decimals ?? railDef.decimals;
  let value = resolved.amount;
  let to = resolved.recipient;

  // Fail-closed: a binding amount/counterparty constraint we cannot establish
  // from the payload denies. The one escape is the explicit EVM
  // allowContractCalls knob, which falls back to native-value measurement of
  // an unrecognised call (and says so loudly).
  if ((needsAmount || needsCounterparty) && resolved.unenforceable) {
    const evmNativeFallback =
      config.allowContractCalls && railDef.family === 'evm' && typeof tx.value === 'string';
    if (!evmNativeFallback) {
      return deny(`[unenforceable] ${resolved.unenforceable}`, notes);
    }
    value = parseIntegerValue(tx.value as string);
    asset = railDef.currency;
    decimals = railDef.decimals;
    to = typeof tx.to === 'string' ? tx.to : undefined;
    notes.push(
      'allowContractCalls=true: an unrecognised call was measured by NATIVE value only — token/contract spend may bypass amount ceilings',
    );
  }

  if (needsCounterparty && to === undefined) {
    return deny(
      '[counterparty] the transaction has no resolvable recipient but the mandate binds counterparties — cannot establish who receives',
      notes,
    );
  }
  if (needsCounterparty && resolved.recipientKind === 'spl-token-account') {
    notes.push(
      'counterparty matching on this SPL transfer is against the destination TOKEN ACCOUNT address; matching by wallet/DID requires that token account to be listed in the allowlist or counterpartyAddressMap (owner resolution is not done offline)',
    );
  }

  const sameCurrencyOrDeny = (currency: string, what: string): MandateOutcome | null => {
    if (asset === undefined) {
      return deny(`[same-currency] ${what} requires a known asset but the transfer asset could not be established`, notes);
    }
    if (currency !== asset) {
      return deny(
        `[same-currency] ${what} is denominated in ${currency} but this transfer moves ${asset} — no FX conversion is performed (AIP v0.8 same-currency invariant), so scope cannot be established`,
        notes,
      );
    }
    return null;
  };

  // 4. actionScope.allowed_rails (binding).
  if (scope.allowed_rails && scope.allowed_rails.length > 0) {
    if (!scope.allowed_rails.some((r) => railMatches(r, railDef, ctx.chain_id))) {
      return deny(
        `[allowed-rails] rail ${railDef.rail} (${ctx.chain_id}) is not in the mandate's allowed_rails [${scope.allowed_rails.join(', ')}]`,
        notes,
      );
    }
  }

  // 5. actionScope.per_transaction_ceiling (binding, same-currency).
  if (scope.per_transaction_ceiling) {
    const c = scope.per_transaction_ceiling;
    const mismatch = sameCurrencyOrDeny(c.currency, 'per_transaction_ceiling');
    if (mismatch) return mismatch;
    const ceiling = parseDecimalScaled(c.amount, decimals);
    if ((value as bigint) > ceiling) {
      return deny(
        `[ceiling] transaction value exceeds per_transaction_ceiling of ${c.amount} ${c.currency}. ${NON_NEGOTIABLE}`,
        notes,
        capDetail({ tag: 'ceiling', constraint: 'actionScope.per_transaction_ceiling', cap: ceiling, observed: value as bigint, decimals, unit: c.currency }),
      );
    }
  }

  // 5b. actionScope[ESCALATION_SCOPE_KEY] (binding, same-currency) — THE THIRD STATE.
  //
  // AFTER THE CEILING, DELIBERATELY. Above the ceiling is a DENY and stays one: a payment nobody may
  // authorise must not be offered to a human as though approving it were an option. So the order is
  // deny, then escalate, then allow, and the band this covers is [threshold, ceiling].
  //
  // THIS IS THE BAND THE v2.1 DEFECT AUTO-APPROVED. The old field emitted a note saying human
  // notification was expected upstream and then allowed the payment, so everything between the
  // threshold and the ceiling proceeded with nobody asked. It now escalates.
  //
  // NOT A DENIAL. `ok: false` here would tell an agent it may never do this, which is false and would
  // send it looking for a different route. The escalation is carried out separately.
  if (scope[ESCALATION_SCOPE_KEY]) {
    const t = scope[ESCALATION_SCOPE_KEY];
    const mismatch = sameCurrencyOrDeny(t.currency, ESCALATION_SCOPE_KEY);
    if (mismatch) return mismatch;
    const threshold = parseDecimalScaled(t.amount, decimals);
    if ((value as bigint) >= threshold) {
      return {
        ok: false,
        reason: `[escalation] transaction value ${formatScaled(value as bigint, decimals)} ${t.currency} is at or above the escalationThreshold of ${t.amount} ${t.currency}; a human approver must authorise it`,
        notes,
        escalation: {
          threshold: { amount: t.amount, currency: t.currency },
          requested: { amount: formatScaled(value as bigint, decimals), currency: t.currency },
          // FROM `approvers.keys`, WHICH IS THE SHAPE THE SCHEMA DEFINES. This read
          // `Array.isArray(scope.approvers)`, and delegation v2.6 defines the field as an OBJECT
          // carrying `keys`. So a schema-VALID credential naming an approver escalated with
          // `approvers: []`: the mandate panel showed a named approver and the approval record showed
          // nobody. Fixed here rather than downstream, because a consumer filling the list in from the
          // credential would be producing a verdict's contents rather than reading them.
          approvers: Array.isArray(scope.approvers?.keys) ? scope.approvers.keys : [],
          // WHICH RULE ROUTED THIS, from the same symbol the rule reads. See ESCALATION_SCOPE_KEY.
          constraint: `actionScope.${ESCALATION_SCOPE_KEY}`,
        },
      };
    }
  }

  // 6. actionScope.allowed_transaction_categories (binding). OWS context
  // carries no category; the deployment must declare one in config.
  if (scope.allowed_transaction_categories && scope.allowed_transaction_categories.length > 0) {
    if (!config.transactionCategory) {
      return deny(
        '[category] mandate restricts allowed_transaction_categories but config.transactionCategory is not declared for this key — cannot establish the category of this transaction',
        notes,
      );
    }
    if (!scope.allowed_transaction_categories.includes(config.transactionCategory)) {
      return deny(
        `[category] declared category ${config.transactionCategory} is not in allowed_transaction_categories [${scope.allowed_transaction_categories.join(', ')}]`,
        notes,
      );
    }
  }

  // 6b. Unknown/unrecognized actionScope fields — fail-closed.
  // AIP v0.8 §1.2-§1.3 explicitly lists advisory fields; everything else is binding.
  // A binding constraint this verifier cannot evaluate is a DENY.
  //
  // Two denial shapes, same outcome, different cause. A property the published
  // schema ACCEPTS but no engine enforces is declared-unenforceable and says so;
  // anything else is genuinely unrecognized. Both deny — an issuer who writes a
  // schema-valid field deserves to be told which of the two happened.
  for (const key of Object.keys(scope)) {
    if (!KNOWN_SCOPE_KEYS.has(key)) {
      const known = declaredUnenforceable('actionScope', key);
      if (known) {
        return deny(`[unenforceable] actionScope.${key}: ${known.reason}`, notes,
          { tag: 'unenforceable', constraint: `actionScope.${key}`, terminal: true });
      }
      return deny(
        `[unknown-rule] unrecognized actionScope constraint "${key}" — cannot evaluate; fail-closed per AIP v0.8`,
        notes,
        { tag: 'unknown-rule', constraint: `actionScope.${key}`, terminal: true },
      );
    }
  }

  // 7. Authorization level configs (binding).
  const checkCounterpartyDid = (did: string, label: string): MandateOutcome | null => {
    const { matched, unmappedDids } = matchCounterparty(to as string, [did], config.counterpartyAddressMap, cpCaseExact);
    if (matched) return null;
    if (unmappedDids.length > 0) {
      return deny(
        `[counterparty] ${label} pins counterparty ${did} but no address mapping exists in config.counterpartyAddressMap — cannot establish that ${to} is that counterparty`,
        notes,
      );
    }
    return deny(`[counterparty] recipient ${to} is not the ${label} counterparty ${did}`, notes);
  };

  if (level === 'one-time' && authCfg?.oneTime) {
    const ot = authCfg.oneTime;
    if (!railMatches(ot.rail, railDef, ctx.chain_id)) {
      return deny(`[one-time] authorized rail is ${ot.rail}, not ${railDef.rail} (${ctx.chain_id})`, notes);
    }
    const mismatch = sameCurrencyOrDeny(ot.currency, 'one-time amount');
    if (mismatch) return mismatch;
    const exact = parseDecimalScaled(ot.amount, decimals);
    if ((value as bigint) !== exact) {
      return deny(`[one-time] amount must be exactly ${ot.amount} ${ot.currency}`, notes);
    }
    if (ot.execution_deadline && nowMs > Date.parse(ot.execution_deadline)) {
      return deny(`[one-time] execution_deadline ${ot.execution_deadline} has passed`, notes);
    }
    const cp = checkCounterpartyDid(ot.counterparty_did, 'one-time');
    if (cp) return cp;
    notes.push('one-time credential: single-use consumption is not trackable at this layer — revoke after settlement');
  }

  if (level === 'recurring' && authCfg?.recurring) {
    const rc = authCfg.recurring;
    if (rc.valid_until && nowMs > Date.parse(rc.valid_until)) {
      return deny(`[recurring] authorization expired (valid_until ${rc.valid_until})`, notes);
    }
    if (rc.allowed_rails && rc.allowed_rails.length > 0 && !rc.allowed_rails.some((r) => railMatches(r, railDef, ctx.chain_id))) {
      return deny(`[recurring] rail ${railDef.rail} not in recurring allowed_rails [${rc.allowed_rails.join(', ')}]`, notes);
    }
    const cp = checkCounterpartyDid(rc.counterparty_did, 'recurring');
    if (cp) return cp;
    const mismatch = sameCurrencyOrDeny(rc.ceiling_currency, 'recurring ceiling');
    if (mismatch) return mismatch;
    if (rc.per_transaction_max !== undefined) {
      const cap = parseDecimalScaled(rc.per_transaction_max, decimals);
      if ((value as bigint) > cap) {
        return deny(`[recurring] value exceeds per_transaction_max ${rc.per_transaction_max} ${rc.ceiling_currency}`, notes);
      }
    }
    const ceiling = parseDecimalScaled(rc.ceiling_amount, decimals);
    const dailyTotal = ctx.spending?.daily_total !== undefined ? parseIntegerValue(ctx.spending.daily_total) : undefined;
    if (dailyTotal !== undefined && dailyTotal + (value as bigint) > ceiling) {
      // The per-key daily counter is a LOWER BOUND on period spend, so an
      // overshoot here is definitely an overshoot of the period ceiling.
      return deny(
        `[recurring] this key's observed spend today plus this transaction exceeds the recurring ceiling ${rc.ceiling_amount} ${rc.ceiling_currency} (period ${rc.period})`,
        notes,
      );
    }
    notes.push(
      `recurring ceiling ${rc.ceiling_amount}/${rc.period}: enforced deny-side only — the available counter is per-API-key, per-day, native-value; full-period accounting needs a stateful evaluator`,
    );
  }

  if (level === 'policy' && authCfg?.policy) {
    const pol = authCfg.policy;
    const caps = pol.per_rail_caps?.[railDef.rail] ?? pol.per_rail_caps?.[ctx.chain_id];
    if (caps) {
      const capCurrency = caps.currency ?? asset ?? railDef.currency;
      const mismatch = sameCurrencyOrDeny(capCurrency, `per_rail_caps[${railDef.rail}]`);
      if (mismatch) return mismatch;
      if (caps.per_transaction !== undefined) {
        const cap = parseDecimalScaled(caps.per_transaction, decimals);
        if ((value as bigint) > cap) {
          return deny(`[per-rail-cap] value exceeds per_transaction cap ${caps.per_transaction} ${capCurrency} on ${railDef.rail}`, notes);
        }
      }
      if (caps.aggregate !== undefined) {
        const agg = parseDecimalScaled(caps.aggregate, decimals);
        const dailyTotal = ctx.spending?.daily_total !== undefined ? parseIntegerValue(ctx.spending.daily_total) : undefined;
        if (dailyTotal !== undefined && dailyTotal + (value as bigint) > agg) {
          return deny(`[per-rail-cap] observed spend today plus this transaction exceeds aggregate cap ${caps.aggregate} ${capCurrency} on ${railDef.rail}`, notes);
        }
        notes.push(`per-rail aggregate cap: enforced deny-side only via the per-key daily counter (period ${caps.period ?? 'unspecified'})`);
      }
    }
    if (pol.rail_preference && !pol.rail_preference.some((r) => railMatches(r, railDef, ctx.chain_id))) {
      notes.push(`rail ${railDef.rail} is outside the policy rail_preference list (preference ordering is advisory)`);
    }
    if (pol.escalation_threshold !== undefined) {
      // Was a NOTE: "human notification expected upstream (not performed by this
      // verifier)". A note here silently auto-approved every payment between the
      // threshold and the per-transaction ceiling, in a field already issuable
      // against v2.1/v2.3/v2.4. The enforced path is actionScope.escalationThreshold,
      // which sits on an enumerated surface and requires actionScope.approvers so the
      // band has somewhere to route.
      const known = declaredUnenforceable('authorizationConfig.policy', 'escalation_threshold');
      return deny(
        `[unenforceable] authorizationConfig.policy.escalation_threshold: ${known?.reason ?? 'not enforced at this layer'}`,
        notes,
      );
    }
  }

  // 8. tradingMandate (when present).
  if (tm) {
    if (tm.maxNotionalPerOrder !== undefined) {
      if (!tm.unit) return deny('[trading-mandate] maxNotionalPerOrder present without unit — verifiers MUST NOT infer units', notes);
      const mismatch = sameCurrencyOrDeny(tm.unit, 'tradingMandate.maxNotionalPerOrder');
      if (mismatch) return mismatch;
      const cap = BigInt(tm.maxNotionalPerOrder) * 10n ** BigInt(decimals);
      if ((value as bigint) > cap) {
        return deny(
          `[notional] transaction value exceeds maxNotionalPerOrder ${tm.maxNotionalPerOrder} ${tm.unit}. ${NON_NEGOTIABLE}`,
          notes,
          capDetail({ tag: 'notional', constraint: 'tradingMandate.maxNotionalPerOrder', cap, observed: value as bigint, decimals, unit: tm.unit }),
        );
      }
    }

    const cp = tm.counterparty;
    if (cp?.blockList && cp.blockList.length > 0 && to) {
      const { matched, unknownKinds } = matchCounterparty(to, cp.blockList, config.counterpartyAddressMap, cpCaseExact);
      if (unknownKinds.length > 0) {
        return deny(
          `[counterparty] blockList carries counterparty identifier kind(s) [${unknownKinds.join(', ')}] this engine cannot match; recognized: [${[...KNOWN_COUNTERPARTY_KINDS].join(', ')}]. An unmatched blockList entry would mean the list silently blocked nothing, so this fails closed`,
          notes,
          { tag: 'counterparty', constraint: 'tradingMandate.counterparty.blockList', terminal: true },
        );
      }
      if (matched) return deny(`[counterparty] recipient ${to} is on the mandate blockList`, notes,
        { tag: 'counterparty', constraint: 'tradingMandate.counterparty.blockList', terminal: true });
    }
    if (cp?.allowList && cp.allowList.length > 0) {
      const { matched, unmappedDids, unknownKinds } = matchCounterparty(to as string, cp.allowList, config.counterpartyAddressMap, cpCaseExact);
      // ASYMMETRY, and it is the same one as geographicAllowedOnly vs geographicBlocked.
      // An unreadable entry on an ALLOWlist can only ever make the list MORE permissive,
      // so it cannot cause a wrongful allow of a recipient that matched a READABLE entry:
      // the unreadable entry is about some other counterparty. It matters only when
      // nothing readable matched, because then the recipient might have been permitted by
      // the entry we cannot read, and refusing with "not on the allowList" would be a
      // false statement about why.
      if (!matched && unknownKinds.length > 0) {
        return deny(
          `[counterparty] recipient ${to} matched no readable allowList entry, and the list carries identifier kind(s) [${unknownKinds.join(', ')}] this engine cannot match; recognized: [${[...KNOWN_COUNTERPARTY_KINDS].join(', ')}]. The kind vocabulary is open by design so a new rail needs no new schema version; an unreadable entry means this engine cannot say whether the recipient was permitted, which is not the same as saying it was not`,
          notes,
          { tag: 'counterparty', constraint: 'tradingMandate.counterparty.allowList', terminal: true },
        );
      }
      if (!matched) {
        const hint = unmappedDids.length > 0 ? ` (${unmappedDids.length} DID entr${unmappedDids.length === 1 ? 'y' : 'ies'} had no address mapping in config.counterpartyAddressMap)` : '';
        return deny(`[counterparty] recipient ${to} is not on the mandate allowList${hint}`, notes);
      }
    }
    if (cp?.requireIssuerClassIn && cp.requireIssuerClassIn.length > 0) {
      return deny(
        '[issuer-class] mandate requires counterparty issuer_class verification, but this verifier has no attestation source for the recipient — cannot establish issuer class (fail closed)',
        notes,
      );
    }

    if (tm.temporal?.allowedTimeWindows && tm.temporal.allowedTimeWindows.length > 0) {
      if (!inTimeWindows(tm.temporal.allowedTimeWindows, nowMs)) {
        return deny('[temporal] transaction time is outside the mandate allowedTimeWindows', notes);
      }
    }

    if (tm.geographic?.allowedJurisdictionsOnly && tm.geographic.allowedJurisdictionsOnly.length > 0) {
      // Schema: fail-closed when jurisdiction is unknown — and at the wallet
      // layer the counterparty's jurisdiction is always unknown.
      return deny(
        '[geographic] mandate restricts to allowedJurisdictionsOnly and the counterparty jurisdiction is unknown at this layer (fail-closed per AIP v0.8 §2.3)',
        notes,
      );
    }
    if (tm.geographic?.blockedJurisdictions && tm.geographic.blockedJurisdictions.length > 0) {
      notes.push('blockedJurisdictions declared: counterparty jurisdiction unknown at this layer — fail-open per AIP v0.8 §2.3, NOT ENFORCED');
    }

    const vel = tm.velocity;
    if (vel && (vel.dailyVolumeCap !== undefined || vel.monthlyVolumeCap !== undefined)) {
      if (!tm.unit) return deny('[velocity] velocity caps present without tradingMandate.unit', notes);
      const mismatch = sameCurrencyOrDeny(tm.unit, 'tradingMandate.velocity caps');
      if (mismatch) return mismatch;
      const dailyTotal = ctx.spending?.daily_total !== undefined ? parseIntegerValue(ctx.spending.daily_total) : undefined;
      if (dailyTotal === undefined) {
        return deny('[velocity] mandate carries velocity caps but the signing context provided no spending.daily_total counter', notes);
      }
      const projected = dailyTotal + (value as bigint);
      const scale = 10n ** BigInt(decimals);
      if (vel.dailyVolumeCap !== undefined && projected > BigInt(vel.dailyVolumeCap) * scale) {
        return deny(
          `[velocity] projected daily volume exceeds dailyVolumeCap ${vel.dailyVolumeCap} ${tm.unit}. ${NON_NEGOTIABLE}`,
          notes,
          capDetail({ tag: 'velocity', constraint: 'tradingMandate.velocity.dailyVolumeCap', cap: BigInt(vel.dailyVolumeCap) * scale, observed: projected, priorTotal: dailyTotal, decimals, unit: tm.unit }),
        );
      }
      if (vel.monthlyVolumeCap !== undefined) {
        // The monthly cap gets the MONTHLY counter. It previously got daily_total,
        // so a 30,000 monthly cap spent at 1,000/day for thirty days never denied:
        // the field named the window and the code used a different one.
        const monthlyTotal =
          ctx.spending?.monthly_total !== undefined ? parseIntegerValue(ctx.spending.monthly_total) : undefined;
        if (monthlyTotal === undefined) {
          return deny(
            '[velocity] mandate carries monthlyVolumeCap but the signing context provided no spending.monthly_total counter (30-day window cannot be established) — fail-closed',
            notes,
          );
        }
        if (monthlyTotal + (value as bigint) > BigInt(vel.monthlyVolumeCap) * scale) {
          return deny(
            `[velocity] projected 30-day volume exceeds monthlyVolumeCap ${vel.monthlyVolumeCap} ${tm.unit}. ${NON_NEGOTIABLE}`,
            notes,
            capDetail({ tag: 'velocity', constraint: 'tradingMandate.velocity.monthlyVolumeCap', cap: BigInt(vel.monthlyVolumeCap) * scale, observed: monthlyTotal + (value as bigint), priorTotal: monthlyTotal, decimals, unit: tm.unit }),
          );
        }
      }
      notes.push('velocity caps enforced against the supplied rolling counters; a cap whose counter is unestablished denies rather than being skipped');
    }

    // crossRailBudget (binding, schema v2.3): one rolling-24h budget consumed
    // across every rail. Conversion uses ONLY the principal-attested rates in
    // the signed mandate (no FX lookup, no oracle — the same-currency invariant
    // holds because every comparison happens in crb.currency on signed data).
    // The cross-rail counter is caller-supplied (the shared CrossRailLedger);
    // any piece we cannot establish denies.
    const crb = tm.crossRailBudget;
    if (crb) {
      if (typeof crb.amount !== 'string' || typeof crb.currency !== 'string' || !crb.rates || typeof crb.rates !== 'object') {
        return deny('[cross-rail] crossRailBudget requires amount, currency and rates — malformed budget cannot be evaluated', notes);
      }
      if (crb.window !== 'P1D') {
        return deny(`[cross-rail] window ${JSON.stringify(crb.window)} is not supported by this evaluator (only P1D / rolling 24h) — cannot establish the accounting window`, notes);
      }
      if (asset === undefined || value === undefined) {
        return deny('[cross-rail] the transfer asset/amount could not be established but the mandate carries a cross-rail budget', notes);
      }
      const rate = crb.rates[asset];
      if (rate === undefined) {
        return deny(`[cross-rail] no principal-attested rate for ${asset} in crossRailBudget.rates — this asset cannot be scoped against the ${crb.currency} budget`, notes);
      }
      const cr = ctx.cross_rail;
      if (!cr) {
        return deny('[cross-rail] mandate carries a crossRailBudget but the signing context supplied no cross-rail counter (ctx.cross_rail)', notes);
      }
      if (cr.currency !== crb.currency) {
        return deny(`[cross-rail] supplied counter is denominated in ${cr.currency} but the budget is ${crb.currency} — totals are not comparable`, notes);
      }
      let converted: bigint;
      let cap: bigint;
      let priorTotal: bigint;
      try {
        converted = convertToBudgetUnits(value, decimals, rate);
        cap = parseDecimalScaled(crb.amount, CROSS_RAIL_SCALE);
        priorTotal = parseIntegerValue(cr.total);
      } catch (e) {
        return deny(`[cross-rail] ${(e as Error).message}`, notes);
      }
      const projected = priorTotal + converted;
      if (projected > cap) {
        return deny(
          `[cross-rail] projected rolling-24h cross-rail spend ${formatBudgetUnits(projected)} ${crb.currency} exceeds the budget ${crb.amount} ${crb.currency} (this payment: ${formatBudgetUnits(converted)} ${crb.currency} as ${asset} at the principal-attested rate ${rate})`,
          notes,
        );
      }
      notes.push(
        `cross-rail budget: ${formatBudgetUnits(projected)} of ${crb.amount} ${crb.currency} consumed including this payment — counter is the shared rolling-24h ledger; rates are principal-attested in the mandate (no oracle)`,
      );
    }

    if (tm.allowedVenues || tm.allowedInstruments || tm.dailyDrawdownCap) {
      notes.push(
        'order-plane constraints declared (allowedVenues/allowedInstruments/dailyDrawdownCap): NOT ENFORCED here — these require order context and belong to an order-aware Observer Protocol evaluator',
      );
    }

    // Fail-closed: unrecognized tradingMandate fields are treated as binding constraints
    // we cannot evaluate. Order-plane fields are in the known set and handled above (surfaced
    // as NOT-ENFORCED notes). Anything beyond the known set DENIES.
    for (const key of Object.keys(tm)) {
      if (!KNOWN_TM_KEYS.has(key)) {
        const known = declaredUnenforceable('tradingMandate', key);
        if (known) {
          return deny(`[unenforceable] tradingMandate.${key}: ${known.reason}`, notes,
            { tag: 'unenforceable', constraint: `tradingMandate.${key}`, terminal: true });
        }
        return deny(
          `[unknown-rule] unrecognized tradingMandate constraint "${key}" — cannot evaluate; fail-closed per AIP v0.8`,
          notes,
        );
      }
    }
  }

  // 9. Advisory fields — surfaced, never deny (AIP v0.8 §1.2–§1.3).
  if (scope.cumulative_budget) {
    notes.push(
      `cumulative_budget declared (${scope.cumulative_budget.amount} ${scope.cumulative_budget.currency} over ${scope.cumulative_budget.window}): advisory per AIP v0.8 — not enforced at this layer; enforced path: tradingMandate.velocity.dailyVolumeCap or monthlyVolumeCap`,
    );
  }
  if (scope.geographic_restriction) {
    notes.push(
      'actionScope.geographic_restriction declared: advisory per AIP v0.8 — not enforced at this layer; enforced path: tradingMandate.geographic.allowedJurisdictionsOnly (fail-closed) or blockedJurisdictions (fail-open)',
    );
  }

  return { ok: true, reason: 'mandate satisfied', notes };
}
