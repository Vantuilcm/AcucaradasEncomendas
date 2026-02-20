Param(
  [switch]$Submit
)

Write-Host "Validando ambiente e automatizando build iOS (EAS Cloud)" -ForegroundColor Cyan

$ErrorActionPreference = 'Stop'

# 1) Pré-checagens
Write-Host "Verificando Node e ferramentas" -ForegroundColor Yellow
node -v
npm -v

# 2) Login no EAS (token opcional)
Write-Host "Verificando login no EAS" -ForegroundColor Yellow
try {
  npx eas whoami
} catch {
  if ($env:EAS_TOKEN) {
    Write-Host "Efetuando login com token" -ForegroundColor Yellow
    npx eas login --token $env:EAS_TOKEN
  } else {
    Write-Error "Sem sessão no EAS e sem EAS_TOKEN. Defina $env:EAS_TOKEN para login não interativo."
    exit 1
  }
}

# 3) Saúde do projeto
Write-Host "Typecheck e doctor" -ForegroundColor Yellow
npm run typecheck
npx expo-doctor --verbose

# 4) Build iOS em produção, não-interativo, com cache limpo
Write-Host "Iniciando build iOS (production)" -ForegroundColor Yellow
npx eas build -p ios --profile production --non-interactive --clear-cache

# 5) Exibir últimos builds
Write-Host "Listando últimos builds" -ForegroundColor Yellow
npx eas build:list --limit 5

# 6) Submissão opcional
if ($Submit) {
  Write-Host "Submetendo IPA para App Store Connect (production)" -ForegroundColor Yellow
  npx eas submit -p ios --profile production --non-interactive
}

Write-Host "Fluxo concluído" -ForegroundColor Green

