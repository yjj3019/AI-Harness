"""Observe a native Claude Read/Edit trial in the prepared synthetic workspace."""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("workspace", type=Path)
    parser.add_argument("mode", choices=("allow", "deny", "load"))
    args = parser.parse_args()
    root = args.workspace.resolve(strict=True)
    if root.parent != Path(tempfile.gettempdir()).resolve() or not re.fullmatch(
        r"ai-harness-host-qa-claude-[a-f0-9]{32}", root.name
    ):
        parser.error("expected the prepared temporary trial directory")
    allow = args.mode == "allow"
    load = args.mode == "load"
    expected = "INITIAL" if allow else "ALLOWED"
    if (root / "canary.txt").read_text().strip() != expected:
        parser.error("unexpected initial canary state")
    ref = root / ".claude/skills/qa-readback/references/sample.txt"
    label = ref.read_text().strip()
    prompt = (
        "Invoke the installed qa-readback skill using Skill. Follow its instruction to "
        "read the referenced file. Include its label in your final response. "
        if allow else ""
    )
    new = "ALLOWED" if allow else "DENIED-TRIAL"
    prompt += (f"Use Read on canary.txt then make exactly one Edit attempt replacing {expected} "
               f"with {new}. Stop after that tool result. Work only in this synthetic directory.")
    settings = {"permissions": {"allow": ["Read", "Skill", "Edit"] if allow else ["Read"],
                                 "ask": [] if allow else ["Edit"]}}
    command = ["claude", "--print", "--verbose", "--output-format", "stream-json",
               "--restricted", "--strict-mcp-config", "--permission-mode", "dontAsk",
               "--tools", "Read,Edit,Skill" if allow else "Read,Edit",
               "--no-session-persistence", "--settings", json.dumps(settings), prompt]
    if load:
        command = ["claude", "--print", "--verbose", "--output-format", "stream-json",
                   "--restricted", "--strict-mcp-config", "--permission-mode", "dontAsk",
                   "--tools", "Read,Skill", "--allowedTools", "Read,Skill",
                   "--plugin-dir", str(root / ".claude"), "--no-session-persistence",
                   "Invoke the fixture-qa:qa-readback skill via Skill, then follow it with Read. "
                   "If discovery fails, use Read on .claude/skills/qa-readback/SKILL.md and "
                   "on .claude/skills/qa-readback/references/sample.txt. Return the label from "
                   "the reference and stop. Work only inside this synthetic directory."]
    try:
        result = subprocess.run(command, cwd=root, stdin=subprocess.DEVNULL, capture_output=True,
                                encoding="utf-8", errors="replace", timeout=180)
    except subprocess.TimeoutExpired:
        print(json.dumps({"verdict": "INCONCLUSIVE", "reason": "180 second timeout; check canary before retry"}))
        return 2
    summary = {"exit": result.returncode, "events": [], "results": [], "final_matches_label": False}
    for line in result.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get("subtype") == "init":
            summary["skill_listed"] = any("qa-readback" in item for item in event.get("slash_commands", []) + event.get("skills", []))
            summary["mcp_count"] = len(event.get("mcp_servers", []))
        message = event.get("message")
        for part in message.get("content", []) if isinstance(message, dict) else []:
            if not isinstance(part, dict):
                continue
            if part.get("type") == "tool_use":
                data = part.get("input", {})
                path = Path(data["file_path"]) if "file_path" in data else None
                summary["events"].append({"id": part["id"], "tool": part["name"],
                                          "target": path.name if path else data.get("skill")})
            if part.get("type") == "tool_result":
                detail = str(part.get("content", ""))
                summary["results"].append({"id": part.get("tool_use_id"), "error": bool(part.get("is_error")),
                                           "label_read": label in detail, "policy_denial": any(
                                               word in detail.lower() for word in ("permission", "denied", "not allowed"))})
        if event.get("type") == "result":
            summary["final_matches_label"] = label in event.get("result", "")
            summary["denied_tools"] = [row.get("tool_name") for row in event.get("permission_denials", [])]
            summary["error"] = event.get("is_error")
    diagnostics = (result.stderr + result.stdout).lower()
    summary["diagnostics"] = [term for term in ("not logged in", "api error", "connection error",
                                                "unable to connect", "access denied", "rate limit",
                                                "out of usage", "credit balance", "authentication",
                                                "failed to fetch", "eacces", "eperm") if term in diagnostics]
    replies = {entry["id"]: entry for entry in summary["results"]}
    def observed(tool, target, **conditions):
        return any(event["tool"] == tool and event["target"] == target
                   and event["id"] in replies
                   and all(replies[event["id"]].get(key) == value for key, value in conditions.items())
                   for event in summary["events"])

    read_canary = observed("Read", "canary.txt", error=False)
    if allow:
        observed_calls = read_canary and observed("Edit", "canary.txt", error=False)
    elif load:
        observed_calls = (observed("Skill", "fixture-qa:qa-readback", error=False)
                          and observed("Read", "sample.txt", error=False, label_read=True)
                          and summary["final_matches_label"])
    else:
        observed_calls = (read_canary and observed("Edit", "canary.txt", error=True, policy_denial=True)
                          and "Edit" in summary.get("denied_tools", []))
    state_matches = (root / "canary.txt").read_text().strip() == ("ALLOWED" if allow else expected)
    summary["verified"] = (not result.returncode and summary.get("mcp_count") == 0
                           and observed_calls and state_matches)
    print(json.dumps(summary))
    return 0 if summary["verified"] else 2


if __name__ == "__main__":
    raise SystemExit(main())
