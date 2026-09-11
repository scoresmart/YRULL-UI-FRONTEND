"""WhatsApp Cloud API - inbound webhook receiver (the "receiving" half).

Drop this file (plus supabase_repo.py) into the Flask backend and register it:

    from webhooks_whatsapp import whatsapp_webhook_bp
    app.register_blueprint(whatsapp_webhook_bp)

Exposes:
    GET  /webhooks/whatsapp   Meta's one-time subscription handshake.
    POST /webhooks/whatsapp   Live events: messages, delivery receipts, calls.

Two rules govern everything below, both imposed by Meta:

1. Always answer 200, even on our own bugs. Meta retries a non-200 with
   exponential backoff for up to ~7 days and will disable the subscription
   after sustained failures. A 500 because one message had an odd shape would
   therefore stall every other message on the number. The only non-200 is 403
   for a bad signature -- that request is not from Meta at all.
2. Answer fast. Meta's timeout is short, so per-message work is kept to a
   bounded number of Supabase round-trips.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import mimetypes
import os
from datetime import datetime, timezone
from typing import Any

import requests
from flask import Blueprint, Response, jsonify, request

try:
    from supabase_repo import (
        insert_message,
        resolve_workspace,
        update_message_status,
        upload_media,
        upsert_call,
        upsert_call_permission,
        upsert_contact,
    )
except ImportError:  # when dropped into a package, e.g. src/routes/
    from .supabase_repo import (  # type: ignore[no-redef]
        insert_message,
        resolve_workspace,
        update_message_status,
        upload_media,
        upsert_call,
        upsert_call_permission,
        upsert_contact,
    )

log = logging.getLogger(__name__)

whatsapp_webhook_bp = Blueprint("whatsapp_webhook", __name__)

VERIFY_TOKEN = os.environ.get("META_WEBHOOK_VERIFY_TOKEN", "")
APP_SECRET = os.environ.get("META_APP_SECRET", "")
GRAPH_VERSION = os.environ.get("META_GRAPH_VERSION", "v21.0")
GRAPH = "https://graph.facebook.com"

# Set to "false" only for local ngrok debugging. Never in production: without
# it, anyone who learns the URL can inject messages into a customer's inbox.
VERIFY_SIGNATURE = os.environ.get("WA_VERIFY_SIGNATURE", "true").lower() != "false"

MEDIA_TYPES = {"image", "video", "audio", "document", "sticker"}
MAX_MEDIA_BYTES = int(os.environ.get("WA_MAX_MEDIA_BYTES", str(25 * 1024 * 1024)))


# ---------------------------------------------------------------------------
# Verification handshake
# ---------------------------------------------------------------------------


@whatsapp_webhook_bp.route("/webhooks/whatsapp", methods=["GET"])
def verify_webhook() -> Response:
    """Meta calls this once when you click "Verify and save" in the dashboard.

    It must echo hub.challenge back as raw text -- a JSON-wrapped or
    quoted body fails verification with a misleading error.
    """
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token", "")
    challenge = request.args.get("hub.challenge", "")

    if mode == "subscribe" and VERIFY_TOKEN and hmac.compare_digest(token, VERIFY_TOKEN):
        log.info("WhatsApp webhook verified by Meta")
        return Response(challenge, status=200, mimetype="text/plain")

    log.warning("WhatsApp webhook verification rejected (mode=%s)", mode)
    return Response("Forbidden", status=403, mimetype="text/plain")


# ---------------------------------------------------------------------------
# Signature
# ---------------------------------------------------------------------------


def _signature_ok(raw_body: bytes) -> bool:
    if not VERIFY_SIGNATURE:
        return True
    if not APP_SECRET:
        log.error("META_APP_SECRET is not set - refusing unverifiable webhook")
        return False

    header = request.headers.get("X-Hub-Signature-256", "")
    if not header.startswith("sha256="):
        return False

    expected = hmac.new(APP_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(header[7:], expected)


# ---------------------------------------------------------------------------
# Event receiver
# ---------------------------------------------------------------------------


@whatsapp_webhook_bp.route("/webhooks/whatsapp", methods=["POST"])
def receive_webhook():
    # Must read the raw bytes, not request.json - re-serialising the parsed
    # body changes whitespace and key order, and the HMAC then never matches.
    raw_body = request.get_data()

    if not _signature_ok(raw_body):
        log.warning("WhatsApp webhook rejected: bad X-Hub-Signature-256")
        return jsonify({"error": "invalid signature"}), 403

    try:
        payload = request.get_json(force=True, silent=True) or {}
        for entry in payload.get("entry") or []:
            for change in entry.get("changes") or []:
                _handle_change(change.get("value") or {})
    except Exception:  # noqa: BLE001 - see rule 1 in the module docstring
        log.exception("WhatsApp webhook processing failed; acking anyway")

    return jsonify({"status": "ok"}), 200


def _handle_change(value: dict[str, Any]) -> None:
    metadata = value.get("metadata") or {}
    phone_number_id = metadata.get("phone_number_id")
    if not phone_number_id:
        return

    workspace_id, access_token = resolve_workspace(phone_number_id)
    if not workspace_id:
        # Number not connected to any workspace. Ack so Meta stops retrying.
        log.warning("No workspace for phone_number_id=%s - ignoring event", phone_number_id)
        return

    # contacts[] carries the sender's WhatsApp profile name, keyed by wa_id.
    profile_names = {
        c.get("wa_id"): ((c.get("profile") or {}).get("name"))
        for c in (value.get("contacts") or [])
        if c.get("wa_id")
    }

    for message in value.get("messages") or []:
        try:
            _handle_message(workspace_id, access_token, message, profile_names)
        except Exception:  # noqa: BLE001 - one bad message must not drop the batch
            log.exception("Failed to store inbound message id=%s", message.get("id"))

    for status in value.get("statuses") or []:
        try:
            _handle_status(workspace_id, status)
        except Exception:  # noqa: BLE001
            log.exception("Failed to apply status for id=%s", status.get("id"))

    for call in value.get("calls") or []:
        try:
            _handle_call(workspace_id, call)
        except Exception:  # noqa: BLE001
            log.exception("Failed to store call id=%s", call.get("id"))


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


def _ts(raw: Any) -> str:
    """Meta sends unix seconds as a string. Fall back to now() if absent."""
    try:
        return datetime.fromtimestamp(int(raw), tz=timezone.utc).isoformat()
    except (TypeError, ValueError):
        return datetime.now(timezone.utc).isoformat()


def _handle_message(
    workspace_id: str,
    access_token: str | None,
    message: dict[str, Any],
    profile_names: dict[str, str | None],
) -> None:
    wa_id = message.get("from")
    wa_message_id = message.get("id")
    if not wa_id:
        return

    created_at = _ts(message.get("timestamp"))
    upsert_contact(workspace_id, wa_id, profile_names.get(wa_id), created_at)

    # A yes/no on a call permission request arrives as an ordinary inbound
    # interactive message. It is still stored as one (staff should see it in
    # the thread), but it also has to update the permission record.
    interactive = message.get("interactive") or {}
    if interactive.get("type") == "call_permission_reply":
        try:
            _handle_call_permission_reply(
                workspace_id, wa_id, interactive.get("call_permission_reply") or {}, created_at
            )
        except Exception:  # noqa: BLE001 - the message itself must still land
            log.exception("Failed to record call permission reply from %s", wa_id)

    body, message_type, media_id, mime_type = _extract_content(message)

    media_url = None
    if media_id and access_token:
        media_url, mime_type = _fetch_media(
            access_token, media_id, workspace_id, wa_message_id or media_id, mime_type
        )

    row: dict[str, Any] = {
        "workspace_id": workspace_id,
        "wa_id": wa_id,
        "wa_message_id": wa_message_id,
        "direction": "inbound",
        "message_type": message_type,
        "body": body,
        "media_url": media_url,
        "media_mime_type": mime_type,
        "status": "received",
        "created_at": created_at,
        "metadata": {"raw_type": message.get("type"), "context": message.get("context")},
    }

    if insert_message(row):
        log.info("Inbound %s from %s stored (%s)", message_type, wa_id, wa_message_id)
    else:
        log.info("Duplicate re-delivery of %s ignored", wa_message_id)


def _extract_content(
    message: dict[str, Any],
) -> tuple[str | None, str, str | None, str | None]:
    """Flatten one Meta message object into (body, message_type, media_id, mime).

    message_type is normalised to the set ChatWindow.jsx can render:
    text | image | video | audio | document | interactive | automated.
    """
    mtype = message.get("type") or "text"

    if mtype == "text":
        return (message.get("text") or {}).get("body"), "text", None, None

    if mtype in MEDIA_TYPES:
        node = message.get(mtype) or {}
        caption = node.get("caption") or node.get("filename")
        # Stickers are webp images; the UI has no sticker branch but renders
        # 'image' with an <img>, which is correct for them.
        normalised = "image" if mtype == "sticker" else mtype
        return caption, normalised, node.get("id"), node.get("mime_type")

    if mtype == "interactive":
        node = message.get("interactive") or {}
        if node.get("type") == "call_permission_reply":
            permission = node.get("call_permission_reply") or {}
            granted = (permission.get("response") or "").lower() == "accept"
            scope = " (always)" if permission.get("is_permanent") else ""
            return (
                f"{'Allowed' if granted else 'Declined'} calls from us{scope if granted else ''}",
                "interactive",
                None,
                None,
            )
        reply = node.get("button_reply") or node.get("list_reply") or {}
        text = reply.get("title") or reply.get("description")
        return text, "interactive", None, None

    if mtype == "button":
        # Reply from a template quick-reply button.
        return (message.get("button") or {}).get("text"), "text", None, None

    if mtype == "reaction":
        node = message.get("reaction") or {}
        emoji = node.get("emoji") or ""
        return f"Reacted {emoji}".strip(), "text", None, None

    if mtype == "location":
        node = message.get("location") or {}
        label = node.get("name") or node.get("address") or ""
        coords = f"{node.get('latitude')},{node.get('longitude')}"
        return f"📍 {label} ({coords})".strip(), "text", None, None

    if mtype == "contacts":
        names = [
            ((c.get("name") or {}).get("formatted_name") or "")
            for c in (message.get("contacts") or [])
        ]
        return "👤 " + ", ".join(n for n in names if n), "text", None, None

    if mtype == "order":
        items = (message.get("order") or {}).get("product_items") or []
        return f"🛒 Order with {len(items)} item(s)", "text", None, None

    if mtype == "system":
        return (message.get("system") or {}).get("body"), "automated", None, None

    if mtype == "unsupported":
        errors = message.get("errors") or [{}]
        return f"[Unsupported message: {errors[0].get('title', 'unknown')}]", "text", None, None

    return f"[{mtype} message]", mtype, None, None


def _fetch_media(
    access_token: str,
    media_id: str,
    workspace_id: str,
    key: str,
    fallback_mime: str | None,
) -> tuple[str | None, str | None]:
    """Download a media file from Meta and re-host it in Supabase Storage.

    Done synchronously because the frontend subscribes to INSERT only -- if the
    row landed with a null media_url and we patched it later, the image would
    not appear until the 30s poll in dataHooks.js. A failure here is not fatal:
    the message still gets stored, just without a preview.
    """
    try:
        meta_resp = requests.get(
            f"{GRAPH}/{GRAPH_VERSION}/{media_id}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        meta_resp.raise_for_status()
        info = meta_resp.json()

        url = info.get("url")
        mime = info.get("mime_type") or fallback_mime
        size = int(info.get("file_size") or 0)
        if not url:
            return None, mime
        if size and size > MAX_MEDIA_BYTES:
            log.warning("Media %s is %d bytes - over limit, skipping download", media_id, size)
            return None, mime

        # The lookup URL is signed but still needs the bearer token.
        bin_resp = requests.get(
            url, headers={"Authorization": f"Bearer {access_token}"}, timeout=30
        )
        bin_resp.raise_for_status()

        ext = mimetypes.guess_extension(mime.split(";")[0]) if mime else None
        path = f"{workspace_id}/{key}{ext or '.bin'}"
        return upload_media(path, bin_resp.content, mime or "application/octet-stream"), mime
    except Exception:  # noqa: BLE001 - never lose the message over its attachment
        log.exception("Media download failed for media_id=%s", media_id)
        return None, fallback_mime


# ---------------------------------------------------------------------------
# Delivery receipts
# ---------------------------------------------------------------------------


def _handle_status(workspace_id: str, status: dict[str, Any]) -> None:
    """statuses[] reports what happened to a message WE sent."""
    wa_message_id = status.get("id")
    state = status.get("status")
    if not wa_message_id or not state:
        return

    detail = None
    if state == "failed":
        errors = status.get("errors") or [{}]
        err = errors[0]
        detail = err.get("error_data", {}).get("details") or err.get("title") or err.get("message")

    update_message_status(workspace_id, wa_message_id, state, detail)
    log.info("Status %s -> %s", wa_message_id, state)


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------


def _handle_call(workspace_id: str, call: dict[str, Any]) -> None:
    """Call events land on this same endpoint once Calling is enabled on the
    number. IncomingCallNotification.jsx subscribes to whatsapp_calls.

    This is also the signalling relay. Meta delivers the far end's session
    description here, never in an API response:

      * inbound  (USER_INITIATED)     connect carries the caller's SDP *offer*
      * outbound (BUSINESS_INITIATED) connect carries the callee's SDP *answer*

    Both are parked on the row for calls_route.py to hand to the browser -- the
    offer through /whatsapp/calls/pending, the answer through
    /whatsapp/calls/answered.
    """
    call_id = call.get("id")
    if not call_id:
        return

    # Meta's own vocabulary is stored verbatim: CallLogs.jsx and
    # IncomingCallNotification.jsx both filter on the literal strings
    # USER_INITIATED / BUSINESS_INITIATED, so normalising to inbound/outbound
    # here would hide every call from the UI.
    direction = (call.get("direction") or "").upper() or "USER_INITIATED"
    inbound = direction != "BUSINESS_INITIATED"
    wa_id = call.get("from") if inbound else call.get("to")
    event = (call.get("event") or "").lower()

    row: dict[str, Any] = {
        "workspace_id": workspace_id,
        "call_id": call_id,
        "wa_id": wa_id,
        "phone": f"+{wa_id}" if wa_id else None,
        "direction": direction,
        "event": call.get("event"),
        "status": call.get("status") or call.get("event"),
        "from_number": call.get("from"),
        "to_number": call.get("to"),
        "timestamp": _ts(call.get("timestamp")),
    }

    # Only written when Meta actually sent one. A terminate event has no
    # session, and PostgREST's merge-upsert would blank the parked offer if the
    # key were present with a null value.
    session = call.get("session") or {}
    if session.get("sdp"):
        row["sdp"] = session.get("sdp")
        row["sdp_type"] = session.get("sdp_type") or ("offer" if inbound else "answer")

    duration = call.get("duration")
    if duration is not None:
        try:
            row["duration"] = int(duration)
        except (TypeError, ValueError):
            pass

    if event in {"terminate", "disconnect", "end", "missed", "reject"}:
        # Stop offering it: whoever was going to answer no longer can.
        row["handled_at"] = datetime.now(timezone.utc).isoformat()

    upsert_call(row)

    if event in {"terminate", "disconnect", "end"}:
        _record_call_message(workspace_id, call, wa_id, inbound)

    log.info("Call %s event=%s direction=%s stored", call_id, event or "?", direction)


def _record_call_message(
    workspace_id: str, call: dict[str, Any], wa_id: str | None, inbound: bool
) -> None:
    """Drop a call bubble into the transcript when a call ends.

    ChatWindow.jsx already renders message_type 'call_event' as a phone bubble
    reading "Voice call / 2 minutes" (or "Missed call"), parsing the duration
    out of the body. Without this row that renderer never fires and a call
    leaves no trace in the conversation at all -- only in Call Logs.
    """
    if not wa_id:
        return

    status = (call.get("status") or "").upper() or "COMPLETED"
    try:
        duration = int(call.get("duration") or 0)
    except (TypeError, ValueError):
        duration = 0

    insert_message(
        {
            "workspace_id": workspace_id,
            "wa_id": wa_id,
            # Distinct from the call id itself: the call may already own a row
            # elsewhere, and this key is what makes Meta's re-delivery a no-op.
            "wa_message_id": f"callevent:{call.get('id')}",
            "direction": "inbound" if inbound else "outbound",
            "message_type": "call_event",
            "body": f"__call_event__|status={status}|duration={duration}",
            "status": "received" if inbound else "sent",
            "created_at": _ts(call.get("end_time") or call.get("timestamp")),
            "metadata": {"call_id": call.get("id"), "event": call.get("event")},
        }
    )


# ---------------------------------------------------------------------------
# Call permissions
# ---------------------------------------------------------------------------


def _handle_call_permission_reply(
    workspace_id: str, wa_id: str, reply: dict[str, Any], replied_at: str
) -> None:
    """Store the contact's answer to a call permission request.

    Meta's GET /call_permissions reports granted and expired, but a decline
    reads back as plain "no permission" -- indistinguishable from never having
    asked. The UI says very different things for those two, so the reply is
    recorded here and merged in by calls_route._permission_state().
    """
    response = (reply.get("response") or "").lower()
    if not response:
        return

    expires_at = None
    raw_expiry = reply.get("expiration_timestamp")
    if raw_expiry:
        try:
            expires_at = datetime.fromtimestamp(int(raw_expiry), tz=timezone.utc).isoformat()
        except (TypeError, ValueError, OSError):
            expires_at = None

    upsert_call_permission(
        {
            "workspace_id": workspace_id,
            "wa_id": wa_id,
            "response": response,
            "is_permanent": bool(reply.get("is_permanent")),
            "expires_at": expires_at,
            "response_source": reply.get("response_source"),
            "responded_at": replied_at,
        }
    )
    log.info("Call permission %s by %s (permanent=%s)", response, wa_id, reply.get("is_permanent"))
