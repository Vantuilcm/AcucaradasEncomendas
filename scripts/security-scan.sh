#!/bin/bash

# RellBuild Security Scan Script
# Checks for hardcoded secrets and sensitive files

EXIT_CODE=0

echo "--- RellBuild Security Scan ---"

# Patterns to scan for
PATTERNS=("AIza" "private_key" "BEGIN PRIVATE KEY" "BEGIN RSA PRIVATE KEY" "client_secret" "client_id")

# Files to scan (excluding node_modules, .expo, .git, backup-protecao, and common public assets)
FILES=$(find . -maxdepth 4 -not -path '*/.*' -not -path './node_modules/*' -not -path './backup-protecao/*' -not -path './assets/*' -type f \( -name "*.js" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" -o -name "*.plist" \))

for pattern in "${PATTERNS[@]}"; do
  # Search for pattern in files, ignoring placeholders and .env files
  FOUND=$(grep -rE "$pattern" $FILES | grep -v "SUBSTITUIR_POR" | grep -v ".env" | grep -v "google-services.json" | grep -v "GoogleService-Info.plist")
  
  if [ ! -z "$FOUND" ]; then
    echo "CRITICAL: Potential secret leaked in code: $pattern"
    echo "$FOUND"
    EXIT_CODE=1
  fi
done

# Check for sensitive files that should not be in the repo
SENSITIVE_FILES=(".p12" ".jks" ".keystore" ".pem")
for ext in "${SENSITIVE_FILES[@]}"; do
  FOUND_FILES=$(find . -name "*$ext" -not -path "./node_modules/*")
  if [ ! -z "$FOUND_FILES" ]; then
    echo "CRITICAL: Sensitive file found in repository: $FOUND_FILES"
    EXIT_CODE=1
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "Security Scan: PASSED"
else
  echo "Security Scan: FAILED - Builds blocked until fixed."
fi

exit $EXIT_CODE
