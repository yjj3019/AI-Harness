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
import http.client
import io
import json
import math
import re
import sqlite3
import time
import urllib.parse
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any

MAX_BODY = 4096
MIN_PURGE_AGE = 7200  # twice the longest approval lifetime (3600 s)
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


def remaining_time(deadline: float) -> float:
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError("provider request deadline exceeded")
    return remaining


class ProviderReader(io.RawIOBase):
    """Own a socket file and reapply the remaining deadline before each read."""

    def __init__(self, sock, deadline):
        self.sock = sock
        self.raw = sock.makefile("rb", buffering=0)
        self.deadline = deadline

    def readable(self):
        return True

    def readinto(self, buffer):
        self.sock.settimeout(remaining_time(self.deadline))
        return self.raw.readinto(buffer)

    def close(self):
        try:
            self.raw.close()
        finally:
            super().close()


class Broker:
    def __init__(self, database: str | Path, secret: bytes, *,
                 allowed: set[str] | frozenset[str] = frozenset(),
                 http_destination: str | None = None, timeout: float = 1.0):
        if len(secret) < 32:
            raise ValueError("broker approval secret must be >=32 bytes")
        if not set(allowed).issubset(ACTIONS):
            raise ValueError("unknown privileged operation")
        if isinstance(timeout, bool) or not isinstance(timeout, (int, float)) or not math.isfinite(timeout) or not 0 < timeout <= 10:
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
                created_at INTEGER NOT NULL,
                reconciled_by TEXT
              );
              CREATE TABLE IF NOT EXISTS counters (
                resource TEXT PRIMARY KEY, value INTEGER NOT NULL
              );
            """)
            # A ledger created before reconcile() recorded its operator lacks the column: add it in place.
            # The column is nullable, existing rows are untouched and no CHECK or key changes.
            if "reconciled_by" not in {row[1] for row in db.execute("PRAGMA table_info(requests)")}:
                try:
                    db.execute("ALTER TABLE requests ADD COLUMN reconciled_by TEXT")
                except sqlite3.OperationalError as error:
                    if "duplicate column" not in str(error):  # another process added it first
                        raise

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
                    "SELECT operation,payload_hash,nonce,state,result_json,reconciled_by "
                    "FROM requests WHERE request_id=?", (request_id,)).fetchone()
                if row:
                    old_op, old_hash, old_nonce, state, result, reconciled_by = row
                    # Constant-time comparison: hashes and nonces are approval material.
                    same = (hmac.compare_digest(old_op.encode(), operation.encode())
                            & hmac.compare_digest(old_hash.encode(), payload_hash.encode())
                            & hmac.compare_digest(old_nonce.encode(), nonce.encode()))
                    if not same:
                        raise BrokerError(409, "REQUEST_ID_CONFLICT")
                    if state == "COMPLETED":
                        db.execute("COMMIT")
                        replayed = {"state": "COMPLETED", "replay": True,
                                    "result": json.loads(result)}
                        if reconciled_by is not None:  # an operator-supplied result, not a provider reply
                            replayed["reconciled_by"] = reconciled_by
                        return replayed
                    raise BrokerError(409, "OUTCOME_UNKNOWN_RECONCILE" if state == "UNKNOWN"
                                      else "REQUEST_IN_FLIGHT")
                try:
                    db.execute("INSERT INTO requests (request_id,operation,payload_hash,nonce,state,result_json,created_at) "
                               "VALUES (?,?,?,?,?,?,?)",
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
        try:
            result = self._send_http(payload, request_id)
            # Serialization is part of accepting the response, not a later DB step.
            # A malformed/non-finite result cannot strand a sent request IN_FLIGHT.
            result_json = canon(result).decode() if result is not None else None
        except Exception:
            # Any adapter or response-serialization failure after intent is
            # committed may follow a send. Do not catch process interrupts.
            result = None
        if result is None:
            with self._connect() as db:
                moved = db.execute("UPDATE requests SET state='UNKNOWN' "
                                   "WHERE request_id=? AND state='IN_FLIGHT'", (request_id,)).rowcount
            if moved != 1:
                reconciled = self._reconciled_result(request_id)
                if reconciled is not None:
                    return reconciled
            raise BrokerError(409, "OUTCOME_UNKNOWN_RECONCILE")
        with self._connect() as db:
            done = db.execute("UPDATE requests SET state='COMPLETED',result_json=? "
                              "WHERE request_id=? AND state='IN_FLIGHT'",
                              (result_json, request_id)).rowcount
        if done != 1:
            # An operator reconciled this request while it was being sent. The ledger keeps the
            # operator's result, so the caller must see that one, not a different provider reply.
            reconciled = self._reconciled_result(request_id)
            if reconciled is not None:
                return reconciled
            # The row is neither IN_FLIGHT nor COMPLETED with a result (not reachable through this class
            # today). The provider reply was not persisted, so it must not be reported as the outcome.
            raise BrokerError(409, "OUTCOME_UNKNOWN_RECONCILE")
        return {"state": "COMPLETED", "replay": False, "result": result}

    def _reconciled_result(self, request_id: str) -> dict | None:
        """The ledger's COMPLETED outcome of a request, in the shape of a replay, or None."""
        with self._connect() as db:
            row = db.execute("SELECT state,result_json,reconciled_by FROM requests WHERE request_id=?",
                             (request_id,)).fetchone()
        if not row or row[0] != "COMPLETED" or row[1] is None:
            return None
        outcome = {"state": "COMPLETED", "replay": True, "result": json.loads(row[1])}
        if row[2] is not None:
            outcome["reconciled_by"] = row[2]
        return outcome

    def _send_http(self, payload: dict, request_id: str) -> dict | None:
        url = urllib.parse.urlsplit(self.destination)
        deadline = time.monotonic() + self.timeout
        connection = http.client.HTTPConnection(url.hostname, url.port, timeout=self.timeout)

        def response_with_deadline(sock, **kwargs):
            response = http.client.HTTPResponse(sock, **kwargs)
            try:
                response.fp.close()
                response.fp = io.BufferedReader(ProviderReader(sock, deadline))
            except BaseException:
                response.close()
                raise
            return response

        connection.response_class = response_with_deadline
        try:
            connection.timeout = remaining_time(deadline)
            connection.connect()
            connection.sock.settimeout(remaining_time(deadline))
            connection.request("POST", url.path, body=canon(payload),
                               headers={"Content-Type": "application/json", "Idempotency-Key": request_id})
            with connection.getresponse() as response:
                if response.status != 200:
                    return None
                # A bounded read does not itself reject premature EOF for a fixed
                # Content-Length. Preserve the declaration before read mutates it.
                declared_length = response.length
                if declared_length is not None and declared_length > MAX_BODY:
                    raise ValueError("provider response exceeds body limit")
                raw = response.read(MAX_BODY + 1)
                if declared_length is not None and len(raw) != declared_length:
                    raise ValueError("incomplete fixed-length provider response")
                if len(raw) > MAX_BODY:
                    return None
                def reject_nonfinite(value):
                    raise ValueError("non-finite provider JSON constant: " + value)
                result = {"provider": json.loads(raw, parse_constant=reject_nonfinite)}
                # Also reject finite-looking numbers that overflow during parsing
                # (e.g. 1e400), and any other value not safely persistable as JSON.
                canon(result)
                remaining_time(deadline)
                return result
        except (http.client.HTTPException, TimeoutError, OSError,
                ValueError, TypeError, OverflowError, RecursionError):
            return None
        finally:
            connection.close()

    def get_counter(self) -> int:
        with self._connect() as db:
            row = db.execute("SELECT value FROM counters WHERE resource='fixture'").fetchone()
            return row[0] if row else 0

    def get_state(self, request_id: str) -> str | None:
        with self._connect() as db:
            row = db.execute("SELECT state FROM requests WHERE request_id=?",
                             (request_id,)).fetchone()
            return row[0] if row else None

    # Operator-only maintenance. Neither method is reachable through the HTTP server
    # and neither resends anything: they only change what the ledger records.
    def reconcile(self, request_id: str, result: dict, *, operator: str) -> dict:
        """Confirm a stranded IN_FLIGHT or UNKNOWN request as COMPLETED.

        The operator must first obtain the real outcome from the provider. A request
        whose outcome is not confirmed stays as it is; it is never retried here. To run
        the action again, issue a new request_id with a new approval."""
        if not isinstance(request_id, str) or not KEY_RE.fullmatch(request_id):
            raise BrokerError(400, "INVALID_REQUEST_ID")
        if not isinstance(operator, str) or not operator.strip() or len(operator) > 128:
            raise BrokerError(400, "OPERATOR_REQUIRED")
        if not isinstance(result, dict):
            raise BrokerError(400, "INVALID_RESULT")
        try:
            result_json = canon(result).decode()
        except (TypeError, ValueError, OverflowError):
            raise BrokerError(400, "INVALID_RESULT") from None
        if len(result_json.encode("utf-8")) > MAX_BODY:  # bytes, like the payload limit in _verify
            raise BrokerError(400, "INVALID_RESULT")
        with self._connect() as db:
            cursor = db.execute(
                "UPDATE requests SET state='COMPLETED',result_json=?,reconciled_by=? "
                "WHERE request_id=? AND state IN ('IN_FLIGHT','UNKNOWN')",
                (result_json, operator.strip(), request_id))
            if cursor.rowcount != 1:
                raise BrokerError(409, "NOTHING_TO_RECONCILE")
        return {"state": "COMPLETED", "replay": False, "result": result, "reconciled_by": operator.strip()}

    def purge_completed(self, older_than_seconds: int, *, now: int | None = None) -> int:
        """Delete COMPLETED rows older than the cutoff and return how many were removed.

        IN_FLIGHT and UNKNOWN rows are never purged. The cutoff must exceed the longest
        approval lifetime (3600 s) with a margin, so a purged row's nonce is expired."""
        if (isinstance(older_than_seconds, bool) or not isinstance(older_than_seconds, int)
                or older_than_seconds < MIN_PURGE_AGE):
            raise BrokerError(400, "PURGE_AGE_TOO_SHORT")
        now = int(time.time()) if now is None else now
        with self._connect() as db:
            return db.execute("DELETE FROM requests WHERE state='COMPLETED' AND created_at<=?",
                              (now - older_than_seconds,)).rowcount
