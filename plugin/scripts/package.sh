#!/usr/bin/env bash
#
# Collects the built formats, the install guide and the licences into one zip:
#
#   scripts/package.sh <Windows|macOS|Linux> <artefacts-dir> <out-dir>
#
# <artefacts-dir> is the build's Observateur_artefacts/Release folder. Every
# format expected on that platform must be present; a missing one fails the
# script rather than shipping a zip without it.
set -euo pipefail

platform="$1"
artefacts="$2"
out="$3"

root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(sed -n 's/^project(ACND_OBSERVATEUR VERSION \([0-9.]*\).*/\1/p' "$root/CMakeLists.txt")"
name="ACND-Observateur-${version}-${platform}"

stage="$(mktemp -d)"
bundle="$stage/$name"
mkdir -p "$bundle/licenses"

require() {
    if [ ! -e "$1" ]; then
        echo "missing build output: $1" >&2
        exit 1
    fi
    cp -R "$1" "$bundle/"
}

require "$artefacts/VST3/ACND Observateur.vst3"
require "$artefacts/CLAP/ACND Observateur.clap"

case "$platform" in
    macOS)
        require "$artefacts/AU/ACND Observateur.component"
        require "$artefacts/Standalone/ACND Observateur.app"
        # Apple Silicon refuses to load unsigned code. An ad-hoc signature is
        # enough to run; a Developer ID signature (see README) removes the
        # Gatekeeper warning as well.
        for b in "$bundle"/*.vst3 "$bundle"/*.component "$bundle"/*.clap "$bundle"/*.app; do
            codesign --force --sign - --timestamp=none "$b"
        done
        ;;
    Windows)
        require "$artefacts/Standalone/ACND Observateur.exe"
        ;;
    Linux)
        require "$artefacts/LV2/ACND Observateur.lv2"
        require "$artefacts/Standalone/ACND Observateur"
        ;;
    *)
        echo "unknown platform: $platform" >&2
        exit 1
        ;;
esac

cp "$root/packaging/INSTALL.txt" "$bundle/"
cp "$root/THIRD_PARTY_NOTICES.md" "$root"/assets/fonts/OFL-*.txt "$bundle/licenses/"

mkdir -p "$out"
out="$(cd "$out" && pwd)"
rm -f "$out/$name.zip"

cd "$stage"
case "$platform" in
    macOS)   ditto -c -k --keepParent "$name" "$out/$name.zip" ;;
    Windows) 7z a -tzip "$out/$name.zip" "$name" > /dev/null ;;
    Linux)   zip -qr -y "$out/$name.zip" "$name" ;;
esac

rm -rf "$stage"
echo "$out/$name.zip"
