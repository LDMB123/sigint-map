#!/usr/bin/env python3
"""
Complete a 20-image pool-luxe-lace batch reliably by running ONE concept per Node invocation.

Why this exists:
- Long-running "range" runs can get wedged on a single concept (safety/rate limits/network).
- Killing/restarting on a fixed interval often prevents Pass A + Pass B from finishing.
- The underlying generator already skips existing outputs; we use that, but we isolate each concept.

Strategy:
- Parse concept names from vegas-v29-apex.js to know expected outputs.
- For each missing concept in [start,end):
  - Run vegas-v29-apex.js with range [i,i+1) so it focuses on exactly one concept.
  - Let it run until it exits or a per-concept timeout hits.
  - If output image exists, move on. If not, back off and retry later.

Usage:
  python3 complete-pool-luxe-lace-20.py \
    --output-dir "$HOME/nanobanana-output/pool-luxe-lace-v13-no-nylons" \
    --input-image "/Users/louisherman/Documents/IMG_4385.jpeg" \
    --start 40 --end 60 \
    --sleep 90 \
    --concept-timeout 1800
"""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


@dataclass(frozen=True)
class Concept:
    idx: int
    name: str


def parse_concept_names(js_path: Path) -> List[str]:
    src = js_path.read_text(encoding="utf-8")
    m = re.search(r"const concepts = \[(.*)\n\];\n", src, flags=re.S)
    if not m:
        raise RuntimeError(f"Could not find concepts array in {js_path}")
    body = m.group(1)
    return [mm.group(1) for mm in re.finditer(r"name:\s*'([^']+)'", body)]


def now() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


def run_one(
    js_path: Path,
    input_image: Path,
    out_dir: Path,
    idx: int,
    concept_name: str,
    log_path: Path,
    concept_timeout_s: int,
    env_overrides: dict,
) -> bool:
    out_png = out_dir / f"{concept_name}.png"
    if out_png.exists():
        return True

    env = os.environ.copy()
    env.update(env_overrides)
    env["OUTPUT_DIR"] = str(out_dir)

    cmd = ["node", str(js_path), str(input_image), str(idx), str(idx + 1)]
    start_t = time.time()

    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as lf:
        lf.write(f"\n[{now()}] START idx={idx} name={concept_name} timeout={concept_timeout_s}s\n")
        lf.write(f"[{now()}] CMD: {' '.join(cmd)}\n")
        lf.flush()

        p = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            env=env,
        )

        try:
            while True:
                if p.stdout is not None:
                    line = p.stdout.readline()
                    if line:
                        sys.stdout.write(line)
                        sys.stdout.flush()
                        lf.write(line)
                        lf.flush()
                        # If we already produced the final file, we can stop early.
                        if out_png.exists():
                            lf.write(f"[{now()}] DETECTED OUTPUT: {out_png}\n")
                            lf.flush()
                            try:
                                p.terminate()
                            except Exception:
                                pass
                            break

                rc = p.poll()
                if rc is not None:
                    lf.write(f"[{now()}] EXIT rc={rc}\n")
                    lf.flush()
                    break

                if time.time() - start_t >= concept_timeout_s:
                    lf.write(f"[{now()}] TIMEOUT; terminating pid={p.pid}\n")
                    lf.flush()
                    p.terminate()
                    try:
                        p.wait(timeout=15)
                    except subprocess.TimeoutExpired:
                        lf.write(f"[{now()}] KILL pid={p.pid}\n")
                        lf.flush()
                        p.kill()
                        p.wait(timeout=15)
                    break

                time.sleep(0.25)
        finally:
            try:
                if p.stdout is not None:
                    p.stdout.close()
            except Exception:
                pass

        ok = out_png.exists()
        lf.write(f"[{now()}] RESULT ok={ok} path={out_png}\n")
        lf.flush()
        return ok


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--output-dir", required=True)
    ap.add_argument("--input-image", required=True)
    ap.add_argument("--start", type=int, required=True, help="start index (inclusive)")
    ap.add_argument("--end", type=int, required=True, help="end index (exclusive)")
    ap.add_argument("--sleep", type=int, default=90, help="sleep between retry passes (seconds)")
    ap.add_argument("--concept-timeout", type=int, default=1800, help="timeout per concept attempt (seconds)")
    ap.add_argument("--max-passes", type=int, default=0, help="0 = infinite; otherwise stop after N full passes")
    ap.add_argument("--log", default=str(Path.home() / "gen-pool-luxe-lace-complete.log"))
    args = ap.parse_args()

    script_dir = Path(__file__).resolve().parent
    js_path = script_dir / "vegas-v29-apex.js"
    out_dir = Path(args.output_dir).expanduser().resolve()
    input_image = Path(args.input_image).expanduser().resolve()
    log_path = Path(args.log).expanduser().resolve()

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "passA").mkdir(parents=True, exist_ok=True)

    names = parse_concept_names(js_path)
    if args.start < 0 or args.start >= len(names):
        raise SystemExit(f"--start {args.start} out of range (0..{len(names)-1})")
    if args.end <= args.start:
        raise SystemExit("--end must be > --start")

    end = min(args.end, len(names))
    concepts = [Concept(i, names[i]) for i in range(args.start, end)]

    # Defaults tuned for less flakiness.
    env_overrides = {
        "RETRY_WAIT_S": os.environ.get("RETRY_WAIT_S", "20"),
        "RATE_LIMIT_BACKOFF_MIN_S": os.environ.get("RATE_LIMIT_BACKOFF_MIN_S", "60"),
        "RATE_LIMIT_BACKOFF_MAX_S": os.environ.get("RATE_LIMIT_BACKOFF_MAX_S", "120"),
        "MAX_CONCEPT_ATTEMPTS": os.environ.get("MAX_CONCEPT_ATTEMPTS", "5"),
    }

    def missing() -> List[Concept]:
        return [c for c in concepts if not (out_dir / f"{c.name}.png").exists()]

    passes = 0
    while True:
        todo = missing()
        done = len(concepts) - len(todo)
        print(f"[{now()}] Progress: {done}/{len(concepts)} done, {len(todo)} remaining")
        if not todo:
            print(f"[{now()}] COMPLETE: all outputs present in {out_dir}")
            return 0

        passes += 1
        if args.max_passes and passes > args.max_passes:
            print(f"[{now()}] STOP: reached max passes ({args.max_passes}) with {len(todo)} remaining")
            return 2

        # One attempt per missing concept per pass.
        for c in todo:
            ok = run_one(
                js_path=js_path,
                input_image=input_image,
                out_dir=out_dir,
                idx=c.idx,
                concept_name=c.name,
                log_path=log_path,
                concept_timeout_s=args.concept_timeout,
                env_overrides=env_overrides,
            )
            if not ok:
                print(f"[{now()}] WARN: failed this pass idx={c.idx} name={c.name}")

        print(f"[{now()}] Sleeping {args.sleep}s before next pass...")
        time.sleep(args.sleep)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print(f"[{now()}] Interrupted.")
        raise

