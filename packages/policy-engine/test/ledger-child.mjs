// Helper process for cross-rail-contention.mjs. Each invocation is a genuinely
// separate OS process with its own per-process writer id and start time — which
// is the whole point: the single-writer guard keys off process identity, so it
// can only be exercised honestly across real processes.
//
//   node ledger-child.mjs write   <path> <asset> <amountRaw> <decimals>
//   node ledger-child.mjs read    <path>
//   node ledger-child.mjs victim  <path>   (write own spend, wait for <path>.go, then sum)
import { CrossRailLedger } from '../dist/index.mjs';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const RATES = { USDC: '1', sat: '0.0005', TUNIT: '1' };
const emit = (r) => process.stdout.write(JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? v.toString() : v)));

const [, , mode, path, asset, amountRaw, decimals] = process.argv;
const ledger = new CrossRailLedger(path);

if (mode === 'write') {
  ledger.record({ rail: `test:${asset}`, asset, amountRaw, decimals: Number(decimals) });
  process.stdout.write(`wrote ${amountRaw} ${asset}`);
} else if (mode === 'read') {
  emit(ledger.sumWindowConverted(RATES));
} else if (mode === 'victim') {
  // A live second writer: record our own spend, then block until the parent
  // signals it has injected a concurrent foreign record, then read. Because we
  // are already running when that record lands (ts >= our start), we must deny.
  ledger.record({ rail: 'test:sat', asset: 'sat', amountRaw: '1000', decimals: 0 });
  const go = path + '.go';
  for (let i = 0; i < 200 && !existsSync(go); i++) execSync('sleep 0.05');
  try {
    emit(ledger.sumWindowConverted(RATES));
  } catch (e) {
    emit({ ok: false, threw: e?.name ?? String(e) });
  }
} else {
  process.stderr.write(`unknown mode ${mode}`);
  process.exit(2);
}
