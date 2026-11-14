#!/usr/bin/env bash
# Copy the Code Studio editor into the admin's Banner Studio (public/code-studio/).
# Same idea as Code-Studio/tools/sync-magento-editor.sh: the editor lives in the Code Studio
# repo and every host (WordPress, Magento, this admin) runs an identical copy.
# Do not edit public/code-studio/editor.js or editor.css here: change them in Code Studio, then run this.
#
#   npm run sync:code-studio
#   CODE_STUDIO_DIR=~/Desktop/apps/Code-Studio CODE_STUDIO_BRANCH=magento-extension npm run sync:code-studio
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${CODE_STUDIO_DIR:-$HOME/Desktop/apps/Code-Studio}"
BRANCH="${CODE_STUDIO_BRANCH:-magento-extension}"
OUT=public/code-studio
mkdir -p "$OUT"
git -C "$REPO" show "$BRANCH:justinnovate-code-studio/editor/js/editor.js" > "$OUT/editor.js"
git -C "$REPO" show "$BRANCH:justinnovate-code-studio/editor/css/editor.css" > "$OUT/editor.css"
SHA="$(git -C "$REPO" rev-parse --short "$BRANCH")"
printf '%s\n' "$SHA" > "$OUT/VERSION"
echo "Banner Studio editor synced from Code Studio $BRANCH ($SHA)."
