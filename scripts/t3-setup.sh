#!/bin/sh
set -eu

vp install --frozen-lockfile --prefer-offline

template="${T3CODE_PROJECT_ROOT:-.}/.env.worktree.local"
if [ -f "$template" ] && [ ! -e .env ] && [ ! -L .env ]; then
  cp -n "$template" .env
fi
