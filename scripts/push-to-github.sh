#!/usr/bin/env bash
set -e

REPO_URL="https://mdmahinpro:${GITHUB_TOKEN}@github.com/mdmahinpro/coaching-techely.git"

# Remove existing github remote if present, add fresh one
git remote remove github 2>/dev/null || true
git remote add github "$REPO_URL"

# Push main branch
git push github main --force

echo "Done — pushed to https://github.com/mdmahinpro/coaching-techely"
