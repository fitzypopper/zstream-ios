#!/usr/bin/env bash
# Preflight check for the ZStream iOS build.
# Catches deterministic build failures locally, before burning a CI run.
#
# Checks:
#   1. Every PBXFileReference in project.pbxproj resolves to a real file
#      relative to SOURCE_ROOT (the .xcodeproj directory). This would have
#      caught the "app/ios/app/ios/..." duplicate-path bug instantly.
#   2. Info.plist is valid XML and has the expected keys.
#   3. Swift files listed in a Sources build phase exist.
#
# Usage: scripts/preflight.sh   (exit 0 = OK, non-zero = problems found)

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROJ_DIR="$ROOT/app/ios"
PBX="$PROJ_DIR/pstream.xcodeproj/project.pbxproj"
PLIST="$PROJ_DIR/pstream/Info.plist"

errors=0
warn=0

say_err() { echo "  [FAIL] $*"; errors=$((errors + 1)); }
say_warn() { echo "  [WARN] $*"; warn=$((warn + 1)); }

echo "== ZStream preflight =="

# --- 1. PBXFileReference paths ---
if [ ! -f "$PBX" ]; then
    say_err "missing $PBX"
else
    echo "-- Checking PBXFileReference paths --"
    # Extract name=...; path=...; sourceTree=... triples from file reference lines.
    grep -oE '\* / [^;]*\}\.swift' "$PBX" >/dev/null 2>&1 || true
    # Simpler: iterate each PBXFileReference's path=...
    while IFS= read -r line; do
        name=$(printf '%s' "$line" | sed -n 's/.*\/\* *\([^*]*\) *\*\/.*/\1/p')
        path=$(printf '%s' "$line" | sed -n 's/.*[ ;]path = \("[^"]*"\|[^;]*\);.*/\1/p' | tr -d '"')
        tree=$(printf '%s' "$line" | sed -n 's/.*sourceTree = \([^;]*\);.*/\1/p')
        [ -z "$path" ] && continue

        case "$tree" in
            SOURCE_ROOT)
                # Resolve relative to the .xcodeproj directory.
                resolved="$PROJ_DIR/$path"
                ;;
            "<group>")
                # Group-relative: try a few common anchor points.
                if [ -f "$PROJ_DIR/$path" ]; then
                    resolved="$PROJ_DIR/$path"
                elif [ -f "$PROJ_DIR/pstream/$path" ]; then
                    resolved="$PROJ_DIR/pstream/$path"
                else
                    say_warn "group-relative path not resolved (skipped): $path"
                    continue
                fi
                ;;
            *)
                continue
                ;;
        esac

        if [ ! -e "$resolved" ]; then
            say_err "unresolved path ($tree): $path  ->  $resolved"
        fi
    done < <(grep -E '^\s+[0-9A-F]{24} /\* .* \*/\s*=\s*\{isa = PBXFileReference;' "$PBX")

    # Guard against the classic prefix bug: no path may start with the repo
    # layout prefix that SOURCE_ROOT already contributes.
    if grep -qE 'path = (app/ios|ios)/' "$PBX"; then
        say_err "path pre-prefixed with source-root dir: app/ios/ or ios/ found"
    fi
fi

# --- 2. Info.plist ---
echo "-- Checking Info.plist --"
if [ ! -f "$PLIST" ]; then
    say_err "missing $PLIST"
else
    if ! plutil -lint "$PLIST" >/dev/null 2>&1; then
        # plutil not on Linux; fall back to python xml parser.
        if ! python3 -c "import xml.dom.minidom,sys; xml.dom.minidom.parse(sys.argv[1])" "$PLIST" 2>/dev/null; then
            say_err "Info.plist is not valid XML"
        else
            echo "  Info.plist XML OK"
        fi
    else
        echo "  Info.plist plutil OK"
    fi
    for key in CFBundleIdentifier CFBundleName TMDB_API_KEY BACKEND_URL; do
        grep -q "<key>$key</key>" "$PLIST" || say_warn "Info.plist missing expected key: $key"
    done
fi

# --- 3. Swift sources vs build phase ---
echo "-- Checking Swift sources exist --"
trim() { printf '%s' "$1" | xargs; }
while IFS= read -r line; do
    # PBXBuildFile refs in Sources phase:
    #   XX /* FileName.swift in Sources */ = {isa = PBXBuildFile; fileRef = YY; }
    ref=$(printf '%s' "$line" | sed -n 's/.*fileRef = \([0-9A-F]\{24\}\).*/\1/p')
    [ -z "$ref" ] && continue
    # The PBXFileReference declaration for that ref carries the display name.
    decl=$(grep -E "^[[:space:]]*${ref} /\* .* \*/ = \{isa = PBXFileReference;" "$PBX")
    [ -z "$decl" ] && continue
    file=$(printf '%s' "$decl" | sed -n 's/.*\/\* *\([^*]*\) *\*\/.*/\1/p' | tr -d ' ')
    [ -z "$file" ] && continue
    found=$(find "$PROJ_DIR/pstream" -name "$file" 2>/dev/null | head -1)
    if [ -z "$found" ]; then
        say_err "source file not found anywhere: $file"
    fi
done < <(grep -E 'in Sources \*/ = \{isa = PBXBuildFile;' "$PBX")

# --- Summary ---
echo ""
if [ "$errors" -gt 0 ]; then
    echo "== $errors error(s), $warn warning(s) — fix before pushing =="
    exit 1
elif [ "$warn" -gt 0 ]; then
    echo "== OK ($warn warning(s)) =="
    exit 0
else
    echo "== All checks passed =="
    exit 0
fi