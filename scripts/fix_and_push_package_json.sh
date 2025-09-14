#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

BRANCH="fix/package-json"
BACKUP_FILE="package.json.broken"
CLEAN_FILE="package.json.clean"

if [ ! -f "$CLEAN_FILE" ]; then
  echo "Missing $CLEAN_FILE in repo root. Aborting."
  exit 1
fi

echo "Creating branch $BRANCH"
git checkout -b "$BRANCH"

if [ -f package.json ]; then
  echo "Backing up existing package.json to $BACKUP_FILE"
  cp package.json "$BACKUP_FILE"
  git add "$BACKUP_FILE"
fi

echo "Replacing package.json with $CLEAN_FILE"
cp "$CLEAN_FILE" package.json
git add package.json

git commit -m "fix(package.json): replace corrupted manifest with cleaned manifest"

echo "Pushing branch $BRANCH to origin"
git push -u origin "$BRANCH"

echo "Branch pushed. Open a PR from $BRANCH into main and review before merging."
