#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:4173}"
DURATION_SECONDS="${2:-70}"
PANEL_DELAY="${PANEL_DELAY:-1.1}"

PANELS=(
  "panel-tracker"
  "panel-quests"
  "panel-stories"
  "panel-rewards"
  "panel-games"
  "panel-gardens"
  "panel-progress"
)

open -a Safari "${BASE_URL}" >/dev/null 2>&1 || true
sleep 2

end_time=$((SECONDS + DURATION_SECONDS))
while [ "${SECONDS}" -lt "${end_time}" ]; do
  for panel in "${PANELS[@]}"; do
    [ "${SECONDS}" -ge "${end_time}" ] && break
    osascript >/dev/null 2>&1 <<OSA || true
tell application "Safari"
  if (count of windows) = 0 then
    make new document with properties {URL:"${BASE_URL}"}
  end if
  activate
  try
    do JavaScript "window.location.hash='${panel}'; var btn=document.querySelector('[data-panel-open=\"${panel}\"]'); if (btn) { btn.click(); }" in front document
  end try
end tell
OSA
    sleep "${PANEL_DELAY}"
  done

  osascript >/dev/null 2>&1 <<OSA || true
tell application "Safari"
  try
    do JavaScript "window.scrollTo(0, document.body.scrollHeight); window.scrollTo(0, 0);" in front document
  end try
end tell
OSA
done
