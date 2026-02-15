#!/usr/bin/env bash
set -u
set +e
set -o pipefail

WATCHDOG_SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/run-v29-dual-ab-watchdog.sh"
GEN_SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/vegas-v29-apex.js"
OUT_DIR="${OUT_DIR:-/Users/louisherman/nanobanana-output/pool-luxe-lace-v1-dual-ab-batch-20260213}"
LOG="${LOG:-/Users/louisherman/gen-pool-luxe-lace-dual-ab-watchdog-screen.log}"
KEEPER_LOG="${KEEPER_LOG:-/Users/louisherman/gen-pool-luxe-lace-keeper.log}"
START_IDX="${START_IDX:-0}"
END_IDX="${END_IDX:-100}"
CHECK_EVERY_S="${CHECK_EVERY_S:-60}"
INCOMPLETE_DIR="${INCOMPLETE_DIR:-${OUT_DIR}/_incomplete-without-strategy-c}"
RETRY_WAIT_S="${RETRY_WAIT_S:-20}"
CACHE_REUSE_WAIT_S="${CACHE_REUSE_WAIT_S:-8}"
REQUEST_PACING_BASE_S="${REQUEST_PACING_BASE_S:-8}"
REQUEST_PACING_MAX_S="${REQUEST_PACING_MAX_S:-20}"
MIN_WAIT_FLOOR_S="${MIN_WAIT_FLOOR_S:-5}"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
klog() { echo "[$(ts)] $*" | tee -a "$KEEPER_LOG"; }

mkdir -p "$OUT_DIR" "$INCOMPLETE_DIR"
touch "$KEEPER_LOG"

count_require_c_missing() {
  python3 - "$GEN_SCRIPT" "$OUT_DIR" "$START_IDX" "$END_IDX" <<'PY'
import re
import sys
from pathlib import Path

try:
    script = Path(sys.argv[1]).read_text()
    out = Path(sys.argv[2])
    start = int(sys.argv[3])
    end = int(sys.argv[4])
    body = re.search(r"const concepts = \[(.*)\n\];\n", script, re.S).group(1)
    names = [m.group(1) for m in re.finditer(r"name:\s*'([^']+)'", body)]
    missing = 0
    for name in names[start:end]:
        root = (out / f"{name}.png").exists()
        c = (out / "strategy-C" / f"{name}.png").exists()
        if not (root and c):
            missing += 1
    print(missing)
except Exception:
    print(-1)
PY
}

sweep_bad_roots() {
  python3 - "$GEN_SCRIPT" "$OUT_DIR" "$INCOMPLETE_DIR" "$START_IDX" "$END_IDX" <<'PY'
import re
import sys
from pathlib import Path

script = Path(sys.argv[1]).read_text()
out = Path(sys.argv[2])
backup = Path(sys.argv[3])
start = int(sys.argv[4])
end = int(sys.argv[5])
backup.mkdir(parents=True, exist_ok=True)

body = re.search(r"const concepts = \[(.*)\n\];\n", script, re.S).group(1)
names = [m.group(1) for m in re.finditer(r"name:\s*'([^']+)'", body)]
moved = 0
for name in names[start:end]:
    root = out / f"{name}.png"
    c = out / "strategy-C" / f"{name}.png"
    if root.exists() and not c.exists():
        root.replace(backup / root.name)
        moved += 1
print(moved)
PY
}

watchdog_alive() {
  pgrep -f "run-v29-dual-ab-watchdog.sh" >/dev/null 2>&1
}

start_watchdog() {
  if watchdog_alive; then
    return 0
  fi
  klog "keeper_action=start_watchdog"
  cd "/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas" || return 1
  screen -dmS v29_watchdog bash -lc "cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas && OUT_DIR=$OUT_DIR LOG=$LOG START_IDX=$START_IDX END_IDX=$END_IDX TERM_SIGNAL_MODE=ignore CHILD_SIGNAL_RETRY_WAIT_S=5 REQUIRE_STRATEGY_C_FOR_COMPLETE=1 RETRY_WAIT_S=$RETRY_WAIT_S CACHE_REUSE_WAIT_S=$CACHE_REUSE_WAIT_S REQUEST_PACING_BASE_S=$REQUEST_PACING_BASE_S REQUEST_PACING_MAX_S=$REQUEST_PACING_MAX_S MIN_WAIT_FLOOR_S=$MIN_WAIT_FLOOR_S bash ./run-v29-dual-ab-watchdog.sh"
}

klog "keeper_start range=${START_IDX}-${END_IDX} check_every=${CHECK_EVERY_S}s"

while true; do
  moved="$(sweep_bad_roots)"
  missing="$(count_require_c_missing)"
  if [[ "$moved" =~ ^[0-9]+$ ]] && (( moved > 0 )); then
    klog "keeper_action=sweep_bad_roots moved=${moved}"
  fi
  if [[ "$missing" == "0" ]]; then
    klog "keeper_done require_c_missing=0"
    exit 0
  fi

  if ! watchdog_alive; then
    start_watchdog
  fi

  klog "keeper_tick require_c_missing=${missing}"
  sleep "$CHECK_EVERY_S"
done
