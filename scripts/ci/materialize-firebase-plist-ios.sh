#!/usr/bin/env bash
set -euo pipefail

LOG_PREFIX="[FIREBASE_PLIST_IOS]"
ROOT_PLIST="GoogleService-Info.plist"
IOS_APP_DIR="ios/AucaradasEncomendas"
IOS_PLIST="${IOS_APP_DIR}/GoogleService-Info.plist"
REQUIRE_NATIVE_IOS_PLIST="${REQUIRE_NATIVE_IOS_PLIST:-0}"

if [ -n "${EAS_BUILD_PLATFORM:-}" ] && [ "${EAS_BUILD_PLATFORM}" != "ios" ] && [ "${REQUIRE_NATIVE_IOS_PLIST}" != "1" ]; then
  echo "${LOG_PREFIX} Skipping because EAS_BUILD_PLATFORM=${EAS_BUILD_PLATFORM}"
  exit 0
fi

echo "${LOG_PREFIX} Ensuring Firebase iOS plist is available"

if [ ! -f "${ROOT_PLIST}" ]; then
  if [ -n "${GOOGLE_SERVICES_INFO_PLIST_BASE64:-}" ]; then
    PLIST_OUT="${ROOT_PLIST}" node <<'NODE'
const fs = require('fs');
const out = process.env.PLIST_OUT;
const value = process.env.GOOGLE_SERVICES_INFO_PLIST_BASE64 || '';
fs.writeFileSync(out, Buffer.from(value, 'base64'));
NODE
    echo "${LOG_PREFIX} Materialized root plist from GOOGLE_SERVICES_INFO_PLIST_BASE64"
  elif [ -n "${GOOGLE_SERVICE_INFO_PLIST:-}" ] && printf '%s' "${GOOGLE_SERVICE_INFO_PLIST}" | grep -q "<plist"; then
    printf '%s' "${GOOGLE_SERVICE_INFO_PLIST}" > "${ROOT_PLIST}"
    echo "${LOG_PREFIX} Materialized root plist from GOOGLE_SERVICE_INFO_PLIST"
  else
    echo "${LOG_PREFIX} ERROR: ${ROOT_PLIST} missing and no usable Firebase plist env var is available" >&2
    exit 1
  fi
else
  echo "${LOG_PREFIX} Root plist already exists"
fi

if [ ! -s "${ROOT_PLIST}" ]; then
  echo "${LOG_PREFIX} ERROR: ${ROOT_PLIST} is empty" >&2
  exit 1
fi

if [ -d "${IOS_APP_DIR}" ]; then
  cp -f "${ROOT_PLIST}" "${IOS_PLIST}"

  if [ ! -s "${IOS_PLIST}" ]; then
    echo "${LOG_PREFIX} ERROR: ${IOS_PLIST} was not created or is empty" >&2
    exit 1
  fi

  BYTES="$(wc -c < "${IOS_PLIST}" | tr -d ' ')"
  echo "${LOG_PREFIX} Native plist ready at ${IOS_PLIST} (${BYTES} bytes)"
else
  if [ "${REQUIRE_NATIVE_IOS_PLIST}" = "1" ]; then
    echo "${LOG_PREFIX} ERROR: ${IOS_APP_DIR} does not exist after prebuild" >&2
    exit 1
  fi

  echo "${LOG_PREFIX} Native iOS directory not present yet; root plist is ready for prebuild"
fi
