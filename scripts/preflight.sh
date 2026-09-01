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
#   4. Common Swift compile pitfalls (shape-style colors, etc.)
#   5. pbxproj duplicate file references (same path added twice)
#   6. TypeScript type-check (if tsc available)
#   7. RN bundle dry-run (if node_modules present)
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
    while IFS= read -r line; do
        name=$(printf '%s' "$line" | sed -n 's/.*\/\* *\([^*]*\) *\*\/.*/\1/p')
        path=$(printf '%s' "$line" | sed -n 's/.*[ ;]path = \("[^"]*"\|[^;]*\);.*/\1/p' | tr -d '"')
        tree=$(printf '%s' "$line" | sed -n 's/.*sourceTree = \([^;]*\);.*/\1/p')
        [ -z "$path" ] && continue

        case "$tree" in
            SOURCE_ROOT)
                resolved="$PROJ_DIR/$path"
                ;;
            "<group>")
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

    # Detect duplicate file references (same path, different IDs) — causes
    # "duplicate symbol" or "multiple commands produce" at build time.
    echo "-- Checking for duplicate file references --"
    duplicate_paths=$(
        grep -E '^\s+[0-9A-F]{24} /\* .* \*/\s*=\s*\{isa = PBXFileReference;' "$PBX" |
        sed -n 's/.*path = "\([^"]*\)".*/\1/p' |
        sort | uniq -d
    )
    if [ -n "$duplicate_paths" ]; then
        echo "$duplicate_paths" | while IFS= read -r p; do
            say_err "duplicate file reference path: $p"
        done
    fi
fi

# --- 2. Info.plist ---
echo "-- Checking Info.plist --"
if [ ! -f "$PLIST" ]; then
    say_err "missing $PLIST"
else
    if ! plutil -lint "$PLIST" >/dev/null 2>&1; then
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
    # ATS check: warn if arbitrary loads disabled but backend might use http
    if ! grep -A1 'NSAllowsArbitraryLoads' "$PLIST" | grep -q 'true'; then
        say_warn "NSAllowsArbitraryLoads is not true — http backend will fail"
    fi
fi

# --- 3. Swift sources vs build phase ---
echo "-- Checking Swift sources exist --"
while IFS= read -r line; do
    ref=$(printf '%s' "$line" | sed -n 's/.*fileRef = \([0-9A-F]\{24\}\).*/\1/p')
    [ -z "$ref" ] && continue
    decl=$(grep -E "^[[:space:]]*${ref} /\* .* \*/ = \{isa = PBXFileReference;" "$PBX")
    [ -z "$decl" ] && continue
    file=$(printf '%s' "$decl" | sed -n 's/.*\/\* *\([^*]*\) *\*\/.*/\1/p' | tr -d ' ')
    [ -z "$file" ] && continue
    found=$(find "$PROJ_DIR/pstream" -name "$file" 2>/dev/null | head -1)
    if [ -z "$found" ]; then
        say_err "source file not found anywhere: $file"
    fi
done < <(grep -E 'in Sources \*/ = \{isa = PBXBuildFile;' "$PBX")

# --- 4. Common Swift compile pitfalls ---
echo "-- Checking Swift for known compile pitfalls --"
while IFS= read -r f; do
    if grep -qE '\.foregroundColor\(\.(tertiary|quaternary)\)' "$f"; then
        say_err "invalid shape-style color in $f: .foregroundColor(.tertiary/.quaternary) is not a Color; use a Color e.g. ZStreamTheme.tertiaryText"
    fi
    # Force-unwrap in critical paths (Keychain, network)
    if grep -qE 'try!\|as!\|!\s*$' "$f"; then
        say_warn "potential force-unwrap in $f — consider safe handling"
    fi
done < <(find "$PROJ_DIR/pstream/Swift" -name '*.swift')

# --- 5. TypeScript type-check (if available) ---
if [ -f "$ROOT/app/package.json" ] && [ -d "$ROOT/app/node_modules" ]; then
    echo "-- TypeScript type-check --"
    if command -v npx >/dev/null 2>&1; then
        if ! npx --package=typescript tsc --noEmit --project "$ROOT/app/tsconfig.json" 2>&1 | grep -v "baseline-browser" | grep -qE "^.*\.ts\(x\)?:[0-9]+: error TS"; then
            echo "  TypeScript OK"
        else
            say_err "TypeScript errors (run 'npx tsc --noEmit' for details)"
        fi
    fi
fi

# --- 6. RN bundle dry-run (if node_modules present) ---
if [ -d "$ROOT/app/node_modules" ] && command -v npx >/dev/null 2>&1; then
    echo "-- RN bundle dry-run --"
    if npx react-native bundle \
        --entry-file "$ROOT/app/index.js" \
        --platform ios \
        --dev false \
        --bundle-output /dev/null \
        --assets-dest /dev/null 2>&1 |
    grep -qE "error|Error"; then
        say_err "React Native bundle failed (run manually for details)"
    else
        echo "  RN bundle OK"
    fi
fi

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