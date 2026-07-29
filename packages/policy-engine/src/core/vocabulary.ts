// The constraint vocabulary this engine recognizes, as data.
//
// These sets were literals inside evaluateMandate, which made them invisible
// to anything outside the evaluator. That is how `allowed_counterparty_types`
// stayed broken: AIP v0.8 §1.3 defines it, §125 lists it in the CLOSED
// actionScope property set, §121 tells issuers they SHOULD use it, and all
// three published schemas accept it — while this engine denied every credential
// carrying it through the generic unknown-rule catch-all. Nothing could compare
// the schema's property list against the evaluator's, because the evaluator's
// was not a list anyone could read.
//
// So the vocabulary is exported, and the schema-vs-engine conformance check
// diffs these against the published schemas rather than against a code comment.
//
// Adding a key here is a behavioural change: an unrecognized key is a DENY, so
// moving a key into KNOWN_* turns a denial into an evaluation. Never widen these
// to make a test pass.

/** `actionScope` properties this engine recognizes. Anything else DENIES via the
 * unknown-rule catch-all (fail-closed per AIP v0.8). */
export const KNOWN_SCOPE_KEYS: ReadonlySet<string> = new Set([
  'allowed_rails',
  'per_transaction_ceiling',
  'allowed_transaction_categories',
  'cumulative_budget',
  'geographic_restriction',
]);

/** `tradingMandate` properties this engine recognizes. Order-plane entries
 * (allowedVenues, allowedInstruments, maxPosition, dailyDrawdownCap) are
 * recognized-but-NOT-ENFORCED here and surface as notes; see mandate.ts §8. */
export const KNOWN_TM_KEYS: ReadonlySet<string> = new Set([
  'unit',
  'maxNotionalPerOrder',
  'counterparty',
  'temporal',
  'geographic',
  'velocity',
  'allowedVenues',
  'allowedInstruments',
  'maxPosition',
  'dailyDrawdownCap',
  'crossRailBudget',
]);

/** A property that appears in a published schema, and that this engine
 * deliberately does not enforce. Distinct from an unknown key: the issuer
 * wrote something the schema permits, so the denial should name the reason
 * rather than report the key as unrecognized. */
export interface DeclaredUnenforceable {
  /** Where the property lives. */
  container: 'actionScope' | 'tradingMandate' | 'delegation.scope.spending_limits' | 'authorizationConfig.policy';
  property: string;
  /** Why it is not enforced, rendered into the denial reason. */
  reason: string;
}

/** Properties the published schemas accept and this engine will not evaluate.
 *
 * These DENY, like any binding constraint the evaluator cannot establish. The
 * difference from the unknown-rule path is legibility: the issuer is told the
 * property is declared-but-unenforceable and why, instead of being told the
 * engine has never heard of a field its own schema accepts. */
export const DECLARED_UNENFORCEABLE: readonly DeclaredUnenforceable[] = [
  {
    container: 'actionScope',
    property: 'allowed_counterparty_types',
    // Deliberately names no unminted schema version. An earlier draft said
    // "withdrawn at v2.5", which would ship stale the moment the reservation
    // set moved. The frozen schema versions that ACCEPT the property are facts
    // and safe to name; the version that drops it is not yet one.
    reason:
      'declared in AIP v0.8 §1.3 and accepted by delegation schemas v2.1/v2.3/v2.4, but no enforcement path exists in any Observer Protocol engine and none is planned. The property is withdrawn from the constraint vocabulary, and the AIP §1.3 recommendation to encode a merchant taxonomy through it is retracted. Credentials issued against a schema version that accepts it will continue to deny',
  },
  {
    container: 'authorizationConfig.policy',
    property: 'escalation_threshold',
    reason:
      'declared here in the v2.1 lineage and never enforced: the evaluator emitted a NOTE saying human notification was expected upstream, which silently auto-approved every payment between the threshold and the per-transaction ceiling. Relocated to actionScope.escalationThreshold, which is an enumerated surface where an unknown key fails closed, and which requires actionScope.approvers so the band has somewhere to route. A credential declaring the old field names a constraint no evaluator honours, so it is refused rather than noted',
  },
  {
    container: 'delegation.scope.spending_limits',
    property: 'per_asset',
    reason:
      'per-asset caps are not evaluated by this engine (out of scope); the enforced path is per_rail.per_transaction',
  },
];

/** Lookup used by the evaluator to choose between the `[unenforceable]` and
 * `[unknown-rule]` denial tags. */
export function declaredUnenforceable(
  container: DeclaredUnenforceable['container'],
  property: string,
): DeclaredUnenforceable | undefined {
  return DECLARED_UNENFORCEABLE.find((d) => d.container === container && d.property === property);
}

/** Counterparty identifier kinds this engine can match on.
 *
 * The SCHEMA constrains the shape of a typed counterparty entry and deliberately
 * does NOT enumerate the kinds: a card rail names its counterparty by merchant
 * descriptor, an issuer-native rail will name it some third way, and a new kind
 * must not require a new schema version. Same discipline as capability names.
 *
 * The price of an open vocabulary is that this set is the closed half. A kind the
 * engine does not recognize DENIES, naming the kind and this set, rather than being
 * ignored: an unrecognized identifier that fell through would mean an allowlist
 * silently matched nothing, which is the permissive direction.
 *
 * So a credential can be issued with `merchant-descriptor` today and will deny
 * until an engine implements it. That is the fail-closed direction and it is the
 * cost of not needing a mint per kind. */
export const KNOWN_COUNTERPARTY_KINDS: ReadonlySet<string> = new Set(['address', 'did']);
