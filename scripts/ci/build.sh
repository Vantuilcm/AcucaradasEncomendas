#!/usr/bin/env bash
set -euo pipefail

# 🚀 scripts/ci/build.sh - Unified Build Orchestrator Entry Point
# Usage: ./scripts/ci/build.sh <app-id> <environment>

APP_ID="${1:-acucaradas-encomendas}"
ENVIRONMENT="${2:-production}"

echo "🌍 [BUILD-ORCHESTRATOR] Initializing build for $APP_ID in $ENVIRONMENT mode..."

export TARGET_APP="$APP_ID"
export APP_ENV="$ENVIRONMENT"

# 1. Run Pipeline Orchestrator to validate and setup
npx ts-node scripts/ci/PipelineOrchestrator.ts build

# 2. Trigger the Build Guardian
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 [BUILD] Iniciando fluxo iOS..."
    chmod +x ./scripts/ci/ios-build-guardian.sh
    ./scripts/ci/ios-build-guardian.sh
else
    echo "🤖 [BUILD] Iniciando fluxo Android..."
    chmod +x ./scripts/ci/android-build-guardian.sh
    ./scripts/ci/android-build-guardian.sh
fi

# 3. Output results
echo "✅ [BUILD-ORCHESTRATOR] Build process finished for $APP_ID."
npx ts-node scripts/ci/PipelineOrchestrator.ts status
