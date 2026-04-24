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
    
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
    
    # Clean old
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
            # Use cmd /c to ensure npm runs properly and capture output just in case
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
    
    # Find the tarball
    $tarNamePattern = "*$name*.tgz"
    $tgz = Get-ChildItem -Filter $tarNamePattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if (-not $tgz) {
        # Try a broader search if specific name fails (e.g. scoped packages sometimes behave differently)
        $tarNamePattern = "*.tgz"
        $tgz = Get-ChildItem -Filter $tarNamePattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    }

    if ($tgz) {
        Write-Host "Found tarball: $($tgz.Name)"
        
        if (-not (Test-Path $destPath)) {
            New-Item -ItemType Directory -Force -Path $destPath | Out-Null
        }
        
        Write-Host "Extracting to $destPath..."
        # Use tar with force and silence
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
    
    Start-Sleep -Seconds 1
}

# --- Firebase Internals (Required for firebase@10.7.1) ---
Install-Package "@firebase/app" "0.9.25"
Install-Package "@firebase/app-compat" "0.2.25"
Install-Package "@firebase/app-types" "0.9.0"
Install-Package "@firebase/auth" "1.5.1"
Install-Package "@firebase/auth-compat" "0.5.1"
Install-Package "@firebase/database" "1.0.2"
Install-Package "@firebase/database-compat" "1.0.2"
Install-Package "@firebase/firestore" "4.4.0"
Install-Package "@firebase/firestore-compat" "0.3.23"
Install-Package "@firebase/functions" "0.11.0"
Install-Package "@firebase/functions-compat" "0.3.6"
Install-Package "@firebase/installations" "0.6.4"
Install-Package "@firebase/installations-compat" "0.2.4"
Install-Package "@firebase/messaging" "0.12.5"
Install-Package "@firebase/messaging-compat" "0.2.5"
Install-Package "@firebase/storage" "0.12.0"
Install-Package "@firebase/storage-compat" "0.3.3"
Install-Package "@firebase/performance" "0.6.4"
Install-Package "@firebase/performance-compat" "0.2.4"
Install-Package "@firebase/remote-config" "0.4.4"
Install-Package "@firebase/remote-config-compat" "0.2.4"
Install-Package "@firebase/analytics" "0.10.0"
Install-Package "@firebase/analytics-compat" "0.2.6"
Install-Package "@firebase/app-check" "0.8.1"
Install-Package "@firebase/app-check-compat" "0.3.8"
Install-Package "@firebase/util" "1.9.3"

# --- Missing Test & Runtime Deps ---
Install-Package "@testing-library/react-native" "12.4.3"
Install-Package "@prisma/client" "5.9.1"
Install-Package "expo-secure-store" "12.3.1"
Install-Package "expo-constants" "14.4.2" # Reinforcing

Write-Host "ALL DONE - Missing Deps Restored"
