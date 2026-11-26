"""Replay the dashboard's forced and incremental modes on a pinned local snapshot."""
import hashlib
import json
import platform
import statistics
import subprocess
import tempfile
from pathlib import Path
from time import perf_counter_ns


ROOT = Path(__file__).resolve().parents[3]
REVISION = "d1e09227eac3c16cda6133ae18a37986e5e934c2"
INPUTS = (
    "scripts/dashboard-status.js",
    "scripts/phase-definition.js",
    "docs/PHASES.md",
    ".github/required-phases.json",
    "docs/attestations/phase-evidence-baseline.json",
)
MODES = {"forced": ["--force"], "incremental": []}
OUTPUT = Path("dashboard/status.json")


def invoke(directory, mode):
    start = perf_counter_ns()
    result = subprocess.run(
        ["node", "scripts/dashboard-status.js", *MODES[mode]],
        cwd=directory, capture_output=True, timeout=30,
    )
    return result, round((perf_counter_ns() - start) / 1e6, 3)


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def replay():
    blobs = {
        name: subprocess.check_output(["git", "show", f"{REVISION}:{name}"], cwd=ROOT)
        for name in INPUTS
    }
    with tempfile.TemporaryDirectory(prefix="harness-dashboard-") as temporary:
        dirs = {mode: Path(temporary) / mode for mode in MODES}
        for directory in dirs.values():
            for name, content in blobs.items():
                dest = directory / name
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(content)

        def outputs():
            return [(directory / OUTPUT).read_bytes() for directory in dirs.values()]

        def successful_pair():
            results = [invoke(directory, mode)[0] for mode, directory in dirs.items()]
            for result in results:
                result.check_returncode()
            require(results[0].stdout == results[1].stdout, "different success messages")
            left, right = outputs()
            require(left == right, "different output bytes")
            return left

        seed = successful_pair()
        rows = json.loads(seed)
        require(any(row["id"] == "evidence-baseline" for row in rows), "missing real phase")
        warm = successful_pair()
        require(seed == warm, "unexpected warm-up output")
        samples = {mode: [] for mode in MODES}
        for pair in range(10):
            order = list(MODES) if pair % 2 == 0 else list(reversed(MODES))
            for mode in order:
                result, duration = invoke(dirs[mode], mode)
                result.check_returncode()
                samples[mode].append(duration)
                require((dirs[mode] / OUTPUT).read_bytes() == seed, "refresh changed bytes")

        for directory in dirs.values():
            (directory / OUTPUT).write_bytes(b"stale")
        require(successful_pair() == seed, "stale output was not repaired")
        for directory in dirs.values():
            (directory / "docs/PHASES.md").write_bytes(b"")
            (directory / INPUTS[-1]).unlink()
        require(successful_pair() == b"[]", "empty input must yield an empty array")
        for mode, directory in dirs.items():
            (directory / "docs/PHASES.md").write_bytes(b"### Phase a: One\n### Phase A: Two\n")
            result, _ = invoke(directory, mode)
            require(result.returncode == 1 and b"duplicate Phase ID 'A' conflicts with 'a'" in result.stderr,
                    "duplicate-ID error contract changed")
            require((directory / OUTPUT).read_bytes() == b"[]", "error changed previous output")
        for directory in dirs.values():
            (directory / "docs/PHASES.md").write_bytes(blobs["docs/PHASES.md"])
            (directory / INPUTS[-1]).write_bytes(blobs[INPUTS[-1]])
            result, _ = invoke(directory, "forced")
            result.check_returncode()
            require((directory / OUTPUT).read_bytes() == seed, "forced rebuild did not recover")

    return {
        "revision": REVISION, "os": platform.platform(), "machine": platform.machine(),
        "processor": platform.processor(), "python": platform.python_version(),
        "node": subprocess.check_output(["node", "--version"], text=True).strip(),
        "input_sha256": {name: hashlib.sha256(data).hexdigest() for name, data in blobs.items()},
        "phase_count": len(rows), "output_sha256": hashlib.sha256(seed).hexdigest(),
        "milliseconds": samples, "median_ms": {k: statistics.median(v) for k, v in samples.items()},
        "checks": ["first generation", "unchanged refresh", "stale output repair",
                   "empty inputs", "duplicate ID error preserves output", "forced rebuild recovery"],
    }


if __name__ == "__main__":
    print(json.dumps(replay(), ensure_ascii=False, indent=2))
