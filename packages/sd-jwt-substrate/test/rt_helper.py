# Round-trip oracle: drives the AP2 reference SDK (MandateClient) from stdin
# JSON, so the Node tests can prove real interop instead of self-consistency.
#
#   mode=verify: {"mode":"verify","token":...,"issuer_public_jwk":{...}}
#     -> {"ok":true,"payloads":[...]} | {"ok":false,"error":...}
#   mode=create: {"mode":"create","issuer_private_jwk":{...},"agent_public_jwk":{...},
#                 "constraints":[...]}  (creates an OpenPaymentMandate)
#     -> {"ok":true,"token":...}
#
# Requires PYTHONPATH pointing at ap2-ref/code/sdk/python and the venv deps.

import json
import sys

from ap2.sdk.mandate import MandateClient
from ap2.sdk.generated.open_payment_mandate import OpenPaymentMandate
from jwcrypto.jwk import JWK


def main() -> None:
    req = json.load(sys.stdin)
    client = MandateClient()
    try:
        if req["mode"] == "verify":
            key = JWK(**req["issuer_public_jwk"])
            result = client.verify(
                token=req["token"],
                key_or_provider=key,
                payload_type=OpenPaymentMandate,
            )
            if isinstance(result, list):
                payloads = result
            else:
                payloads = [result.mandate_payload.model_dump(by_alias=True, exclude_none=True)]
            print(json.dumps({"ok": True, "payloads": payloads}, default=str))
        elif req["mode"] == "create":
            issuer_key = JWK(**req["issuer_private_jwk"])
            mandate = OpenPaymentMandate(
                constraints=req.get("constraints", []),
                cnf={"jwk": req["agent_public_jwk"]},
            )
            token = client.create(payloads=[mandate], issuer_key=issuer_key)
            print(json.dumps({"ok": True, "token": token}))
        else:
            print(json.dumps({"ok": False, "error": f"unknown mode {req['mode']}"}))
    except Exception as e:  # noqa: BLE001 — report, don't crash the harness
        print(json.dumps({"ok": False, "error": f"{type(e).__name__}: {e}"}))


if __name__ == "__main__":
    main()
