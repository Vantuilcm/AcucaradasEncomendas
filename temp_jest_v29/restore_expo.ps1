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

Install-Package "expo-constants" "14.4.2"
Install-Package "expo-modules-core" "1.5.13"
Install-Package "expo-asset" "8.10.1"
Install-Package "expo-file-system" "15.4.5"
Install-Package "expo-font" "11.4.0"
Install-Package "expo-application" "5.3.0"
Install-Package "expo-keep-awake" "12.3.0"
Install-Package "expo-modules-autolinking" "1.5.1"
Install-Package "babel-preset-expo" "9.5.2"
Install-Package "@expo/config" "8.1.2"
Install-Package "@expo/config-plugins" "7.2.5"
Install-Package "@expo/vector-icons" "13.0.0"

Write-Host "Expo dependencies restored."
