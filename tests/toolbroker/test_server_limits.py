"""Loopback-only HTTP resource-limit regressions; no production-safety assertion."""
import http.client
import socket
import threading
import time
import unittest
from contextlib import contextmanager

from toolbroker.server import serve


class NeverBroker:
    def __init__(self):
        self.calls = 0

    def execute(self, *args):
        self.calls += 1
        raise AssertionError("partial requests must not reach the broker")


@contextmanager
def running_server(**limits):
    broker = NeverBroker()
    server = serve(broker, **limits)
    thread = threading.Thread(target=server.serve_forever,
                              kwargs={"poll_interval": 0.01}, daemon=True)
    thread.start()
    try:
        yield server, broker
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


def connect(server):
    return socket.create_connection(server.server_address, timeout=2)


def receive_all(sock):
    data = b""
    while True:
        part = sock.recv(4096)
        if not part:
            return data
        data += part


def partial_body(sock):
    sock.sendall(b"POST /v1/tools/execute HTTP/1.1\r\nHost: localhost\r\n"
                 b"Content-Type: application/json\r\nContent-Length: 100\r\n\r\n{")


def health(server):
    conn = http.client.HTTPConnection(*server.server_address, timeout=2)
    try:
        conn.request("GET", "/health")
        response = conn.getresponse()
        body = response.read()
        return response.status, body
    finally:
        conn.close()


class ServerLimitTests(unittest.TestCase):
    def test_partial_body_times_out_closes_and_never_executes(self):
        with running_server(read_timeout=0.2) as (server, broker):
            with connect(server) as sock:
                partial_body(sock)
                reply = receive_all(sock)
            self.assertIn(b" 408 ", reply)
            self.assertIn(b"Connection: close", reply)
            self.assertIn(b"REQUEST_TIMEOUT", reply)
            self.assertEqual(broker.calls, 0)

    def test_partial_headers_and_request_line_time_out(self):
        with running_server(read_timeout=0.2) as (server, broker):
            for prefix in (b"GET /hea", b"GET /health HTTP/1.1\r\nHost: local"):
                with self.subTest(prefix=prefix), connect(server) as sock:
                    sock.sendall(prefix)
                    reply = receive_all(sock)
                self.assertIn(b" 408 ", reply)
                self.assertIn(b"Connection: close", reply)
            self.assertEqual(broker.calls, 0)

    def test_truncated_body_with_write_eof_is_400_not_json_execution(self):
        with running_server(read_timeout=0.3) as (server, broker):
            with connect(server) as sock:
                partial_body(sock)
                sock.shutdown(socket.SHUT_WR)
                reply = receive_all(sock)
            self.assertIn(b" 400 ", reply)
            self.assertIn(b"TRUNCATED_BODY", reply)
            self.assertIn(b"Connection: close", reply)
            self.assertEqual(broker.calls, 0)

    def test_health_responds_while_upload_is_partial(self):
        with running_server(read_timeout=0.8, max_connections=2) as (server, broker):
            with connect(server) as uploader:
                partial_body(uploader)
                started = time.monotonic()
                status, body = health(server)
                self.assertEqual(status, 200)
                self.assertIn(b'"status":"up"', body)
                self.assertLess(time.monotonic() - started, 0.7)
                self.assertIn(b" 408 ", receive_all(uploader))
            self.assertEqual(broker.calls, 0)

    def test_admission_is_bounded_and_slot_released_after_timeout(self):
        with running_server(read_timeout=0.3, max_connections=1) as (server, broker):
            with connect(server) as uploader:
                partial_body(uploader)
                # TCP accepts are processed in order by the single accept loop.
                with connect(server) as rejected:
                    reply = receive_all(rejected)
                self.assertIn(b" 503 ", reply)
                self.assertIn(b"Connection: close", reply)
                self.assertIn(b" 408 ", receive_all(uploader))
            # EOF follows shutdown_request; release happens in worker's finally.
            deadline = time.monotonic() + 2
            while True:
                status, _ = health(server)
                if status == 200:
                    break
                self.assertEqual(status, 503)
                self.assertLess(time.monotonic(), deadline)
                time.sleep(0.01)
            self.assertEqual(broker.calls, 0)

    def test_invalid_limits_fail_before_binding(self):
        for timeout in (0, -1, float("inf"), float("nan"), None, True):
            with self.subTest(timeout=timeout), self.assertRaises(ValueError):
                serve(NeverBroker(), read_timeout=timeout)
        for maximum in (0, -1, 1.5, True, None):
            with self.subTest(maximum=maximum), self.assertRaises(ValueError):
                serve(NeverBroker(), max_connections=maximum)


if __name__ == "__main__":
    unittest.main()
