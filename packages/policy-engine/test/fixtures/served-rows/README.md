# Served-row oracles for `signableFromRefusalRow`

**Copied verbatim, not constructed here.** A fixture this package generated from its own
understanding of the served shape would agree with it by construction and establish nothing. THE
ORACLE IS THE SIGNATURE: each row carries the signature an enforcement point produced over the bytes
it built. A rebuild wrong in any field produces different bytes and does not verify.

| file | rows | shape | version | source, sha256 at copy |
|---|---|---|---|---|
| `served-rows-v1-v2.json` | 14 | served | v2 | `observerprotocol-website/scripts/__fixtures__/refusals-served.json`, `e72aa89d4430bdc7c70d4b3ae59a8e47cfa40eeb94e41daadf9ee59469e540b6`; itself copied 2026-08-20 from `agenticterminal-dashboard/src/lib/dashboard/__fixtures__/refusals-served-citation-store.json` |
| `v3-served-row-not-supplied.json` | 1 | served | v3 | `op-mcp-payment-server` branch `session/banxico-corpus`, `fixtures/v3-vectors/`, lifted from `GET /v1/refusals` on :9093 on 2026-08-20; `5abc9a4be60157756ceae83afc19547845e498674cbe5cdc8a0e84788d2b0901` |
| `v3-served-row-recorded.json` | 1 | served | v3 | same, `fa571ef363574758fd240477b4116336b0cd47635aa97d3e823a19b4174c101b` |
| `v3-served-not-supplied.json` | 1 | store | v3 | same, out of the :9093 store; `237d356f34d581a1ea13c8673cea5b682ea801818c924e8e6f5f5d5ca7c1bc1a` |
| `v3-served-recorded.json` | 1 | store | v3 | same, `63cdb89ccd39bb2ea874ca0d459ebb80ab9bcd2ee14818899830ed20572714fd` |
| `v3-constructed-recorded-with-note.json` | 1 | store | v3 | same; CONSTRUCTED and signed with the :9093 refusal key, because no deployment emits a recorded bound with a note; `97151493203511307a49bca6d44d8f9171817e4b5e7ae54c2289c2b3269c54ce` |

The v3 records were signed by an engine built at `6f58fcb`, the commit this branch merges. The keys
are throwaway demo keys; the records are an authorisation for nothing. What they establish is that
the construction in this package produces the bytes that enforcement point signed, for both shapes
and both `appliedBound` arms.

**The one cell no deployment produces:** a SERVED row on the `recorded` arm carrying a `note`. The
read route's `appliedBoundView` does not serve the recorded arm's note, so such a row cannot exist
until it does. `test/served-rows.mjs` covers that cell by projecting the constructed store record
to the served shape and requiring the enforcement point's own signature to verify over it, and
says so on every run.
