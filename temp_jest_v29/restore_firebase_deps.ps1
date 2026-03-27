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

    Write-Host "--- Restoring $pkgName ---"
    
    if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
    
    # Clean old
    if (Test-Path $destPath) { 
        Write-Host "Cleaning $destPath..."
        Remove-Item $destPath -Recurse -Force -ErrorAction SilentlyContinue 
    }
    
    # Download
    npm pack "$pkgName@$version"
    Start-Sleep -Seconds 2
    
    # Find tarball
    $tarNamePattern = "*$name*.tgz"
    if ($pkgName -like "@*/*") {
        $tarNamePattern = "*" + $name + "*.tgz"
    }

    $tgz = Get-ChildItem -Filter $tarNamePattern | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
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
        Write-Error "Failed to download $pkgName (Pattern: $tarNamePattern)"
    }
    
    Start-Sleep -Seconds 1
}

# Firebase & Auth & Notifications
Install-Package "firebase" "10.7.1"
Install-Package "expo-notifications" "0.20.1"
Install-Package "expo-auth-session" "5.0.2"
Install-Package "jsonwebtoken" "9.0.2"
Install-Package "jwt-decode" "4.0.0"
Install-Package "expo-linking" "5.0.2"
Install-Package "expo-web-browser" "12.3.2"
Install-Package "expo-splash-screen" "~0.20.5"
Install-Package "expo-status-bar" "1.6.0"

Write-Host "Firebase and Auth dependencies restored."
