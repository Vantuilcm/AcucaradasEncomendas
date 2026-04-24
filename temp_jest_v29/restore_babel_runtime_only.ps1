$ErrorActionPreference = "Stop"
Start-Transcript -Path "restore_log.txt" -Force

$pkgName = "@babel/plugin-transform-runtime"
$version = "latest"
$name = "plugin-transform-runtime"
$targetDir = "..\node_modules\@babel"
$destPath = Join-Path $targetDir $name

Write-Host "Target Dir: $targetDir"
Write-Host "Dest Path: $destPath"

if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir }

# Clean old
if (Test-Path $destPath) { 
    Write-Host "Cleaning old directory..."
    Remove-Item $destPath -Recurse -Force 
}

# Download
Write-Host "Downloading $pkgName..."
npm pack "$pkgName@$version"

# Find tarball
$tgz = Get-ChildItem -Filter "*$name*.tgz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($tgz) {
    Write-Host "Found tarball: $($tgz.Name)"
    New-Item -ItemType Directory -Force -Path $destPath | Out-Null
    
    Write-Host "Extracting..."
    tar -xf $tgz.Name -C $destPath --strip-components=1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Extraction successful."
        # Remove-Item $tgz.Name
        Write-Host "Kept tarball for inspection: $($tgz.Name)"
    } else {
        Write-Error "Tar extraction failed with code $LASTEXITCODE"
    }
} else {
    Write-Error "Failed to download $pkgName"
}

Write-Host "DONE"
Stop-Transcript
