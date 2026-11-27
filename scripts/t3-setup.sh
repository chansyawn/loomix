#!/bin/sh
set -eu

source_env="${T3CODE_PROJECT_ROOT:-.}/.env"
if [ -f "$source_env" ] && [ ! -e .env ] && [ ! -L .env ]; then
  (umask 077; cp -n "$source_env" .env)
fi

vp install --frozen-lockfile --prefer-offline
sh scripts/t3-resources.sh --prepare
