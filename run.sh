#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
#  Nexus Developer Tools
#  ─────────────────────
#  Usage:
#    ./run.sh                     Start backend (apps/api) + frontend (apps/web)
#    ./run.sh -p | --prettify     Run prettier across the whole codebase (write fixes)
#    ./run.sh -l | --lint         Run eslint across the whole codebase
#    ./run.sh -p -l │ --prettify --lint  Prettify, then lint
#    ./run.sh -h | --help         Show this help
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

# ───────────────────────────────────────────────────────────────────
# Configuration
# ───────────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.scratch/logs"
API_PORT="${API_PORT:-8080}"
WEB_PORT="${WEB_PORT:-3000}"

API_HEALTH_URL="http://localhost:${API_PORT}/health"
WEB_HEALTH_URL="http://localhost:${WEB_PORT}"

READY_TIMEOUT=60        # seconds to wait for a server to become healthy
STARTUP_GRACE=3         # seconds before starting to poll

# Escaping colour codes
if [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]]; then
  C_RESET=$'\033[0m'
  C_INFO=$'\033[36m'
  C_OK=$'\033[32m'
  C_WARN=$'\033[33m'
  C_ERR=$'\033[31m'
  C_BOLD=$'\033[1m'
else
  C_RESET=''
  C_INFO=''
  C_OK=''
  C_WARN=''
  C_ERR=''
  C_BOLD=''
fi

# ───────────────────────────────────────────────────────────────────
# Logging helpers
# ───────────────────────────────────────────────────────────────────
log_info() { printf '%s[%sNexus%s] %s\n' "$C_INFO" "$C_BOLD" "$C_RESET$C_INFO" "$*" "$C_RESET"; }
log_ok()   { printf '%s[%s✔%s] %s\n'      "$C_OK"   "$C_BOLD" "$C_RESET$C_OK"   "$*" "$C_RESET"; }
log_warn() { printf '%s[%s!%s] %s\n'      "$C_WARN" "$C_BOLD" "$C_RESET$C_WARN" "$*" "$C_RESET"; }
log_err()  { printf '%s[%s✘%s] %s\n'      "$C_ERR"  "$C_BOLD" "$C_RESET$C_ERR"  "$*" "$C_RESET" >&2; }

# ───────────────────────────────────────────────────────────────────
# Pre-flight checks
# ───────────────────────────────────────────────────────────────────
require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_err "Required command not found: '$cmd'. Please install it first."
    do_exit 1
  fi
}

check_workspace_deps() {
  local dir="$1" label="$2"
  if [[ ! -d "$dir/node_modules" ]]; then
    log_err "Dependencies missing in $label ($dir/node_modules)."
    log_err "Run 'npm install' from the repo root and try again."
    do_exit 1
  fi
}

port_in_use() {
  local port="$1"
  (command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | awk '{print $4}' | grep -q ":$port$") \
    || (command -v lsof >/dev/null 2>&1 && lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1)
}

# ───────────────────────────────────────────────────────────────────
# Server lifecycle
# ───────────────────────────────────────────────────────────────────
declare -a CHILD_NAMES=()
EXIT_CODE=0

# Ends the script with a specific status while letting the EXIT trap run.
# The trap reads EXIT_CODE rather than $?, because $? is unreliable inside
# an EXIT trap (bash often reports 0 there).
do_exit() {
  EXIT_CODE="$1"
  exit "$EXIT_CODE"
}

cleanup() {
  local sig="$1"
  if ((${#CHILD_NAMES[@]})); then
    log_warn "Shutting down (${sig:-exit})…"
    for name in "${CHILD_NAMES[@]}"; do
      local pidfile="$LOG_DIR/$name.pid"
      if [[ -f "$pidfile" ]]; then
        local pid
        pid="$(cat "$pidfile")"
        if kill -0 "$pid" >/dev/null 2>&1; then
          kill -TERM -- "-$pid" >/dev/null 2>&1 || kill -TERM "$pid" >/dev/null 2>&1 || true
        fi
      fi
    done
    wait 2>/dev/null || true
  fi
  exit "$EXIT_CODE"
}
trap 'cleanup SIGINT'  SIGINT
trap 'cleanup SIGTERM' SIGTERM
trap 'cleanup EXIT'    EXIT

spawn_server() {
  local name="$1"
  local dir="$2"
  local label="$3"
  shift 3
  # Remaining args: the command to run, injected into the working dir.
  local logfile="$LOG_DIR/$name.log"

  log_info "Starting $label ($dir)…"
  mkdir -p "$LOG_DIR"

  # setsid runs the server in its own process group so cleanup can kill the
  # entire tree (npm -> tsx/next -> workers) with a single group signal.
  # We use sh -c to reliably write the new process group leader's PID to the pidfile,
  # because setsid may fork and exit immediately, rendering $! dead.
  if command -v setsid >/dev/null 2>&1; then
    setsid sh -c "echo \$\$ > \"$LOG_DIR/$name.pid\"; cd \"$dir\" && exec \"\$@\"" -- "$@" >"$logfile" 2>&1 &
  else
    sh -c "echo \$\$ > \"$LOG_DIR/$name.pid\"; cd \"$dir\" && exec \"\$@\"" -- "$@" >"$logfile" 2>&1 &
  fi
  
  CHILD_NAMES+=("$name")
  log_info "$label log: $logfile"
}

wait_for_ready() {
  local url="$1" name="$2" timeout="$3"
  local elapsed=0

  sleep "$STARTUP_GRACE"
  while (( elapsed < timeout )); do
    if curl -s -o /dev/null -m 2 "$url"; then
      return 0
    fi
    # Bail early if the process we spawned has already died.
    local pidfile="$LOG_DIR/$name.pid"
    if [[ -f "$pidfile" ]]; then
      local pid; pid="$(cat "$pidfile")"
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        return 2
      fi
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  return 1
}

start_servers() {
  log_info "═ Starting Nexus servers ═"

  # Port preflight
  if port_in_use "$API_PORT"; then
    log_err "Port $API_PORT is already in use — backend cannot start. Free the port or set API_PORT."
    do_exit 1
  fi
  if port_in_use "$WEB_PORT"; then
    log_err "Port $WEB_PORT is already in use — frontend cannot start. Free the port or set WEB_PORT."
    do_exit 1
  fi

  # Backend listens on $API_PORT (maps to the API's own PORT env var).
  # Frontend runs `next dev` on $WEB_PORT and proxies /api back to $API_PORT.
  spawn_server api "$ROOT_DIR/apps/api" "Backend " \
    env PORT="$API_PORT" npm run dev
  spawn_server web "$ROOT_DIR/apps/web" "Frontend" \
    env API_URL="http://localhost:$API_PORT" npm run dev -- -p "$WEB_PORT"

  # ── Backend readiness ──
  local api_status=0
  wait_for_ready "$API_HEALTH_URL" "api" "$READY_TIMEOUT" || api_status=$?
  if [[ "$api_status" -eq 0 ]]; then
    log_ok "Backend healthy  → $API_HEALTH_URL  (PID $(cat "$LOG_DIR/api.pid"))"
  elif [[ "$api_status" -eq 2 ]]; then
    log_err "Backend exited during startup. Last log lines:"
    tail -n 15 "$LOG_DIR/api.log" 2>/dev/null | sed 's/^/    /'
    do_exit 1
  else
    log_err "Backend did not become healthy within ${READY_TIMEOUT}s. Tail of log:"
    tail -n 15 "$LOG_DIR/api.log" 2>/dev/null | sed 's/^/    /'
    do_exit 1
  fi

  # ── Frontend readiness ──
  local web_status=0
  wait_for_ready "$WEB_HEALTH_URL" "web" "$READY_TIMEOUT" || web_status=$?
  if [[ "$web_status" -eq 0 ]]; then
    log_ok "Frontend healthy → $WEB_HEALTH_URL  (PID $(cat "$LOG_DIR/web.pid"))"
  elif [[ "$web_status" -eq 2 ]]; then
    log_err "Frontend exited during startup. Last log lines:"
    tail -n 15 "$LOG_DIR/web.log" 2>/dev/null | sed 's/^/    /'
    do_exit 1
  else
    log_err "Frontend did not become healthy within ${READY_TIMEOUT}s. Tail of log:"
    tail -n 15 "$LOG_DIR/web.log" 2>/dev/null | sed 's/^/    /'
    do_exit 1
  fi

  log_ok "Both servers running. Press Ctrl+C to stop."
  log_info "Logs: $LOG_DIR/api.log  |  $LOG_DIR/web.log"

  # Block until a signal arrives.
  wait
}

# ───────────────────────────────────────────────────────────────────
# Prettify
# ───────────────────────────────────────────────────────────────────
run_prettify() {
  local prettier="$ROOT_DIR/node_modules/.bin/prettier"
  if [[ ! -x "$prettier" ]]; then
    log_err "Prettier not found ($prettier). Run 'npm install' at the repo root first."
    do_exit 1
  fi

  log_info "═ Prettifying codebase (prettier --write) ═"
  local start; start="$(date +%s)"

  # NOTE: prettier auto-reads .prettierignore from cwd (the repo root).
  if ! ( cd "$ROOT_DIR" && "$prettier" --write \
        "apps/web/**/*.{ts,tsx,css,mjs,json}" \
        "apps/api/**/*.ts" \
        "packages/shared/**/*.ts" \
        "eslint.config.mjs" \
        "package.json" ); then
    log_err "Prettier reported errors — see above."
    return 1
  fi

  local dur=$(( $(date +%s) - start ))
  log_ok "Prettify complete (${dur}s)."
  return 0
}

# ───────────────────────────────────────────────────────────────────
# Lint
# ───────────────────────────────────────────────────────────────────
run_lint() {
  local eslint="$ROOT_DIR/node_modules/.bin/eslint"
  if [[ ! -x "$eslint" ]]; then
    log_err "ESLint not found ($eslint). Run 'npm install' at the repo root first."
    do_exit 1
  fi

  log_info "═ Linting codebase (eslint) ═"
  local overall=0
  local target

  # Each workspace linted from its own directory so its local eslint
  # config (e.g. the Next.js config in apps/web) resolves correctly.
  while IFS='|' read -r dir target label; do
    [[ -z "$dir" ]] && continue
    if [[ ! -d "$ROOT_DIR/$dir" ]]; then
      log_warn "Skipping $label: directory $dir does not exist."
      continue
    fi
    log_info "── $label ($dir) ──"
    # $target intentionally word-splits into separate positional args.
    if ( cd "$ROOT_DIR/$dir" && "$eslint" $target ); then
      log_ok "$label: clean"
    else
      log_warn "$label: problems found"
      overall=1
    fi
  done <<'EOF'
apps/web|app components lib hooks next.config.ts|Web
apps/api|src|API
packages/shared|src|Shared
EOF

  if [[ "$overall" -eq 0 ]]; then
    log_ok "Lint passed — no problems."
  else
    log_err "Lint finished with problems. Review the output above."
  fi
  log_info "Lint exit code: $overall"
  return "$overall"
}

# ───────────────────────────────────────────────────────────────────
# Help
# ───────────────────────────────────────────────────────────────────
show_help() {
  cat <<USAGE
Nexus Developer Tools

Usage:
  ./run.sh [options]

Options:
  -p, --prettify   Run prettier across the whole codebase (--write, in place).
  -l, --lint       Run eslint across the whole codebase.
  -h, --help       Show this help message.

With no options, ./run.sh starts both the backend (apps/api, port $API_PORT)
and the frontend (apps/web, port $WEB_PORT), waits for them to become healthy,
and reports status. Press Ctrl+C to stop both.

Examples:
  ./run.sh                # run both servers
  ./run.sh -p             # prettify only
  ./run.sh -l             # lint only
  ./run.sh -p -l          # prettify, then lint
USAGE
}

# ───────────────────────────────────────────────────────────────────
# Entry point
# ───────────────────────────────────────────────────────────────────
DO_PRETTIFY=0
DO_LINT=0
DO_LINT_EXIT=0

if [[ $# -eq 0 ]]; then
  require_cmd node
  require_cmd npm
  require_cmd curl
  check_workspace_deps "$ROOT_DIR/apps/api" "apps/api"
  check_workspace_deps "$ROOT_DIR/apps/web" "apps/web"
  start_servers
  do_exit 0
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--prettify) DO_PRETTIFY=1 ;;
    -l|--lint)     DO_LINT=1     ;;
    -h|--help)     show_help; do_exit 0 ;;
    *)
      log_err "Unknown option: '$1'"
      show_help >&2
      do_exit 1
      ;;
  esac
  shift
done

if [[ "$DO_PRETTIFY" -eq 1 ]]; then
  run_prettify || DO_LINT_EXIT=1
fi
if [[ "$DO_LINT" -eq 1 ]]; then
  run_lint || DO_LINT_EXIT=1
fi

do_exit "${DO_LINT_EXIT:-0}"
