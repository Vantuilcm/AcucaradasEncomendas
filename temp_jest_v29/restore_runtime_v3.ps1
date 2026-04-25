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
    Write-Host "Target Dir: $targetDir"
    Write-Host "Dest Path: $destPath"

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

# React Native internals
# Install-Package "@react-native/assets-registry" "0.72.0"
# Install-Package "@react-native/codegen" "0.72.8"
# Install-Package "@react-native/gradle-plugin" "0.72.11"
# Install-Package "@react-native/js-polyfills" "0.72.1"
# Install-Package "@react-native/normalize-colors" "0.72.0"
# Install-Package "@react-native/virtualized-lists" "0.72.8"

# React Native Community
Install-Package "@react-native-community/cli" "11.3.10"
Install-Package "@react-native-community/cli-platform-android" "11.3.10"
Install-Package "@react-native-community/cli-platform-ios" "11.3.10"

# Other runtimes
Install-Package "regenerator-runtime" "latest"
Install-Package "co" "4.6.0"

Write-Host "ALL DONE"
