$ErrorActionPreference = "Continue"

Write-Host "Starting debug restore of @firebase/app..."

$pkgName = "@firebase/app"
$version = "0.9.25"
$scope = "@firebase"
$name = "app"
$targetDir = "..\node_modules\@firebase"
$destPath = Join-Path $targetDir $name

Write-Host "Target Dir: $targetDir"
Write-Host "Dest Path: $destPath"

if (-not (Test-Path $targetDir)) { 
    Write-Host "Creating target dir..."
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null 
}

if (Test-Path $destPath) { 
    Write-Host "Cleaning old dest..."
    Remove-Item $destPath -Recurse -Force -ErrorAction SilentlyContinue 
}

Write-Host "Running npm pack..."
npm pack "$pkgName@$version"

$tarNamePattern = "*$name*.tgz"
$tgz = Get-ChildItem -Filter $tarNamePattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($tgz) {
    Write-Host "Found tarball: $($tgz.Name)"
    New-Item -ItemType Directory -Force -Path $destPath | Out-Null
    
    Write-Host "Extracting to $destPath..."
    tar -xf $tgz.Name -C $destPath --strip-components=1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Extraction successful."
        Remove-Item $tgz.Name
        Get-ChildItem $destPath
    } else {
        Write-Error "Tar extraction failed with code $LASTEXITCODE"
    }
} else {
    Write-Error "Failed to download $pkgName"
}

Write-Host "Debug script finished."
