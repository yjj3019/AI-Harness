"""Deny-by-default reference tool broker for *fixture* write operations.

Trust assumption: broker process, signing key, configuration and SQLite DB belong
to a separate trusted OS principal. A coding agent with write access to these
resources can bypass this reference implementation. Do NOT install as production
authorization without that isolation and a provider-specific adapter.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

MAX_BODY = 4096
KEY_RE = re.compile(r"^[A-Za-z0-9_-]{8,96}$")
ACTIONS = frozenset({"fixture.db.increment", "fixture.http.post"})


def canon(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
                      allow_nan=False).encode("utf-8")


def digest(operation: str, request_id: str, payload: dict) -> str:
    return hashlib.sha256(canon({"operation": operation, "request_id": request_id,
                                 "payload": payload})).hexdigest()


def unbase(text: str) -> bytes:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", text):
        raise ValueError("invalid base64url")
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


@dataclass
class BrokerError(Exception):
    status: int
    code: str

    def __str__(self) -> str:
        return self.code


class Broker:
    def __init__(self, database: str | Path, secret: bytes, *,
                 allowed: set[str] | frozenset[str] = frozenset(),
                 http_destination: str | None = None, timeout: float = 1.0):
        if len(secret) < 32:
            raise ValueError("broker approval secret must be >=32 bytes")
        if not set(allowed).issubset(ACTIONS):
            raise ValueError("unknown privileged operation")
        if timeout <= 0 or timeout > 10:
            raise ValueError("invalid timeout")
        self.database = str(database)
        self.secret = secret
        self.allowed = frozenset(allowed)
        self.timeout = timeout
        self.destination = None
        if "fixture.http.post" in self.allowed:
            if http_destination is None:
                raise ValueError("fixed server-side destination required")
            url = urllib.parse.urlsplit(http_destination)
            if (url.scheme != "http" or url.hostname not in ("127.0.0.1", "::1")
                    or url.username or url.password or url.fragment
                    or url.path != "/write" or url.query):
                raise ValueError("fixture HTTP only supports a fixed literal loopback endpoint")
            self.destination = http_destination
        with self._connect() as db:
            db.executescript("""
              CREATE TABLE IF NOT EXISTS requests (
                request_id TEXT PRIMARY KEY,
                operation TEXT NOT NULL,
                payload_hash TEXT NOT NULL,
                nonce TEXT NOT NULL UNIQUE,
                state TEXT NOT NULL CHECK(state IN ('IN_FLIGHT','UNKNOWN','COMPLETED')),
                result_json TEXT,
                created_at INTEGER NOT NULL
              );
              CREATE TABLE IF NOT EXISTS counters (
                resource TEXT PRIMARY KEY, value INTEGER NOT NULL
              );
            """)

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        db = sqlite3.connect(self.database, timeout=5, isolation_level=None)
        try:
            db.execute("PRAGMA busy_timeout=5000")
            yield db
        finally:
            db.close()

    def _verify(self, operation: str, request_id: str, payload: dict, approval: str,
                now: int) -> tuple[str, str]:
        if not isinstance(operation, str) or operation not in self.allowed:
            raise BrokerError(403, "OPERATION_DENIED")
        if not isinstance(request_id, str) or not KEY_RE.fullmatch(request_id):
            raise BrokerError(400, "INVALID_REQUEST_ID")
        if not isinstance(payload, dict):
            raise BrokerError(400, "INVALID_PAYLOAD")
        try:
            if len(canon(payload)) > MAX_BODY:
                raise BrokerError(400, "INVALID_PAYLOAD")
        except (TypeError, ValueError, OverflowError):
            raise BrokerError(400, "INVALID_PAYLOAD") from None
        if operation == "fixture.db.increment":
            if (set(payload) != {"amount"} or type(payload["amount"]) is not int
                    or not 1 <= payload["amount"] <= 100):
                raise BrokerError(400, "INVALID_COUNTER_PAYLOAD")
        elif operation == "fixture.http.post":
            if (set(payload) != {"value"} or not isinstance(payload["value"], str)
                    or not 1 <= len(payload["value"]) <= 256):
                raise BrokerError(400, "INVALID_HTTP_PAYLOAD")
        if not isinstance(approval, str) or len(approval) > 2500 or approval.count(".") != 1:
            raise BrokerError(403, "APPROVAL_REQUIRED")
        try:
            encoded, signature = approval.split(".")
            raw = unbase(encoded)
            claims = json.loads(raw)
            if (not isinstance(claims, dict) or
                    set(claims) != {"operation", "request_id", "payload_hash", "nonce", "expires"}):
                raise ValueError("claims")
            nonce, exp = claims["nonce"], claims["expires"]
            valid = (isinstance(nonce, str) and KEY_RE.fullmatch(nonce) is not None
                     and type(exp) is int and now <= exp <= now + 3600)
            valid = valid and claims["operation"] == operation and claims["request_id"] == request_id
            payload_hash = digest(operation, request_id, payload)
            valid = valid and hmac.compare_digest(str(claims["payload_hash"]), payload_hash)
            signature_ok = hmac.compare_digest(hmac.new(self.secret, raw, hashlib.sha256).digest(),
                                               unbase(signature))
            if not (valid and signature_ok):
                raise ValueError("mismatch")
            return payload_hash, nonce
        except (ValueError, KeyError, TypeError, UnicodeError, OverflowError):
            raise BrokerError(403, "APPROVAL_INVALID") from None

    def execute(self, operation: str, request_id: str, payload: dict, approval: str,
                *, now: int | None = None) -> dict:
        now = int(time.time()) if now is None else now
        payload_hash, nonce = self._verify(operation, request_id, payload, approval, now)
        with self._connect() as db:
            try:
                db.execute("BEGIN IMMEDIATE")
                row = db.execute(
                    "SELECT operation,payload_hash,nonce,state,result_json "
                    "FROM requests WHERE request_id=?", (request_id,)).fetchone()
                if row:
                    old_op, old_hash, old_nonce, state, result = row
                    if (old_op, old_hash, old_nonce) != (operation, payload_hash, nonce):
                        raise BrokerError(409, "REQUEST_ID_CONFLICT")
                    if state == "COMPLETED":
                        db.execute("COMMIT")
                        return {"state": "COMPLETED", "replay": True,
                                "result": json.loads(result)}
                    raise BrokerError(409, "OUTCOME_UNKNOWN_RECONCILE" if state == "UNKNOWN"
                                      else "REQUEST_IN_FLIGHT")
                try:
                    db.execute("INSERT INTO requests VALUES (?,?,?,?,?,?,?)",
                               (request_id, operation, payload_hash, nonce,
                                "IN_FLIGHT", None, now))
                except sqlite3.IntegrityError:
                    raise BrokerError(409, "APPROVAL_NONCE_REUSED") from None
                if operation == "fixture.db.increment":
                    # Transactionally commit intent, actual DB write and result.
                    db.execute("INSERT INTO counters(resource,value) VALUES ('fixture',0) "
                               "ON CONFLICT(resource) DO NOTHING")
                    db.execute("UPDATE counters SET value=value+? WHERE resource='fixture'",
                               (payload["amount"],))
                    value = db.execute("SELECT value FROM counters WHERE resource='fixture'").fetchone()[0]
                    result = {"counter": value}
                    db.execute("UPDATE requests SET state='COMPLETED',result_json=? "
                               "WHERE request_id=?", (canon(result).decode(), request_id))
                    db.execute("COMMIT")
                    return {"state": "COMPLETED", "replay": False, "result": result}
                db.execute("COMMIT")
            except Exception:
                if db.in_transaction:
                    db.execute("ROLLBACK")
                raise

        # The remote provider cannot participate in our transaction. Mark the
        # attempt before sending; uncertain results are NEVER retried automatically.
        result = self._send_http(payload, request_id)
        if result is None:
            with self._connect() as db:
                db.execute("UPDATE requests SET state='UNKNOWN' "
                           "WHERE request_id=? AND state='IN_FLIGHT'", (request_id,))
            raise BrokerError(409, "OUTCOME_UNKNOWN_RECONCILE")
        with self._connect() as db:
            db.execute("UPDATE requests SET state='COMPLETED',result_json=? "
                       "WHERE request_id=? AND state='IN_FLIGHT'",
                       (canon(result).decode(), request_id))
        return {"state": "COMPLETED", "replay": False, "result": result}

    def _send_http(self, payload: dict, request_id: str) -> dict | None:
        request = urllib.request.Request(
            self.destination, data=canon(payload),
            headers={"Content-Type": "application/json", "Idempotency-Key": request_id},
            method="POST")
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect)
        try:
            with opener.open(request, timeout=self.timeout) as response:
                raw = response.read(MAX_BODY + 1)
                if response.status != 200 or len(raw) > MAX_BODY:
                    return None
                return {"provider": json.loads(raw)}
        except (urllib.error.HTTPError, urllib.error.URLError,
                TimeoutError, OSError, ValueError):
            return None

    def get_counter(self) -> int:
        with self._connect() as db:
            row = db.execute("SELECT value FROM counters WHERE resource='fixture'").fetchone()
            return row[0] if row else 0

    def get_state(self, request_id: str) -> str | None:
        with self._connect() as db:
            row = db.execute("SELECT state FROM requests WHERE request_id=?",
                             (request_id,)).fetchone()
            return row[0] if row else None
