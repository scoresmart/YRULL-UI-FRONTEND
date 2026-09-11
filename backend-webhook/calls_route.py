"""WhatsApp Calling API - the /whatsapp/call* routes the dashboard calls.

Register alongside the webhook blueprint:

    from calls_route import calls_bp
    app.register_blueprint(calls_bp)

Exposes exactly the surface src/lib/api.js expects:

    POST /whatsapp/call-button              tappable "call us" message
    GET  /whatsapp/calls                    call history (CallLogs.jsx)
    GET  /whatsapp/calls/pending            inbound calls still ringing
    POST /whatsapp/call/accept              answer, with our SDP answer
    POST /whatsapp/call/reject              decline a ringing call
    POST /whatsapp/call/hangup              terminate a live call
    POST /whatsapp/call/action              generic action (used for `connect`)
    GET  /whatsapp/call/permission-status   may we call this contact?
    POST /whatsapp/call/permission          ask them for that permission
    GET  /whatsapp/calls/answered           the callee's SDP answer, once it lands

The browser never talks to Meta. It owns the RTCPeerConnection and therefore
the SDP, but the access token stays here, so every signalling step is relayed
through these routes.

SDP storage is deliberately not here -- it is the webhook's job. Both halves are
parked on the whatsapp_calls row rather than in a module-level dict, so a second
gunicorn worker (or a redeploy mid-ring) does not lose the call.

There is no auto-pre_accept. Meta's pre_accept carries *our* SDP answer, which
does not exist until a browser has opened a microphone and built one, so the
server has nothing to send until someone clicks Accept. Callers that want the
two-step media setup can send action `pre_accept` through /whatsapp/call/action
with their answer before accepting.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from functools import wraps
from typing import Any

from flask import Blueprint, g, jsonify, request

try:
    from auth_workspace import require_workspace
    from supabase_repo import (
        answered_call,
        get_call_permission,
        insert_message,
        list_calls,
        mark_call_handled,
        pending_calls,
        resolve_number,
        upsert_call,
    )
    from whatsapp_graph import (
        GraphError,
        call_action,
        get_call_permission as graph_get_call_permission,
        send_call_button,
        send_call_permission_request,
    )
except ImportError:  # when dropped into a package, e.g. src/routes/
    from .auth_workspace import require_workspace  # type: ignore[no-redef]
    from .supabase_repo import (  # type: ignore[no-redef]
        answered_call,
        get_call_permission,
        insert_message,
        list_calls,
        mark_call_handled,
        pending_calls,
        resolve_number,
        upsert_call,
    )
    from .whatsapp_graph import (  # type: ignore[no-redef]
        GraphError,
        call_action,
        get_call_permission as graph_get_call_permission,
        send_call_button,
        send_call_permission_request,
    )

log = logging.getLogger(__name__)

calls_bp = Blueprint("whatsapp_calls", __name__)

# How long a ringing call stays offerable, and how long a pickup stays
# collectable. Both mirror the polls in IncomingCallNotification.jsx.
PENDING_TTL_SECONDS = 60
ANSWER_TTL_SECONDS = 120


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


class RouteError(Exception):
    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


def _body() -> dict[str, Any]:
    return request.get_json(silent=True) or {}


def _required(body: dict[str, Any], field: str) -> str:
    value = body.get(field)
    if not value or not str(value).strip():
        raise RouteError(f"'{field}' is required")
    return str(value).strip()


def _number() -> tuple[str, str]:
    """The (phone_number_id, access_token) this workspace acts as."""
    phone_number_id, token = resolve_number(g.workspace_id)
    if not phone_number_id or not token:
        raise RouteError(
            "No WhatsApp number is connected to this workspace. Connect one in Integrations.",
            409,
        )
    return phone_number_id, token


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _handle(fn: Any) -> Any:
    """Turn RouteError/GraphError into the {"error": ...} shape apiJSON reads.

    Anything else is a bug on our side and must not leak a stack trace or a
    Meta token fragment into a toast.
    """
    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return fn(*args, **kwargs)
        except RouteError as exc:
            return jsonify({"error": exc.message}), exc.status
        except GraphError as exc:
            return jsonify({"error": exc.message}), exc.status
        except Exception:  # noqa: BLE001
            log.exception("%s failed for workspace=%s", fn.__name__, getattr(g, "workspace_id", None))
            return jsonify({"error": "Call service is unavailable right now"}), 500

    return wrapper


# ---------------------------------------------------------------------------
# Call button -- lets THEM call US
# ---------------------------------------------------------------------------


@calls_bp.route("/whatsapp/call-button", methods=["POST"])
@require_workspace
@_handle
def send_call_button_route():
    body = _body()
    to = _required(body, "to")
    text = (body.get("message") or "Tap below to call us on WhatsApp.").strip()
    display_text = (body.get("display_text") or "Call Now").strip()

    try:
        ttl_minutes = int(body.get("ttl_minutes") or 10080)
    except (TypeError, ValueError):
        ttl_minutes = 10080

    phone_number_id, token = _number()
    result = send_call_button(phone_number_id, token, to, text, display_text, ttl_minutes)

    # Mirror it into the transcript. ChatWindow.jsx renders message_type
    # 'voice_call' as a green call bubble and strips the "[Call Button] "
    # prefix, so the staff member sees what the contact sees.
    wa_message_id = ((result.get("messages") or [{}])[0]).get("id")
    insert_message(
        {
            "workspace_id": g.workspace_id,
            "wa_id": to,
            "wa_message_id": wa_message_id or f"callbtn:{to}:{_now()}",
            "direction": "outbound",
            "message_type": "voice_call",
            "body": f"[Call Button] {text}",
            "status": "sent",
            "created_at": _now(),
            "metadata": {"display_text": display_text, "ttl_minutes": ttl_minutes},
        }
    )

    return jsonify({"status": "sent", "to": to, "result": result}), 200


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------


@calls_bp.route("/whatsapp/calls", methods=["GET"])
@require_workspace
@_handle
def list_calls_route():
    """CallLogs.jsx expects a bare array, not an envelope."""
    try:
        limit = min(max(int(request.args.get("limit", 50)), 1), 500)
    except (TypeError, ValueError):
        limit = 50

    return jsonify(list_calls(g.workspace_id, limit, request.args.get("direction"))), 200


@calls_bp.route("/whatsapp/calls/pending", methods=["GET"])
@require_workspace
@_handle
def pending_calls_route():
    rows = pending_calls(g.workspace_id, PENDING_TTL_SECONDS)
    pending = [
        {
            "call_id": row.get("call_id"),
            # `from`/`to` rather than from_number/to_number: that is the shape
            # incomingCall in IncomingCallNotification.jsx reads.
            "from": row.get("from_number") or row.get("wa_id"),
            "to": row.get("to_number"),
            "sdp": row.get("sdp"),
            "sdp_type": row.get("sdp_type") or "offer",
            "direction": row.get("direction") or "USER_INITIATED",
            "timestamp": row.get("timestamp"),
        }
        for row in rows
        if row.get("call_id") and row.get("sdp")
    ]
    return jsonify({"pending": pending, "count": len(pending)}), 200


@calls_bp.route("/whatsapp/calls/answered", methods=["GET"])
@require_workspace
@_handle
def answered_calls_route():
    call_id = (request.args.get("call_id") or "").strip()
    if not call_id:
        raise RouteError("'call_id' is required")

    row = answered_call(g.workspace_id, call_id, ANSWER_TTL_SECONDS)
    answered = (
        [{"call_id": row.get("call_id"), "sdp": row.get("sdp"), "sdp_type": "answer"}]
        if row and row.get("sdp")
        else []
    )
    return jsonify({"answered": answered, "count": len(answered)}), 200


# ---------------------------------------------------------------------------
# Answering and ending calls
# ---------------------------------------------------------------------------


@calls_bp.route("/whatsapp/call/accept", methods=["POST"])
@require_workspace
@_handle
def accept_call_route():
    body = _body()
    call_id = _required(body, "call_id")
    sdp = _required(body, "sdp")

    phone_number_id, token = _number()
    result = call_action(
        phone_number_id,
        token,
        "accept",
        call_id=call_id,
        sdp=sdp,
        sdp_type=body.get("sdp_type") or "answer",
    )

    mark_call_handled(g.workspace_id, call_id, "ACCEPTED")
    return jsonify({"status": "accepted", "call_id": call_id, "result": result}), 200


@calls_bp.route("/whatsapp/call/reject", methods=["POST"])
@require_workspace
@_handle
def reject_call_route():
    call_id = _required(_body(), "call_id")

    phone_number_id, token = _number()
    call_action(phone_number_id, token, "reject", call_id=call_id)

    mark_call_handled(g.workspace_id, call_id, "REJECTED")
    return jsonify({"status": "rejected", "call_id": call_id}), 200


@calls_bp.route("/whatsapp/call/hangup", methods=["POST"])
@require_workspace
@_handle
def hangup_call_route():
    call_id = _required(_body(), "call_id")

    phone_number_id, token = _number()
    try:
        call_action(phone_number_id, token, "terminate", call_id=call_id)
    except GraphError as exc:
        # The other side hanging up first terminates the call for both of us,
        # and our terminate then 4xxs. The call is over either way, so treat it
        # as success rather than showing the staff member an error on a call
        # they just ended.
        if 400 <= exc.status < 500:
            log.info("Terminate on already-ended call %s: %s", call_id, exc.message)
        else:
            raise

    mark_call_handled(g.workspace_id, call_id, "ENDED")
    return jsonify({"status": "terminated", "call_id": call_id}), 200


# ---------------------------------------------------------------------------
# Generic action -- how the dashboard places outbound calls
# ---------------------------------------------------------------------------

ALLOWED_ACTIONS = {"connect", "pre_accept", "accept", "reject", "terminate"}


@calls_bp.route("/whatsapp/call/action", methods=["POST"])
@require_workspace
@_handle
def call_action_route():
    body = _body()
    action = _required(body, "action")
    if action not in ALLOWED_ACTIONS:
        raise RouteError(f"Unknown action '{action}'")

    to = (body.get("to") or "").strip() or None
    # `connect` addresses a recipient; every other action addresses a call that
    # already exists. Meta rejects a payload carrying both.
    call_id = None if action == "connect" else ((body.get("call_id") or "").strip() or None)
    sdp = body.get("sdp")
    sdp_type = body.get("sdp_type") or ("offer" if action == "connect" else "answer")

    if action == "connect":
        if not to:
            raise RouteError("'to' is required to place a call")
        if not sdp:
            raise RouteError("'sdp' is required to place a call")
        _assert_may_call(to)

    phone_number_id, token = _number()
    result = call_action(
        phone_number_id,
        token,
        action,
        call_id=call_id,
        to=to,
        sdp=sdp,
        sdp_type=sdp_type,
    )

    if action == "connect" and to:
        # Log the outbound call immediately. The webhook only reports it once
        # the contact picks up, so without this a call nobody answered would
        # never appear in CallLogs at all.
        new_call_id = ((result.get("calls") or [{}])[0]).get("id")
        if new_call_id:
            upsert_call(
                {
                    "workspace_id": g.workspace_id,
                    "call_id": new_call_id,
                    "wa_id": to,
                    "phone": f"+{to}",
                    "direction": "BUSINESS_INITIATED",
                    "event": "connect",
                    "status": "RINGING",
                    "to_number": to,
                    "timestamp": _now(),
                }
            )

    return jsonify({"status": "ok", "action": action, "result": result}), 200


# ---------------------------------------------------------------------------
# Call permission
# ---------------------------------------------------------------------------

# The vocabulary IncomingCallNotification.jsx switches on.
NEVER_ASKED = "never_asked"
GRANTED = "granted"
GRANTED_PERMANENT = "granted_permanent"
EXPIRED = "expired"
DECLINED = "declined"


def _read_permission(payload: dict[str, Any]) -> tuple[str | None, int | None]:
    """Pull (status, expiration_unix) out of Meta's call_permissions body.

    The response has been reshaped more than once during the calling beta
    (top-level, nested under `permission`, wrapped in `data[]`), so this hunts
    for the fields instead of indexing a fixed path -- a KeyError here would
    block every outbound call on the account.
    """
    candidates: list[dict[str, Any]] = []
    for node in (payload, payload.get("permission"), payload.get("call_permission")):
        if isinstance(node, dict):
            candidates.append(node)
    data = payload.get("data")
    if isinstance(data, list):
        candidates.extend(item for item in data if isinstance(item, dict))

    for node in candidates:
        status = node.get("status") or node.get("permission_status")
        if not status:
            continue
        expires = node.get("expiration_timestamp") or node.get("expires_at")
        try:
            expires_int = int(expires) if expires is not None else None
        except (TypeError, ValueError):
            expires_int = None
        return str(status).lower(), expires_int

    return None, None


def _local_state(workspace_id: str, wa_id: str) -> tuple[str, int | None]:
    """What our own record of their last reply says.

    Meta reports "no permission" identically whether the contact declined or
    was never asked; the reply webhook is the only place that distinction
    exists, and the UI shows very different text for the two.
    """
    record = get_call_permission(workspace_id, wa_id)
    if not record:
        return NEVER_ASKED, None

    expires_at = record.get("expires_at")
    expires_unix = None
    if expires_at:
        try:
            expires_unix = int(datetime.fromisoformat(str(expires_at).replace("Z", "+00:00")).timestamp())
        except ValueError:
            expires_unix = None

    response = (record.get("response") or "").lower()
    if response in {"reject", "declined", "decline"}:
        return DECLINED, expires_unix
    if response in {"accept", "granted", "approve"}:
        if record.get("is_permanent"):
            return GRANTED_PERMANENT, None
        if expires_unix and expires_unix < datetime.now(timezone.utc).timestamp():
            return EXPIRED, expires_unix
        return GRANTED, expires_unix

    return NEVER_ASKED, expires_unix


def _permission_state(wa_id: str) -> tuple[str, bool, int | None]:
    """(state, can_call, expires_unix) for one contact."""
    phone_number_id, token = _number()

    try:
        status, expires = _read_permission(graph_get_call_permission(phone_number_id, token, wa_id))
    except GraphError as exc:
        # Calling may not be enabled on the number yet, or the edge may be
        # having a bad day. Neither is a reason to ring someone who never
        # agreed to it, so fall back to what we recorded ourselves.
        log.warning("call_permissions lookup failed for %s: %s", wa_id, exc.message)
        state, expires = _local_state(g.workspace_id, wa_id)
        return state, state in {GRANTED, GRANTED_PERMANENT}, expires

    now = datetime.now(timezone.utc).timestamp()

    if status == "permanent":
        return GRANTED_PERMANENT, True, expires
    if status == "temporary":
        if expires and expires < now:
            return EXPIRED, False, expires
        return GRANTED, True, expires
    if status in {"expired", "revoked"}:
        return EXPIRED, False, expires

    # no_permission (or a status we do not recognise): our own record is the
    # only thing that can tell "they said no" from "we never asked".
    local_state, local_expires = _local_state(g.workspace_id, wa_id)
    if local_state in {GRANTED, GRANTED_PERMANENT}:
        # Meta is authoritative -- if it says no permission, a stale local
        # "granted" means the window lapsed.
        return EXPIRED, False, local_expires
    return local_state, False, local_expires


def _assert_may_call(wa_id: str) -> None:
    """Refuse a call the contact never agreed to.

    dialOut() in IncomingCallNotification.jsx already checks permission-status
    before building an offer, so this rarely fires -- but that check is a
    courtesy to the user, not a control. Anything holding a JWT can POST
    /whatsapp/call/action directly, and the rule has to hold here too.
    """
    state, can_call, _ = _permission_state(wa_id)
    if can_call:
        return

    if state == DECLINED:
        message = "This contact declined being called. You can ask again 24 hours after the last request."
    elif state == EXPIRED:
        message = "Their permission to be called has expired. Ask again to call them."
    else:
        message = "This contact has not granted permission to be called. Send a call permission request first."

    raise RouteError(message, 403)


@calls_bp.route("/whatsapp/call/permission-status", methods=["GET"])
@require_workspace
@_handle
def call_permission_status_route():
    wa_id = (request.args.get("wa_id") or "").strip()
    if not wa_id:
        raise RouteError("'wa_id' is required")

    state, can_call, expires = _permission_state(wa_id)

    # Cosmetic field only -- a nonsense expiry from Meta must not turn into a
    # 500 that leaves the dialler unable to check anyone.
    expires_at = None
    if expires:
        try:
            expires_at = datetime.fromtimestamp(expires, tz=timezone.utc).isoformat()
        except (OverflowError, OSError, ValueError):
            log.warning("Unusable expiration_timestamp %r for %s", expires, wa_id)

    return (
        jsonify({"wa_id": wa_id, "state": state, "can_call": can_call, "expires_at": expires_at}),
        200,
    )


@calls_bp.route("/whatsapp/call/permission", methods=["POST"])
@require_workspace
@_handle
def request_call_permission_route():
    body = _body()
    to = _required(body, "to")
    text = (body.get("text") or "May we call you on WhatsApp about your enquiry?").strip()

    phone_number_id, token = _number()
    result = send_call_permission_request(phone_number_id, token, to, text)

    insert_message(
        {
            "workspace_id": g.workspace_id,
            "wa_id": to,
            "wa_message_id": ((result.get("messages") or [{}])[0]).get("id")
            or f"callperm:{to}:{_now()}",
            "direction": "outbound",
            "message_type": "interactive",
            "body": text,
            "status": "sent",
            "created_at": _now(),
            "metadata": {"kind": "call_permission_request"},
        }
    )

    return jsonify({"status": "sent", "to": to, "result": result}), 200
