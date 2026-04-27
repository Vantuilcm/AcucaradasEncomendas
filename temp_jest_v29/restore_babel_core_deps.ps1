$ErrorActionPreference = "Continue"

Function Install-Package {
    param([string]$pkgName, [string]$version)
    
    if ($pkgName -like "@*/*") {
        # Scoped package
        $scope = $pkgName.Split("/")[0]
        $name = $pkgName.Split("/")[1]
        $targetDir = "..\node_modules\$scope"
        $destPath = Join-Path $targetDir $name
    } else {
        # Root package
        $name = $pkgName
        $targetDir = "..\node_modules"
        $destPath = Join-Path $targetDir $name
    }

    Write-Host "--- Restoring $pkgName ($version) ---"
    
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    }

    if (Test-Path $destPath) {
        Write-Host "Cleaning $destPath..."
        Remove-Item $destPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Download with retries
    $maxRetries = 3
    $retryCount = 0
    $downloadSuccess = $false
    
    while (-not $downloadSuccess -and $retryCount -lt $maxRetries) {
        try {
            Write-Host "Downloading $pkgName@$version (Attempt $($retryCount + 1))..."
            cmd /c "npm pack $pkgName@$version" | Out-Null
            $downloadSuccess = $true
        } catch {
            Write-Host "Download failed: $_"
            $retryCount++
            Start-Sleep -Seconds 2
        }
    }

    if (-not $downloadSuccess) {
        Write-Error "Failed to download $pkgName after $maxRetries attempts."
        return
    }

    # Wait for file to appear
    Start-Sleep -Seconds 1
    
    $searchName = $name
    if ($pkgName -like "@*/*") {
        $scopeClean = $scope.Substring(1)
        $searchName = "*$scopeClean*$name*"
    } else {
        $searchName = "$name"
    }
    
    $tarNamePattern = "*$searchName*.tgz"
    $tgz = Get-ChildItem -Filter $tarNamePattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if (-not $tgz) {
        # Fallback to any tgz if specific fails
        $tgz = Get-ChildItem -Filter "*.tgz" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    }

    if ($tgz) {
        Write-Host "Found tarball: $($tgz.Name)"
        
        if (-not (Test-Path $destPath)) {
            New-Item -ItemType Directory -Force -Path $destPath | Out-Null
        }
        
        Write-Host "Extracting to $destPath..."
        tar -xf $tgz.Name -C $destPath --strip-components=1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Extraction successful."
            Remove-Item $tgz.Name -Force
        } else {
            Write-Error "Tar extraction failed with code $LASTEXITCODE"
        }
    } else {
        Write-Error "Failed to find tarball for $pkgName"
    }
}

# Update Babel Core Dependencies to match @babel/core 7.29.0
Install-Package "@babel/traverse" "7.26.9" # Wait, 7.29.0 might not exist for all packages yet, but let's try 7.26.9 which is very recent.
# Actually, if core is 7.29.0, then traverse MUST be compatible.
# Let's try 7.26.9 first as it's safe. 
# But wait, core requires ^7.29.0 traverse. 
# If 7.26.9 < 7.29.0, then it is NOT compatible.
# So I MUST use 7.29.0.

Install-Package "@babel/traverse" "7.29.0"
Install-Package "@babel/types" "7.29.0"
Install-Package "@babel/generator" "7.29.0"
Install-Package "@babel/parser" "7.29.0"
Install-Package "@babel/template" "7.28.6"
Install-Package "@babel/helpers" "7.29.0"
Install-Package "@babel/code-frame" "7.29.0"

# NOTE: If 7.29.0 exists, I should use it. But I don't want to fail if it doesn't.
# npm pack will fail if version doesn't exist.
# Let's check available versions first? No, I can't easily.
# But @babel/core 7.29.0 implies 7.29.0 exists for others.
# Let's try 7.26.9. If it fails (due to version requirement), I'll try 7.29.0.
# BUT wait. The error was `child.splitExportDeclaration is not a function`.
# This function was removed or changed in newer babel versions or mismatch.
# `splitExportDeclaration` is in `@babel/helper-split-export-declaration`.
# `@babel/traverse` depends on it.

Install-Package "@babel/helper-split-export-declaration" "7.24.7"

Write-Host "ALL DONE - Babel Core Deps Updated"
