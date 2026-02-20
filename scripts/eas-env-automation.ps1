param(
  [switch]$CheckOnly = $false,
  [string]$StripeProdKey = "",
  [string]$OneSignalAppId = "",
  [switch]$ApplyToPreview = $true,
  [switch]$ApplyToDevelopment = $true
)
function Run {
  param([string[]]$ArgList)
  $cmd = Get-Command eas -ErrorAction SilentlyContinue
  if ($cmd) {
    & eas @ArgList
  } else {
    & npx eas-cli @ArgList
  }
}
$whoami = Run @("whoami")
if ($LASTEXITCODE -ne 0 -or ($whoami -join " ") -match "Not logged in") {
  Write-Host "ERRO: Faça login com 'eas login' antes de continuar."
  exit 1
}
function GetEnvJson {
  param([string]$Environment)
  $out = Run @("env:list", $Environment, "--format", "json", "--scope", "project")
  if ($LASTEXITCODE -ne 0 -or -not $out) {
    $out = Run @("env:list", $Environment, "--json", "--scope", "project")
  }
  try {
    return ($out | ConvertFrom-Json)
  } catch {
    return @()
  }
}
function HasVar {
  param([object[]]$Vars, [string]$Name)
  foreach ($v in $Vars) {
    if ($v.name -eq $Name) { return $true }
  }
  return $false
}
function CreateVar {
  param([string]$Environment, [string]$Name, [string]$Value)
  Write-Host "Criando $Name em $Environment"
  Run @("env:create", $Environment, "--name", $Name, "--type", "string", "--visibility", "secret", "--scope", "project", "--value", $Value)
  return $LASTEXITCODE
}
Write-Host "Verificando variáveis em production, preview e development"
$prodVars = GetEnvJson "production"
$prevVars = GetEnvJson "preview"
$devVars = GetEnvJson "development"
$prodStripeOk = (HasVar $prodVars "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD") -or (HasVar $prodVars "STRIPE_PUBLISHABLE_KEY_PROD")
$prodOneSignalOk = HasVar $prodVars "EXPO_PUBLIC_ONESIGNAL_APP_ID"
$prevOneSignalOk = HasVar $prevVars "EXPO_PUBLIC_ONESIGNAL_APP_ID"
$devOneSignalOk = HasVar $devVars "EXPO_PUBLIC_ONESIGNAL_APP_ID"
$prodStripeState = $(if ($prodStripeOk) { "OK" } else { "FALTANDO" })
$prodOneSignalState = $(if ($prodOneSignalOk) { "OK" } else { "FALTANDO" })
$prevOneSignalState = $(if ($prevOneSignalOk) { "OK" } else { "FALTANDO" })
$devOneSignalState = $(if ($devOneSignalOk) { "OK" } else { "FALTANDO" })
Write-Host "production: STRIPE_PROD=$prodStripeState ONE_SIGNAL=$prodOneSignalState"
Write-Host "preview:    ONE_SIGNAL=$prevOneSignalState"
Write-Host "development: ONE_SIGNAL=$devOneSignalState"
if (-not $CheckOnly) {
  if ($StripeProdKey -and -not $prodStripeOk) {
    $code = CreateVar "production" "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD" $StripeProdKey
    if ($code -ne 0) { Write-Host "Falha ao criar EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD" }
  }
  if ($OneSignalAppId) {
    if (-not $prodOneSignalOk) {
      $code = CreateVar "production" "EXPO_PUBLIC_ONESIGNAL_APP_ID" $OneSignalAppId
      if ($code -ne 0) { Write-Host "Falha ao criar EXPO_PUBLIC_ONESIGNAL_APP_ID em production" }
    }
    if ($ApplyToPreview -and -not $prevOneSignalOk) {
      $code = CreateVar "preview" "EXPO_PUBLIC_ONESIGNAL_APP_ID" $OneSignalAppId
      if ($code -ne 0) { Write-Host "Falha ao criar EXPO_PUBLIC_ONESIGNAL_APP_ID em preview" }
    }
    if ($ApplyToDevelopment -and -not $devOneSignalOk) {
      $code = CreateVar "development" "EXPO_PUBLIC_ONESIGNAL_APP_ID" $OneSignalAppId
      if ($code -ne 0) { Write-Host "Falha ao criar EXPO_PUBLIC_ONESIGNAL_APP_ID em development" }
    }
  }
  Write-Host "Revalidando após criação"
  $prodVars = GetEnvJson "production"
  $prevVars = GetEnvJson "preview"
  $devVars = GetEnvJson "development"
  $prodStripeOk = (HasVar $prodVars "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY_PROD") -or (HasVar $prodVars "STRIPE_PUBLISHABLE_KEY_PROD")
  $prodOneSignalOk = HasVar $prodVars "EXPO_PUBLIC_ONESIGNAL_APP_ID"
  $prevOneSignalOk = HasVar $prevVars "EXPO_PUBLIC_ONESIGNAL_APP_ID"
  $devOneSignalOk = HasVar $devVars "EXPO_PUBLIC_ONESIGNAL_APP_ID"
  $prodStripeState = $(if ($prodStripeOk) { "OK" } else { "FALTANDO" })
  $prodOneSignalState = $(if ($prodOneSignalOk) { "OK" } else { "FALTANDO" })
  $prevOneSignalState = $(if ($prevOneSignalOk) { "OK" } else { "FALTANDO" })
  $devOneSignalState = $(if ($devOneSignalOk) { "OK" } else { "FALTANDO" })
  Write-Host "production: STRIPE_PROD=$prodStripeState ONE_SIGNAL=$prodOneSignalState"
  Write-Host "preview:    ONE_SIGNAL=$prevOneSignalState"
  Write-Host "development: ONE_SIGNAL=$devOneSignalState"
}
