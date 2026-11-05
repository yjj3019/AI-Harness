"""Opt-in loopback-only HTTP tool endpoint. No approval-signing API is exposed."""
import argparse
import io
import json
import math
import os
import stat
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from .broker import Broker, BrokerError


class ToolServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, handler, *, read_timeout=5.0, max_connections=16):
        if (isinstance(read_timeout, bool) or not isinstance(read_timeout, (int, float))
                or not math.isfinite(read_timeout) or read_timeout <= 0):
            raise ValueError("read_timeout must be finite and positive")
        if (isinstance(max_connections, bool) or not isinstance(max_connections, int)
                or max_connections < 1):
            raise ValueError("max_connections must be a positive integer")
        self.read_timeout = read_timeout
        self._slots = threading.BoundedSemaphore(max_connections)
        super().__init__(address, handler)

    def get_request(self):
        request, address = super().get_request()
        # Set before a worker reads the request line/headers, not only before body reads.
        request.settimeout(self.read_timeout)
        return request, address

    def process_request(self, request, client_address):
        # Never wait here: a slow uploader must not stall the accept loop or spawn
        # unbounded workers. Saturated clients get a small close-only response.
        if not self._slots.acquire(blocking=False):
            try:
                request.sendall(b"HTTP/1.0 503 Service Unavailable\r\n"
                                b"Connection: close\r\nContent-Length: 0\r\n\r\n")
            except OSError:
                pass
            finally:
                self.shutdown_request(request)
            return
        try:
            super().process_request(request, client_address)
        except BaseException:
            self._slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self._slots.release()


class DeadlineReader(io.RawIOBase):
    """Enforce one monotonic deadline across every buffered socket read."""

    def __init__(self, sock, deadline, idle_timeout):
        super().__init__()
        self.sock = sock
        self.deadline = deadline
        self.idle_timeout = idle_timeout

    def readable(self):
        return True

    def readinto(self, buffer):
        remaining = self.deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError("request deadline exceeded")
        self.sock.settimeout(min(self.idle_timeout, remaining))
        return self.sock.recv_into(buffer)


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.rfile.close()
        self.request_deadline = time.monotonic() + self.server.read_timeout
        self.rfile = io.BufferedReader(DeadlineReader(
            self.connection, self.request_deadline, self.server.read_timeout))

    def check_deadline(self):
        if time.monotonic() >= self.request_deadline:
            raise TimeoutError("request deadline exceeded")

    def handle_one_request(self):
        # BaseHTTPRequestHandler silently closes on header timeouts. Keep its parsing
        # and method dispatch, but provide an explicit bounded 408 for partial headers.
        self.requestline = ""
        self.request_version = "HTTP/1.0"
        self.command = None
        try:
            self.raw_requestline = self.rfile.readline(65537)
            if len(self.raw_requestline) > 65536:
                self.send_error(414)
                return
            if not self.raw_requestline:
                self.close_connection = True
                return
            if not self.parse_request():
                return
            self.check_deadline()
            method = getattr(self, "do_" + self.command, None)
            if method is None:
                self.send_error(501)
                return
            method()
            self.wfile.flush()
        except TimeoutError:
            self.respond(408, {"error": "REQUEST_TIMEOUT"})
        except OSError:
            self.close_connection = True

    def log_message(self, *args):
        # Never log tokens, payload, secret or sensitive query data.
        pass

    def respond(self, code, body):
        # Reads may have reduced the socket timeout to the remaining deadline.
        self.connection.settimeout(self.server.read_timeout)
        data = json.dumps(body, separators=(",", ":")).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Connection", "close")
        self.close_connection = True
        try:
            self.end_headers()
            self.wfile.write(data)
        except OSError:
            # A timed-out or disconnected uploader may no longer read a response.
            pass

    def do_GET(self):
        if self.path == "/health":
            self.respond(200, {"status": "up"})
        else:
            self.respond(404, {"error": "NOT_FOUND"})

    def do_POST(self):
        if self.path != "/v1/tools/execute":
            self.respond(404, {"error": "NOT_FOUND"})
            return
        # Optional local token. If TOOLBROKER_TOKEN is set, require matching header.
        expected = os.environ.get("TOOLBROKER_TOKEN")
        if expected:
            got = self.headers.get("X-Toolbroker-Token", "")
            if got != expected:
                self.respond(401, {"error": "UNAUTHORIZED"})
                return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip()
            if not 0 < size <= 8192 or content_type != "application/json":
                raise BrokerError(400, "INVALID_REQUEST")
            raw = self.rfile.read(size)
            self.check_deadline()
            if len(raw) != size:
                raise BrokerError(400, "TRUNCATED_BODY")
            body = json.loads(raw)
            if not isinstance(body, dict) or set(body) != {
                "operation", "request_id", "payload", "approval"
            }:
                raise BrokerError(400, "INVALID_REQUEST")
            result = self.server.broker.execute(
                body["operation"], body["request_id"], body["payload"], body["approval"])
            self.respond(200, result)
        except TimeoutError:
            self.respond(408, {"error": "REQUEST_TIMEOUT"})
        except BrokerError as error:
            self.respond(error.status, {"error": error.code})
        except (ValueError, TypeError, OverflowError, UnicodeError):
            self.respond(400, {"error": "INVALID_REQUEST"})
        except Exception:
            self.respond(500, {"error": "INTERNAL_ERROR"})


def serve(broker, port=0, *, read_timeout=5.0, max_connections=16):
    server = ToolServer(("127.0.0.1", port), Handler,
                        read_timeout=read_timeout, max_connections=max_connections)
    server.broker = broker
    return server


def main():
    p = argparse.ArgumentParser(description="Local-only ToolBroker proof; NOT production-ready")
    p.add_argument("--db", required=True)
    p.add_argument("--secret-file", required=True)
    p.add_argument("--policy", required=True)
    p.add_argument("--port", type=int, default=0)
    args = p.parse_args()
    secret_path = Path(args.secret_file)
    if os.name == "posix" and stat.S_IMODE(secret_path.stat().st_mode) & 0o077:
        p.error("secret must be owner-only mode 0600")
    policy = json.loads(Path(args.policy).read_text(encoding="utf-8"))
    if not isinstance(policy, dict) or set(policy) - {"allowed", "http_destination"}:
        p.error("invalid policy")
    broker = Broker(args.db, secret_path.read_bytes(),
                    allowed=set(policy.get("allowed", [])),
                    http_destination=policy.get("http_destination"))
    server = serve(broker, args.port)
    print("listening=127.0.0.1:" + str(server.server_address[1]), flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
