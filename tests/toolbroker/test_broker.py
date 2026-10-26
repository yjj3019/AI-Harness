"""Tool-level authorization, duplicate prevention and unknown-outcome fixtures."""
import base64
import concurrent.futures
import hashlib
import hmac
import json
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

from toolbroker import Broker, BrokerError, digest
from toolbroker.broker import canon
from toolbroker.server import serve

SECRET = bytes.fromhex("2d" * 32)  # deterministic test-only secret


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
            previous = self.writes.setdefault(key, value)
            if previous != value:
                self.send_error(409)
                return
            count = len(self.writes)
        if self.mode == "ack-lost":
            time.sleep(0.3)
        out = canon({"accepted": True, "count": count})
        try:
            self.send_response(200)
            self.send_header("Content-Length", str(len(out)))
            self.end_headers()
            self.wfile.write(out)
        except (BrokenPipeError, ConnectionResetError):
            pass


class BrokerTests(unittest.TestCase):
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
        server = serve(b)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = "http://127.0.0.1:" + str(server.server_address[1]) + "/v1/tools/execute"
            fields = {"operation": "fixture.db.increment", "request_id": "request_0001",
                      "payload": {"amount": 7}, "approval": ""}
            def req():
                return urllib.request.Request(url, data=canon(fields),
                    headers={"Content-Type": "application/json"}, method="POST")
            with self.assertRaises(urllib.error.HTTPError) as error:
                urllib.request.urlopen(req(), timeout=2)
            self.assertEqual(error.exception.code, 403)
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
        Provider.mode, Provider.writes = "normal", {}
        server = ThreadingHTTPServer(("127.0.0.1", 0), Provider)
        server.daemon_threads = True
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            target = "http://127.0.0.1:" + str(server.server_address[1]) + "/write"
            b = self.broker(["fixture.http.post"], url=target)
            first = self.send(b, op="fixture.http.post", payload={"value": "once"})
            again = self.send(b, op="fixture.http.post", payload={"value": "once"})
            self.assertFalse(first["replay"])
            self.assertTrue(again["replay"])
            self.assertEqual(Provider.writes, {"request_0001": "once"})
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_timeout_after_provider_write_is_unknown_and_never_auto_retried(self):
        Provider.mode, Provider.writes = "ack-lost", {}
        server = ThreadingHTTPServer(("127.0.0.1", 0), Provider)
        server.daemon_threads = True
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            target = "http://127.0.0.1:" + str(server.server_address[1]) + "/write"
            b = self.broker(["fixture.http.post"], url=target, timeout=0.05)
            with self.assertRaises(BrokerError) as error:
                self.send(b, op="fixture.http.post", payload={"value": "uncertain"})
            self.assertEqual(error.exception.code, "OUTCOME_UNKNOWN_RECONCILE")
            self.assertEqual(b.get_state("request_0001"), "UNKNOWN")
            with self.assertRaises(BrokerError):
                self.send(b, op="fixture.http.post", payload={"value": "uncertain"})
            self.assertEqual(Provider.writes, {"request_0001": "uncertain"})
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_no_arbitrary_destinations_or_user_urls(self):
        for url in ("https://example.com/write", "http://localhost:9001/write",
                    "http://127.0.0.1:9001/not-allowlisted"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                self.broker(["fixture.http.post"], url=url)


if __name__ == "__main__":
    unittest.main()
