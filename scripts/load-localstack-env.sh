#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=${1:-.env.localstack}
SELF_PATH="${BASH_SOURCE[0]}"
RUN_MODE="sourced"
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  RUN_MODE="executed"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Environment file \"$ENV_FILE\" not found." >&2
  if [[ "$RUN_MODE" == "executed" ]]; then
    exit 1
  else
    return 1
  fi
fi

if [[ "$RUN_MODE" == "executed" ]]; then
  echo "Hint: source this script to export variables into your current shell:" >&2
  echo "  source $SELF_PATH [path-to-env]" >&2
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

echo "Loaded environment variables from $ENV_FILE"

if [[ "$RUN_MODE" == "executed" ]]; then
  echo "Note: Running this script as a standalone command loads variables only for this process." >&2
  echo "To persist in your shell, run: source $SELF_PATH" >&2
fi
