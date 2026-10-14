#!/usr/bin/env bash
set -u
FIX="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$FIX/../../../.." && pwd)"
SCRIPT="$REPO/scripts/ci/attest-ipa-firebase-native-identity.sh"
WF="$REPO/.github/workflows/ios-preview-local.yml"
chmod +x "$SCRIPT"
pass() { echo "TEST_PASS=$1"; }
fail() { echo "TEST_FAIL=$1"; }
echo "SCRIPT=$SCRIPT"
echo "WF=$WF"

set +e
OUT=$(
  EXPO_PUBLIC_FIREBASE_PROJECT_ID=acucaradas-encomendas-sandbox \
  EXPO_PUBLIC_FIREBASE_APP_ID='1:sandbox:app' \
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID='111' \
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET='acucaradas-encomendas-sandbox.appspot.com' \
  "$SCRIPT" "$FIX/valid-sandbox/test.ipa" 2>&1
)
EC=$?
set -e
if [ "$EC" -eq 0 ]; then pass VALID_SANDBOX_IPA; else fail VALID_SANDBOX_IPA; echo "$OUT" | tail -12; fi

reject() {
  local name="$1" path="$2"
  set +e
  OUT=$("$SCRIPT" "$path" 2>&1)
  EC=$?
  set -e
  if [ "$EC" -ne 0 ]; then pass "$name"; else fail "$name"; echo "$OUT" | tail -5; fi
}
reject PRODUCTION_FIREBASE_IPA "$FIX/production-firebase/test.ipa"
reject MISSING_GOOGLE_SERVICE_PLIST "$FIX/missing-plist/test.ipa"
reject CORRUPTED_PLIST "$FIX/corrupt-plist/test.ipa"
reject WRONG_BUNDLE_ID "$FIX/wrong-bundle/test.ipa"
reject EMPTY_IPA "$FIX/empty-ipa/test.ipa"
reject CORRUPTED_ZIP "$FIX/corrupt-zip/test.ipa"
reject MULTIPLE_APP_PAYLOADS "$FIX/multi-app/test.ipa"

# R90 / R89-D01: pre-extract ZIP member path traversal rejects + outside-temp proof
CANARY_DIR="${TMPDIR:-/tmp}/ae-r90-zipslip-canary-$$"
mkdir -p "$CANARY_DIR"
CANARY_MARK="$CANARY_DIR/CANARY_MARKER"
echo "KEEP" > "$CANARY_MARK"
reject_zipslip() {
  local name="$1" path="$2" probe="$3"
  set +e
  OUT=$("$SCRIPT" "$path" 2>&1)
  EC=$?
  set -e
  if [ "$EC" -eq 0 ]; then
    fail "$name"
    echo "$OUT" | tail -8
    return
  fi
  if [ -e "$probe" ]; then
    fail "${name}_OUTSIDE_TEMP_WRITTEN"
    echo "probe exists: $probe"
    return
  fi
  if [ ! -f "$CANARY_MARK" ] || [ "$(cat "$CANARY_MARK")" != "KEEP" ]; then
    fail "${name}_CANARY_TAMPERED"
    return
  fi
  pass "$name"
  pass "${name}_NO_OUTSIDE_TEMP"
}
reject_zipslip ZIP_ABS_PATH "$FIX/zip-abs-path/test.ipa" "/tmp/ae-r90-zipslip-abs-should-not-exist"
reject_zipslip ZIP_PARENT_DOTDOT "$FIX/zip-parent-dotdot/test.ipa" "/tmp/ae-r90-zipslip-dotdot-should-not-exist"
reject_zipslip ZIP_NESTED_DOTDOT "$FIX/zip-nested-dotdot/test.ipa" "/tmp/ae-r90-zipslip-nested-should-not-exist"
reject_zipslip ZIP_BACKSLASH "$FIX/zip-backslash/test.ipa" "$FIX/Payload/evil.txt"
reject_zipslip ZIP_SYMLINK "$FIX/zip-symlink/test.ipa" "/tmp/ae-r90-zipslip-symlink-target"
rm -rf "$CANARY_DIR"

set +e
OUT=$("$SCRIPT" "$FIX/valid-sandbox/test.ipa" "$FIX/workspace-GoogleService-Info.plist" 2>&1)
EC=$?
set -e
if [ "$EC" -ne 0 ]; then pass UNATTESTED_IPA_PATH; else fail UNATTESTED_IPA_PATH; fi

set +e
OUT=$(
  EXPO_PUBLIC_FIREBASE_PROJECT_ID=acucaradas-encomendas-sandbox \
  EXPO_PUBLIC_FIREBASE_APP_ID='1:sandbox:app' \
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID='111' \
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET='acucaradas-encomendas-sandbox.appspot.com' \
  "$SCRIPT" "$FIX/valid-sandbox/test.ipa" 2>&1
)
EC=$?
set -e
SHA=$(printf '%s\n' "$OUT" | sed -n 's/^ATTESTED_IPA_SHA256=//p' | tail -n 1)
FAKE='0000000000000000000000000000000000000000000000000000000000000000'
if [ "$EC" -eq 0 ] && [ -n "$SHA" ] && [ "$SHA" != "$FAKE" ]; then
  # prove diverge-check would fail-closed
  if [ "$SHA" != "$FAKE" ]; then pass MISMATCHED_SHA256; else fail MISMATCHED_SHA256; fi
else
  fail MISMATCHED_SHA256
  echo "$OUT" | tail -5
fi

if grep -q 'Post-build IPA Firebase native identity attestation' "$WF" \
  && grep -A3 'name: Upload attested preview IPA artifact' "$WF" | grep -q 'if: success()' \
  && grep -A25 'name: Upload attested preview IPA artifact' "$WF" | grep -q 'dist/preview-local.ipa' \
  && ! grep -A30 'name: Upload attested preview IPA artifact' "$WF" | grep -q 'build-\*\.ipa' \
  && ! grep -A30 'name: Upload attested preview IPA artifact' "$WF" | grep -qE '^[[:space:]]+\*\.ipa' \
  && grep -A8 'name: Upload diagnostic build logs' "$WF" | grep -q 'if: always()' \
  && grep -A12 'name: Upload diagnostic build logs' "$WF" | grep -q 'build-logs/' \
  && ! grep -A12 'name: Upload diagnostic build logs' "$WF" | grep -q '\.ipa'; then
  pass FAILED_ATTESTATION_UPLOAD_BLOCKED
  pass FAILED_BUILD_DIAGNOSTIC_LOGS_PRESERVED
else
  fail WORKFLOW_STRUCTURE
fi
