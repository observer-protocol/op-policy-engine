// THE RESTATEMENT'S READING, encoded from DIVERGENCE.md and from nothing else.
//
// This is NOT derived from evaluate.mjs and never sees its output. It is a second, independent
// implementation of what an institution following the restatement would record, so that a
// disagreement between the two is an observation rather than a construction.
//
// It implements the three divergences DIVERGENCE.md records as outcome-changing or element-omitting:
//   D1  the element table omits inciso a)'s third component, the verification method
//   D2  firmeza is computed against the fourth paragraph's 45 day period ONLY, so the 180 day
//       foreign rule is never applied
//   D5  channel and signatory are not carried as requirements at all
const DAY = 86400000;

export function restatementDetermination(facts) {
  // D1: the restatement's element table. verification_method_stated is absent from it.
  const elements = [
    facts.dictamen?.evidence_of_factors_present === true,
    facts.operation?.occurred_at !== null && facts.operation?.occurred_at !== undefined && facts.operation?.occurred_at !== '',
    !!facts.operation?.acquirer_name && !!facts.operation?.merchant_name,
    facts.issuer?.holds_device_address === true
      ? !!(facts.dictamen?.device_address?.physical_address || facts.dictamen?.device_address?.ip_address)
      : true,
  ];
  const floor = elements.every(Boolean);

  // D2: always the fourth paragraph's 45 days, whatever the operation's geography.
  const s = Date.parse(facts.notice?.received_at);
  const e = Date.parse(facts.dictamen?.made_available_at);
  let delivered_in_time;
  if (Number.isNaN(s) || Number.isNaN(e)) delivered_in_time = false;   // the restatement has no third state
  else delivered_in_time = (e - s) <= 45 * DAY;

  // D5: channel and signatory are not tested.
  const conforming = floor && delivered_in_time;
  return {
    firmeza: conforming ? 'not_attached' : 'attached',
    floor: floor ? 'floor_met' : 'floor_not_met',
    basis: 'restatement element table, 45 day fourth-paragraph period, channel and signatory not tested',
  };
}
