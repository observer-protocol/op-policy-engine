
    import { evaluate as real } from '/Users/agentic/Desktop/OP_AT/op-policy-engine/policy-library//psr-2017-752/evaluate.mjs';
    export * from '/Users/agentic/Desktop/OP_AT/op-policy-engine/policy-library//psr-2017-752/evaluate.mjs';
    globalThis.__hits = globalThis.__hits || [];
    export const evaluate = (f, r) => { const o = real(f, r); globalThis.__hits.push(o); return o; };
  