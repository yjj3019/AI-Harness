"""Tool-level authorization, duplicate prevention and unknown-outcome fixtures."""
import base64
import concurrent.futures
import contextlib
import hashlib
import hmac
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import Mock, patch

from toolbroker import Broker, BrokerError, digest
from toolbroker.broker import ProviderReader, canon
from toolbroker.server import serve

SECRET = bytes.fromhex("2d" * 32)  # deterministic test-only secret
TOKEN = "stub"


def b64(data):
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def approval(op, rid, payload, *, nonce=None, expiry=None):
    claims = {"operation": op, "request_id": rid,
              "payload_hash": digest(op, rid, payload),
              "nonce": nonce or ("nonce_" + rid),
              "expires": int(time.time()) + 300 if expiry is None else expiry}
    content = canon(claims)
    return b64(content) + "." + b64(hmac.new(SECRET, content, hashlib.sha256).digest())


class Provider(BaseHTTPRequestHandler):
    writes = {}
    calls = 0
    mode = "normal"
    lock = threading.Lock()

    def log_message(self, *args):
        pass

    def do_POST(self):
        if self.path != "/write":
            self.send_error(404)
            return
        key = self.headers.get("Idempotency-Key")
        value = json.loads(self.rfile.read(int(self.headers["Content-Length"])))["value"]
        with self.lock:
            type(self).calls += 1
            previous = self.writes.setdefault(key, value)
            if previous != value:
                self.send_error(409)
                return
            count = len(self.writes)
        if self.mode == "ack-lost":
            time.sleep(0.3)
        out = canon({"accepted": True, "count": count})
        if self.mode in ("NaN", "Infinity", "-Infinity", "1e400"):
            out = ('{"accepted":' + self.mode + '}').encode()
        try:
            self.send_response(200)
            if self.mode == "truncated-chunk":
                self.send_header("Transfer-Encoding", "chunked")
                self.end_headers()
                # Advertise a longer chunk than actually sent and omit terminator.
                self.wfile.write(b"20\r\n{\"accepted\":true}")
                self.wfile.flush()
                self.close_connection = True
                return
            if self.mode == "truncated-length":
                self.send_header("Content-Length", "200")
                self.end_headers()
                # Valid JSON is not sufficient proof of a complete HTTP response.
                self.wfile.write(b'{"accepted":true}')
                self.wfile.flush()
                self.close_connection = True
                return
            self.send_header("Content-Length", str(len(out)))
            self.end_headers()
            self.wfile.write(out)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass


class BrokerTests(unittest.TestCase):
    def test_provider_reader_shares_one_deadline_across_reads(self):
        sock = Mock()
        raw = sock.makefile.return_value
        raw.readinto.return_value = 1
        with ProviderReader(sock, 5.0) as reader, patch(
            "toolbroker.broker.time.monotonic", side_effect=[1.0, 4.0, 5.0]
        ):
            self.assertEqual(reader.readinto(bytearray(1)), 1)
            sock.settimeout.assert_called_with(4.0)
            self.assertEqual(reader.readinto(bytearray(1)), 1)
            sock.settimeout.assert_called_with(1.0)
            with self.assertRaises(TimeoutError):
                reader.readinto(bytearray(1))
        self.assertEqual(raw.readinto.call_count, 2)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = Path(self.tmp.name) / "broker.sqlite"

    def tearDown(self):
        self.tmp.cleanup()

    def broker(self, allow=None, url=None, timeout=1):
        return Broker(self.db, SECRET, allowed=set(allow or []),
                      http_destination=url, timeout=timeout)

    def send(self, broker, op="fixture.db.increment", rid="request_0001",
             payload=None, token=None):
        if payload is None:
            payload = {"amount": 1}
        if token is None:
            token = approval(op, rid, payload)
        return broker.execute(op, rid, payload, token)

    def test_default_deny_even_with_valid_approval(self):
        b = self.broker()
        with self.assertRaises(BrokerError) as error:
            self.send(b)
        self.assertEqual(error.exception.code, "OPERATION_DENIED")
        self.assertEqual(b.get_counter(), 0)

    def test_approval_is_required_and_bound_to_exact_operation(self):
        b = self.broker(["fixture.db.increment"])
        for token in ("", approval("fixture.http.post", "request_0001", {"value": "x"})):
            with self.assertRaises(BrokerError):
                self.send(b, token=token)
        self.assertEqual(b.get_counter(), 0)

    def test_tampered_or_expired_approval_cannot_write(self):
        b = self.broker(["fixture.db.increment"])
        token = approval("fixture.db.increment", "request_0001", {"amount": 1})
        with self.assertRaises(BrokerError):
            self.send(b, payload={"amount": 2}, token=token)
        expired = approval("fixture.db.increment", "request_0001",
                           {"amount": 1}, expiry=int(time.time()) - 3)
        with self.assertRaises(BrokerError):
            self.send(b, token=expired)
        self.assertEqual(b.get_counter(), 0)

    def test_replay_returns_original_db_result_without_second_write(self):
        b = self.broker(["fixture.db.increment"])
        first = self.send(b, payload={"amount": 7})
        second = self.send(b, payload={"amount": 7})
        self.assertFalse(first["replay"])
        self.assertTrue(second["replay"])
        self.assertEqual(b.get_counter(), 7)

    def test_64_concurrent_calls_apply_exactly_one_local_db_write(self):
        b = self.broker(["fixture.db.increment"])
        with concurrent.futures.ThreadPoolExecutor(max_workers=16) as ex:
            answers = list(ex.map(lambda _: self.send(b, payload={"amount": 3}), range(64)))
        self.assertEqual(sum(not item["replay"] for item in answers), 1)
        self.assertEqual(b.get_counter(), 3)

    def test_request_id_collision_is_conflict(self):
        b = self.broker(["fixture.db.increment"])
        self.send(b)
        with self.assertRaises(BrokerError) as error:
            self.send(b, payload={"amount": 2})
        self.assertEqual(error.exception.code, "REQUEST_ID_CONFLICT")
        self.assertEqual(b.get_counter(), 1)

    def test_approval_nonce_cannot_authorize_another_request(self):
        b = self.broker(["fixture.db.increment"])
        self.send(b)
        other = approval("fixture.db.increment", "request_0002", {"amount": 1},
                         nonce="nonce_request_0001")
        with self.assertRaises(BrokerError) as error:
            self.send(b, rid="request_0002", token=other)
        self.assertEqual(error.exception.code, "APPROVAL_NONCE_REUSED")
        self.assertEqual(b.get_counter(), 1)

    def test_invalid_payload_never_writes(self):
        b = self.broker(["fixture.db.increment"])
        for number, bad in enumerate((0, -1, True, "1", 101, None)):
            payload = {"amount": bad}
            with self.subTest(payload=bad), self.assertRaises(BrokerError):
                self.send(b, rid="invalid_" + str(1000 + number), payload=payload)
        self.assertEqual(b.get_counter(), 0)

    def test_db_rollback_preserves_at_most_once_claim(self):
        b = self.broker(["fixture.db.increment"])
        con = sqlite3.connect(self.db)
        try:
            con.execute("BEGIN IMMEDIATE")
            con.execute("INSERT INTO counters VALUES ('fixture',123)")
            con.rollback()
        finally:
            con.close()
        self.assertEqual(b.get_counter(), 0)

    def test_broker_counter_update_fault_rolls_back_and_retry_applies_once(self):
        b = self.broker(["fixture.db.increment"])
        payload = {"amount": 7}
        token = approval("fixture.db.increment", "request_0001", payload)
        original_connect = sqlite3.connect
        observed = []

        class FaultAfterCounterUpdate(sqlite3.Connection):
            def execute(self, sql, parameters=()):
                cursor = super().execute(sql, parameters)
                if sql.startswith("UPDATE counters SET value=value+"):
                    observed.append((self.in_transaction,
                                     super().execute("SELECT value FROM counters WHERE resource='fixture'").fetchone()[0],
                                     super().execute("SELECT state FROM requests WHERE request_id=?",
                                                     ("request_0001",)).fetchone()[0]))
                    raise sqlite3.OperationalError("injected after counter update")
                return cursor

        def faulting_connect(*args, **kwargs):
            return original_connect(*args, factory=FaultAfterCounterUpdate, **kwargs)

        with patch("toolbroker.broker.sqlite3.connect", side_effect=faulting_connect):
            with self.assertRaisesRegex(sqlite3.OperationalError, "injected after counter update"):
                self.send(b, payload=payload, token=token)
        self.assertEqual(observed, [(True, 7, "IN_FLIGHT")])
        reopened = self.broker(["fixture.db.increment"])
        self.assertEqual(reopened.get_counter(), 0)
        self.assertIsNone(reopened.get_state("request_0001"))
        db = sqlite3.connect(self.db)
        try:
            self.assertIsNone(db.execute("SELECT value FROM counters WHERE resource='fixture'").fetchone())
        finally:
            db.close()
        first = self.send(reopened, payload=payload, token=token)
        replay = self.send(reopened, payload=payload, token=token)
        self.assertFalse(first["replay"])
        self.assertTrue(replay["replay"])
        self.assertEqual(first["result"], {"counter": 7})
        self.assertEqual(replay["result"], first["result"])
        self.assertEqual(reopened.get_counter(), 7)
        self.assertEqual(reopened.get_state("request_0001"), "COMPLETED")

    def test_actual_worker_termination_rolls_back_partial_transaction(self):
        b = self.broker(["fixture.db.increment"])
        marker = Path(self.tmp.name) / "transaction-open"
        worker = (
            "import sqlite3,sys,time,pathlib;"
            "c=sqlite3.connect(sys.argv[1]);"
            "c.execute('BEGIN IMMEDIATE');"
            'c.execute("INSERT INTO counters VALUES (?,?)",("fixture",123));'
            "pathlib.Path(sys.argv[2]).write_text('open');"
            "time.sleep(30)"
        )
        process = subprocess.Popen([sys.executable, "-c", worker, str(self.db), str(marker)],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            limit = time.time() + 5
            while not marker.exists() and time.time() < limit and process.poll() is None:
                time.sleep(0.02)
            self.assertTrue(marker.exists(), "Worker failed to enter SQLite transaction")
            process.kill()
            process.wait(timeout=5)
            self.assertEqual(b.get_counter(), 0)
            self.assertEqual(self.send(b)["result"]["counter"], 1)
        finally:
            if process.poll() is None:
                process.kill()
                process.wait(timeout=5)

    def test_actual_broker_http_server_denies_unapproved_write(self):
        b = self.broker(["fixture.db.increment"])
        with patch.dict(os.environ, {"TOOLBROKER_TOKEN": TOKEN}):
            server = serve(b)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            try:
                url = "http://127.0.0.1:" + str(server.server_address[1]) + "/v1/tools/execute"
                fields = {"operation": "fixture.db.increment", "request_id": "request_0001",
                          "payload": {"amount": 7}, "approval": ""}
                def req():
                    return urllib.request.Request(url, data=canon(fields),
                        headers={"Content-Type": "application/json", "X-Toolbroker-Token": TOKEN}, method="POST")
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(req(), timeout=2)
                try:
                    self.assertEqual(error.exception.code, 403)
                finally:
                    error.exception.close()
                self.assertEqual(b.get_counter(), 0)
                fields["approval"] = approval(fields["operation"], fields["request_id"], fields["payload"])
                with urllib.request.urlopen(req(), timeout=2) as result:
                    self.assertEqual(json.loads(result.read())["result"]["counter"], 7)
                self.assertEqual(b.get_counter(), 7)
            finally:
                server.shutdown()
                server.server_close()
                thread.join(timeout=2)

    def test_fixed_loopback_http_post_is_replayed_locally_not_sent_twice(self):
        Provider.mode, Provider.writes, Provider.calls = "normal", {}, 0
        server = ThreadingHTTPServer(("127.0.0.1", 0), Provider)
        server.daemon_threads = True
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            target = "http://127.0.0.1:" + str(server.server_address[1]) + "/write"
            b = self.broker(["fixture.http.post"], url=target)
            first = self.send(b, op="fixture.http.post", payload={"value": "once"})
            with patch.object(b, "_send_http", wraps=b._send_http) as resend:
                again = self.send(b, op="fixture.http.post", payload={"value": "once"})
                resend.assert_not_called()
            self.assertFalse(first["replay"])
            self.assertTrue(again["replay"])
            self.assertEqual(first["result"], again["result"])
            self.assertEqual(Provider.calls, 1)
            self.assertEqual(Provider.writes, {"request_0001": "once"})
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_timeout_after_provider_write_is_unknown_and_never_auto_retried(self):
        import http.client
        import socket

        applied = threading.Event()
        release = threading.Event()
        finished = threading.Event()
        timed_out = threading.Event()

        class HeldResponseProvider(Provider):
            mode, writes, calls = "normal", {}, 0

            def send_response(self, *args, **kwargs):
                # Provider.do_POST has already recorded the write at this point.
                applied.set()
                if not release.wait(5):
                    return
                super().send_response(*args, **kwargs)

            def do_POST(self):
                try:
                    super().do_POST()
                finally:
                    finished.set()

        # unittest runs these fixtures sequentially; this temporary class patch is
        # process-wide and must not overlap other HTTP tests in the same process.
        original_getresponse = http.client.HTTPConnection.getresponse

        def observe_getresponse(connection, *args, **kwargs):
            if not applied.wait(5):
                raise AssertionError("provider did not apply write")
            try:
                return original_getresponse(connection, *args, **kwargs)
            except socket.timeout:
                timed_out.set()
                raise

        server = ThreadingHTTPServer(("127.0.0.1", 0), HeldResponseProvider)
        server.daemon_threads = True
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            target = "http://127.0.0.1:" + str(server.server_address[1]) + "/write"
            b = self.broker(["fixture.http.post"], url=target, timeout=0.2)
            payload = {"value": "uncertain"}
            token = approval("fixture.http.post", "request_0001", payload)
            with patch.object(http.client.HTTPConnection, "getresponse", observe_getresponse):
                with self.assertRaises(BrokerError) as error:
                    self.send(b, op="fixture.http.post", payload=payload, token=token)
            self.assertTrue(applied.is_set())
            self.assertTrue(timed_out.is_set(), "expected a real socket response timeout")
            self.assertEqual(error.exception.code, "OUTCOME_UNKNOWN_RECONCILE")
            self.assertEqual(b.get_state("request_0001"), "UNKNOWN")
            reopened = self.broker(["fixture.http.post"], url=target)
            self.assertEqual(reopened.get_state("request_0001"), "UNKNOWN")
            with patch.object(reopened, "_send_http", wraps=reopened._send_http) as resend:
                with self.assertRaises(BrokerError) as retry:
                    self.send(reopened, op="fixture.http.post", payload=payload, token=token)
                resend.assert_not_called()
            self.assertEqual(retry.exception.code, "OUTCOME_UNKNOWN_RECONCILE")
            self.assertEqual(HeldResponseProvider.calls, 1)
            self.assertEqual(HeldResponseProvider.writes, {"request_0001": "uncertain"})
        finally:
            release.set()
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
            if applied.is_set():
                self.assertTrue(finished.wait(2), "provider handler did not finish")

    def test_uncertain_provider_responses_are_durable_unknown_without_resend(self):
        for mode in ("truncated-chunk", "truncated-length", "NaN", "Infinity", "-Infinity", "1e400"):
            with self.subTest(mode=mode):
                Provider.mode, Provider.writes, Provider.calls = mode, {}, 0
                server = ThreadingHTTPServer(("127.0.0.1", 0), Provider)
                server.daemon_threads = True
                thread = threading.Thread(target=server.serve_forever, daemon=True)
                thread.start()
                try:
                    target = "http://127.0.0.1:" + str(server.server_address[1]) + "/write"
                    b = self.broker(["fixture.http.post"], url=target)
                    rid = "uncertain_" + str(len(mode)) + "_" + mode.replace("-", "_")
                    payload = {"value": "provider already applied this"}
                    token = approval("fixture.http.post", rid, payload)
                    with self.assertRaises(BrokerError) as error:
                        self.send(b, op="fixture.http.post", rid=rid,
                                  payload=payload, token=token)
                    self.assertEqual(error.exception.status, 409)
                    self.assertEqual(error.exception.code, "OUTCOME_UNKNOWN_RECONCILE")
                    self.assertEqual(b.get_state(rid), "UNKNOWN")
                    # A fresh broker proves UNKNOWN was persisted rather than held
                    # only in memory. A retry must not contact the provider again.
                    reopened = self.broker(["fixture.http.post"], url=target)
                    self.assertEqual(reopened.get_state(rid), "UNKNOWN")
                    with self.assertRaises(BrokerError) as retry:
                        self.send(reopened, op="fixture.http.post", rid=rid,
                                  payload=payload, token=token)
                    self.assertEqual(retry.exception.code, "OUTCOME_UNKNOWN_RECONCILE")
                    self.assertEqual(Provider.calls, 1)
                    self.assertEqual(Provider.writes, {rid: payload["value"]})
                finally:
                    server.shutdown()
                    server.server_close()
                    thread.join(timeout=2)

    def test_unpersistable_adapter_result_is_unknown_before_result_update(self):
        b = self.broker(["fixture.http.post"], url="http://127.0.0.1:9001/write")
        payload = {"value": "once"}
        token = approval("fixture.http.post", "request_0001", payload)
        with patch.object(b, "_send_http", return_value={"provider": float("nan")}) as send:
            for _ in range(2):
                with self.assertRaises(BrokerError) as error:
                    self.send(b, op="fixture.http.post", payload=payload, token=token)
                self.assertEqual(error.exception.code, "OUTCOME_UNKNOWN_RECONCILE")
                self.assertEqual(b.get_state("request_0001"), "UNKNOWN")
            send.assert_called_once()

    def test_unexpected_adapter_exception_is_durable_unknown_without_resend(self):
        url = "http://127.0.0.1:9001/write"
        b = self.broker(["fixture.http.post"], url=url)
        payload = {"value": "once"}
        token = approval("fixture.http.post", "request_0001", payload)
        with patch.object(Broker, "_send_http", side_effect=RuntimeError("adapter failed")) as send:
            with self.assertRaises(BrokerError) as error:
                self.send(b, op="fixture.http.post", payload=payload, token=token)
            self.assertEqual((error.exception.status, error.exception.code),
                             (409, "OUTCOME_UNKNOWN_RECONCILE"))
            reopened = self.broker(["fixture.http.post"], url=url)
            self.assertEqual(reopened.get_state("request_0001"), "UNKNOWN")
            with self.assertRaises(BrokerError) as retry:
                self.send(reopened, op="fixture.http.post", payload=payload, token=token)
            self.assertEqual(retry.exception.code, "OUTCOME_UNKNOWN_RECONCILE")
            send.assert_called_once_with(payload, "request_0001")

    def test_adapter_process_interrupts_are_not_swallowed(self):
        for interrupt in (KeyboardInterrupt, SystemExit):
            with self.subTest(interrupt=interrupt):
                rid = "interrupt_" + interrupt.__name__
                b = self.broker(["fixture.http.post"], url="http://127.0.0.1:9001/write")
                payload = {"value": "once"}
                token = approval("fixture.http.post", rid, payload)
                with patch.object(Broker, "_send_http", side_effect=interrupt) as send:
                    with self.assertRaises(interrupt):
                        self.send(b, op="fixture.http.post", rid=rid, payload=payload, token=token)
                    reopened = self.broker(["fixture.http.post"], url="http://127.0.0.1:9001/write")
                    self.assertEqual(reopened.get_state(rid), "IN_FLIGHT")
                    with self.assertRaises(BrokerError) as retry:
                        self.send(reopened, op="fixture.http.post", rid=rid, payload=payload, token=token)
                    self.assertEqual(retry.exception.code, "REQUEST_IN_FLIGHT")
                    send.assert_called_once_with(payload, rid)

    def strand(self, b, state, rid="request_0001", created=None):
        """Insert a ledger row as a crash after the intent commit would leave it."""
        payload = {"value": "x"}
        with contextlib.closing(sqlite3.connect(b.database, isolation_level=None)) as db:
            db.execute("INSERT INTO requests (request_id,operation,payload_hash,nonce,state,result_json,created_at) "
                       "VALUES (?,?,?,?,?,?,?)",
                       (rid, "fixture.http.post", digest("fixture.http.post", rid, payload),
                        "nonce_" + rid, state, None,
                        int(time.time()) if created is None else created))
        return payload

    def test_stranded_in_flight_is_reconciled_only_by_operator_without_resend(self):
        b = self.broker(["fixture.http.post"], url="http://127.0.0.1:9/write")
        payload = self.strand(b, "IN_FLIGHT")
        with patch.object(b, "_send_http") as send:
            with self.assertRaises(BrokerError) as blocked:
                self.send(b, op="fixture.http.post", payload=payload)
            self.assertEqual(blocked.exception.code, "REQUEST_IN_FLIGHT")
            done = b.reconcile("request_0001", {"ok": True}, operator="ops-1")
            again = self.send(b, op="fixture.http.post", payload=payload)
            send.assert_not_called()
        self.assertEqual(done["state"], "COMPLETED")
        self.assertTrue(again["replay"])
        self.assertEqual(again["result"], {"ok": True})
        self.assertEqual(b.get_state("request_0001"), "COMPLETED")

    def test_reconcile_rejects_unknown_completed_and_malformed_input(self):
        b = self.broker(["fixture.http.post"], url="http://127.0.0.1:9/write")
        self.strand(b, "COMPLETED", rid="request_0002")
        for rid, result, operator, code in (
                ("request_0404", {"ok": 1}, "ops", "NOTHING_TO_RECONCILE"),
                ("request_0002", {"ok": 1}, "ops", "NOTHING_TO_RECONCILE"),
                ("bad id", {"ok": 1}, "ops", "INVALID_REQUEST_ID"),
                ("request_0404", ["no"], "ops", "INVALID_RESULT"),
                ("request_0404", {"ok": float("nan")}, "ops", "INVALID_RESULT"),
                ("request_0404", {"ok": 1}, " ", "OPERATOR_REQUIRED")):
            with self.subTest(rid=rid, code=code), self.assertRaises(BrokerError) as error:
                b.reconcile(rid, result, operator=operator)
            self.assertEqual(error.exception.code, code)

    def test_reconcile_records_the_operator_and_marks_the_replay(self):
        b = self.broker(["fixture.http.post", "fixture.db.increment"], url="http://127.0.0.1:9/write")
        payload = self.strand(b, "IN_FLIGHT")
        done = b.reconcile("request_0001", {"ok": True}, operator="  ops-1  ")
        self.assertEqual(done["reconciled_by"], "ops-1")
        with contextlib.closing(sqlite3.connect(b.database, isolation_level=None)) as db:
            stored = db.execute("SELECT reconciled_by FROM requests WHERE request_id='request_0001'").fetchone()
        self.assertEqual(stored, ("ops-1",))
        with patch.object(b, "_send_http") as send:
            again = self.send(b, op="fixture.http.post", payload=payload)
            send.assert_not_called()
        self.assertEqual(again["reconciled_by"], "ops-1")
        # An ordinary completion carries no operator marker.
        self.send(b, op="fixture.db.increment", rid="request_0003")
        plain = self.send(b, op="fixture.db.increment", rid="request_0003")
        self.assertTrue(plain["replay"])
        self.assertNotIn("reconciled_by", plain)

    def test_reconcile_during_a_send_wins_and_the_caller_sees_the_ledger_result(self):
        b = self.broker(["fixture.http.post"], url="http://127.0.0.1:9/write")
        payload = {"value": "x"}

        def send_then_reconcile(body, request_id):
            b.reconcile(request_id, {"ok": "operator"}, operator="ops-2")
            return {"ok": "provider"}

        with patch.object(b, "_send_http", side_effect=send_then_reconcile):
            outcome = self.send(b, op="fixture.http.post", payload=payload)
        self.assertEqual(outcome["result"], {"ok": "operator"})
        self.assertEqual(outcome["reconciled_by"], "ops-2")
        self.assertEqual(b.get_state("request_0001"), "COMPLETED")
        with patch.object(b, "_send_http") as send:
            again = self.send(b, op="fixture.http.post", payload=payload)
            send.assert_not_called()
        self.assertEqual(again["result"], {"ok": "operator"})

    def test_a_ledger_created_before_the_operator_column_is_migrated_in_place(self):
        old_schema = """
          CREATE TABLE requests (
            request_id TEXT PRIMARY KEY,
            operation TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            nonce TEXT NOT NULL UNIQUE,
            state TEXT NOT NULL CHECK(state IN ('IN_FLIGHT','UNKNOWN','COMPLETED')),
            result_json TEXT,
            created_at INTEGER NOT NULL
          );
          CREATE TABLE counters (resource TEXT PRIMARY KEY, value INTEGER NOT NULL);
        """
        payload = {"value": "x"}
        with contextlib.closing(sqlite3.connect(self.db, isolation_level=None)) as db:
            db.executescript(old_schema)
            db.execute("INSERT INTO requests VALUES (?,?,?,?,?,?,?)",
                       ("request_0001", "fixture.http.post", digest("fixture.http.post", "request_0001", payload),
                        "nonce_request_0001", "COMPLETED", json.dumps({"ok": True}), int(time.time())))
        for _ in range(2):  # opening twice must be idempotent
            b = self.broker(["fixture.http.post"], url="http://127.0.0.1:9/write")
            with contextlib.closing(sqlite3.connect(b.database, isolation_level=None)) as db:
                columns = [row[1] for row in db.execute("PRAGMA table_info(requests)")]
            self.assertEqual(columns.count("reconciled_by"), 1)
        with patch.object(b, "_send_http") as send:
            again = self.send(b, op="fixture.http.post", payload=payload)
            send.assert_not_called()
        self.assertTrue(again["replay"])
        self.assertEqual(again["result"], {"ok": True})
        self.assertNotIn("reconciled_by", again)
        self.strand(b, "IN_FLIGHT", rid="request_0002")
        self.assertEqual(b.reconcile("request_0002", {"ok": 2}, operator="ops")["state"], "COMPLETED")

    def test_purge_removes_only_old_completed_rows(self):
        b = self.broker(["fixture.http.post"], url="http://127.0.0.1:9/write")
        old = int(time.time()) - 100000
        self.strand(b, "COMPLETED", rid="request_old1", created=old)
        self.strand(b, "COMPLETED", rid="request_new1")
        self.strand(b, "IN_FLIGHT", rid="request_old2", created=old)
        self.strand(b, "UNKNOWN", rid="request_old3", created=old)
        self.assertEqual(b.purge_completed(7200), 1)
        self.assertIsNone(b.get_state("request_old1"))
        self.assertEqual(b.get_state("request_new1"), "COMPLETED")
        self.assertEqual(b.get_state("request_old2"), "IN_FLIGHT")
        self.assertEqual(b.get_state("request_old3"), "UNKNOWN")
        for bad in (0, 3599, 7199, True, -5, 7200.5, "7200"):
            with self.subTest(bad=bad), self.assertRaises(BrokerError) as error:
                b.purge_completed(bad)
            self.assertEqual(error.exception.code, "PURGE_AGE_TOO_SHORT")

    def test_ledger_comparison_uses_constant_time_digest(self):
        b = self.broker(["fixture.db.increment"])
        self.send(b)
        with patch("toolbroker.broker.hmac.compare_digest", wraps=hmac.compare_digest) as cmp:
            self.send(b)
        self.assertEqual(cmp.call_count, 5)  # two approval checks plus three ledger fields

    def test_no_arbitrary_destinations_or_user_urls(self):
        for url in ("https://example.com/write", "http://localhost:9001/write",
                    "http://127.0.0.1:9001/not-allowlisted"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                self.broker(["fixture.http.post"], url=url)


if __name__ == "__main__":
    unittest.main()
