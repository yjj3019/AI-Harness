"""Opt-in loopback-only HTTP tool endpoint. No approval-signing API is exposed."""
import argparse
import json
import os
import stat
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from .broker import Broker, BrokerError


class ToolServer(ThreadingHTTPServer):
    daemon_threads = True


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        # Never log tokens, payload, secret or sensitive query data.
        pass

    def respond(self, code, body):
        data = json.dumps(body, separators=(",", ":")).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":
            self.respond(200, {"status": "up"})
        else:
            self.respond(404, {"error": "NOT_FOUND"})

    def do_POST(self):
        if self.path != "/v1/tools/execute":
            self.respond(404, {"error": "NOT_FOUND"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip()
            if not 0 < size <= 8192 or content_type != "application/json":
                raise BrokerError(400, "INVALID_REQUEST")
            body = json.loads(self.rfile.read(size))
            if not isinstance(body, dict) or set(body) != {
                "operation", "request_id", "payload", "approval"
            }:
                raise BrokerError(400, "INVALID_REQUEST")
            result = self.server.broker.execute(
                body["operation"], body["request_id"], body["payload"], body["approval"])
            self.respond(200, result)
        except BrokerError as error:
            self.respond(error.status, {"error": error.code})
        except (ValueError, TypeError, OverflowError, UnicodeError):
            self.respond(400, {"error": "INVALID_REQUEST"})
        except Exception:
            self.respond(500, {"error": "INTERNAL_ERROR"})


def serve(broker, port=0):
    server = ToolServer(("127.0.0.1", port), Handler)
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
