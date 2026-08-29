# Source provenance: GXS card-terms 4.7 and refund-help

Retrieved **2026-08-29T23:21:16Z** (environment clock) with `curl -L --compressed` and a desktop browser User-Agent. HTTP/2 200 on both pins. Every digest below was computed locally with `sha256sum` over the stored file.

## Pins

| stored file | what | bytes | sha256 |
|---|---|---|---|
| `card-terms.html` | `https://www.gxs.com.sg/card-terms` raw HTML. HTML comment: Last Published Fri Aug 28 2026 07:28:52 GMT+0000. Title: GXS Debit Card & GXS FlexiCard Terms. In force from 6 November 2025. | 168557 | `d42dfd6b480280c154ebd3820e5303d79a2b96976934a21bde8c1b71c6efc1b2` |
| `refund-help.html` | `https://help.gxs.com.sg/?title=GXS_FlexiCredit%2FGXS_Credit_Card%2FSecurity_%26_Fraud%2FHow_can_I_request_a_refund_for_unauthorised_transactions_on_my_GXS_Credit_Card%3F` raw HTML. Title: How can I request a refund for unauthorised transactions on my GXS Credit Card? | 64360 | `4d0d6a06e4e7ab80b53ebd80c2385198eac674d577d3c4327c8b2a1ce0ba7bea` |
| `synthetic-ed25519.json` | REPOSITORY-INTERNAL SYNTHETIC signing fixture. Not a secret. Not an Observer Protocol issuer key. | | see SOURCES.md |

## Locators used by the register

- Section C (GXS FlexiCard), heading 4 Your Obligations, `<strong>4.7</strong>` at HTML byte offset 125393. Sentence: `If you dispute any transaction, you must inform us immediately in the manner specified. We may credit your FlexiCard with the amount of the disputed transaction after completing our investigations or at such time as we may determine in accordance with our usual practices.`
- Help article body: four-step in-app path (FlexiCredit tile; specific transaction; Get Help; Raising a card transaction dispute).

## What was searched and not found

Over both retrieved bodies: `Shared Responsibility Framework`, `srf-register-accepted-v1`. Zero matches. That absence is the WIRED citation gap. It is not filled in.

Section B debit-card 5.7 (`We may credit your savings account…`) is on the same terms page and is ABSENT-RULED for this encode. The contract names clause 4.7.

## Pairing

`srf-register-accepted-v1` is paired **by reference only**. It is not stored in this directory. No clause text from that register is copied here.
