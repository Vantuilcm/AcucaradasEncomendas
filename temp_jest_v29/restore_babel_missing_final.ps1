$ErrorActionPreference = "Stop"
$targetDir = "..\node_modules\@babel"

Function Install-Package {
    param([string]$pkgName, [string]$version)
    
    $name = $pkgName -split "/" | Select-Object -Last 1
    $destPath = Join-Path $targetDir $name

    Write-Host "--- Restoring $pkgName ---"
    
    # Clean old
    if (Test-Path $destPath) { 
        Write-Host "Cleaning $destPath..."
        Remove-Item $destPath -Recurse -Force -ErrorAction SilentlyContinue 
    }
    
    # Download
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
            Remove-Item $tgz.Name
        } else {
            Write-Error "Tar extraction failed with code $LASTEXITCODE"
        }
    } else {
        Write-Error "Failed to download $pkgName"
    }
    
    Start-Sleep -Seconds 1
}

Install-Package "@babel/plugin-transform-named-capturing-groups-regex" "latest"
Install-Package "@babel/plugin-transform-react-jsx-self" "latest"
Install-Package "@babel/plugin-transform-runtime" "latest"

Write-Host "ALL DONE"
