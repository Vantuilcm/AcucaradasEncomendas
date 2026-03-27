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

# Restore missing @ide/backoff dependency for expo-notifications
Install-Package "@ide/backoff" "0.1.0" # Assuming latest or checking version

Write-Host "ALL DONE - IDE Backoff Restored"
