#!/usr/bin/env bash
set -euo pipefail

# If the launching terminal disconnects, keep running when started under nohup/daemonized contexts.
trap '' HUP

# Re-run the V29 APEX pool-luxe-lace batch until all images in a range exist.
# Behavior:
# - Starts the generator if it is not running.
# - Every INTERVAL_SECONDS, checks progress; if the generator exited, starts a new attempt.
# - Does NOT kill the generator on the interval (90s is typically too short for Pass A+Pass B).
# - The generator skips already-generated images, so restarts are safe.
#
# Usage:
#   ./run-pool-luxe-lace-loop.sh \
#     --output-dir "$HOME/nanobanana-output/pool-luxe-lace-v13-no-nylons" \
#     --input-image "/Users/louisherman/Documents/IMG_4385.jpeg" \
#     --start 40 --end 60 \
#     --interval 90
#
# Notes:
# - start/end are concept-index bounds (like vegas-v29-apex.js uses): [start, end)
# - This script is intentionally simple: it does not modify prompts, only keeps retrying.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
GEN_JS="$SCRIPT_DIR/vegas-v29-apex.js"

OUTPUT_DIR=""
INPUT_IMAGE=""
START_IDX=""
END_IDX=""
INTERVAL_SECONDS="90"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      OUTPUT_DIR="${2:-}"; shift 2;;
    --input-image)
      INPUT_IMAGE="${2:-}"; shift 2;;
    --start)
      START_IDX="${2:-}"; shift 2;;
    --end)
      END_IDX="${2:-}"; shift 2;;
    --interval)
      INTERVAL_SECONDS="${2:-}"; shift 2;;
    -*)
      echo "Unknown arg: $1" >&2
      exit 2;;
    *)
      echo "Unexpected positional arg: $1" >&2
      exit 2;;
  esac
done

if [[ -z "$OUTPUT_DIR" || -z "$INPUT_IMAGE" || -z "$START_IDX" || -z "$END_IDX" ]]; then
  echo "Missing required args." >&2
  echo "Required: --output-dir --input-image --start --end" >&2
  exit 2
fi

trap 'rc=$?; echo "Loop exit rc=$rc (output=$OUTPUT_DIR range=[$START_IDX,$END_IDX))"' EXIT

mkdir -p "$OUTPUT_DIR" "$OUTPUT_DIR/passA"

LOG_FILE="$HOME/gen-$(basename "$OUTPUT_DIR")-${START_IDX}-${END_IDX}.log"

expected_names_file="$(mktemp)"
trap 'rm -f "$expected_names_file"' EXIT

node - <<'NODE' "$GEN_JS" "$START_IDX" "$END_IDX" >"$expected_names_file"
const fs = require("fs");
const [fp, sRaw, eRaw] = process.argv.slice(2);
const s = parseInt(sRaw, 10);
const e = parseInt(eRaw, 10);
const src = fs.readFileSync(fp, "utf8");
const m = src.match(/const concepts = \[(.*)\n\];\n/s);
if (!m) {
  console.error("Could not find concepts array in " + fp);
  process.exit(1);
}
const body = m[1];
const names = [...body.matchAll(/name:\s*'([^']+)'/g)].map(x => x[1]);
const slice = names.slice(s, Math.min(e, names.length));
for (const n of slice) console.log(n);
NODE

total_expected="$(wc -l <"$expected_names_file" | tr -d ' ')"
if [[ "$total_expected" == "0" ]]; then
  echo "No expected names found for range [$START_IDX,$END_IDX). Check inputs." >&2
  exit 1
fi

missing_count() {
  local missing=0
  while IFS= read -r name; do
    if [[ ! -f "$OUTPUT_DIR/$name.png" ]]; then
      missing=$((missing + 1))
    fi
  done <"$expected_names_file"
  echo "$missing"
}

echo "Loop start: output=$OUTPUT_DIR range=[$START_IDX,$END_IDX) interval=${INTERVAL_SECONDS}s expected=$total_expected log=$LOG_FILE"

while true; do
  miss="$(missing_count)"
  if [[ "$miss" == "0" ]]; then
    echo "All done: $total_expected/$total_expected present in $OUTPUT_DIR"
    exit 0
  fi

  echo "Missing: $((total_expected - miss))/$total_expected done ($miss remaining). Ensuring generator is running..."

  python3 - <<'PY' \
    "$GEN_JS" "$INPUT_IMAGE" "$START_IDX" "$END_IDX" \
    "$OUTPUT_DIR" "$LOG_FILE" "$INTERVAL_SECONDS"
import os
import subprocess
import sys
import time

gen_js, input_image, start_idx, end_idx, output_dir, log_file, interval_s = sys.argv[1:]
interval_s = int(interval_s)

env = os.environ.copy()
env["OUTPUT_DIR"] = output_dir
env["RETRY_WAIT_S"] = env.get("RETRY_WAIT_S", "10")
env["RATE_LIMIT_BACKOFF_MIN_S"] = env.get("RATE_LIMIT_BACKOFF_MIN_S", "20")
env["RATE_LIMIT_BACKOFF_MAX_S"] = env.get("RATE_LIMIT_BACKOFF_MAX_S", "40")

cmd = ["node", gen_js, input_image, start_idx, end_idx]

with open(log_file, "a", encoding="utf-8") as lf:
    lf.write(f"\n[loop] start cmd={' '.join(cmd)} (will run until exit)\n")
    lf.flush()

    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env)
    start = time.time()
    while True:
        # Stream output if available.
        if p.stdout is not None:
            line = p.stdout.readline()
            if line:
                sys.stdout.write(line)
                sys.stdout.flush()
                lf.write(line)
                lf.flush()
                continue
        rc = p.poll()
        if rc is not None:
            lf.write(f"[loop] end pid={p.pid} rc={rc}\n")
            lf.flush()
            break
        # Check-in heartbeat at the interval; keep running.
        if time.time() - start >= interval_s:
            lf.write(f"[loop] heartbeat pid={p.pid} still running\n")
            lf.flush()
            break
        time.sleep(0.25)
PY

  # Wait before the next progress check / possible restart.
  sleep "$INTERVAL_SECONDS"
done
