"""Meta Graph client for the WhatsApp Calling API.

Every call the business places, accepts, rejects or terminates is one POST to
`/{PHONE_NUMBER_ID}/calls`; permission requests and the tappable call button are
POSTs to `/{PHONE_NUMBER_ID}/messages`. This module is the only place that talks
to graph.facebook.com, so the payload shapes Meta requires live in one file.

Meta's errors are unwrapped into GraphError.message. That matters because
apiJSON() in src/lib/api.js surfaces `error` straight into a toast -- a generic
"Request failed" there means a staff member has no idea the contact simply never
granted call permission.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import requests

log = logging.getLogger(__name__)

GRAPH = "https://graph.facebook.com"
# Deliberately NOT META_GRAPH_VERSION. That is pinned to v21.0 for the webhook,
# and v21.0 has no /calls edge at all -- inheriting it would 404 every call with
# nothing in the message to say why. Override with WA_CALLING_GRAPH_VERSION.
GRAPH_VERSION = os.environ.get("WA_CALLING_GRAPH_VERSION", "v23.0")

_TIMEOUT = int(os.environ.get("WA_GRAPH_TIMEOUT", "15"))


class GraphError(RuntimeError):
    def __init__(self, message: str, status: int = 502, raw: Any = None) -> None:
        super().__init__(message)
        self.message = message
        # 4xx from Meta is the caller's fault (bad number, no permission) and is
        # passed through; anything else is reported as a gateway failure.
        self.status = status if 400 <= status < 500 else 502
        self.raw = raw


def _request(method: str, path: str, token: str, **kwargs: Any) -> dict[str, Any]:
    url = f"{GRAPH}/{GRAPH_VERSION}/{path.lstrip('/')}"
    try:
        resp = requests.request(
            method,
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=_TIMEOUT,
            **kwargs,
        )
    except requests.RequestException as exc:
        raise GraphError(f"Could not reach WhatsApp: {exc}") from exc

    try:
        body = resp.json() if resp.content else {}
    except ValueError:
        body = {"raw": resp.text[:500]}

    if resp.status_code >= 400:
        err = (body or {}).get("error") or {}
        message = (
            (err.get("error_user_msg") or "").strip()
            or (err.get("error_data") or {}).get("details")
            or err.get("message")
            or f"WhatsApp rejected the request ({resp.status_code})"
        )
        log.warning("Graph %s %s -> %s %s", method, path, resp.status_code, body)
        raise GraphError(message, resp.status_code, body)

    return body or {}


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------


def _session(sdp: str | None, sdp_type: str | None) -> dict[str, Any] | None:
    if not sdp:
        return None
    return {"sdp_type": sdp_type or "answer", "sdp": sdp}


def call_action(
    phone_number_id: str,
    token: str,
    action: str,
    *,
    call_id: str | None = None,
    to: str | None = None,
    sdp: str | None = None,
    sdp_type: str | None = None,
    callback_data: str | None = None,
) -> dict[str, Any]:
    """POST /{PHONE_NUMBER_ID}/calls.

    `connect` places a new call and is the only action that takes `to` instead
    of `call_id`; its response is the sole source of the call id, at
    calls[0].id. Every other action addresses an existing call.
    """
    payload: dict[str, Any] = {"messaging_product": "whatsapp", "action": action}

    if action == "connect" and not call_id:
        if not to:
            raise GraphError("A recipient is required to place a call", 400)
        payload["to"] = to
    else:
        if not call_id:
            raise GraphError(f"call_id is required for action '{action}'", 400)
        payload["call_id"] = call_id

    session = _session(sdp, sdp_type)
    if session:
        payload["session"] = session
    if callback_data:
        payload["biz_opaque_callback_data"] = callback_data

    return _request("POST", f"{phone_number_id}/calls", token, json=payload)


def get_call_permission(phone_number_id: str, token: str, wa_id: str) -> dict[str, Any]:
    """GET /{PHONE_NUMBER_ID}/call_permissions?user_wa_id=...

    Returns Meta's raw body. The shape has moved during the calling beta, so
    callers must read it defensively rather than indexing blindly -- see
    _read_permission() in calls_route.py.
    """
    return _request(
        "GET",
        f"{phone_number_id}/call_permissions",
        token,
        params={"user_wa_id": wa_id},
    )


# ---------------------------------------------------------------------------
# Messages that are part of the calling flow
# ---------------------------------------------------------------------------


def send_message(phone_number_id: str, token: str, payload: dict[str, Any]) -> dict[str, Any]:
    return _request("POST", f"{phone_number_id}/messages", token, json=payload)


def send_call_button(
    phone_number_id: str,
    token: str,
    to: str,
    body_text: str,
    display_text: str = "Call Now",
    ttl_minutes: int = 10080,
) -> dict[str, Any]:
    """Send the tappable "call us" button (interactive type `voice_call`).

    This does NOT place a call -- it invites the contact to place one, which is
    the only way to reach someone who has not granted call permission. Their tap
    arrives back as a USER_INITIATED call on the webhook.

    ttl_minutes is how long the button stays live; the default is 7 days, Meta's
    maximum, so a contact who reads the message the next morning can still use
    it.
    """
    return send_message(
        phone_number_id,
        token,
        {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "voice_call",
                "body": {"text": body_text},
                "action": {
                    "name": "voice_call",
                    "parameters": {
                        "display_text": display_text,
                        "ttl_minutes": ttl_minutes,
                    },
                },
            },
        },
    )


def send_call_permission_request(
    phone_number_id: str, token: str, to: str, body_text: str
) -> dict[str, Any]:
    """Ask the contact to allow business-initiated calls.

    Meta rate-limits this hard: one request per 24 hours and two per week per
    contact, and it only sends inside an open 24-hour conversation window. A
    rejection here is normal, not a bug -- pass Meta's own wording through.
    """
    return send_message(
        phone_number_id,
        token,
        {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": {
                "type": "call_permission_request",
                "body": {"text": body_text},
                "action": {"name": "call_permission_request"},
            },
        },
    )
