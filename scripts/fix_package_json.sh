#!/usr/bin/env bash
# Run this locally to replace the corrupted package.json with the cleaned template on a new branch.
set -euo pipefail

CLEAN_FILE="package.json.clean"
TARGET_FILE="package.json"
BRANCH="fix/package-json"

if [ ! -f "$CLEAN_FILE" ]; then
  echo "Missing $CLEAN_FILE in repo root. Aborting."
  exit 1
fi

echo "Creating branch $BRANCH and replacing $TARGET_FILE with $CLEAN_FILE"

git checkout -b "$BRANCH"
cp "$CLEAN_FILE" "$TARGET_FILE"
git add "$TARGET_FILE"
git commit -m "fix: replace corrupted package.json with cleaned template"

echo "Created branch $BRANCH with fixed package.json. Push with: git push -u origin $BRANCH"
