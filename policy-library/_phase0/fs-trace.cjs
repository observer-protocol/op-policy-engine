// ─── THE READ-TRACE, the instrument the first freeze's soundness rests on ───────────────────────
//
// The oracle at 57b13bd was frozen from a dirty tree, before capture-oracle.mjs refused one. What
// establishes that no dirty file reached the frozen bytes is this instrument: it records every path
// opened for reading by fs, in the process it is preloaded into and in every child node process
// (NODE_OPTIONS propagates), so a whole gate run yields the set of files actually read.
//
//   FS_TRACE_LOG=/tmp/gate.log NODE_OPTIONS="--require $PWD/policy-library/_phase0/fs-trace.cjs" \
//     node policy-library/_phase0/gate.mjs
//   sort -u /tmp/gate.log        # the read set; intersect with whatever is in question
//
// RUN THE POSITIVE CONTROL FIRST. An instrument's silence about a file means nothing until it has
// been shown seeing a read of that exact file: preload this, read the file in question with
// fs.readFileSync, and confirm it appears in the log. Measured 2026-08-23 over the full gate: 40
// distinct paths, all under policy-library; none of the seven then-untracked files appears, and the
// positive control saw reads of all access modes patched here.
//
// STATED LIMIT: module loading by the ESM loader is internal to node and outside this instrument's
// reach. A file only reachable as an imported module is not traced; none of the artifacts this was
// built to rule out is a loadable module.
const fs = require('fs');
const path = require('path');
const LOG = process.env.FS_TRACE_LOG;
const record = (p) => { try { fs.appendFileSync(LOG, path.resolve(String(p)) + '\n'); } catch {} };
for (const name of ['readFileSync', 'openSync', 'createReadStream', 'statSync']) {
  const orig = fs[name];
  fs[name] = function (p, ...rest) { record(p); return orig.call(this, p, ...rest); };
}
const origReadFile = fs.readFile;
fs.readFile = function (p, ...rest) { record(p); return origReadFile.call(this, p, ...rest); };
const origPromises = fs.promises.readFile;
fs.promises.readFile = function (p, ...rest) { record(p); return origPromises.call(this, p, ...rest); };
