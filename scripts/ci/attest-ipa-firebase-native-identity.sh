#!/usr/bin/env bash
# AE post-build IPA Firebase native identity attestation (Preview Sandbox fail-closed).
# Reads GoogleService-Info.plist FROM INSIDE the IPA only — never workspace plist as substitute.
# Does not modify, repackage, or resign the IPA.
# Does not print API_KEY or full plist contents.
set -euo pipefail

EXPECTED_PROJECT_ID='acucaradas-encomendas-sandbox'
REJECTED_PRODUCTION_PROJECT_ID='acucaradas-encomendas'
EXPECTED_BUNDLE_ID='com.acucaradas.encomendas'

fail() {
  echo "::error::IPA_FIREBASE_NATIVE_ATTESTATION_FAIL: $1"
  exit 1
}

IPA_PATH="${1:-}"
if [ -z "$IPA_PATH" ]; then
  fail "usage: attest-ipa-firebase-native-identity.sh <path-to-ipa>"
fi

# Reject workspace plist substitution attempts (explicit forbidden second arg / env override tricks)
if [ "${AE_ATTEST_ALLOW_WORKSPACE_PLIST:-}" = "1" ]; then
  fail "workspace plist substitution is forbidden"
fi
if [ -n "${2:-}" ]; then
  fail "unexpected extra argument (embedded IPA plist only; no workspace plist path)"
fi

if [ ! -f "$IPA_PATH" ]; then
  fail "IPA missing: $IPA_PATH"
fi
if [ ! -s "$IPA_PATH" ]; then
  fail "IPA empty: $IPA_PATH"
fi

# Integrity fingerprint of the exact file under attestation
if command -v shasum >/dev/null 2>&1; then
  ATTESTED_IPA_SHA256="$(shasum -a 256 "$IPA_PATH" | awk '{print $1}')"
elif command -v sha256sum >/dev/null 2>&1; then
  ATTESTED_IPA_SHA256="$(sha256sum "$IPA_PATH" | awk '{print $1}')"
else
  fail "neither shasum nor sha256sum available"
fi
if [ -z "$ATTESTED_IPA_SHA256" ] || [ "${#ATTESTED_IPA_SHA256}" -ne 64 ]; then
  fail "failed to compute IPA SHA256"
fi

TMPDIR_ATTEST="$(mktemp -d "${TMPDIR:-/tmp}/ae-ipa-attest.XXXXXX")"
cleanup() { rm -rf "$TMPDIR_ATTEST"; }
trap cleanup EXIT

# Corrupted zip / invalid IPA
if ! unzip -tqq "$IPA_PATH" >/dev/null 2>&1; then
  fail "IPA is not a valid zip/IPA archive"
fi

# R90 / R89-D01: fail-closed ZIP member path inspection BEFORE any extract.
# Do not rely on post-extract plist prefix checks to stop zip-slip writes.
assert_safe_zip_members() {
  local ipa="$1"
  local listing=""
  local member=""
  local rest=""
  local part=""

  if ! command -v zipinfo >/dev/null 2>&1; then
    fail "zipinfo required for pre-extraction ZIP member validation"
  fi

  # Reject symbolic-link members (zipinfo permission column starts with 'l')
  if zipinfo "$ipa" 2>/dev/null | grep -E '^l' >/dev/null 2>&1; then
    fail "ZIP contains symlink member (escape risk)"
  fi

  if ! listing="$(zipinfo -1 "$ipa" 2>/dev/null)"; then
    fail "ZIP member listing failed"
  fi
  if [ -z "$(printf '%s' "$listing" | tr -d '[:space:]')" ]; then
    fail "ZIP member listing empty"
  fi

  while IFS= read -r member || [ -n "$member" ]; do
    [ -z "$member" ] && continue

    # Absolute / UNC / drive-letter paths
    case "$member" in
      /*|\\*)
        fail "ZIP member has absolute path"
        ;;
    esac
    if printf '%s' "$member" | grep -Eq '^[A-Za-z]:[\\/]'; then
      fail "ZIP member has drive-letter absolute path"
    fi

    # Platform-ambiguous separators (reject before extract)
    case "$member" in
      *\\*)
        fail "ZIP member contains backslash path separator"
        ;;
    esac

    # Null byte / control chars in member names
    if printf '%s' "$member" | grep -Eq $'[\x00-\x1f]'; then
      fail "ZIP member contains control characters"
    fi

    # Reject ".." path components (including nested)
    rest="$member"
    while :; do
      case "$rest" in
        */*)
          part="${rest%%/*}"
          rest="${rest#*/}"
          ;;
        *)
          part="$rest"
          rest=""
          ;;
      esac
      if [ "$part" = ".." ]; then
        fail "ZIP member contains parent-directory component"
      fi
      # Empty segment from leading/duplicate slashes — reject ambiguity
      if [ -z "$part" ] && [ -n "$rest" ]; then
        fail "ZIP member has empty path segment"
      fi
      [ -z "$rest" ] && break
    done
  done <<EOF
$listing
EOF
}

assert_safe_zip_members "$IPA_PATH"

if ! unzip -q "$IPA_PATH" -d "$TMPDIR_ATTEST"; then
  fail "IPA extraction failed"
fi

# Post-extract containment: every extracted path must remain under TMPDIR_ATTEST
# (defense-in-depth; primary control is pre-extraction member validation).
if command -v find >/dev/null 2>&1; then
  while IFS= read -r extracted || [ -n "$extracted" ]; do
    [ -z "$extracted" ] && continue
    case "$extracted" in
      "$TMPDIR_ATTEST"/*) ;;
      "$TMPDIR_ATTEST") ;;
      *)
        fail "extracted path escaped attestation temp directory"
        ;;
    esac
  done <<EOF
$(find "$TMPDIR_ATTEST" 2>/dev/null || true)
EOF
fi

# Exactly one Payload/*.app (bash 3.2-portable; no mapfile)
APP_LIST_FILE="$TMPDIR_ATTEST/app-dirs.txt"
find "$TMPDIR_ATTEST/Payload" -maxdepth 1 -mindepth 1 -type d -name '*.app' 2>/dev/null | sort > "$APP_LIST_FILE" || true
APP_COUNT="$(wc -l < "$APP_LIST_FILE" | tr -d ' ')"
if [ -z "$APP_COUNT" ] || [ "$APP_COUNT" -eq 0 ]; then
  fail "no Payload/*.app found inside IPA"
fi
if [ "$APP_COUNT" -gt 1 ]; then
  fail "multiple Payload/*.app directories found ($APP_COUNT)"
fi
APP_DIR="$(head -n 1 "$APP_LIST_FILE")"
if [ -z "$APP_DIR" ] || [ ! -d "$APP_DIR" ]; then
  fail "Payload/*.app path unresolved"
fi

PLIST_PATH="$APP_DIR/GoogleService-Info.plist"
# Must be under extract tree (embedded), never an absolute workspace override
case "$PLIST_PATH" in
  "$TMPDIR_ATTEST"/*) ;;
  *) fail "plist path escaped attestation extract tree" ;;
esac
if [ ! -f "$PLIST_PATH" ]; then
  fail "GoogleService-Info.plist missing inside .app"
fi
if [ ! -s "$PLIST_PATH" ]; then
  fail "GoogleService-Info.plist empty inside .app"
fi

plist_get() {
  local key="$1"
  local val=""
  if [ -x /usr/libexec/PlistBuddy ]; then
    if ! val="$(/usr/libexec/PlistBuddy -c "Print :${key}" "$PLIST_PATH" 2>/dev/null)"; then
      fail "plist field ${key} unreadable"
    fi
  else
    # XML-only fallback for local fixture tests on non-macOS (CI macOS uses PlistBuddy).
    local xml
    xml="$(tr -d '\r' < "$PLIST_PATH" | tr '\n' ' ')"
    if ! printf '%s' "$xml" | grep -q '<plist'; then
      fail "plist field ${key} unreadable (binary plist requires PlistBuddy / macOS)"
    fi
    val="$(printf '%s' "$xml" | sed -n "s/.*<key>${key}<\\/key>[[:space:]]*<string>\\([^<]*\\)<\\/string>.*/\\1/p" | head -n 1)"
    if [ -z "$val" ]; then
      fail "plist field ${key} unreadable"
    fi
  fi
  val="$(printf '%s' "$val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  if [ -z "$val" ]; then
    fail "plist field ${key} empty"
  fi
  printf '%s' "$val"
}

PROJECT_ID="$(plist_get PROJECT_ID)"
BUNDLE_ID="$(plist_get BUNDLE_ID)"
GOOGLE_APP_ID="$(plist_get GOOGLE_APP_ID)"
GCM_SENDER_ID="$(plist_get GCM_SENDER_ID)"
STORAGE_BUCKET="$(plist_get STORAGE_BUCKET)"
# Read API_KEY only for presence/length gate — never print it
API_KEY_LEN="$(plist_get API_KEY | awk '{print length($0)}')"

if [ "$PROJECT_ID" = "$REJECTED_PRODUCTION_PROJECT_ID" ]; then
  fail "PROJECT_ID is Production (${REJECTED_PRODUCTION_PROJECT_ID})"
fi
if [ "$PROJECT_ID" != "$EXPECTED_PROJECT_ID" ]; then
  fail "PROJECT_ID identity mismatch (expected ${EXPECTED_PROJECT_ID})"
fi
if [ "$BUNDLE_ID" != "$EXPECTED_BUNDLE_ID" ]; then
  fail "BUNDLE_ID identity mismatch"
fi
if [ "$API_KEY_LEN" -lt 10 ]; then
  fail "embedded API_KEY too short"
fi

# Optional cross-check against already-validated Preview Sandbox env (when present)
if [ -n "${EXPO_PUBLIC_FIREBASE_PROJECT_ID:-}" ] && [ "$EXPO_PUBLIC_FIREBASE_PROJECT_ID" != "$EXPECTED_PROJECT_ID" ]; then
  fail "EXPO_PUBLIC_FIREBASE_PROJECT_ID env is not Sandbox while attesting IPA"
fi
if [ -n "${EXPO_PUBLIC_FIREBASE_PROJECT_ID:-}" ] && [ "$PROJECT_ID" != "$EXPO_PUBLIC_FIREBASE_PROJECT_ID" ]; then
  fail "PROJECT_ID diverges from EXPO_PUBLIC_FIREBASE_PROJECT_ID"
fi
if [ -n "${EXPO_PUBLIC_FIREBASE_APP_ID:-}" ] && [ "$GOOGLE_APP_ID" != "$EXPO_PUBLIC_FIREBASE_APP_ID" ]; then
  fail "GOOGLE_APP_ID diverges from EXPO_PUBLIC_FIREBASE_APP_ID"
fi
if [ -n "${EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:-}" ] && [ "$GCM_SENDER_ID" != "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" ]; then
  fail "GCM_SENDER_ID diverges from EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
fi
if [ -n "${EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:-}" ] && [ "$STORAGE_BUCKET" != "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" ]; then
  fail "STORAGE_BUCKET diverges from EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
fi

echo "ATTESTED_IPA_PATH=$IPA_PATH"
echo "ATTESTED_IPA_SHA256=$ATTESTED_IPA_SHA256"
echo "ATTESTED_FIREBASE_PROJECT_ID=$PROJECT_ID"
echo "ATTESTED_BUNDLE_ID=$BUNDLE_ID"
echo "IPA_FIREBASE_NATIVE_ATTESTATION=PASS"

# Export for GitHub Actions when available
if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "ATTESTED_IPA_PATH=$IPA_PATH"
    echo "ATTESTED_IPA_SHA256=$ATTESTED_IPA_SHA256"
  } >> "$GITHUB_ENV"
fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### IPA Firebase native attestation"
    echo ""
    echo "| Field | Value |"
    echo "|-------|-------|"
    echo "| Path | \`$IPA_PATH\` |"
    echo "| SHA256 | \`$ATTESTED_IPA_SHA256\` |"
    echo "| PROJECT_ID | \`$PROJECT_ID\` |"
    echo "| BUNDLE_ID | \`$BUNDLE_ID\` |"
    echo "| Result | PASS |"
  } >> "$GITHUB_STEP_SUMMARY"
fi

exit 0
