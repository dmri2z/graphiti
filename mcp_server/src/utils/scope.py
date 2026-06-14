"""Public/private scope resolution for MCP tools.

Every tool exposes a ``scope`` parameter instead of a free-form ``group_id``. The
scope plus the request's identity resolve to exactly one graph name (``group_id``),
which for FalkorDB is a separate physical graph:

- ``public``  -> the shared :data:`PUBLIC_GROUP_ID` graph (``default_db``).
- ``private`` -> the current user's own graph: the username from the request
  header :data:`USER_HEADER`, or :data:`ANONYMOUS_USER` when no user is identified.

Because tools no longer accept arbitrary ``group_id`` values, the only graph names
graphiti can ever select are ``default_db`` and per-user private graphs — callers
(and LLMs) can no longer invent ad-hoc group ids that silently spawn new databases.

There is intentionally no per-user access control yet: any identified user may read,
write, and delete in any tenant they target via ``scope``.
"""

import logging
import os
import re
from typing import Any, Literal

logger = logging.getLogger(__name__)

# The shared, world-readable graph. Matches the configured default group_id.
PUBLIC_GROUP_ID = 'default_db'
# Private graph used when no user is identified on the request.
ANONYMOUS_USER = 'anonymous'
# HTTP header carrying the current username (HTTP/streamable transports only).
USER_HEADER = os.getenv('GRAPHITI_USER_HEADER', 'X-Graphiti-User')

Scope = Literal['public', 'private']

# Usernames become FalkorDB graph names; restrict to a safe, predictable charset.
_SAFE_USERNAME = re.compile(r'^[A-Za-z0-9._-]{1,128}$')


def resolve_username(ctx: Any) -> str:
    """Best-effort extraction of the current username from the request header.

    Returns :data:`ANONYMOUS_USER` when there is no HTTP request (e.g. stdio
    transport), the header is absent, or the value fails safe-name validation.
    Never raises — identity resolution must not break a tool call.
    """
    try:
        request = ctx.request_context.request
        raw = request.headers.get(USER_HEADER)
    except Exception:
        return ANONYMOUS_USER

    if not raw:
        return ANONYMOUS_USER

    username = raw.strip()
    if not _SAFE_USERNAME.match(username):
        logger.warning('Ignoring malformed %s header value; using anonymous', USER_HEADER)
        return ANONYMOUS_USER
    return username


def resolve_group_id(scope: Scope, ctx: Any) -> str:
    """Resolve a ``scope`` + request identity to a single graph name (group_id)."""
    if scope == 'public':
        return PUBLIC_GROUP_ID
    if scope == 'private':
        return resolve_username(ctx)
    raise ValueError(f"Invalid scope '{scope}'; expected 'public' or 'private'")


def allowed_group_ids(ctx: Any) -> set[str]:
    """The set of group ids this request is permitted to touch."""
    return {PUBLIC_GROUP_ID, resolve_username(ctx)}


def validate_group_id(group_id: str, ctx: Any) -> None:
    """Defensive backstop: reject a group_id outside the request's allowed set.

    With the scope-based API this should never fire, but it guarantees that no
    code path can target a graph other than ``default_db`` or the caller's own
    private graph.
    """
    allowed = allowed_group_ids(ctx)
    if group_id not in allowed:
        raise ValueError(f"Refusing to access group '{group_id}'; allowed: {sorted(allowed)}")
