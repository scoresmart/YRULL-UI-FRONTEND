"""Thin Supabase (PostgREST + Storage) data layer for the WhatsApp webhook.

Deliberately built on `requests` rather than `supabase-py` so this drops into
the Flask app with zero new dependencies, and so the exact conflict-resolution
semantics of every write are visible here instead of hidden behind a client.

All writes use the SERVICE ROLE key and therefore bypass RLS. Never expose
these functions to a request path that a browser can reach directly.
"""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

log = logging.getLogger(__name__)

SUPABASE_URL = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""

# Where the phone_number_id -> workspace_id mapping lives. Overridable because
# the existing sending-side backend already owns this table and we must not
# assume its shape.
INTEGRATIONS_TABLE = os.environ.get("WA_INTEGRATIONS_TABLE", "workspace_integrations")
INTEGRATIONS_PNID_COLUMN = os.environ.get("WA_INTEGRATIONS_PNID_COLUMN", "phone_number_id")
INTEGRATIONS_TOKEN_COLUMN = os.environ.get("WA_INTEGRATIONS_TOKEN_COLUMN", "access_token")

MEDIA_BUCKET = os.environ.get("WA_MEDIA_BUCKET", "whatsapp-media")

_TIMEOUT = 10


class SupabaseError(RuntimeError):
    pass


def _headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set")
    h = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def _rest(table: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{table}"


def _check(resp: requests.Response, what: str) -> Any:
    if resp.status_code >= 400:
        raise SupabaseError(f"{what} failed [{resp.status_code}]: {resp.text[:500]}")
    if not resp.content:
        return None
    try:
        return resp.json()
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Workspace routing
# ---------------------------------------------------------------------------

# phone_number_id -> (workspace_id, access_token, cached_at). Meta hits this
# endpoint once per inbound message; without a cache that is one extra DB
# round-trip on every single message.
_ws_cache: dict[str, tuple[str | None, str | None, float]] = {}
_WS_CACHE_TTL = int(os.environ.get("WA_WORKSPACE_CACHE_TTL", "300"))


def resolve_workspace(phone_number_id: str) -> tuple[str | None, str | None]:
    """Map an inbound phone_number_id to (workspace_id, access_token).

    Falls back to WA_DEFAULT_WORKSPACE_ID so a single-workspace (Phase 1)
    deployment works before the multi-tenant integrations table is populated.
    """
    now = time.time()
    hit = _ws_cache.get(phone_number_id)
    if hit and (now - hit[2]) < _WS_CACHE_TTL:
        return hit[0], hit[1]

    workspace_id: str | None = None
    token: str | None = None

    try:
        resp = requests.get(
            _rest(INTEGRATIONS_TABLE),
            headers=_headers(),
            params={
                "select": f"workspace_id,{INTEGRATIONS_TOKEN_COLUMN}",
                INTEGRATIONS_PNID_COLUMN: f"eq.{phone_number_id}",
                "limit": "1",
            },
            timeout=_TIMEOUT,
        )
        rows = _check(resp, "resolve_workspace") or []
        if rows:
            workspace_id = rows[0].get("workspace_id")
            token = rows[0].get(INTEGRATIONS_TOKEN_COLUMN)
    except Exception as exc:  # noqa: BLE001 - routing must never break the webhook
        log.warning("workspace lookup failed for pnid=%s: %s", phone_number_id, exc)

    if not workspace_id:
        workspace_id = os.environ.get("WA_DEFAULT_WORKSPACE_ID") or None
    if not token:
        token = os.environ.get("WHATSAPP_ACCESS_TOKEN") or None

    _ws_cache[phone_number_id] = (workspace_id, token, now)
    return workspace_id, token


# ---------------------------------------------------------------------------
# Contacts
# ---------------------------------------------------------------------------


def upsert_contact(workspace_id: str, wa_id: str, name: str | None, seen_at: str) -> None:
    """Create or touch the contact. Requires the (workspace_id, wa_id) unique index.

    `name` is only written when Meta actually sent a profile name -- otherwise a
    later webhook without one would blank out a name the user already edited.
    """
    row: dict[str, Any] = {
        "workspace_id": workspace_id,
        "wa_id": wa_id,
        "phone": f"+{wa_id}",
        "last_seen": seen_at,
        "first_seen": seen_at,
    }
    if name:
        row["name"] = name

    resp = requests.post(
        _rest("whatsapp_contacts"),
        headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
        params={"on_conflict": "workspace_id,wa_id"},
        json=[row],
        timeout=_TIMEOUT,
    )
    _check(resp, "upsert_contact")


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


def insert_message(row: dict[str, Any]) -> bool:
    """Insert an inbound message, ignoring Meta's re-deliveries.

    Returns True if a new row was actually created. `ignore-duplicates` (rather
    than `merge-duplicates`) matters here: a replay must not UPDATE the row,
    because the frontend subscribes to INSERT only and an update would be a
    silent no-op that also clobbers any AI enrichment written since.
    """
    resp = requests.post(
        _rest("whatsapp_messages"),
        headers=_headers({"Prefer": "resolution=ignore-duplicates,return=representation"}),
        params={"on_conflict": "workspace_id,wa_message_id"},
        json=[row],
        timeout=_TIMEOUT,
    )
    created = _check(resp, "insert_message") or []
    return bool(created)


def update_message_status(
    workspace_id: str,
    wa_message_id: str,
    status: str,
    error_detail: str | None = None,
) -> None:
    """Apply a delivery receipt (sent/delivered/read/failed) to an outbound row."""
    patch: dict[str, Any] = {"status": status}
    if error_detail:
        patch["error_detail"] = error_detail

    resp = requests.patch(
        _rest("whatsapp_messages"),
        headers=_headers({"Prefer": "return=minimal"}),
        params={
            "workspace_id": f"eq.{workspace_id}",
            "wa_message_id": f"eq.{wa_message_id}",
        },
        json=patch,
        timeout=_TIMEOUT,
    )
    _check(resp, "update_message_status")


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------


def upsert_call(row: dict[str, Any]) -> None:
    """Record a call event. Merges, because one call_id progresses through
    several events (ringing -> accepted -> terminated) and the UI wants the
    latest state on a single row."""
    resp = requests.post(
        _rest("whatsapp_calls"),
        headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
        params={"on_conflict": "workspace_id,call_id"},
        json=[row],
        timeout=_TIMEOUT,
    )
    _check(resp, "upsert_call")


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


def upload_media(path: str, content: bytes, content_type: str) -> str:
    """Re-host a WhatsApp media file and return its public URL.

    Meta's own media links expire in ~5 minutes and require a bearer token, so
    they are useless as an <img src>. `x-upsert` makes a webhook replay
    overwrite rather than 409.
    """
    resp = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{MEDIA_BUCKET}/{path}",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": content_type or "application/octet-stream",
            "x-upsert": "true",
        },
        data=content,
        timeout=30,
    )
    _check(resp, "upload_media")
    return f"{SUPABASE_URL}/storage/v1/object/public/{MEDIA_BUCKET}/{path}"


# ---------------------------------------------------------------------------
# Outbound routing (workspace -> the number we send/call from)
# ---------------------------------------------------------------------------

# The reverse of resolve_workspace(): the calling routes start from a logged-in
# user's workspace and have to find the number to act as.
_num_cache: dict[str, tuple[str | None, str | None, float]] = {}


def resolve_number(workspace_id: str) -> tuple[str | None, str | None]:
    """Map a workspace to (phone_number_id, access_token).

    Falls back to the WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN env pair
    so a single-number deployment works before the integrations table is
    populated, exactly like resolve_workspace() does in the other direction.
    """
    now = time.time()
    hit = _num_cache.get(workspace_id)
    if hit and (now - hit[2]) < _WS_CACHE_TTL:
        return hit[0], hit[1]

    phone_number_id: str | None = None
    token: str | None = None

    try:
        resp = requests.get(
            _rest(INTEGRATIONS_TABLE),
            headers=_headers(),
            params={
                "select": f"{INTEGRATIONS_PNID_COLUMN},{INTEGRATIONS_TOKEN_COLUMN}",
                "workspace_id": f"eq.{workspace_id}",
                "limit": "1",
            },
            timeout=_TIMEOUT,
        )
        rows = _check(resp, "resolve_number") or []
        if rows:
            phone_number_id = rows[0].get(INTEGRATIONS_PNID_COLUMN)
            token = rows[0].get(INTEGRATIONS_TOKEN_COLUMN)
    except Exception as exc:  # noqa: BLE001 - fall through to the env fallback
        log.warning("number lookup failed for workspace=%s: %s", workspace_id, exc)

    if not phone_number_id:
        phone_number_id = os.environ.get("WHATSAPP_PHONE_NUMBER_ID") or None
    if not token:
        token = os.environ.get("WHATSAPP_ACCESS_TOKEN") or None

    _num_cache[workspace_id] = (phone_number_id, token, now)
    return phone_number_id, token


# ---------------------------------------------------------------------------
# Call reads
# ---------------------------------------------------------------------------

# Meta labels calls USER_INITIATED / BUSINESS_INITIATED and the whole frontend
# (CallLogs.jsx, IncomingCallNotification.jsx) filters on those exact strings.
# Rows written before that was fixed carry inbound/outbound, so every read
# accepts both spellings.
INBOUND_DIRECTIONS = ("USER_INITIATED", "inbound")
OUTBOUND_DIRECTIONS = ("BUSINESS_INITIATED", "outbound")


def list_calls(workspace_id: str, limit: int = 50, direction: str | None = None) -> list[dict[str, Any]]:
    params: dict[str, str] = {
        "select": "*",
        "workspace_id": f"eq.{workspace_id}",
        "order": "timestamp.desc.nullslast",
        "limit": str(limit),
    }
    if direction:
        alias = (
            INBOUND_DIRECTIONS
            if direction in INBOUND_DIRECTIONS
            else OUTBOUND_DIRECTIONS
            if direction in OUTBOUND_DIRECTIONS
            else (direction,)
        )
        params["direction"] = f"in.({','.join(alias)})"

    resp = requests.get(_rest("whatsapp_calls"), headers=_headers(), params=params, timeout=_TIMEOUT)
    return _check(resp, "list_calls") or []


def pending_calls(workspace_id: str, ttl_seconds: int = 60) -> list[dict[str, Any]]:
    """Inbound calls still ringing: an SDP offer parked by the webhook that
    nobody has accepted, rejected or hung up yet.

    `handled_at` rather than `status` decides this. Status is Meta's vocabulary
    and keeps changing as a call progresses; handled_at is ours and means
    exactly one thing -- this ring has been dealt with, stop showing it.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=ttl_seconds)
    resp = requests.get(
        _rest("whatsapp_calls"),
        headers=_headers(),
        params={
            "select": "call_id,wa_id,from_number,to_number,direction,sdp,sdp_type,timestamp",
            "workspace_id": f"eq.{workspace_id}",
            "direction": f"in.({','.join(INBOUND_DIRECTIONS)})",
            "handled_at": "is.null",
            "sdp": "not.is.null",
            "sdp_type": "eq.offer",
            "timestamp": f"gte.{cutoff.isoformat()}",
            "order": "timestamp.desc",
            "limit": "5",
        },
        timeout=_TIMEOUT,
    )
    return _check(resp, "pending_calls") or []


def answered_call(workspace_id: str, call_id: str, ttl_seconds: int = 120) -> dict[str, Any] | None:
    """The callee's SDP answer for an outbound call, if it has arrived.

    Meta does not return the answer in the connect response -- it is delivered
    to the webhook when the contact picks up, which is why dialOut() in
    IncomingCallNotification.jsx polls for it.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=ttl_seconds)
    resp = requests.get(
        _rest("whatsapp_calls"),
        headers=_headers(),
        params={
            "select": "call_id,sdp,sdp_type,timestamp",
            "workspace_id": f"eq.{workspace_id}",
            "call_id": f"eq.{call_id}",
            "sdp": "not.is.null",
            "sdp_type": "eq.answer",
            "timestamp": f"gte.{cutoff.isoformat()}",
            "limit": "1",
        },
        timeout=_TIMEOUT,
    )
    rows = _check(resp, "answered_call") or []
    return rows[0] if rows else None


def mark_call_handled(workspace_id: str, call_id: str, status: str) -> None:
    """Take a call out of the pending list and record how it ended."""
    resp = requests.patch(
        _rest("whatsapp_calls"),
        headers=_headers({"Prefer": "return=minimal"}),
        params={"workspace_id": f"eq.{workspace_id}", "call_id": f"eq.{call_id}"},
        json={"status": status, "handled_at": datetime.now(timezone.utc).isoformat()},
        timeout=_TIMEOUT,
    )
    _check(resp, "mark_call_handled")


# ---------------------------------------------------------------------------
# Call permissions
# ---------------------------------------------------------------------------


def upsert_call_permission(row: dict[str, Any]) -> None:
    """Record a contact's answer to a call permission request.

    Meta's own permission endpoint reports granted/expired but not *declined* --
    a decline looks identical to never having been asked. The UI needs to tell
    those apart (one says "ask again", the other says "they said no"), so the
    reply webhook is stored here as well.
    """
    resp = requests.post(
        _rest("whatsapp_call_permissions"),
        headers=_headers({"Prefer": "resolution=merge-duplicates,return=minimal"}),
        params={"on_conflict": "workspace_id,wa_id"},
        json=[row],
        timeout=_TIMEOUT,
    )
    _check(resp, "upsert_call_permission")


def get_call_permission(workspace_id: str, wa_id: str) -> dict[str, Any] | None:
    resp = requests.get(
        _rest("whatsapp_call_permissions"),
        headers=_headers(),
        params={
            "select": "*",
            "workspace_id": f"eq.{workspace_id}",
            "wa_id": f"eq.{wa_id}",
            "limit": "1",
        },
        timeout=_TIMEOUT,
    )
    rows = _check(resp, "get_call_permission") or []
    return rows[0] if rows else None
