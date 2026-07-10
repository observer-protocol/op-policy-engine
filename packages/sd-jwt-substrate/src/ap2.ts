// AP2 mandate vocabulary (v0.2.0, 2026-04-28, github.com/google-agentic-commerce/AP2).
// The `vct` values and constraint types below are transcribed from the
// normative JSON schemas at code/sdk/schemas/ap2/*.json. Field-level payload
// types mirror those schemas; they are intentionally structural (the wire
// truth is the schema, not these types).

export const AP2_VCT = {
  checkout: 'mandate.checkout.1',
  checkoutOpen: 'mandate.checkout.open.1',
  payment: 'mandate.payment.1',
  paymentOpen: 'mandate.payment.open.1',
} as const;
export type Ap2Vct = (typeof AP2_VCT)[keyof typeof AP2_VCT];

export const AP2_CHECKOUT_CONSTRAINTS = {
  allowedMerchants: 'checkout.allowed_merchants',
  lineItems: 'checkout.line_items',
} as const;

export const AP2_PAYMENT_CONSTRAINTS = {
  allowedPayees: 'payment.allowed_payees',
  allowedPaymentInstruments: 'payment.allowed_payment_instruments',
  allowedPisps: 'payment.allowed_pisps',
  amountRange: 'payment.amount_range',
  budget: 'payment.budget',
  agentRecurrence: 'payment.agent_recurrence',
  executionDate: 'payment.execution_date',
  reference: 'payment.reference',
} as const;

export interface Ap2Merchant {
  id: string;
  name: string;
  website?: string;
}

/** ISO-4217, minor units. */
export interface Ap2Amount {
  amount: number;
  currency: string;
}

export interface Ap2PaymentInstrument {
  id: string;
  type: string;
  description?: string;
}

export interface Ap2Pisp {
  legal_name: string;
  brand_name: string;
  domain_name: string;
}

/** Closed Payment Mandate (vct mandate.payment.1). `transaction_id` is the
 * base64url _sd_alg-hash of the merchant's checkout_jwt — the chain link. */
export interface Ap2PaymentMandatePayload {
  vct: typeof AP2_VCT.payment;
  transaction_id: string;
  payee: Ap2Merchant;
  payment_amount: Ap2Amount;
  payment_instrument: Ap2PaymentInstrument;
  pisp?: Ap2Pisp;
  execution_date?: string;
  risk_data?: Record<string, unknown>;
  iat?: number;
  exp?: number;
  [k: string]: unknown;
}

export type Ap2PaymentConstraint =
  | { type: typeof AP2_PAYMENT_CONSTRAINTS.allowedPayees; allowed: Ap2Merchant[] }
  | { type: typeof AP2_PAYMENT_CONSTRAINTS.allowedPaymentInstruments; allowed: Ap2PaymentInstrument[] }
  | { type: typeof AP2_PAYMENT_CONSTRAINTS.allowedPisps; allowed: Ap2Pisp[] }
  | { type: typeof AP2_PAYMENT_CONSTRAINTS.amountRange; currency: string; max: number; min?: number }
  | { type: typeof AP2_PAYMENT_CONSTRAINTS.budget; max: number; currency: string }
  | { type: typeof AP2_PAYMENT_CONSTRAINTS.agentRecurrence; frequency: 'ON_DEMAND' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'; max_occurrences?: number }
  | { type: typeof AP2_PAYMENT_CONSTRAINTS.executionDate; not_before?: string; not_after?: string }
  | { type: typeof AP2_PAYMENT_CONSTRAINTS.reference; conditional_transaction_id: string };

/** Open Payment Mandate (vct mandate.payment.open.1). `cnf` carries the
 * agent's PoP JWK; constraints MUST include a payment.reference. */
export interface Ap2OpenPaymentMandatePayload {
  vct: typeof AP2_VCT.paymentOpen;
  constraints: Ap2PaymentConstraint[];
  cnf: { jwk: Record<string, unknown> };
  payee?: Ap2Merchant;
  payment_amount?: Ap2Amount;
  payment_instrument?: Ap2PaymentInstrument;
  pisp?: Ap2Pisp;
  execution_date?: string;
  risk_data?: Record<string, unknown>;
  iat?: number;
  exp?: number;
  [k: string]: unknown;
}

/** Closed Checkout Mandate (vct mandate.checkout.1). */
export interface Ap2CheckoutMandatePayload {
  vct: typeof AP2_VCT.checkout;
  checkout_jwt: string;
  checkout_hash: string;
  iat?: number;
  exp?: number;
  [k: string]: unknown;
}
